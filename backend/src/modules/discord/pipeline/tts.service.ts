import { WebSocket } from "ws";

/**
 * ElevenLabs TTS service using WebSocket streaming.
 *
 * Text chunks are sent as they arrive from the LLM,
 * and audio chunks are returned in real-time for playback.
 */
export class TtsService {
  private ws: WebSocket | null = null;
  private onAudioChunk: (pcmData: Buffer) => void;
  private onDone: () => void;
  private audioChunks: Buffer[] = [];

  constructor(
    onAudioChunk: (pcmData: Buffer) => void,
    onDone: () => void
  ) {
    this.onAudioChunk = onAudioChunk;
    this.onDone = onDone;
  }

  /**
   * Opens a WebSocket connection to ElevenLabs for streaming TTS.
   */
  async start(): Promise<void> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId =
      process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel

    if (!apiKey) {
      throw new Error(
        "ELEVENLABS_API_KEY environment variable is not set"
      );
    }

    const modelId = "eleven_flash_v2_5";
    const url = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${modelId}`;

    this.ws = new WebSocket(url);

    return new Promise<void>((resolve, reject) => {
      this.ws!.on("open", () => {
        // Send initial config — request PCM 24kHz output
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
            this.onDone();
          }
        } catch {
          // Non-JSON or malformed — skip
        }
      });

      this.ws!.on("error", (err) => {
        console.error("ElevenLabs TTS WebSocket error:", err);
        reject(err);
      });

      this.ws!.on("close", () => {
        this.ws = null;
      });
    });
  }

  /**
   * Sends a text chunk to be synthesized.
   * Call this as LLM tokens stream in.
   */
  sendText(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ text }));
  }

  /**
   * Signals that no more text will be sent.
   * ElevenLabs will flush remaining audio and send isFinal.
   */
  flush(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ text: "" }));
  }

  /**
   * Returns all collected audio as a single buffer.
   */
  getFullAudio(): Buffer {
    return Buffer.concat(this.audioChunks);
  }

  /**
   * Closes the WebSocket connection.
   */
  stop(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.audioChunks = [];
  }
}
