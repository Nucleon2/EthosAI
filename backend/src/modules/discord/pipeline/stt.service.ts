import {
  createClient,
  LiveTranscriptionEvents,
  type ListenLiveClient,
} from "@deepgram/sdk";

export type TranscriptHandler = (
  transcript: string,
  isFinal: boolean
) => void;

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;

/**
 * Manages a Deepgram WebSocket connection for real-time
 * speech-to-text on Discord Opus audio.
 *
 * Discord sends Opus at 48kHz stereo -- Deepgram accepts it
 * natively.
 *
 * Turn detection strategy:
 *   We use Deepgram's UtteranceEnd event (utterance_end_ms) as
 *   the primary signal that the user finished speaking. When it
 *   fires, we flush the accumulated interim text as a final
 *   transcript. This is more reliable than speech_final for
 *   short-lived audio streams (Discord's opus stream ends on
 *   silence before Deepgram's endpointing can fire).
 */
export class SttService {
  private connection: ListenLiveClient | null = null;
  private onTranscript: TranscriptHandler;
  private keepAliveInterval: ReturnType<typeof setInterval> | null =
    null;
  private reconnectAttempts = 0;
  private isStopped = false;
  private isOpen = false;

  /**
   * Accumulates finalized segments (is_final=true) for the current
   * utterance. These are confirmed transcriptions that won't change.
   */
  private finalizedSegments: string[] = [];

  /**
   * Stores the latest interim hypothesis for the current segment.
   * This gets replaced on each interim update and cleared when the
   * segment is finalized.
   */
  private currentInterim = "";

  /**
   * Tracks whether we already emitted a final transcript for the
   * current utterance (to avoid duplicates from both is_final and
   * UtteranceEnd firing).
   */
  private finalEmitted = false;

  constructor(onTranscript: TranscriptHandler) {
    this.onTranscript = onTranscript;
  }

  /**
   * Opens a streaming connection to Deepgram.
   * Resolves only when the WebSocket is actually open and ready.
   */
  async start(): Promise<void> {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error(
        "DEEPGRAM_API_KEY environment variable is not set"
      );
    }

    this.isStopped = false;
    this.isOpen = false;
    this.finalizedSegments = [];
    this.currentInterim = "";
    this.finalEmitted = false;
    const deepgram = createClient(apiKey);

    this.connection = deepgram.listen.live({
      model: "nova-3",
      language: "en",
      encoding: "opus",
      sample_rate: 48000,
      channels: 2,
      punctuate: true,
      interim_results: true,
      utterance_end_ms: 1500,
      endpointing: 500,
      smart_format: true,
    });

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("[STT] Connection timeout"));
        this.stop();
      }, 10_000);

      this.connection!.on(LiveTranscriptionEvents.Open, () => {
        clearTimeout(timeout);
        this.isOpen = true;
        this.reconnectAttempts = 0;
        console.log("[STT] Deepgram connection opened");
        resolve();
      });

      this.connection!.on(
        LiveTranscriptionEvents.Transcript,
        (data: {
          is_final: boolean;
          speech_final: boolean;
          channel: {
            alternatives: Array<{ transcript: string }>;
          };
        }) => {
          const transcript =
            data.channel?.alternatives?.[0]?.transcript;
          if (!transcript) return;

          if (data.is_final) {
            // Deepgram confirmed this segment
            console.log(
              `[STT] Segment final: "${transcript}"`
            );
            
            // Add to finalized segments
            this.finalizedSegments.push(transcript);
            this.currentInterim = "";

            // If speech_final is also set, treat as end of turn
            if (data.speech_final) {
              this.emitFinalFromSegments();
            } else {
              // Send interim with accumulated finalized text
              this.onTranscript(
                this.finalizedSegments.join(" "),
                false
              );
            }
          } else {
            // Interim result -- replace current hypothesis
            console.log(
              `[STT] Transcript (interim): "${transcript}"`
            );
            this.currentInterim = transcript;
            
            // Send combined finalized + current interim
            const combined = this.finalizedSegments.length > 0
              ? `${this.finalizedSegments.join(" ")} ${transcript}`
              : transcript;
            this.onTranscript(combined, false);
          }
        }
      );

      // UtteranceEnd fires when Deepgram detects the user stopped
      // speaking. This is our primary "turn done" signal.
      this.connection!.on(
        LiveTranscriptionEvents.UtteranceEnd,
        () => {
          console.log("[STT] UtteranceEnd event received");
          this.emitFinalFromSegments();
        }
      );

      this.connection!.on(
        LiveTranscriptionEvents.Error,
        (err: unknown) => {
          clearTimeout(timeout);
          console.error("[STT] Deepgram error:", err);
        }
      );

      this.connection!.on(LiveTranscriptionEvents.Close, () => {
        this.isOpen = false;
        this.cleanupTimers();
        console.log("[STT] Deepgram connection closed");
        if (!this.isStopped) {
          this.attemptReconnect();
        }
      });

      // Keep connection alive during silence
      this.keepAliveInterval = setInterval(() => {
        if (this.isOpen) {
          this.connection?.keepAlive();
        }
      }, 10_000);
    });
  }

  /**
   * Emits a final transcript from accumulated segments and resets
   * the accumulation state. Guards against duplicate emissions.
   */
  private emitFinalFromSegments(): void {
    if (this.finalEmitted) return;

    // Combine finalized segments with any remaining interim
    const parts: string[] = [...this.finalizedSegments];
    if (this.currentInterim.trim()) {
      parts.push(this.currentInterim);
    }

    const finalText = parts.join(" ").trim();
    if (!finalText) return;

    this.finalEmitted = true;
    this.finalizedSegments = [];
    this.currentInterim = "";
    console.log(`[STT] Transcript (FINAL): "${finalText}"`);
    this.onTranscript(finalText, true);

    // Reset for next utterance after a short delay
    setTimeout(() => {
      this.finalEmitted = false;
    }, 200);
  }

  /**
   * Called when the Discord audio stream ends (user stops
   * speaking). If we have accumulated text that was never
   * finalized, flush it now.
   */
  flushPending(): void {
    const hasPending =
      this.finalizedSegments.length > 0 ||
      this.currentInterim.trim();
    
    if (hasPending && !this.finalEmitted) {
      console.log(
        "[STT] Flushing pending transcript on stream end"
      );
      this.emitFinalFromSegments();
    }
  }

  /**
   * Attempts to reconnect to Deepgram after an unexpected
   * disconnect.
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(
        `[STT] Max reconnect attempts ` +
          `(${MAX_RECONNECT_ATTEMPTS}) reached`
      );
      this.connection = null;
      return;
    }

    this.reconnectAttempts++;
    const delay =
      RECONNECT_DELAY_MS *
      Math.pow(2, this.reconnectAttempts - 1);
    console.log(
      `[STT] Reconnecting in ${delay}ms ` +
        `(attempt ${this.reconnectAttempts}` +
        `/${MAX_RECONNECT_ATTEMPTS})...`
    );

    await new Promise((r) => setTimeout(r, delay));

    if (this.isStopped) return;

    try {
      await this.start();
      console.log("[STT] Reconnected to Deepgram successfully.");
    } catch (err) {
      console.error("[STT] Reconnect failed:", err);
      this.attemptReconnect();
    }
  }

  /**
   * Sends an Opus audio chunk to Deepgram for transcription.
   * Silently drops packets if connection is not open.
   */
  sendAudio(opusPacket: Buffer): void {
    if (!this.connection || !this.isOpen) return;
    try {
      this.connection.send(
        opusPacket.buffer.slice(
          opusPacket.byteOffset,
          opusPacket.byteOffset + opusPacket.byteLength
        ) as ArrayBuffer
      );
    } catch (err) {
      console.error("[STT] Failed to send audio packet:", err);
    }
  }

  /**
   * Returns whether the STT connection is active and open.
   */
  isConnected(): boolean {
    return this.connection !== null && this.isOpen;
  }

  /**
   * Gracefully closes the Deepgram connection.
   */
  stop(): void {
    this.isStopped = true;
    this.isOpen = false;
    try {
      this.connection?.requestClose();
    } catch {
      // Connection may already be closed
    }
    this.cleanupTimers();
    this.connection = null;
  }

  private cleanupTimers(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }
}
