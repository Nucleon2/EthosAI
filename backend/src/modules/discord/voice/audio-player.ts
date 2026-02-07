import {
  createAudioResource,
  createAudioPlayer,
  AudioPlayerStatus,
  type VoiceConnection,
  type AudioPlayer,
  StreamType,
} from "@discordjs/voice";
import { Readable } from "node:stream";

/** Active audio players keyed by guild ID. */
const players = new Map<string, AudioPlayer>();

/**
 * Plays raw PCM audio (signed 16-bit LE, 24kHz mono) through
 * the voice connection. Queues if already playing.
 *
 * Returns a promise that resolves when playback finishes.
 */
export async function playAudio(
  connection: VoiceConnection,
  pcmData: Buffer,
  guildId: string
): Promise<void> {
  let player = players.get(guildId);
  if (!player) {
    player = createAudioPlayer();
    connection.subscribe(player);
    players.set(guildId, player);
  }

  const stream = Readable.from(pcmData);
  const resource = createAudioResource(stream, {
    inputType: StreamType.Raw,
  });

  player.play(resource);

  return new Promise<void>((resolve, reject) => {
    const onIdle = (): void => {
      cleanup();
      resolve();
    };
    const onError = (err: Error): void => {
      cleanup();
      reject(err);
    };
    const cleanup = (): void => {
      player!.off(AudioPlayerStatus.Idle, onIdle);
      player!.off("error", onError);
    };

    player!.on(AudioPlayerStatus.Idle, onIdle);
    player!.on("error", onError);
  });
}

/**
 * Immediately stops any audio playing in the guild.
 * Used for interruption handling when user starts speaking.
 */
export function stopPlayback(guildId: string): void {
  const player = players.get(guildId);
  if (player) {
    player.stop(true);
  }
}

/**
 * Cleans up the audio player for a guild.
 */
export function destroyPlayer(guildId: string): void {
  const player = players.get(guildId);
  if (player) {
    player.stop(true);
    players.delete(guildId);
  }
}
