AGENTS.md
Agentic Market & Behavior Intelligence Framework (Ethereum)

This document defines rules, expectations, and architectural guidelines for all AI agents
and evaluation agents working on the Ethereum Wallet–Personalized Intelligent Trading Analyst.

The system analyzes Ethereum wallet activity, market context, and behavioral patterns to
produce explainable, personalized market insights and habit-aware coaching outputs.
It explicitly does NOT provide trading signals or financial advice.

---

## Environment

Language: TypeScript (ES2021 target, ES2022 modules)
Runtime: Bun
Backend Framework: ElysiaJS
Blockchain: Ethereum (EVM-compatible tooling)
Data Sources: On-chain APIs (Alchemy, Moralis, Etherscan, etc), Market APIs (CoinGecko, exchanges)
Target Platform: Web (API-first)

All code must be compatible with this stack.

---

## Build, Run, and Test Commands

# Development server (watch mode)
bun run dev

# Run main entry
bun run src/index.ts

# Install dependencies
bun install

# Type check
bun tsc --noEmit

# Run all tests
bun test

# Run a single test file
bun test src/path/to/test.test.ts

# Run tests matching a pattern
bun test --grep "pattern"

# Watch mode for tests
bun test --watch

---

## Project Philosophy

This project is NOT a trading bot.

It is an agentic market intelligence and behavioral awareness system where:

- AI agents explain market events
- Wallet history is used to infer behavioral patterns
- Outputs focus on awareness, reflection, and habit coaching
- Learning occurs through iteration and evaluation, not model training

The system prioritizes:

- Explainability over prediction
- Behavioral insight over signals
- Personalization without financial advice
- Determinism and testability
- Explicit feedback loops

At no point may the system output:
- Buy or sell instructions
- Entry, exit, stop, or target prices
- Portfolio allocation advice

---

## Agent Roles and Responsibilities

### Planner Agent (Market & Behavior Analyst)

Responsibilities:
- Receive detected market events
- Combine market context with wallet behavior summaries
- Select relevant historical analogs
- Produce structured explanation plans

Planner agents must:
- Operate at an abstract and symbolic level
- Never access blockchain APIs directly
- Never generate trading signals
- Always explain why a pattern was inferred
- Produce serializable, testable plans

---

### Executor Agent (Data Retrieval Layer)

Responsibilities:
- Fetch on-chain data (transactions, swaps, balances)
- Fetch market data (price, volatility, volume)
- Normalize and return raw observations

Executor agents must:
- Never perform reasoning or interpretation
- Never summarize or infer behavior
- Only return validated, typed data
- Never guess missing data

They are data pipes, not analysts.

---

### Memory and Evaluation Agent

Responsibilities:
- Store wallet behavior summaries
- Track historical events and responses
- Maintain behavioral archetype evolution
- Provide structured feedback to the planner

This agent enables longitudinal learning across sessions.

---

## Testing and Evaluation Agents (LLM Evaluation Layer)

Testing agents exist to validate explainability, safety, and behavioral accuracy.

### Scenario Generator Agent
- Produces controlled market scenarios
- Defines wallet profiles and market conditions
- Enables repeatable experiments

### Plan Validator Agent
- Deterministically validates planner output
- Enforces schema, safety, and compliance rules
- Rejects outputs containing signals or advice
- Does NOT use an LLM

### Judge Agent
- Scores explanations on clarity, personalization, tone, and safety
- Evaluates whether behavior claims are justified
- Produces structured improvement feedback

### Regression Runner Agent
- Replays historical scenarios
- Detects drift in explanations or persona outputs
- Compares scores and metrics across runs

Testing agents must never access live wallet data.

---

## Agentic Insight Loop

All analyses must follow this loop:

1. Market event detection
2. Wallet behavior retrieval
3. Historical similarity matching
4. Explanation planning
5. Plan validation
6. Insight generation
7. Evaluation and scoring
8. Iteration and refinement

Skipping steps breaks explainability guarantees.

---

## Architecture Principles

Follow strict separation of concerns:

agents
- Reasoning, planning, memory, evaluation

market
- Price, volatility, and event detection

wallet
- On-chain ingestion and normalization

core
- Insight loops, similarity engines, metrics

server
- Elysia app, routes, orchestration

Blockchain logic must never be coupled with agent reasoning.

Prefer composable modules over large files.

---

## Insight Abstraction Rules

All outputs must be structured insights, not advice.

type Insight =
  | { type: "market-event"; summary: string }
  | { type: "behavior-pattern"; description: string; confidence: number }
  | { type: "historical-analog"; referencePeriod: string }
  | { type: "nudge"; suggestion: string }
  | { type: "reflection"; question: string };

Rules:
- Planner agents produce insights
- Validator agents approve insights
- Executors never generate insights
- All insights must be explainable and logged

---

## Code Style

Functions and variables: camelCase
Files: kebab-case
Classes, types, interfaces: PascalCase
Constants: UPPER_SNAKE_CASE

Indentation: 2 spaces
Quotes: Double quotes
Semicolons: Required
Line length: 80 to 100 characters

Write comments explaining reasoning, not mechanics.

---

## Code Conventions

- Prefer pure functions
- Explicitly type all inputs and outputs
- Keep functions single-purpose
- Use async and await consistently

Example:

function calculateTradeFrequency(
  trades: number,
  hours: number
): number {
  if (hours <= 0) return 0;
  return trades / hours;
}

---

## Type Safety Rules

Never use any

Prefer unknown when uncertain

Narrow using guards or schemas

Zod or TypeBox is mandatory at all system boundaries.

---

## Elysia Usage Guidelines

Elysia acts as the control plane.

Use it to:
- Trigger analysis
- Query insight status
- Inspect memory summaries
- Run evaluation suites

Keep handlers thin and validated.

---

## Imports

Use ES module syntax only

External imports first, internal imports second

Prefer named imports

---

## Agent Behavior Rules

Agents must never:
- Output financial advice or signals
- Modify files outside the project
- Execute or suggest git commands
- Generate credentials or secrets
- Hallucinate on-chain data

Agents should:
- Log assumptions
- Express uncertainty explicitly
- Favor clarity over confidence
- Ask for clarification when context is missing

---

## Error Handling

Always handle Promise rejections
Prefer typed errors
Use early returns

---

## Documentation Requirements

- Public functions require doc comments
- Behavioral assumptions must be logged
- Archetype changes must be recorded
- Documentation must explain why decisions were made

---

## Recommended Project Structure

backend/
  src/
    modules/

      analysis/
        index.ts            # Elysia routes for triggering analysis
        service.ts          # Orchestrates market + behavior analysis
        model.ts            # Insight, Event, Archetype types

        agents/
          planner.agent.ts  # Market + behavior reasoning
          memory.agent.ts   # Long-term wallet behavior memory

      wallet/
        index.ts            # Wallet-related routes
        service.ts          # Wallet ingestion orchestration
        model.ts            # Transaction, Swap, Balance types

        adapters/
          alchemy.adapter.ts
          moralis.adapter.ts
          etherscan.adapter.ts

      market/
        index.ts            # Market routes
        service.ts          # Market snapshot + event detection
        model.ts            # Price, Volatility, Event types

      executor/
        index.ts            # Internal execution routes (optional)
        service.ts          # Data fetch coordination

        agents/
          executor.agent.ts # Pure data retrieval agent

      testing/
        index.ts            # Test control routes
        service.ts          # Test orchestration
        model.ts            # Scenario, JudgeScore, TestResult types

        agents/
          scenario-generator.agent.ts
          plan-validator.agent.ts
          judge.agent.ts
          regression-runner.agent.ts

        suites/
          eth-volatility.suite.ts
          wallet-behavior.suite.ts

        fixtures/
          scenarios.json

        goldens/
          expected-insight.json

    core/
      insight-loop.ts       # Main agentic loop
      similarity-engine.ts  # Historical pattern matching
      metrics.ts            # Scoring and evaluation metrics
      types.ts              # Shared core types

    utils/
      logging/
        index.ts
      timing/
        index.ts
      ids/
        index.ts
      math/
        index.ts

    app.ts                  # Elysia app bootstrap

  .env
  package.json
  tsconfig.json
AGENTS.md


---

## Environment Variables

PORT=3000
NODE_ENV=development
ETH_RPC_URL=
MARKET_API_KEY=

---

## Important Notes

Bun is the only supported runtime

All blockchain access must go through adapters

Testing agents are first-class citizens

The primary goal is explainable market intelligence

Trading execution is explicitly out of scope

Access ./backend/.agents/skills/elysiajs for Elysia skill references