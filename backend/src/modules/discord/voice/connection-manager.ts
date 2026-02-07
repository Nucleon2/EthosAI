import {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
  type VoiceConnection,
  type DiscordGatewayAdapterCreator,
} from "@discordjs/voice";

/** Active voice connections keyed by guild ID. */
const connections = new Map<string, VoiceConnection>();

/**
 * Joins a voice channel and stores the connection.
 * Sets selfDeaf to false so we can receive user audio.
 */
export function joinChannel(
  channelId: string,
  guildId: string,
  adapterCreator: DiscordGatewayAdapterCreator
): VoiceConnection {
  const existing = connections.get(guildId);
  if (existing) return existing;

  const connection = joinVoiceChannel({
    channelId,
    guildId,
    adapterCreator,
    selfDeaf: false,
    selfMute: false,
  });

  // Handle disconnects — try to reconnect once, then destroy
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      connection.destroy();
      connections.delete(guildId);
    }
  });

  connection.on(VoiceConnectionStatus.Destroyed, () => {
    connections.delete(guildId);
  });

  connections.set(guildId, connection);
  return connection;
}

/**
 * Leaves the voice channel for a given guild.
 */
export function leaveChannel(guildId: string): void {
  const connection = connections.get(guildId);
  if (!connection) return;
  connection.destroy();
  connections.delete(guildId);
}

/**
 * Returns the active connection for a guild, if any.
 */
export function getConnection(guildId: string): VoiceConnection | undefined {
  return connections.get(guildId);
}
