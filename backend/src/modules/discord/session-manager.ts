import type { VoiceConnection } from "@discordjs/voice";
import { SttService } from "./pipeline/stt.service";
import { LlmService } from "./pipeline/llm.service";
import { TtsService } from "./pipeline/tts.service";
import { subscribeToUser } from "./voice/audio-receiver";
import { playAudio, stopPlayback, destroyPlayer } from "./voice/audio-player";
import { databaseService } from "../database";

/**
 * Represents the state of a single coaching session.
 */
interface CoachingSession {
  userId: string;
  discordUserId: string;
  walletAddress: string;
  guildId: string;
  channelId: string;
  connection: VoiceConnection;
  stt: SttService;
  llm: LlmService;
  tts: TtsService | null;
  unsubscribeAudio: (() => void) | null;
  isProcessing: boolean;
  utteranceBuffer: string;
  topicsDiscussed: string[];
  nudgesDelivered: string[];
  startedAt: Date;
}

/** Active sessions keyed by Discord user ID. */
const sessions = new Map<string, CoachingSession>();

interface StartSessionParams {
  userId: string;
  discordUserId: string;
  walletAddress: string;
  guildId: string;
  channelId: string;
  connection: VoiceConnection;
}

/**
 * Starts a new coaching session for a user.
 *
 * Wires up the full pipeline:
 *   Discord audio → Deepgram STT → DeepSeek LLM → ElevenLabs TTS → Discord playback
 */
async function startSession(params: StartSessionParams): Promise<void> {
  const { userId, discordUserId, walletAddress, guildId, channelId, connection } = params;

  const llm = new LlmService(walletAddress);
  await llm.initialize();

  const session: CoachingSession = {
    userId,
    discordUserId,
    walletAddress,
    guildId,
    channelId,
    connection,
    stt: null as unknown as SttService,
    llm,
    tts: null,
    unsubscribeAudio: null,
    isProcessing: false,
    utteranceBuffer: "",
    topicsDiscussed: [],
    nudgesDelivered: [],
    startedAt: new Date(),
  };

  // Create STT with transcript handler
  const stt = new SttService((transcript, isFinal) => {
    handleTranscript(session, transcript, isFinal);
  });

  session.stt = stt;
  await stt.start();

  // Subscribe to the user's audio in the voice channel
  const unsubscribe = subscribeToUser(
    connection,
    discordUserId,
    (opusPacket) => {
      // When user speaks while bot is playing, interrupt
      if (session.isProcessing) {
        stopPlayback(guildId);
        if (session.tts) {
          session.tts.stop();
          session.tts = null;
        }
        session.isProcessing = false;
      }
      stt.sendAudio(opusPacket);
    },
    (_userId) => {
      // Silence detected — Deepgram's endpointing handles turn detection
    }
  );

  session.unsubscribeAudio = unsubscribe;
  sessions.set(discordUserId, session);

  // Send an initial greeting via TTS
  await processLlmResponse(
    session,
    "The user just joined the coaching session. Give a brief, warm greeting and reference one interesting pattern from their wallet data."
  );
}

/**
 * Handles incoming transcripts from Deepgram.
 */
function handleTranscript(
  session: CoachingSession,
  transcript: string,
  isFinal: boolean
): void {
  if (!isFinal) {
    // Accumulate interim results
    session.utteranceBuffer = transcript;
    return;
  }

  // Final transcript — process the complete utterance
  const finalText = transcript || session.utteranceBuffer;
  session.utteranceBuffer = "";

  if (!finalText.trim()) return;

  console.log(`[STT] ${session.discordUserId}: "${finalText}"`);
  session.topicsDiscussed.push(finalText);

  // Don't overlap with an in-progress response
  if (session.isProcessing) return;

  processLlmResponse(session, finalText).catch((err) => {
    console.error("Pipeline error:", err);
    session.isProcessing = false;
  });
}

/**
 * Runs the LLM → TTS → playback pipeline for a single turn.
 */
async function processLlmResponse(
  session: CoachingSession,
  text: string
): Promise<void> {
  session.isProcessing = true;

  // Collect all audio chunks, play when done
  const audioChunks: Buffer[] = [];
  let ttsResolve: (() => void) | null = null;
  const ttsDonePromise = new Promise<void>((resolve) => {
    ttsResolve = resolve;
  });

  const tts = new TtsService(
    (pcmChunk) => {
      audioChunks.push(pcmChunk);
    },
    () => {
      ttsResolve?.();
    }
  );

  session.tts = tts;

  try {
    await tts.start();
  } catch (err) {
    console.error("Failed to start TTS:", err);
    session.isProcessing = false;
    return;
  }

  // Stream LLM response to TTS
  let sentenceBuffer = "";
  await session.llm.respond(
    text,
    (chunk) => {
      sentenceBuffer += chunk;
      // Send to TTS in sentence-sized chunks for natural pacing
      const sentenceEnd = sentenceBuffer.match(/[.!?]\s/);
      if (sentenceEnd && sentenceEnd.index !== undefined) {
        const sentence = sentenceBuffer.slice(
          0,
          sentenceEnd.index + 1
        );
        tts.sendText(sentence);
        sentenceBuffer = sentenceBuffer.slice(
          sentenceEnd.index + 2
        );
      }
    },
    (fullResponse) => {
      // Flush remaining text
      if (sentenceBuffer.trim()) {
        tts.sendText(sentenceBuffer);
      }
      tts.flush();
      session.nudgesDelivered.push(fullResponse);
      console.log(`[LLM] Response: "${fullResponse.slice(0, 80)}..."`);
    }
  );

  // Wait for TTS to finish generating audio
  await ttsDonePromise;

  // Play the collected audio
  if (audioChunks.length > 0) {
    const fullAudio = Buffer.concat(audioChunks);
    try {
      await playAudio(session.connection, fullAudio, session.guildId);
    } catch (err) {
      console.error("Audio playback error:", err);
    }
  }

  tts.stop();
  session.tts = null;
  session.isProcessing = false;
}

/**
 * Ends a coaching session and persists the summary to the database.
 */
async function endSession(discordUserId: string): Promise<void> {
  const session = sessions.get(discordUserId);
  if (!session) return;

  // Clean up pipeline
  session.stt.stop();
  if (session.tts) session.tts.stop();
  if (session.unsubscribeAudio) session.unsubscribeAudio();
  destroyPlayer(session.guildId);

  // Generate a session summary via LLM
  const history = session.llm.getHistory();
  const summaryText = history
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n")
    .slice(0, 2000);

  // Persist to database
  try {
    await databaseService.saveDiscordSession({
      userId: session.userId,
      discordUserId: session.discordUserId,
      guildId: session.guildId,
      channelId: session.channelId,
      startedAt: session.startedAt,
      endedAt: new Date(),
      nudgesDelivered: session.nudgesDelivered,
      topicsDiscussed: session.topicsDiscussed,
      sessionSummary: summaryText,
    });
  } catch (err) {
    console.error("Failed to save session to database:", err);
  }

  sessions.delete(discordUserId);
}

/**
 * Checks if a user has an active session.
 */
function hasSession(discordUserId: string): boolean {
  return sessions.has(discordUserId);
}

/**
 * Gets a user's active session, if any.
 */
function getSession(
  discordUserId: string
): CoachingSession | undefined {
  return sessions.get(discordUserId);
}

export const sessionManager = {
  startSession,
  endSession,
  hasSession,
  getSession,
};
