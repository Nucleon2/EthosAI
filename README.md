# Ethereum Wallet Behavioral Intelligence & Market Analysis

> **Personalized market insights powered by your on-chain behavior**

An agentic market intelligence system that analyzes your Ethereum wallet's trading patterns, detects market events, and provides personalized, behavior-aware insights—without giving financial advice.

## 🎯 What This Does

Paste an Ethereum address. The system learns your trading behavior from on-chain patterns, then when the market moves it explains:

### Four Core Insights

1. **"What just happened"**  
   Price movements + news context + on-chain metrics + technical patterns

2. **"What you tend to do in these moments"**  
   Behavioral patterns derived from your historical wallet activity

3. **"A supportive nudge"**  
   Habit-aware coaching: breaks, limits, reflection prompts, journaling suggestions

4. **"Shareable content"**  
   Auto-generated posts for LinkedIn and X in your chosen persona voice

### Example Output

> *"ETH just moved sharply and gas spiked. In your history, after fast drops you usually increase trade frequency within 2 hours and swap into higher volatility tokens. Want a 5-minute cooldown and a quick recap of your last 3 similar days?"*

---

## 🧠 Key Differentiators

### 1. Behavioral Archetyping

The system auto-labels users based on wallet patterns:

- **Momentum Chaser** – follows price action aggressively
- **Rebound Buyer** – buys dips consistently
- **Late-Night Overtrader** – elevated activity during off-hours
- **Small-Cap Explorer** – high exposure to volatile tokens
- **Patient Holder** – low trade frequency, long hold times

Each archetype receives:
- Strengths analysis
- Common failure modes
- 2 personalized habit nudges

### 2. Time-Local Proactive Nudges

Soft intervention when patterns suggest impulsive behavior:

> *"You usually place 3+ swaps within 30 minutes after moves like this. Want a quick 60-second recap first?"*

Includes one-click actions:
- Generate market recap
- Open journal prompt
- Set cooldown timer

### 3. Social AI Personas

Three distinct voices for content generation:

- **Calm Analyst** – macro focus, low hype, structured
- **Data Nerd** – charts, on-chain metrics, numbers-driven
- **Trading Coach** – psychology, discipline, habit formation

Each persona generates:
- X posts (1–3 tweet threads)
- LinkedIn posts (professional, contextual)
- Educational hooks (no predictions, no signals)

---

## 🏗️ Architecture

### Core Modules

```
backend/src/
├── modules/
│   ├── analysis/         # Market + behavior reasoning agents
│   ├── wallet/          # On-chain data ingestion (Alchemy, Moralis, Etherscan)
│   ├── market/          # Price, volatility, event detection
│   ├── executor/        # Data retrieval coordination
│   └── testing/         # LLM evaluation & regression suites
├── core/
│   ├── insight-loop.ts  # Main agentic reasoning loop
│   ├── similarity-engine.ts  # Historical pattern matching
│   └── metrics.ts       # Scoring and evaluation
└── utils/               # Logging, timing, IDs, math
```

### Data Sources

#### A. Wallet Ingestion (Ethereum)
Via Alchemy / Moralis / Etherscan:
- Normal transactions, internal transactions
- ERC-20 transfers
- DEX swaps (decoded router logs)
- Token balances over time
- Gas paid, time-of-day activity

#### B. Market Context
Via CoinGecko or exchange APIs:
- ETH price + candlestick data
- 1h, 4h, 24h percentage moves
- Volume spikes
- Volatility spikes
- Gas price spikes (optional)
- Net exchange flows (optional)

#### C. Behavior Features (Proprietary)

Computed from wallet history:

| Feature | Description |
|---------|-------------|
| **Trade Frequency** | Trades per day/hour after market events |
| **Holding Time** | Average duration between buy and sell swaps |
| **Chase Behavior** | Position size increases after losses |
| **Revenge Trading** | Burst patterns of back-to-back swaps post-drawdown |
| **Risk Appetite** | Ratio of small-cap vs ETH/stablecoin trades |
| **Impulse Windows** | Time-of-day activity spikes |
| **Slippage Tolerance** | Gas paid and failed transaction frequency |

---

## 🔄 How It Works: The Insight Loop

### Step 1: Event Detection

Triggers activate when:
- ETH moves >X% in Y minutes
- Volatility spike vs 7-day baseline
- Gas price threshold breach
- Major narrative shift (optional news summary)

### Step 2: Historical Similarity Matching

Creates context vectors for each time period:
```typescript
{
  market_return_1h: number,
  market_return_24h: number,
  gas_level: number,
  volatility_regime: "low" | "medium" | "high",
  day_of_week: string,
  time_of_day: number
}
```

Finds nearest neighbors in user's trading history and summarizes:
- What user did next (trade frequency, token risk, position size)
- Success/failure outcomes

### Step 3: Structured LLM Explanation

**Input (JSON):**
```json
{
  "market_snapshot": { ... },
  "event_explanation_candidates": [ ... ],
  "user_behavior_summary": { ... },
  "similar_historical_days": [ ... ]
}
```

**Output (Structured):**
```json
{
  "what_happened": "Plain language market summary",
  "why_it_happened": ["Ranked factors with uncertainty"],
  "your_pattern": "Observed behavior (non-judgmental)",
  "nudge": "Supportive suggestion",
  "reflection_question": "Journal prompt",
  "social_posts": {
    "twitter": "Thread text",
    "linkedin": "Professional post"
  },
  "disclaimer": "Not financial advice"
}
```

---

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.3.8+
- Ethereum RPC access (Alchemy/Moralis/Etherscan API key)
- Market data API key (CoinGecko or exchange)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd Derive-Ai-hackathon-market-analysis/backend

# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env and add your API keys
```

### Environment Variables

```env
PORT=3000
NODE_ENV=development
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
MARKET_API_KEY=your_coingecko_or_exchange_key
```

### Run Development Server

```bash
# Start with hot reload
bun run dev

# Or run directly
bun src/index.ts
```

### Test the Server

```bash
# Health check
curl http://localhost:3000/api/ping

# Expected response:
# {"pong":true,"timestamp":"2026-02-06T15:02:24.223Z","status":"ok"}
```

### Run Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test src/modules/testing/suites/wallet-behavior.suite.ts

# Run with watch mode
bun test --watch
```

### Type Check

```bash
bun run type-check
```

---

## 📡 API Endpoints (Planned)

### Analysis
- `POST /api/analysis/trigger` – Trigger market + wallet analysis
- `GET /api/analysis/status/:id` – Get insight generation status
- `GET /api/analysis/insights/:walletAddress` – Retrieve latest insights

### Wallet
- `POST /api/wallet/ingest` – Ingest wallet transaction history
- `GET /api/wallet/summary/:address` – Get behavioral summary
- `GET /api/wallet/archetype/:address` – Get assigned archetype

### Market
- `GET /api/market/snapshot` – Current market state
- `GET /api/market/events` – Recent detected events

### Testing
- `POST /api/testing/run` – Execute evaluation suite
- `GET /api/testing/results` – View test scores and regressions

---

## 🧪 Agent Architecture

### Planner Agent (Market & Behavior Analyst)
- Combines market events with wallet behavior
- Selects historical analogs
- Produces structured explanation plans
- **Never** generates trading signals

### Executor Agent (Data Retrieval)
- Fetches on-chain data (transactions, swaps, balances)
- Fetches market data (price, volatility, volume)
- Pure data layer—no reasoning or interpretation

### Memory & Evaluation Agent
- Stores wallet behavior summaries
- Tracks historical events and responses
- Maintains behavioral archetype evolution
- Provides structured feedback to planner

### Testing Agents (LLM Evaluation)
- **Scenario Generator** – Creates controlled test cases
- **Plan Validator** – Enforces schema and safety rules
- **Judge Agent** – Scores explanations on clarity, safety, personalization
- **Regression Runner** – Detects output drift over time

---

## 🛡️ Safety & Compliance

### What This System Does NOT Do

- ❌ Provide buy/sell signals
- ❌ Recommend entry/exit prices
- ❌ Suggest portfolio allocations
- ❌ Predict future price movements
- ❌ Guarantee trading outcomes

### What This System DOES Do

- ✅ Explains market context in plain language
- ✅ Surfaces your historical behavior patterns
- ✅ Offers reflective questions and habit nudges
- ✅ Generates educational, brand-safe content
- ✅ Explicitly states uncertainty and limitations

All outputs include:
- Source citations (price feeds, APIs used)
- Uncertainty qualifiers ("likely", "possible", "unclear")
- Disclaimer: "Not financial advice"

---

## 🎨 Persona System

### Calm Analyst
**Tone:** Measured, macro-focused, structured  
**Use Case:** Professional audiences, long-form analysis  
**Example:** *"Broad risk-off rotation consistent with prior volatility regime shifts. Historical context suggests..."*

### Data Nerd
**Tone:** Analytical, numbers-driven, on-chain focused  
**Use Case:** Technical traders, crypto-native audiences  
**Example:** *"ETH down 8.3% | Gas: 42 gwei (+38%) | Exchange netflows: -23k ETH | 24h vol spike: 2.1σ above mean"*

### Trading Coach
**Tone:** Supportive, psychology-aware, habit-focused  
**Use Case:** Behavioral reflection, journaling prompts  
**Example:** *"Fast moves often trigger reactive trading. Before your next swap, try: 1) Write down your reason 2) Check if it's on your plan 3) Wait 5 minutes"*

---

## 📊 Behavioral Metrics Dashboard (Future)

Planned visualizations:
- Trade frequency over time (overlaid with market moves)
- Risk appetite trajectory (small-cap exposure trend)
- Impulse window heatmap (activity by hour/day)
- Archetype evolution timeline
- "Pattern match" similarity scores for current vs historical moments

---

## 🗺️ Roadmap

### Phase 1: Core Engine ✅
- [x] Project structure
- [x] Elysia server setup
- [ ] Wallet ingestion adapter (Alchemy/Moralis)
- [ ] Market event detection
- [ ] Behavior feature extraction
- [ ] Similarity matching engine

### Phase 2: Agentic Intelligence
- [ ] Planner agent implementation
- [ ] Memory agent with archetype tracking
- [ ] LLM-based explanation generation
- [ ] Structured output validation

### Phase 3: Coaching & Personas
- [ ] Behavioral archetype classifier
- [ ] Proactive nudge triggers
- [ ] Social persona content generator
- [ ] Reflection prompts library

### Phase 4: Testing & Safety
- [ ] Scenario generator
- [ ] Plan validator (schema + safety checks)
- [ ] Judge agent scoring system
- [ ] Regression test suite

### Phase 5: Production & Scale
- [ ] API authentication
- [ ] Rate limiting
- [ ] Caching layer
- [ ] Multi-wallet support
- [ ] Dashboard UI

---

## 🤝 Contributing

See [AGENTS.md](AGENTS.md) for detailed architectural guidelines and agent behavior rules.

### Key Principles

1. **Explainability over prediction** – Every insight must be traceable
2. **Behavioral focus over signals** – Awareness, not advice
3. **Personalization without financial advice** – Context, not commands
4. **Determinism and testability** – All agents must be evaluable
5. **Explicit feedback loops** – Learning through iteration

---

## 📄 License

MIT

---

## 🔗 Resources

- [ElysiaJS Documentation](https://elysiajs.com)
- [Bun Runtime](https://bun.sh)
- [Alchemy API](https://www.alchemy.com)
- [Moralis API](https://moralis.io)
- [CoinGecko API](https://www.coingecko.com/en/api)

---

**⚠️ Disclaimer:** This system is for educational and analytical purposes only. It does not provide financial advice, trading signals, or investment recommendations. Always do your own research and consult with qualified financial advisors before making trading decisions.
