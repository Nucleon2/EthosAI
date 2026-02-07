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
 * Bytes per 20ms frame at 48kHz, 16-bit, stereo.
 *
 * 48000 samples/s * 0.020s * 2 channels * 2 bytes = 3840 bytes.
 *
 * Discord's Opus encoder expects exactly this chunk size per frame.
 */
const FRAME_SIZE = 3840;

/**
 * Resamples PCM audio from 24kHz mono to 48kHz stereo.
 *
 * ElevenLabs outputs signed 16-bit LE, 24kHz, mono.
 * Discord expects signed 16-bit LE, 48kHz, stereo.
 *
 * Strategy:
 *  - Upsample 24kHz -> 48kHz via linear interpolation (2x)
 *  - Duplicate mono channel to stereo (L = R)
 *
 * Input:  1 sample = 2 bytes (16-bit mono)
 * Output: 1 frame  = 4 bytes (16-bit stereo) at 2x sample rate
 */
function resample24kMonoTo48kStereo(input: Buffer): Buffer {
  const bytesPerSample = 2;
  const sampleCount = input.length / bytesPerSample;

  // Output: 2x samples (upsample) * 2 channels (stereo) * 2 bytes
  const output = Buffer.alloc(sampleCount * 2 * 2 * bytesPerSample);

  let writeOffset = 0;

  for (let i = 0; i < sampleCount; i++) {
    const currentSample = input.readInt16LE(i * bytesPerSample);

    // Linear interpolation: get next sample (or repeat last)
    const nextSample =
      i + 1 < sampleCount
        ? input.readInt16LE((i + 1) * bytesPerSample)
        : currentSample;

    const midSample = Math.round(
      (currentSample + nextSample) / 2
    );

    // Write first upsampled frame (stereo: L + R)
    output.writeInt16LE(currentSample, writeOffset);
    output.writeInt16LE(currentSample, writeOffset + 2);
    writeOffset += 4;

    // Write interpolated frame (stereo: L + R)
    output.writeInt16LE(midSample, writeOffset);
    output.writeInt16LE(midSample, writeOffset + 2);
    writeOffset += 4;
  }

  return output;
}

/**
 * Creates a Readable stream that yields PCM data in frame-sized
 * chunks (3840 bytes = 20ms at 48kHz stereo 16-bit).
 *
 * This prevents discord.js from receiving the entire buffer at
 * once, which causes negative timeout calculations in its
 * internal frame scheduler.
 */
function createFramedStream(pcmData: Buffer): Readable {
  let offset = 0;

  return new Readable({
    read() {
      if (offset >= pcmData.length) {
        this.push(null);
        return;
      }

      const end = Math.min(offset + FRAME_SIZE, pcmData.length);
      const chunk = pcmData.subarray(offset, end);

      // If the last chunk is smaller than a frame, pad with silence
      if (chunk.length < FRAME_SIZE) {
        const padded = Buffer.alloc(FRAME_SIZE);
        chunk.copy(padded);
        this.push(padded);
      } else {
        this.push(chunk);
      }

      offset = end;
    },
  });
}

/**
 * Plays PCM audio from ElevenLabs through the voice connection.
 *
 * Accepts 24kHz mono PCM from TTS, resamples to 48kHz stereo,
 * and feeds it to Discord's audio player as Raw PCM in 20ms frames.
 *
 * Returns a promise that resolves when playback finishes.
 */
export async function playAudio(
  connection: VoiceConnection,
  pcmData: Buffer,
  guildId: string
): Promise<void> {
  if (pcmData.length === 0) return;

  let player = players.get(guildId);
  if (!player) {
    player = createAudioPlayer();
    connection.subscribe(player);
    players.set(guildId, player);
  }

  // Resample from ElevenLabs format to Discord format
  const resampled = resample24kMonoTo48kStereo(pcmData);

  // Stream in frame-sized chunks to avoid negative timeout warnings
  const stream = createFramedStream(resampled);
  const resource = createAudioResource(stream, {
    inputType: StreamType.Raw,
    inlineVolume: false,
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
