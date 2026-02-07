import { WebSocket } from "ws";

/** Timeout if ElevenLabs never sends isFinal after flush. */
const TTS_DONE_TIMEOUT_MS = 15_000;

/** Timeout for initial WebSocket connection. */
const TTS_CONNECT_TIMEOUT_MS = 10_000;

/**
 * ElevenLabs TTS service using WebSocket streaming.
 *
 * Text chunks are sent as they arrive from the LLM,
 * and audio chunks are returned in real-time for playback.
 *
 * Includes timeout protection and graceful error handling
 * to prevent the pipeline from hanging.
 */
export class TtsService {
  private ws: WebSocket | null = null;
  private onAudioChunk: (pcmData: Buffer) => void;
  private onDone: () => void;
  private audioChunks: Buffer[] = [];
  private doneTimeout: ReturnType<typeof setTimeout> | null = null;
  private doneCalled = false;

  constructor(
    onAudioChunk: (pcmData: Buffer) => void,
    onDone: () => void
  ) {
    this.onAudioChunk = onAudioChunk;
    this.onDone = onDone;
  }

  /**
   * Opens a WebSocket connection to ElevenLabs for streaming TTS.
   * Rejects if the connection cannot be established within timeout.
   */
  async start(): Promise<void> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId =
      process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";

    if (!apiKey) {
      throw new Error(
        "ELEVENLABS_API_KEY environment variable is not set"
      );
    }

    const modelId = "eleven_flash_v2_5";
    const url =
      `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${modelId}`;

    this.ws = new WebSocket(url);
    this.doneCalled = false;

    return new Promise<void>((resolve, reject) => {
      const connectTimeout = setTimeout(() => {
        reject(new Error("[TTS] Connection timeout"));
        this.stop();
      }, TTS_CONNECT_TIMEOUT_MS);

      this.ws!.on("open", () => {
        clearTimeout(connectTimeout);
        // Send initial config -- request PCM 24kHz output
        this.ws!.send(
          JSON.stringify({
            text: " ",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
            xi_api_key: apiKey,
            output_format: "pcm_24000",
            generation_config: {
              chunk_length_schedule: [120, 160, 250, 290],
            },
          })
        );
        resolve();
      });

      this.ws!.on("message", (data: Buffer | string) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.audio) {
            const pcm = Buffer.from(msg.audio, "base64");
            this.audioChunks.push(pcm);
            this.onAudioChunk(pcm);
          }
          if (msg.isFinal) {
            this.callDone();
          }
        } catch {
          // Non-JSON or malformed -- skip
        }
      });

      this.ws!.on("error", (err) => {
        clearTimeout(connectTimeout);
        console.error("[TTS] ElevenLabs WebSocket error:", err);
        this.callDone();
        reject(err);
      });

      this.ws!.on("close", () => {
        clearTimeout(connectTimeout);
        // If we never got isFinal, signal done to prevent hanging
        this.callDone();
        this.ws = null;
      });
    });
  }

  /**
   * Ensures onDone is called exactly once, even on error or timeout.
   */
  private callDone(): void {
    if (this.doneCalled) return;
    this.doneCalled = true;
    if (this.doneTimeout) {
      clearTimeout(this.doneTimeout);
      this.doneTimeout = null;
    }
    this.onDone();
  }

  /**
   * Sends a text chunk to be synthesized.
   * Call this as LLM tokens stream in.
   */
  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify({ text }));
    } catch (err) {
      console.error("[TTS] Failed to send text chunk:", err);
    }
  }

  /**
   * Signals that no more text will be sent.
   * ElevenLabs will flush remaining audio and send isFinal.
   * Starts a safety timeout in case isFinal never arrives.
   */
  flush(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.callDone();
      return;
    }

    try {
      this.ws.send(JSON.stringify({ text: "" }));
    } catch (err) {
      console.error("[TTS] Failed to flush:", err);
      this.callDone();
      return;
    }

    // Safety timeout: if ElevenLabs doesn't respond, call done anyway
    this.doneTimeout = setTimeout(() => {
      console.warn(
        "[TTS] Timeout waiting for isFinal from ElevenLabs. Completing."
      );
      this.callDone();
    }, TTS_DONE_TIMEOUT_MS);
  }

  /**
   * Returns all collected audio as a single buffer.
   */
  getFullAudio(): Buffer {
    return Buffer.concat(this.audioChunks);
  }

  /**
   * Closes the WebSocket connection and cleans up.
   */
  stop(): void {
    if (this.doneTimeout) {
      clearTimeout(this.doneTimeout);
      this.doneTimeout = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Already closed
      }
      this.ws = null;
    }
    this.audioChunks = [];
  }
}
