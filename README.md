# ArbiLink Harness 🧪

> Test suite and demo agents for [ArbiLink](https://github.com/ghost-clio/arbilink) — agent commerce on Arbitrum.

## What's inside

| Component | Description |
|-----------|-------------|
| **Unit Tests** | 15 vitest tests covering all gateway endpoints |
| **Battle Test** | 20 tests against live Arbitrum Sepolia (contract + gateway) |
| **3-Agent Demo** | Alpha/Beta/Gamma circular economy with x402 payments |

## Quick Start

```bash
git clone https://github.com/ghost-clio/arbilink-harness.git
cd arbilink-harness && npm install

# Unit tests (no gateway needed)
npm test              # 15 passing

# Battle test (requires gateway + Sepolia)
# Terminal 1: cd ../arbilink && PORT=3403 npm run dev
# Terminal 2:
GATEWAY_URL=http://localhost:3403 npm run battle   # 20 passing

# Demo
GATEWAY_URL=http://localhost:3403 npm run demo
```

## Battle Test Coverage

Tests run against live Arbitrum Sepolia contracts:

| Test | What it verifies |
|------|-----------------|
| AgentEscrow deployment | Bytecode exists, USDC address correct, nextEscrowId readable |
| ERC-8004 registration | Registry accessible (AgentIdentity/AGENT), deployer owns NFT |
| Gateway health | 12 features reported, uptime tracking |
| Service registration | 3 agents register with pricing |
| Service discovery | Find services by capability |
| x402 payment flow | 402 gate → payment proof → 200 access |
| Spending policies | Per-tx limits enforced (rejects over-limit) |
| Reputation tracking | Transaction count + success rate |
| Transaction log | Entries populated after payments |
| CSV export | Correct header + data rows |
| Identity check | On-chain NFT ownership verification |
| Stress: registration | 20 services in 18ms (0.9ms/req) |
| Stress: discovery | 20 services across 5 capabilities in 2ms |

## Demo: Circular Economy

Three agents trade services in a loop:

```
Alpha (Code Review, $0.01) → pays Beta
Beta (Summarization, $0.005) → pays Gamma  
Gamma (Data Analysis, $0.02) → pays Alpha
```

Each step: discover → 402 → pay → access → reputation update.

```bash
npm run demo
# 🚀 ArbiLink Demo — Agent Commerce on Arbitrum
# ═══════════════════════════════════════════════
# 📝 Step 1: Registering agents...
# 🔒 Step 2: Setting spending policies...
# 🔍 Step 3: Service discovery...
# 💰 Step 4: Agent-to-agent service requests...
# ⭐ Step 5: Agent reputation...
# 📊 Step 6: Spending summaries...
# 📜 Step 7: Transaction log...
# 💚 Step 8: Gateway health...
# 🎉 Demo complete!
```

## On-Chain Addresses

| Contract | Address | Network |
|----------|---------|---------|
| AgentEscrow | `0x26469E9C1a73eaC710bE3FC49966878a0e8ab0f7` | Arb Sepolia |
| ERC-8004 Registry | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | Arb Sepolia |
| USDC | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` | Arb Sepolia |

## License

MIT
