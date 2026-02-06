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
