# EthosAI

Agentic market intelligence and behavioral awareness for Ethereum wallets.

Ethos analyzes on-chain wallet activity, correlates it with market data, and produces explainable behavioral insights using AI. It includes a Discord voice coaching bot that delivers real-time, personalized market awareness through conversation.

**This is not a trading bot.** It never outputs buy/sell signals, price targets, or portfolio advice.

---

## What It Does

- **Wallet Behavioral Analysis** -- Fetches transaction history from Etherscan, identifies patterns (trading frequency, token habits, risk signals), and generates a structured behavioral profile via DeepSeek LLM.
- **Token Market Analysis** -- Pulls market data from CoinGecko, correlates your transfer activity with price movements, and produces personalized insights about your behavior around a specific token.
- **Discord Voice Coaching** -- A real-time voice bot that joins your Discord channel, listens via Deepgram STT, reasons with DeepSeek LLM (loaded with your wallet context), and responds through ElevenLabs TTS. Supports natural interruption.
- **Web Dashboard** -- Shows your behavioral insight, analysis history, and coaching session logs.

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | ElysiaJS, Bun, Prisma 7, PostgreSQL |
| Frontend | React 19, Vite, Tailwind CSS v4, ShadCN, Zustand |
| AI | DeepSeek LLM, Deepgram STT, ElevenLabs TTS |
| Blockchain | Etherscan API, CoinGecko API |
| Voice | Discord.js, @discordjs/voice, Opus |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/ping` | Health check |
| `GET` | `/api/address/:wallet` | Run wallet behavioral analysis |
| `GET` | `/api/address/:wallet/history` | Paginated analysis history |
| `GET` | `/api/address/:wallet/token/:token` | Run token analysis |
| `GET` | `/api/address/:wallet/token/:token/history` | Paginated token analysis history |
| `POST` | `/api/discord/start` | Start Discord bot |
| `POST` | `/api/discord/stop` | Stop Discord bot |
| `GET` | `/api/discord/status` | Bot online/offline status |
| `GET` | `/api/discord/sessions/:wallet` | Coaching session history |
| `GET` | `/api/discord/sessions/:wallet/latest` | Latest coaching session |
| `GET` | `/api/discord/user/:discordUserId` | Lookup linked wallet for Discord user |

---

## Setup

### Prerequisites

- [Bun](https://bun.sh) runtime
- PostgreSQL database
- API keys: Etherscan, DeepSeek

### Environment Variables

Create `backend/.env`:

```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/...
ETHERSCAN_API_KEY=
DEEPSEEK_API_KEY=

# Discord voice coaching (optional)
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=

# Optional
PORT=3000
COINGECKO_API_KEY=
ELEVENLABS_VOICE_ID=
DISCORD_AUTO_START=false
```

### Backend

```bash
cd backend
bun install
bunx prisma migrate dev --name init
bun run dev
```

Server starts on `http://localhost:3000`.

### Frontend

```bash
cd client
bun install
bun run dev
```

Opens on `http://localhost:5173`.

### Discord Bot (Optional)

1. Create an application at [discord.com/developers](https://discord.com/developers/applications)
2. Enable bot with **Message Content**, **Server Members**, and **Presence** intents
3. Invite the bot with `bot` + `applications.commands` scopes and permissions: Send Messages, Connect, Speak, Use Slash Commands
4. Set `DISCORD_BOT_TOKEN` and `DISCORD_CLIENT_ID` in `.env`
5. Deploy slash commands: `bun src/modules/discord/commands/deploy.ts`
6. Start via API (`POST /api/discord/start`) or set `DISCORD_AUTO_START=true`

**Slash commands:** `/link <wallet>`, `/coach`, `/stop`

---

## Scripts

| Command | Directory | Description |
|---------|-----------|-------------|
| `bun run dev` | `backend/` | Start backend in watch mode |
| `bun run dev` | `client/` | Start frontend dev server |
| `bun run build` | `client/` | Type-check and production build |
| `bun test` | `backend/` | Run tests |
| `bun tsc --noEmit` | `backend/` | Type-check backend |

---

## Safety

This system does **not** provide financial advice. All outputs are behavioral insights, reflection questions, and pattern observations. LLM system prompts enforce this compliance boundary. Every analysis includes uncertainty qualifiers and disclaimers.

---

## License

MIT
