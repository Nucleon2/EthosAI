import {
  createClient,
  LiveTranscriptionEvents,
  type ListenLiveClient,
} from "@deepgram/sdk";

export type TranscriptHandler = (transcript: string, isFinal: boolean) => void;

/**
 * Manages a Deepgram WebSocket connection for real-time
 * speech-to-text on Discord Opus audio.
 *
 * Discord sends Opus at 48kHz stereo — Deepgram accepts it natively.
 */
export class SttService {
  private connection: ListenLiveClient | null = null;
  private onTranscript: TranscriptHandler;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;

  constructor(onTranscript: TranscriptHandler) {
    this.onTranscript = onTranscript;
  }

  /**
   * Opens a streaming connection to Deepgram.
   */
  async start(): Promise<void> {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPGRAM_API_KEY environment variable is not set");
    }

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

    this.connection.on(
      LiveTranscriptionEvents.Transcript,
      (data: {
        is_final: boolean;
        speech_final: boolean;
        channel: {
          alternatives: Array<{ transcript: string }>;
        };
      }) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        if (!transcript) return;

        // speech_final means the utterance is complete (endpointing)
        const isFinal = data.speech_final ?? data.is_final;
        this.onTranscript(transcript, isFinal);
      }
    );

    this.connection.on(LiveTranscriptionEvents.Error, (err: unknown) => {
      console.error("Deepgram STT error:", err);
    });

    this.connection.on(LiveTranscriptionEvents.Close, () => {
      this.cleanup();
    });

    // Keep connection alive during silence
    this.keepAliveInterval = setInterval(() => {
      this.connection?.keepAlive();
    }, 10_000);
  }

  /**
   * Sends an Opus audio chunk to Deepgram for transcription.
   */
  sendAudio(opusPacket: Buffer): void {
    if (!this.connection) return;
    this.connection.send(opusPacket.buffer.slice(
      opusPacket.byteOffset,
      opusPacket.byteOffset + opusPacket.byteLength
    ) as ArrayBuffer);
  }

  /**
   * Closes the Deepgram connection.
   */
  stop(): void {
    this.connection?.requestClose();
    this.cleanup();
  }

  private cleanup(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    this.connection = null;
  }
}
