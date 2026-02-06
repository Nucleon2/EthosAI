# Wallet API Documentation

## Overview

The Wallet API provides comprehensive endpoints for analyzing Ethereum wallet addresses using the Etherscan API. All data is validated with Zod schemas and properly typed.

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Etherscan API key to `.env`:
   ```
   ETHERSCAN_API_KEY=your_api_key_here
   ```
   
   Get a free API key at: https://etherscan.io/apis

3. Add your DeepSeek API key for behavior analysis to `.env`:
   ```
   DEEPSEEK_API_KEY=your_api_key_here
   DEEPSEEK_API_URL=https://api.deepseek.com/v1/chat/completions
   DEEPSEEK_MODEL=deepseek-chat
   ```
   
   Get an API key at: https://platform.deepseek.com

4. Install dependencies and run:
   ```bash
   bun install
   bun run dev
   ```

## API Endpoints

### 1. Get Complete Wallet Information with Behavior Analysis

**Endpoint:** `GET /api/address/:walletAddress`

Retrieves comprehensive information about an Ethereum wallet including:
- ETH balance
- Normal transactions
- Internal transactions (contract executions)
- ERC20 token transfers
- ERC721 NFT transfers
- **AI-powered behavioral analysis and insights**

**Parameters:**
- `walletAddress` (path, required): Ethereum address (0x...)
- `limit` (query, optional): Max transactions per type (default: 100, max: 10000)

**Example:**
```bash
curl http://localhost:3000/api/address/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb?limit=50
```

**Response:**
```json
{
  "success": true,
  "behavior": {
    "summary": "Active trader with moderate DeFi engagement...",
    "activityLevel": {
      "level": "active",
      "rationale": "Consistent transaction patterns over the past 30 days"
    },
    "dominantPatterns": [
      {
        "label": "DeFi Interaction",
        "description": "Regular interactions with decentralized exchanges",
        "confidence": 0.85
      },
      {
        "label": "Token Accumulation",
        "description": "Pattern of acquiring and holding ERC20 tokens",
        "confidence": 0.72
      }
    ],
    "tokenHabits": [
      {
        "label": "Stablecoin Usage",
        "description": "Frequent USDT and USDC transfers indicating hedging behavior",
        "confidence": 0.90
      }
    ],
    "riskSignals": [
      {
        "label": "High-Frequency Trading",
        "description": "Multiple transactions within short timeframes",
        "confidence": 0.65
      }
    ],
    "reflectionQuestions": [
      "What triggers your decision to engage with DeFi protocols?",
      "How do you manage gas fees with high-frequency transactions?"
    ]
  },
  "meta": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "transactionLimit": 50,
    "retrievedAt": "2026-02-06T...",
    "behaviorAnalyzedAt": "2026-02-06T...",
    "behaviorModel": "deepseek-chat",
    "behaviorError": null
  }
}
```

### 2. Get Token-Specific Market + Behavioral Analysis

**Endpoint:** `GET /api/address/:walletAddress/token/:tokenAddress`

Retrieves token-specific wallet behavior plus token market analysis using CoinGecko:
- Token market snapshot (price, volume, market cap)
- Technical pattern descriptions in plain language
- News and events (CoinGecko status updates)
- Sentiment proxy from CoinGecko sources
- **Transfer size metrics** (average, median, large transfer threshold and count in base units)
- **Price timing analysis** (transfers near significant price movements with 6-hour window analysis)
- Personalized behavioral insights for this token with emotional signals, nudges, and habit reflections

**Parameters:**
- `walletAddress` (path, required): Ethereum address (0x...)
- `tokenAddress` (path, required): ERC20 contract address (0x...)
- `limit` (query, optional): Max token transfers to analyze (default: 100, max: 10000)
- `days` (query, optional): Market chart window (default: 30, max: 365)

**Example:**
```bash
curl "http://localhost:3000/api/address/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb/token/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48?limit=200&days=30"
```

**Response:**
```json
{
  "success": true,
  "tokenAnalysis": {
    "marketBrief": "USDC maintained price stability near $1.00 with $5.5B daily volume. Recent market movements show typical stablecoin behavior with minimal volatility.",
    "technicalPatterns": [
      {
        "label": "Price Stability",
        "significance": "USDC held within 0.1% of peg throughout the 30-day period, demonstrating strong reserve backing and market confidence.",
        "confidence": 0.95
      }
    ],
    "newsSummary": [
      {
        "title": "Circle Reserve Update",
        "summary": "Monthly attestation confirms full backing of USDC reserves",
        "category": "update",
        "source": "coingecko",
        "url": "https://www.coingecko.com/en/coins/usd-coin",
        "date": "2026-02-05"
      }
    ],
    "sentiment": {
      "overall": "neutral",
      "sources": [
        {
          "source": "coingecko-sentiment",
          "signal": "neutral",
          "detail": "Community votes up 52% / down 48%",
          "score": 0.04
        },
        {
          "source": "market-stability",
          "signal": "positive",
          "detail": "Consistent peg maintenance indicates strong confidence",
          "score": 0.85
        }
      ]
    },
    "transferSizeMetrics": {
      "averageTransferSize": 15000000000,
      "medianTransferSize": 5000000000,
      "largeTransferThreshold": 50000000000,
      "largeTransferCount": 12,
      "transferSizeUnits": "base",
      "averageAbsWindowMoveForLarge": 0.08,
      "windowHours": 6,
      "largeTransfersWithPriceData": 12,
      "largeTransfersNearMove": 2,
      "percentLargeTransfersNearMove": 16.67,
      "dominantWindowDirectionForLarge": "flat"
    },
    "behavioralInsights": {
      "emotionalSignals": [
        {
          "label": "Systematic Stability Preference",
          "description": "Your USDC transfers show a strong pattern of hedging into stability during volatile periods. 12 large transfers (>50M base units) occurred during the analysis window, with most happening during flat market conditions.",
          "confidence": 0.78
        }
      ],
      "nudges": [
        "Your large USDC transfers typically happen in flat markets. Consider whether you're maximizing opportunities during volatility.",
        "Only 16.67% of your large transfers occurred near significant price movements (>5% in 6-hour windows). This suggests a conservative, stability-focused approach."
      ],
      "winningPatterns": [
        "Consistent use of stablecoins demonstrates disciplined risk management"
      ],
      "losingPatterns": [],
      "reflectionPrompts": [
        "What triggers your decision to move into USDC?",
        "Are you using USDC primarily for stability or as a trading base?"
      ],
      "habitCelebrations": [
        "You've maintained regular USDC activity over 200 transfers—this shows consistent engagement with DeFi"
      ],
      "dataGaps": []
    }
  },
  "meta": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "tokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "balance": "1250.5",
    "transactionLimit": 200,
    "marketDays": 30,
    "retrievedAt": "2026-02-06T12:34:56.789Z",
    "analysisModel": "deepseek-chat",
    "analysisError": null
  }
}
```

**Key Response Fields:**

- **transferSizeMetrics**: Statistical analysis of transfer amounts in base units
  - `averageTransferSize`: Mean transfer amount
  - `medianTransferSize`: Median transfer amount (less affected by outliers)
  - `largeTransferThreshold`: 80th percentile threshold defining "large" transfers
  - `largeTransferCount`: Number of transfers exceeding the large threshold
  - `averageAbsWindowMoveForLarge`: Average absolute price change (%) within 6-hour windows for large transfers
  - `windowHours`: Size of the price analysis window (6 hours)
  - `largeTransfersWithPriceData`: Number of large transfers with corresponding price data
  - `largeTransfersNearMove`: Large transfers occurring near significant price moves (>5%)
  - `percentLargeTransfersNearMove`: Percentage of large transfers near significant moves
  - `dominantWindowDirectionForLarge`: Predominant price direction during large transfers (up/down/mixed/flat/unknown)

- **behavioralInsights**: Personalized analysis derived from wallet behavior
  - `emotionalSignals`: Detected emotional or impulsive patterns with confidence scores
  - `nudges`: Gentle coaching suggestions based on observed behavior
  - `winningPatterns`: Positive behavioral patterns identified
  - `losingPatterns`: Potentially risky patterns identified
  - `reflectionPrompts`: Questions to encourage self-awareness
  - `habitCelebrations`: Positive reinforcement for healthy habits
  - `dataGaps`: List of missing data that limits analysis depth
