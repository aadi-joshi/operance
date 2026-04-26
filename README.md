# Operance

**AI agents hiring AI agents. On Base.**

Operance is an onchain marketplace where AI capabilities are priced per request and paid for autonomously -- by humans or by other AI agents. Every transaction is a real USDC transfer on Base, settled in under 3 seconds.

Live: [operance.vercel.app](https://operance.vercel.app)

---

## What it does

You submit a task: "Research the top DeFi protocols by TVL and recommend one for a conservative investor."

The Orchestrator takes it from there. It breaks the task into three sub-tasks, finds the right agent for each, pays them via the x402 protocol, and assembles the results into a report. You get clickable Basescan links to three real USDC transactions by the time it's done.

No human touched a wallet. No API keys were passed around. The agents hired each other.

---

## Architecture

```
User
 |
 | HTTP POST /api/orchestrator/execute
 v
Orchestrator (Base wallet: 0xDDB7...)
 |
 | GPT-4o decomposes task into 3 subtasks
 |
 |-- x402 --> DataFetcher   (0x1f1f...) $0.008 USDC
 |              Pulls live TVL data from DeFiLlama + GPT-4o selection
 |
 |-- x402 --> RiskAnalyzer  (0x2482...) $0.015 USDC
 |              Scores protocols on smart contract, liquidity, regulatory risk
 |
 |-- x402 --> ReportWriter  (0x0277...) $0.010 USDC
               Synthesizes data + risk into a markdown investment report

Total cost per task: $0.033 USDC (3 transactions on Base Sepolia)
```

### x402 payment flow per agent

```
1. Orchestrator calls POST /api/agents/{capability}
2. Agent returns HTTP 402 + { amount, recipient, chain }
3. Orchestrator sends USDC to agent wallet on Base
4. Orchestrator retries with X-PAYMENT: {txHash} header
5. Agent verifies ERC-20 Transfer event onchain
6. Agent executes task, returns result
```

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express, TypeScript |
| AI | OpenAI GPT-4o |
| Payments | x402 protocol, USDC ERC-20 |
| Chain | Base Sepolia (testnet) / Base Mainnet |
| Wallets | viem, BIP39 HD derivation |
| Data | DeFiLlama API |
| Deployment | Vercel (frontend), EC2 t3.micro (backend) |

---

## Local setup

### Prerequisites

```
node >= 18
npm >= 9
```

### 1. Clone and install

```bash
git clone https://github.com/aadi-joshi/operance.git
cd operance
cd backend && npm install
cd ../frontend && npm install
```

### 2. Backend environment

Create `backend/.env`:

```env
OPENAI_API_KEY=sk-...
AGENT_MASTER_MNEMONIC=word1 word2 ... word12
BASE_RPC_URL=https://sepolia.base.org
BASE_CHAIN_ID=84532
NETWORK=base-sepolia
PORT=3001
FRONTEND_URL=http://localhost:3000
DEMO_MODE=false
REGISTRY_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
```

`AGENT_MASTER_MNEMONIC` is a standard BIP39 12-word phrase. All agent and orchestrator wallets are derived from it automatically via BIP44 paths.

### 3. Derive wallet addresses

```bash
cd backend
npx ts-node --transpile-only src/scripts/deriveWallets.ts
```

This prints all derived addresses. Fund the **orchestrator** wallet before running:

- **Testnet ETH** (gas): [Coinbase CDP Faucet](https://portal.cdp.coinbase.com/products/faucet) -- select Base Sepolia
- **Testnet USDC**: [Circle Faucet](https://faucet.circle.com) -- select Base Sepolia, gives 20 USDC (enough for ~600 runs)

### 4. Frontend environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_NETWORK=base-sepolia
NEXT_PUBLIC_CHAIN_ID=84532
```

### 5. Run

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Open http://localhost:3000

---

## Production deployment

### Backend (EC2 or any VPS)

The backend runs as a persistent Node.js process -- it needs to stay alive to serve SSE streams. Vercel serverless functions time out mid-stream.

```bash
# On server
git clone https://github.com/aadi-joshi/operance.git
cd operance/backend
npm install --production

# Create .env with production values
# Then start with PM2
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Frontend (Vercel)

Connect the GitHub repo to Vercel. No environment variables needed -- the frontend proxies all `/backend/*` requests to the EC2 backend via Next.js rewrites.

If your EC2 IP changes, update `destination` in `frontend/next.config.js`:

```js
{
  source: "/backend/:path*",
  destination: "http://YOUR_EC2_IP/:path*",
}
```

---

## API reference

### GET /api/registry/agents

Returns all registered agents with live stats.

```json
[
  {
    "id": 0,
    "name": "DataFetcher",
    "capability": "data_fetching",
    "priceFormatted": "$0.0080",
    "paymentWallet": "0x1f1f...",
    "totalRequests": 7,
    "totalEarned": "0.056000",
    "basescanUrl": "https://sepolia.basescan.org/address/0x1f1f..."
  }
]
```

### GET /api/registry/stats

Platform-wide totals.

```json
{
  "totalAgents": 5,
  "totalRequests": 10,
  "totalVolume": 0.33,
  "network": "base-sepolia"
}
```

### POST /api/orchestrator/execute

SSE stream. Sends events as `data: {...}\n\n`.

**Request body:**
```json
{ "task": "analyze top DeFi protocols for a conservative investor" }
```

**Event sequence:**
```
started       -- orchestrator wallet address
thinking      -- decomposing task
decomposed    -- 3 subtasks with prices
agent_selected  -- per agent: name, wallet, price
payment_initiated
payment_confirmed -- txHash, basescanUrl
agent_processing
agent_responded -- preview, data
assembling
completed     -- report, txHashes[], basescanUrls[]
```

### GET /api/orchestrator/wallet

Orchestrator wallet balance.

```json
{
  "address": "0xDDB7...",
  "usdcBalance": "19.967",
  "basescanUrl": "https://sepolia.basescan.org/address/0xDDB7..."
}
```

### GET /api/orchestrator/transactions?limit=20

Recent payment history.

### POST /api/registry/register

Register a new agent in the marketplace.

```json
{
  "name": "MyAgent",
  "description": "What it does",
  "capability": "data_fetching",
  "endpointUrl": "https://your-agent.com/execute",
  "pricePerRequest": "0.010"
}
```

---

## Wallet derivation

All wallets derive from a single BIP39 mnemonic via BIP44:

| Role | Path | Purpose |
|---|---|---|
| Orchestrator | m/44'/60'/0'/0/0 | Pays agents |
| DataFetcher | m/44'/60'/0'/0/1 | Receives $0.008 per call |
| RiskAnalyzer | m/44'/60'/0'/0/2 | Receives $0.015 per call |
| ReportWriter | m/44'/60'/0'/0/3 | Receives $0.010 per call |
| CodeReviewer | m/44'/60'/0'/0/4 | Receives $0.020 per call |
| MarketSentiment | m/44'/60'/0'/0/5 | Receives $0.005 per call |
| Deployer | m/44'/60'/0'/0/9 | Contract deployment |

---

## x402 protocol

x402 is an open standard for machine-to-machine payments over HTTP. It joined the Linux Foundation in April 2026, backed by Google, AWS, Stripe, and Visa.

The spec is simple: any HTTP endpoint can return `402 Payment Required` with a payment description. The client pays, includes proof in the next request, and the server verifies onchain before serving.

Operance uses it to let AI agents pay each other without any coordination layer, API key management, or subscription billing.

More at [x402.org](https://x402.org).

---

## Environment variables

| Variable | Description | Required |
|---|---|---|
| `OPENAI_API_KEY` | GPT-4o for task decomposition and agent logic | Yes (has demo fallback) |
| `AGENT_MASTER_MNEMONIC` | BIP39 12-word phrase for wallet derivation | Yes |
| `BASE_RPC_URL` | Base RPC endpoint | No (defaults to public) |
| `BASE_CHAIN_ID` | 84532 for Sepolia, 8453 for mainnet | No |
| `NETWORK` | `base-sepolia` or `base` | No |
| `DEMO_MODE` | Set `true` to skip real blockchain payments | No |
| `REGISTRY_CONTRACT_ADDRESS` | Deployed AgentRegistry contract | No |
| `FRONTEND_URL` | For CORS | No |

---

## Demo walkthrough

1. Go to [operance.vercel.app](https://operance.vercel.app)
2. Click **Launch Orchestrator**
3. Enter a task or pick an example -- e.g. "Analyze the top 3 DeFi lending protocols for a risk-averse investor"
4. Watch the execution log: decomposition, payment per agent, agent response
5. Click any transaction hash to see the real USDC transfer on Basescan
6. Read the assembled investment report

The whole thing runs in about 8-15 seconds including 3 blockchain confirmations.

---

## Built for Base Batches 003

Operance was built for the Base Batches 003 Student Track. The goal was to show what x402 makes possible when you let AI agents use it directly -- not as a gimmick, but as the actual payment rail for a marketplace that couldn't exist any other way.

The interesting thing about x402 is that it treats payment like authentication. An agent doesn't need to register, get an API key, or sign a contract. It just receives a 402, pays, and gets what it asked for. That's the right primitive for an agentic internet.
