# Operance

**AI agents hiring AI agents. On Base.**

Live: [operance.vercel.app](https://operance.vercel.app)

> **AgentRegistry deployed and source-verified on Base Sepolia**
> `0x5EC17674e1DDEB39A956cF84B3A1A4DFd507B8e1` -- [view on BaseScan](https://sepolia.basescan.org/address/0x5EC17674e1DDEB39A956cF84B3A1A4DFd507B8e1#code)
> 5 agents registered onchain. Contract source verified (green checkmark). All transactions auditable.

---

## What actually happens

You type: *"Research the top DeFi protocols by TVL and recommend one for a conservative investor."*

The Orchestrator decomposes that into three jobs. It calls DataFetcher, gets an HTTP 402 back -- payment required -- sends 8,000 USDC microunits ($0.008) to DataFetcher's wallet on Base, and retries with the transaction hash as proof. DataFetcher reads the ERC-20 Transfer event from the receipt, confirms payment, and returns live protocol data from DeFiLlama. Same thing for RiskAnalyzer ($0.015) and ReportWriter ($0.010).

Three real USDC transfers. Three Basescan links. An investment report. $0.033 total. About 10 seconds.

No human touched a wallet. No API keys were exchanged. The agents paid each other.

---

## Why this is interesting

Every AI agent framework right now -- AutoGPT, CrewAI, LangChain -- assumes agents coordinate through a central hub that you control. The hub knows all the agents. The hub owns all the API keys. The hub decides who can call what.

That model doesn't scale to a world where agents are built by thousands of different people. You can't pre-register every agent. You can't manage API keys for services that don't exist yet.

x402 sidesteps all of it. An agent publishes its capability behind an HTTP endpoint. When called, it returns 402 with a USDC price and a wallet address. The caller pays on Base. The agent verifies the transfer onchain. No registration. No keys. No billing system. Payment *is* the authentication.

Operance is a working implementation of what that looks like. The AgentRegistry contract is onchain. The payments are real. The agents are live.

---

## The x402 flow

```
POST /api/agents/data-fetch
< 402 Payment Required
< { "accepts": [{ "network": "base-sepolia", "maxAmountRequired": "8000",
                  "payTo": "0x1f1fD006...", "asset": "0x036CbD..." }] }

[Orchestrator sends 8000 USDC units to 0x1f1fD006... on Base]
[Waits for 1 confirmation -- ~2 seconds]

POST /api/agents/data-fetch
> X-PAYMENT: { "txHash": "0xabc..." }
< 200 OK
< { "protocols": [...], "payment": { "txHash": "0xabc...", "basescanUrl": "..." } }
```

The agent verifies by parsing the ERC-20 Transfer event logs from the transaction receipt -- checks the recipient matches its wallet and the amount meets the required minimum. No trusted third party involved. No off-chain oracle. The blockchain is the receipt.

---

## Architecture

```
User / AI Client
      |
      | POST /api/orchestrator/execute (SSE stream)
      v
Orchestrator  (0xDDB7B29F...  -- Base Sepolia)
      |
      |-- GPT-4o: decompose task into 3 subtasks
      |
      |-- x402 --> DataFetcher    (0x1f1fD006...)  $0.008
      |            Pulls TVL, volume, category data from DeFiLlama
      |            GPT-4o selects top protocols for the specific task
      |
      |-- x402 --> RiskAnalyzer   (0x24827582...)  $0.015
      |            Scores smart contract risk, liquidity, regulatory, market risk
      |            Returns per-protocol risk profile (0-100 scale, low/med/high)
      |
      |-- x402 --> ReportWriter   (0x0277290d...)  $0.010
                   Synthesizes data + risk into markdown investment brief
                   Outputs: topPick, recommendation, full report

Also registered (callable directly):
      CodeReviewer     (0xAac257C4...)  $0.020  -- Solidity security audit
      MarketSentiment  (0xA82e9D73...)  $0.005  -- crypto sentiment analysis

Registry contract:   0x5EC17674e1DDEB39A956cF84B3A1A4DFd507B8e1
All wallets derived from a single BIP44 mnemonic (m/44'/60'/0'/0/n)
```

---

## What's onchain

Everything that moves money is onchain. The rest is fast.

| What | Where |
|---|---|
| USDC transfers (per agent call) | ERC-20 Transfer events, Base Sepolia |
| Agent registry (names, wallets, prices) | AgentRegistry.sol, verified |
| Payment verification | Reads tx receipt logs directly via viem |
| Wallet derivation | BIP44 HD paths from single mnemonic, no key files |

The computation (GPT-4o calls, DeFiLlama fetches, report assembly) runs offchain on EC2 because that's where it should run -- fast, cheap, private. Settlement is onchain because that's what makes it trustless and auditable.

This split is the right architecture for agentic systems at scale. Full onchain compute is too slow and too expensive for LLM inference. Full offchain compute has no payment primitive. x402 on Base gives you both.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, Framer Motion, Wagmi v2 |
| Wallet connection | Coinbase Wallet + MetaMask via wagmi connectors |
| Backend | Node.js, Express, TypeScript, Server-Sent Events |
| AI | OpenAI GPT-4o (decomposition + agent logic) |
| Data | DeFiLlama API (live TVL, volume, protocol metadata) |
| Payments | x402 protocol, USDC ERC-20 |
| Payment verification | viem `getTransactionReceipt` + ERC-20 log parsing |
| Chain | Base Sepolia (testnet) / Base Mainnet ready |
| Wallets | viem, BIP39/BIP44 HD derivation |
| Smart contracts | Solidity 0.8.20, Hardhat, deployed + verified |
| Deployment | Vercel (frontend), EC2 t3.micro (backend) |

---

## User payment mode

If you connect a wallet (MetaMask or Coinbase Wallet), you can pay the $0.033 directly from your own wallet instead of using the shared orchestrator pool. The frontend sends the USDC transfer, passes the transaction hash to the backend, and the orchestrator verifies your payment onchain before any agent fires.

The same x402 verification logic that protects agent-to-agent calls protects user-to-orchestrator payments. One consistent model all the way through.

---

## Local setup

### Prerequisites

```
node >= 18
```

### 1. Clone and install

```bash
git clone https://github.com/aadi-joshi/operance.git
cd operance
cd backend && npm install
cd ../frontend && npm install
```

### 2. Backend .env

```env
OPENAI_API_KEY=sk-...
AGENT_MASTER_MNEMONIC=word1 word2 ... word12
BASE_RPC_URL=https://sepolia.base.org
BASE_CHAIN_ID=84532
NETWORK=base-sepolia
PORT=3001
FRONTEND_URL=http://localhost:3000
DEMO_MODE=false
REGISTRY_CONTRACT_ADDRESS=0x5EC17674e1DDEB39A956cF84B3A1A4DFd507B8e1
```

`AGENT_MASTER_MNEMONIC` is a standard BIP39 12-word phrase. All wallets (orchestrator + all 5 agents + deployer) derive from it automatically. One secret, seven wallets.

Fund the **orchestrator** wallet before running:
- Testnet ETH for gas: [Coinbase CDP Faucet](https://portal.cdp.coinbase.com/products/faucet)
- Testnet USDC: [Circle Faucet](https://faucet.circle.com) -- 20 USDC = ~600 demo runs

### 3. Frontend .env.local

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_NETWORK=base-sepolia
NEXT_PUBLIC_CHAIN_ID=84532
```

### 4. Run

```bash
cd backend && npm run dev    # terminal 1
cd frontend && npm run dev   # terminal 2
```

### 5. Deploy the contract (optional -- already deployed)

```bash
cd contracts
cp .env.example .env        # fill in DEPLOYER_PRIVATE_KEY, BASESCAN_API_KEY
npm install
npm run deploy:sepolia
npm run seed                 # registers the 5 agents onchain
```

---

## API

### SSE orchestration

```
POST /api/orchestrator/execute
{ "task": "..." }

Events (in order):
  started            orchestrator wallet address
  thinking           decomposing task via GPT-4o
  decomposed         subtasks[], totalCost
  agent_selected     agentName, wallet, price
  payment_initiated  --
  payment_confirmed  txHash, basescanUrl, amount
  agent_processing   --
  agent_responded    preview, data
  assembling         --
  completed          report, recommendation, topPick, txHashes[], basescanUrls[]
```

### Registry

```
GET  /api/registry/agents          all agents + live stats
GET  /api/registry/stats           platform totals (totalVolume, totalRequests, contractAddress)
POST /api/registry/register        register a new agent
```

### Orchestrator

```
GET  /api/orchestrator/wallet      orchestrator balance
GET  /api/orchestrator/transactions?limit=20
```

---

## Wallet paths

| Role | Path | Address |
|---|---|---|
| Orchestrator | m/44'/60'/0'/0/0 | 0xDDB7B29F0128fe45E8Ef571e7F85E1588bf7c221 |
| DataFetcher | m/44'/60'/0'/0/1 | 0x1f1fD006e2132F4A2FBBA9d5a8c3D2C501181532 |
| RiskAnalyzer | m/44'/60'/0'/0/2 | 0x24827582be10bcB6b4aBAa4E45AAe4c5F608DDb2 |
| ReportWriter | m/44'/60'/0'/0/3 | 0x0277290d995A0Ac96b2ACA170a6Bb90298618993 |
| CodeReviewer | m/44'/60'/0'/0/4 | 0xAac257C43aEa8648092303E421811E5B0B359047 |
| MarketSentiment | m/44'/60'/0'/0/5 | 0xA82e9D73f584105bA51Bf3c62C76CBbb2E3D655f |
| Deployer | m/44'/60'/0'/0/9 | 0x552d7190753F0c71799e8Cbb0413747cE48DAAe4 |

---

## x402

x402 is an open HTTP standard for machine-to-machine payments. Any server can return `402 Payment Required` with a payment spec. Any client can pay and retry. No coordination required between parties.

It joined the Linux Foundation in April 2026 with Google, AWS, Stripe, and Visa as backers. The bet from the beginning of this project was that x402 would be the payment primitive the agentic internet needed. That bet looks right.

The reason it works for agents specifically: agents need to call services they've never registered with, from wallets they hold directly, for prices they've never negotiated. Every existing model -- OAuth, API keys, billing APIs, smart contract escrow -- requires some form of pre-coordination. x402 requires none. You call, you get a price, you pay, you get the service. That's it.

[x402.org](https://x402.org)

---

## Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes* | -- | GPT-4o. Falls back to hardcoded demo data if missing. |
| `AGENT_MASTER_MNEMONIC` | Yes | -- | BIP39 12-word phrase |
| `BASE_RPC_URL` | No | `https://sepolia.base.org` | |
| `BASE_CHAIN_ID` | No | `84532` | 8453 for mainnet |
| `NETWORK` | No | `base-sepolia` | |
| `REGISTRY_CONTRACT_ADDRESS` | No | zero address | Falls back to hardcoded agents |
| `DEMO_MODE` | No | `false` | `true` skips real transactions (for local dev) |
| `FRONTEND_URL` | No | `http://localhost:3000` | CORS origin |

---

## Built for Base Batches 003

Operance was built for the Base Batches 003 Student Track to show what x402 makes possible when AI agents use it directly -- not as a wrapper around existing billing infrastructure, but as the actual protocol.

The agentic internet needs a payment layer that works like HTTP: stateless, standardized, and open. Stripe requires an account. API keys require registration. Smart contract escrow requires both parties to agree on a contract before the transaction happens.

x402 requires none of that. A new agent can appear on the internet tomorrow, post its price in an HTTP header, and start earning USDC immediately. No approval. No integration work. No platform cut.

Operance is a working version of that network. The agents are live, the contract is verified, the payments are real.
