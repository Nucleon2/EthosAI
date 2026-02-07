# Plan: Fix Discord Voice AI Bot

## Goal
Get the existing Discord voice coaching bot working end-to-end. The pipeline (STT -> LLM -> TTS -> Discord playback) is already coded but never tested. This plan fixes all identified bugs and missing config.

## Status: ALL SUBTASKS COMPLETE

## Subtasks

### 1. ✅ Update `.env.example` with all required env vars
**Files:** `backend/.env.example`
- Add `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_AUTO_START`
- Add `DEEPGRAM_API_KEY`
- Add `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`
- Add `COINGECKO_BASE_URL`, `COINGECKO_API_KEY_TYPE`
- Remove stale `MARKET_API_KEY` and `ETH_RPC_URL` placeholders
- **Commit:** `chore: add discord/deepgram/elevenlabs env vars to .env.example`

### 2. ✅ Add missing voice dependencies
**Files:** `backend/package.json`
- Install `libsodium-wrappers` (required by @discordjs/voice for encryption)
- Install `@types/libsodium-wrappers` for TypeScript
- Verify `@discordjs/opus` works with Bun, or add `opusscript` as fallback
- Run `bun install` to validate
- **Commit:** `chore: add voice encryption and opus dependencies`

### 3. ✅ Fix PCM resampling (24kHz mono -> 48kHz stereo)
**Files:** `backend/src/modules/discord/voice/audio-player.ts`
- ElevenLabs outputs PCM at 24kHz, 16-bit, mono
- Discord expects 48kHz stereo (for its Opus encoder)
- Add a `resamplePcm` function that:
  - Upsamples 24kHz -> 48kHz (2x interpolation)
  - Duplicates mono channel to stereo
- Apply before creating the AudioResource
- **Commit:** `fix: resample 24kHz mono PCM to 48kHz stereo for discord playback`

### 4. ✅ Fix audio player resource type
**Files:** `backend/src/modules/discord/voice/audio-player.ts`
- Current code: `createAudioResource(stream, { inputType: StreamType.Raw })`
- Discord.js `StreamType.Raw` expects signed 16-bit LE, 48kHz, stereo
- After resampling (subtask 3), this should work correctly
- Add `inlineVolume: false` to avoid unnecessary processing
- **Commit:** Combined with subtask 3 commit

### 5. ✅ Add error handling & reconnection
**Files:** 
- `backend/src/modules/discord/session-manager.ts`
- `backend/src/modules/discord/pipeline/stt.service.ts`
- `backend/src/modules/discord/pipeline/tts.service.ts`

Changes:
- **STT:** Add reconnection on WebSocket close (with backoff)
- **TTS:** Add timeout if ElevenLabs doesn't respond, call `onDone()` after timeout
- **Session manager:** Add try-catch around `stt.sendAudio()` to prevent crash if STT disconnects
- **Session manager:** Handle case where `processLlmResponse` throws - reset `isProcessing` flag
- Add graceful cleanup if voice connection drops mid-session
- **Commit:** `fix: add error recovery for voice pipeline failures`

### 6. ✅ Fix slash command deployment for Bun
**Files:** `backend/src/modules/discord/commands/deploy.ts`
- Script loads env vars via `process.env` but Bun needs `.env` to be explicitly loaded or the script run from the backend dir
- Add a note/check at top of script to ensure env vars are present
- Verify the script works: `bun src/modules/discord/commands/deploy.ts`
- **Commit:** `fix: ensure slash command deployment loads env correctly`

### 7. ✅ Type-check and fix compilation errors
**Files:** Various
- Run `bun tsc --noEmit` from `backend/`
- Fix any type errors found
- Ensure `noUnusedLocals` and `noUnusedParameters` don't flag pipeline code
- **Commit:** `fix: resolve typescript compilation errors in discord module`

## Testing Strategy
After all fixes:
1. Run `bun tsc --noEmit` - must pass
2. Deploy slash commands: `bun src/modules/discord/commands/deploy.ts`
3. Start the server: `bun run dev`
4. Start the bot via API: `curl -X POST http://localhost:3000/api/discord/start`
5. In Discord:
   - Run `/link <wallet_address>` to link wallet
   - Join a voice channel
   - Run `/coach` to start a session
   - Speak and verify the bot responds
   - Run `/stop` to end the session

## Dependency Graph
```
Subtask 1 (env) ----+
                     |
Subtask 2 (deps) ---+--> Subtask 7 (type-check) --> Subtask 6 (deploy) --> Test
                     |
Subtask 3+4 (audio) +
                     |
Subtask 5 (errors) -+
```
Subtasks 1-5 are independent and can be done in any order. Subtask 7 should be last before testing.
