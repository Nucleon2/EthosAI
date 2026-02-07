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
 *
 * Important: We track the active stream per user to avoid stacking
 * duplicate listeners when Discord fires multiple speaking-start
 * events for the same utterance.
 */
export function subscribeToUser(
  connection: VoiceConnection,
  userId: string,
  onChunk: AudioChunkHandler,
  onEnd: SpeakingEndHandler
): () => void {
  const receiver = connection.receiver;

  /** The currently active opus stream for this user. */
  let activeStream: Readable | null = null;

  const onSpeakingStart = (speakingUserId: string): void => {
    if (speakingUserId !== userId) return;

    // If we already have an active stream, don't subscribe again.
    // Discord may fire speaking-start multiple times for the same
    // utterance; subscribing again stacks listeners and leaks memory.
    if (activeStream && !activeStream.destroyed) return;

    const opusStream: Readable = receiver.subscribe(userId, {
      end: {
        behavior: EndBehaviorType.AfterSilence,
        duration: 1500,
      },
    });

    activeStream = opusStream;
    let packetCount = 0;

    opusStream.on("data", (chunk: Buffer) => {
      packetCount++;
      if (packetCount === 1) {
        console.log(
          `[Audio] Receiving opus packets from ${userId}`
        );
      }
      onChunk(chunk, userId);
    });

    opusStream.on("end", () => {
      console.log(
        `[Audio] Stream ended for ${userId} ` +
          `(${packetCount} packets)`
      );
      activeStream = null;
      onEnd(userId);
    });

    opusStream.on("error", (err) => {
      console.error(
        `[Audio] Stream error for ${userId}:`,
        err
      );
      activeStream = null;
      // Notify session manager so STT can flush pending text
      onEnd(userId);
    });
  };

  receiver.speaking.on("start", onSpeakingStart);

  // Return cleanup
  return () => {
    receiver.speaking.off("start", onSpeakingStart);
    if (activeStream && !activeStream.destroyed) {
      activeStream.destroy();
      activeStream = null;
    }
  };
}
