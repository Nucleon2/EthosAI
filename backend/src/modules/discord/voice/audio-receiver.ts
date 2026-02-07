import {
  type VoiceConnection,
  EndBehaviorType,
} from "@discordjs/voice";
import type { Readable } from "node:stream";

/**
 * Callback fired when an audio chunk is received from a user.
 * The data is raw Opus packets from Discord.
 */
export type AudioChunkHandler = (
  opusPacket: Buffer,
  userId: string
) => void;

/**
 * Callback fired when a user stops speaking (after silence duration).
 */
export type SpeakingEndHandler = (userId: string) => void;

/**
 * Subscribes to a specific user's audio in a voice connection.
 *
 * Returns a cleanup function to unsubscribe.
 *
 * Discord sends Opus-encoded packets at 48kHz stereo.
 * We forward raw Opus directly to Deepgram (it accepts Opus natively).
 */
export function subscribeToUser(
  connection: VoiceConnection,
  userId: string,
  onChunk: AudioChunkHandler,
  onEnd: SpeakingEndHandler
): () => void {
  const receiver = connection.receiver;

  // Listen for when the user starts speaking
  const onSpeakingStart = (speakingUserId: string): void => {
    if (speakingUserId !== userId) return;

    const opusStream: Readable = receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 1500,
      },
    });

    opusStream.on("data", (chunk: Buffer) => {
      onChunk(chunk, userId);
    });

    opusStream.on("end", () => {
      onEnd(userId);
    });
  };

  receiver.speaking.on("start", onSpeakingStart);

  // Return cleanup
  return () => {
    receiver.speaking.off("start", onSpeakingStart);
  };
}
