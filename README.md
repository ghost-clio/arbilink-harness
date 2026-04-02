# ArbiLink Harness 🧪

Test harness and multi-agent demo for [ArbiLink](https://github.com/ghost-clio/arbilink) — agent-to-agent commerce on Arbitrum.

## What's Inside

### 🤖 Demo — 3 AI Agents in a Circular Economy

Three autonomous agents register services, discover each other, and pay with USDC on Arbitrum Sepolia via the x402 payment protocol:

| Agent | Capability | Price |
|-------|-----------|-------|
| **Alpha** | Code Review | $0.01 USDC |
| **Beta** | Summarization | $0.005 USDC |
| **Gamma** | Data Analysis | $0.02 USDC |

**Flow:**
1. All agents register their services on the ArbiLink gateway
2. Each agent sets spending policies (per-tx + daily limits)
3. Alpha → Beta (summarization), Beta → Gamma (analysis), Gamma → Alpha (code review)
4. Each request follows x402: `402 Payment Required` → pay USDC → re-request with proof → service delivered
5. Reputation builds with each successful transaction

### ✅ Gateway Tests — 15 Passing

Full integration test suite covering:
- Health check, service registration, capability discovery
- x402 payment flow (402 → pay → 200)
- Spending policy enforcement + violation rejection
- Reputation tracking, transaction log
- Edge cases (404, missing params, round-trip)

## Quick Start

```bash
# Clone both repos
git clone https://github.com/ghost-clio/arbilink
git clone https://github.com/ghost-clio/arbilink-harness

# Install
cd arbilink-harness
npm install

# Run tests (15 passing)
npm test

# Run the 3-agent demo
npm run demo

# Record demo output
npm run demo:record
```

## Requirements

- Node.js 18+
- ArbiLink gateway (linked via `file:../arbilink`)

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Agent Alpha │     │ Agent Beta  │     │ Agent Gamma │
│ Code Review │     │ Summarize   │     │ Analysis    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────┬───────┴───────────┬───────┘
                   │                   │
           ┌───────▼───────────────────▼───────┐
           │       ArbiLink Gateway            │
           │  x402 · ERC-8004 · Spending Policies │
           └───────────────┬───────────────────┘
                           │
                   ┌───────▼───────┐
                   │   Arbitrum    │
                   │   Sepolia     │
                   │   (USDC)      │
                   └───────────────┘
```

## License

MIT
