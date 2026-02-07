import {
  VoiceConnectionStatus,
  type VoiceConnection,
} from "@discordjs/voice";
import { SttService } from "./pipeline/stt.service";
import { LlmService } from "./pipeline/llm.service";
import { TtsService } from "./pipeline/tts.service";
import { subscribeToUser } from "./voice/audio-receiver";
import {
  playAudio,
  stopPlayback,
  destroyPlayer,
} from "./voice/audio-player";
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
  currentTurnId: number;
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
  tokenAddress?: string;
}

/**
 * Starts a new coaching session for a user.
 *
 * Wires up the full pipeline:
 *   Discord audio -> Deepgram STT -> DeepSeek LLM
 *     -> ElevenLabs TTS -> Discord playback
 *
 * Includes voice connection monitoring for auto-cleanup.
 */
async function startSession(
  params: StartSessionParams
): Promise<void> {
  const {
    userId,
    discordUserId,
    walletAddress,
    guildId,
    channelId,
    connection,
    tokenAddress,
  } = params;

  console.log(
    `[Session] Starting for ${discordUserId} ` +
      `(wallet: ${walletAddress})`
  );

  const llm = new LlmService(walletAddress, tokenAddress);
  await llm.initialize();
  console.log("[Session] LLM initialized");

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
    currentTurnId: 0,
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
  console.log("[Session] STT started");

  // Subscribe to the user's audio in the voice channel
  const unsubscribe = subscribeToUser(
    connection,
    discordUserId,
    (opusPacket) => {
      // Forward audio to STT -- interruption is handled
      // separately in handleTranscript to avoid races
      stt.sendAudio(opusPacket);
    },
    () => {
      console.log("[Audio] User stopped speaking");
      // Flush any pending interim transcript as final
      // since the audio stream has ended
      stt.flushPending();
    }
  );

  session.unsubscribeAudio = unsubscribe;
  sessions.set(discordUserId, session);
  console.log("[Session] Audio subscription active");

  // Monitor voice connection -- auto-cleanup on disconnect
  connection.on(VoiceConnectionStatus.Destroyed, () => {
    console.log(
      `[Session] Voice connection destroyed for ` +
        `${discordUserId}`
    );
    cleanupSession(discordUserId).catch((err) => {
      console.error(
        "[Session] Cleanup on disconnect failed:",
        err
      );
    });
  });

  // Send an initial greeting via TTS
  try {
    session.currentTurnId++;
    session.isProcessing = true;
    await processLlmResponse(
      session,
      "The user just joined the coaching session. " +
        "Give a brief, warm greeting and reference one " +
        "interesting pattern from their wallet data.",
      session.currentTurnId
    );
    console.log("[Session] Initial greeting delivered");
  } catch (err) {
    console.error("[Session] Initial greeting failed:", err);
    // Session is still usable even if greeting fails
    session.isProcessing = false;
  }
}

/**
 * Handles incoming transcripts from Deepgram.
 *
 * Accumulates interim results and triggers the LLM pipeline
 * on final transcripts. Uses turn IDs to safely cancel
 * in-flight pipelines when interrupted.
 */
function handleTranscript(
  session: CoachingSession,
  transcript: string,
  isFinal: boolean
): void {
  if (!isFinal) {
    session.utteranceBuffer = transcript;
    return;
  }

  // Final transcript -- process the complete utterance
  const finalText = transcript || session.utteranceBuffer;
  session.utteranceBuffer = "";

  if (!finalText.trim()) return;

  console.log(`[Pipeline] User said: "${finalText}"`);
  session.topicsDiscussed.push(finalText);

  // Increment turn ID to cancel any in-flight pipeline
  session.currentTurnId++;
  const turnId = session.currentTurnId;

  // If already processing, stop playback/TTS immediately
  // The old pipeline will see its turnId is stale and exit
  if (session.isProcessing) {
    console.log(
      `[Pipeline] Interrupting turn ${turnId - 1}, ` +
        `starting turn ${turnId}`
    );
    stopPlayback(session.guildId);
    if (session.tts) {
      session.tts.stop();
      session.tts = null;
    }
  }

  // Start the new pipeline with this turn ID
  session.isProcessing = true;
  processLlmResponse(session, finalText, turnId).catch((err) => {
    console.error(
      `[Pipeline] Error in turn ${turnId}:`,
      err
    );
    // Only clear isProcessing if this is still the current turn
    if (session.currentTurnId === turnId) {
      session.isProcessing = false;
    }
  });
}

/**
 * Runs the LLM -> TTS -> playback pipeline for a single turn.
 *
 * Collects all TTS audio before playing to avoid choppy output.
 * Checks the `turnId` throughout so cancelled pipelines exit cleanly.
 */
async function processLlmResponse(
  session: CoachingSession,
  text: string,
  turnId: number
): Promise<void> {
  console.log(`[Pipeline] Starting turn ${turnId}: LLM -> TTS -> playback`);

  // Check if already cancelled before we start
  if (session.currentTurnId !== turnId) {
    console.log(`[Pipeline] Turn ${turnId} cancelled before start`);
    return;
  }

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
    console.log(`[Pipeline] Turn ${turnId}: TTS connected`);
  } catch (err) {
    console.error(`[Pipeline] Turn ${turnId}: Failed to start TTS:`, err);
    session.tts = null;
    if (session.currentTurnId === turnId) {
      session.isProcessing = false;
    }
    return;
  }

  // Bail if cancelled while TTS was connecting
  if (session.currentTurnId !== turnId) {
    console.log(`[Pipeline] Turn ${turnId} cancelled during TTS init`);
    tts.stop();
    session.tts = null;
    return;
  }

  try {
    let sentenceBuffer = "";

    await session.llm.respond(
      text,
      (chunk) => {
        // Bail mid-stream if cancelled
        if (session.currentTurnId !== turnId) return;

        sentenceBuffer += chunk;
        // Send to TTS in sentence-sized chunks
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
        if (session.currentTurnId !== turnId) return;
        // Flush remaining text
        if (sentenceBuffer.trim()) {
          tts.sendText(sentenceBuffer);
        }
        tts.flush();
        session.nudgesDelivered.push(fullResponse);
        console.log(
          `[LLM] Turn ${turnId} response: "${fullResponse.slice(0, 80)}..."`
        );
      }
    );
  } catch (err) {
    console.error(`[Pipeline] Turn ${turnId}: LLM response failed:`, err);
    tts.stop();
    session.tts = null;
    if (session.currentTurnId === turnId) {
      session.isProcessing = false;
    }
    return;
  }

  // Bail if cancelled during LLM streaming
  if (session.currentTurnId !== turnId) {
    console.log(`[Pipeline] Turn ${turnId} cancelled during LLM`);
    tts.stop();
    session.tts = null;
    return;
  }

  // Wait for TTS to finish generating audio
  await ttsDonePromise;
  console.log(
    `[Pipeline] Turn ${turnId}: TTS done, ${audioChunks.length} chunks ` +
      `(${audioChunks.reduce((s, c) => s + c.length, 0)} bytes)`
  );

  // Bail if cancelled during TTS
  if (session.currentTurnId !== turnId) {
    console.log(`[Pipeline] Turn ${turnId} cancelled during TTS generation`);
    tts.stop();
    session.tts = null;
    return;
  }

  // Play the collected audio
  if (audioChunks.length > 0) {
    const fullAudio = Buffer.concat(audioChunks);
    try {
      console.log(
        `[Pipeline] Turn ${turnId}: Playing ${fullAudio.length} bytes of audio`
      );
      await playAudio(
        session.connection,
        fullAudio,
        session.guildId
      );
      console.log(`[Pipeline] Turn ${turnId}: Playback finished`);
    } catch (err) {
      console.error(`[Pipeline] Turn ${turnId}: Audio playback error:`, err);
    }
  } else {
    console.warn(`[Pipeline] Turn ${turnId}: No audio chunks received from TTS`);
  }

  tts.stop();
  session.tts = null;

  // Only clear isProcessing if this is still the current turn
  if (session.currentTurnId === turnId) {
    session.isProcessing = false;
    console.log(`[Pipeline] Turn ${turnId} complete`);
  } else {
    console.log(
      `[Pipeline] Turn ${turnId} finished but was superseded by ` +
        `turn ${session.currentTurnId}`
    );
  }
}

/**
 * Internal cleanup -- stops all pipeline components without
 * persisting to database. Used for unexpected disconnects.
 */
async function cleanupSession(
  discordUserId: string
): Promise<void> {
  const session = sessions.get(discordUserId);
  if (!session) return;

  session.stt.stop();
  if (session.tts) session.tts.stop();
  if (session.unsubscribeAudio) session.unsubscribeAudio();
  destroyPlayer(session.guildId);
  sessions.delete(discordUserId);
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

  // Generate a session summary from conversation history
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
    console.error(
      "[Session] Failed to save session to database:",
      err
    );
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
