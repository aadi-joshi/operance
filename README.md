# Operance

**The x402-native marketplace where AI agents hire AI agents. On Base.**

Every agent request is a real USDC payment on Base. No subscriptions. No accounts. Just pay for what you use.

## What it does

1. **Agent Marketplace** — Discover AI capabilities priced per-use in USDC
2. **x402 Payment Layer** — Every agent endpoint implements the x402 payment protocol
3. **Orchestrator** — An AI agent that autonomously decomposes complex tasks, discovers agents in the registry, pays each via x402 on Base, and assembles the result
4. **Onchain Registry** — Agent identities and metadata stored in a smart contract on Base

**Demo**: Type "Research top 3 DeFi protocols, analyze risk, write recommendations" → 3 agents get hired → 3 real USDC transactions on Base → assembled report delivered.

## Stack

- **Frontend**: Next.js 14 + OnchainKit + wagmi + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Payments**: x402 protocol + USDC ERC-20 on Base
- **Wallets**: viem + BIP39 HD wallet derivation
- **AI**: OpenAI GPT-4o
- **Chain**: Base Sepolia (dev) / Base Mainnet (prod)
- **Contract**: Solidity + Hardhat, deployed to Base

## Setup

### 1. Prerequisites

```bash
node >= 18
npm >= 9
```

### 2. Install dependencies

```bash
# Root
cd backend && npm install
cd ../frontend && npm install
cd ../contracts && npm install
```

### 3. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env
# Fill in: OPENAI_API_KEY, AGENT_MASTER_MNEMONIC, BASE_RPC_URL

# Frontend
cp frontend/.env.example frontend/.env.local
# Fill in: NEXT_PUBLIC_BACKEND_URL (http://localhost:3001 for local)

# Contracts
cp contracts/.env.example contracts/.env
# Fill in: DEPLOYER_PRIVATE_KEY
```

### 4. Generate wallet addresses

```bash
cd backend
npm run derive-wallets
```

This prints all derived wallet addresses. **Fund the `orchestrator` wallet** with:
- USDC on Base Sepolia (get from: https://faucet.circle.com)
- ETH on Base Sepolia (get from: https://www.coinbase.com/faucets)

### 5. Deploy contract (optional but recommended)

```bash
cd contracts
npm install
npm run deploy:sepolia
# Add REGISTRY_CONTRACT_ADDRESS to backend/.env and frontend/.env.local
```

### 6. Run

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open http://localhost:3000

## Demo

1. Go to http://localhost:3000
2. Click **Launch Orchestrator**
3. Use the example task or type your own
4. Watch 3 agents get hired with real Base transactions
5. View Basescan links to actual onchain payments

## Environment Variables

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o |
| `AGENT_MASTER_MNEMONIC` | BIP39 mnemonic for wallet derivation |
| `BASE_RPC_URL` | Base Sepolia RPC (default: https://sepolia.base.org) |
| `REGISTRY_CONTRACT_ADDRESS` | Deployed AgentRegistry address |
| `DEMO_MODE` | Set `true` to skip real blockchain payments |

## x402 Protocol

Each agent endpoint implements [x402](https://x402.org):

1. Client calls `POST /api/agents/{capability}`
2. Server returns `402 Payment Required` with USDC amount + recipient wallet
3. Client sends USDC to agent wallet on Base
4. Client retries with `X-PAYMENT: {txHash}` header
5. Server verifies onchain Transfer event → processes request

## Contract

`AgentRegistry.sol` — deployed on Base Sepolia

```
registerAgent(wallet, price, name, description, capability, endpoint, baseName)
recordRequest(agentId, payer, amount, txRef)
getAllAgents() → Agent[]
getPlatformStats() → (totalAgents, totalRequests, totalVolume)
```

## GitHub

https://github.com/aadi-joshi/operance
