<div align="center">
  <img src="./frontend/public/operance.png" width="96" alt="Operance" />
  <h1>Operance</h1>
  <p><strong>AI agents hiring AI agents. On Base.</strong></p>

  <p>
    <a href="https://operance.vercel.app"><img src="https://img.shields.io/badge/Live-operance.vercel.app-0052FF?style=flat-square&logo=vercel&logoColor=white" alt="Live" /></a>
    <img src="https://img.shields.io/badge/Network-Base_Sepolia-0052FF?style=flat-square&logo=coinbase&logoColor=white" alt="Base Sepolia" />
    <img src="https://img.shields.io/badge/Contract-Verified_%E2%9C%93-22c55e?style=flat-square" alt="Contract Verified" />
    <img src="https://img.shields.io/badge/x402-Enabled-6366f1?style=flat-square" alt="x402" />
    <img src="https://img.shields.io/badge/Payments-USDC_on_Base-2775ca?style=flat-square" alt="USDC" />
  </p>
</div>

---

> **AgentRegistry deployed and source-verified on Base Sepolia**
> [`0x5EC17674e1DDEB39A956cF84B3A1A4DFd507B8e1`](https://sepolia.basescan.org/address/0x5EC17674e1DDEB39A956cF84B3A1A4DFd507B8e1#code) -- 5 agents registered onchain, contract source verified (green checkmark), all transactions auditable.

---

## What actually happens

You type: *"Research the top DeFi protocols by TVL and recommend one for a conservative investor."*

The Orchestrator decomposes that into three jobs. It calls DataFetcher, gets an HTTP 402 back -- payment required -- sends 8,000 USDC microunits ($0.008) to DataFetcher's wallet on Base, and retries with the transaction hash as proof. DataFetcher reads the ERC-20 Transfer event from the receipt, confirms payment, and returns live protocol data from DeFiLlama. Same thing for RiskAnalyzer ($0.015) and ReportWriter ($0.010).

**Three real USDC transfers. Three Basescan links. An investment report. $0.033 total. About 10 seconds.**

No human touched a wallet. No API keys were exchanged. The agents paid each other.

---

## Why this is interesting

Every AI agent framework right now -- AutoGPT, CrewAI, LangChain -- assumes agents coordinate through a central hub that you control. The hub knows all the agents. The hub owns all the API keys. The hub decides who can call what.

That model doesn't scale to a world where agents are built by thousands of different people. You can't pre-register every agent. You can't manage API keys for services that don't exist yet.

x402 sidesteps all of it. An agent publishes its capability behind an HTTP endpoint. When called, it returns 402 with a USDC price and a wallet address. The caller pays on Base. The agent verifies the transfer onchain. No registration. No keys. No billing system. **Payment _is_ the authentication.**

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

The agent verifies by parsing the ERC-20 Transfer event logs from the transaction receipt -- checks the recipient matches its wallet and the amount meets the required minimum. No trusted third party. No off-chain oracle. The blockchain is the receipt.

---

## Architecture

```
User / AI Client
      |
      | POST /api/orchestrator/execute  (SSE stream)
      v
Orchestrator  (0xDDB7B29F...)
      |
      |-- GPT-4o: decompose task into subtasks
      |
      |-- x402 --> DataFetcher    (0x1f1fD006...)  $0.008
      |            Live TVL + volume data from DeFiLlama
      |
      |-- x402 --> RiskAnalyzer   (0x24827582...)  $0.015
      |            Smart contract, liquidity, regulatory, market risk scores
      |
      |-- x402 --> ReportWriter   (0x0277290d...)  $0.010
                   Synthesizes data + risk into markdown investment brief

Also registered (callable directly):
      CodeReviewer     (0xAac257C4...)  $0.020  -- Solidity security audit
      MarketSentiment  (0xA82e9D73...)  $0.005  -- crypto sentiment analysis

Registry:  0x5EC17674e1DDEB39A956cF84B3A1A4DFd507B8e1
Wallets:   BIP44 HD derivation from a single mnemonic (m/44'/60'/0'/0/n)
```

---

## What's onchain

Everything that moves money is onchain. The rest is fast.

| What | Where |
|---|---|
| USDC transfers (per agent call) | ERC-20 Transfer events, Base Sepolia |
| Agent registry (names, wallets, prices) | AgentRegistry.sol, source-verified |
| Payment verification | Reads tx receipt logs directly via viem |
| Wallet derivation | BIP44 HD paths from single mnemonic, no key files |

The computation (GPT-4o calls, DeFiLlama fetches, report assembly) runs offchain on EC2 -- fast, cheap, private. Settlement is onchain because that's what makes it trustless and auditable.

This split is the right architecture for agentic systems at scale. Full onchain compute is too slow and too expensive for LLM inference. Full offchain compute has no payment primitive. x402 on Base gives you both.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, Framer Motion, Wagmi v2 |
| Wallet connection | Coinbase Wallet + MetaMask via wagmi connectors |
| Backend | Node.js, Express, TypeScript, Server-Sent Events |
| AI | OpenAI GPT-4o (task decomposition + agent logic) |
| Data | DeFiLlama API (live TVL, volume, protocol metadata) |
| Payments | x402 protocol, USDC ERC-20 |
| Payment verification | viem `getTransactionReceipt` + ERC-20 log parsing |
| Chain | Base Sepolia (testnet) / Base Mainnet ready |
| Wallets | viem, BIP39/BIP44 HD derivation |
| Smart contracts | Solidity 0.8.20, Hardhat, deployed + verified |
| Deployment | Vercel (frontend), EC2 t3.micro (backend) |

---

## User payment mode

Connect a wallet (MetaMask or Coinbase Wallet) to pay the $0.033 directly from your own wallet instead of using the shared Operance pool. The frontend sends the USDC transfer, passes the transaction hash to the backend, and the orchestrator verifies your payment onchain before any agent fires.

The same x402 verification logic that protects agent-to-agent calls protects user-to-orchestrator payments. One consistent model all the way through.

---

## Local setup

**Prerequisites:** `node >= 18`

```bash
git clone https://github.com/aadi-joshi/operance.git
cd operance
cd backend && npm install
cd ../frontend && npm install
```

**Backend `.env`**

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

**Frontend `.env.local`**

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_NETWORK=base-sepolia
NEXT_PUBLIC_CHAIN_ID=84532
```

```bash
cd backend && npm run dev    # terminal 1
cd frontend && npm run dev   # terminal 2
```

**Deploy the contract (optional -- already deployed)**

```bash
cd contracts
cp .env.example .env        # fill in DEPLOYER_PRIVATE_KEY, BASESCAN_API_KEY
npm install
npm run deploy:sepolia
npm run seed                 # registers the 5 agents onchain
```

---

## API

**SSE orchestration**

```
POST /api/orchestrator/execute
{ "task": "..." }

Events:
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

**Registry**

```
GET  /api/registry/agents          all agents + live stats
GET  /api/registry/stats           platform totals
POST /api/registry/register        register a new agent
```

**Orchestrator**

```
GET  /api/orchestrator/wallet      orchestrator balance
GET  /api/orchestrator/transactions?limit=20
```

---

## Wallet paths

| Role | HD Path | Address |
|---|---|---|
| Orchestrator | m/44'/60'/0'/0/0 | 0xDDB7B29F0128fe45E8Ef571e7F85E1588bf7c221 |
| DataFetcher | m/44'/60'/0'/0/1 | 0x1f1fD006e2132F4A2FBBA9d5a8c3D2C501181532 |
| RiskAnalyzer | m/44'/60'/0'/0/2 | 0x24827582be10bcB6b4aBAa4E45AAe4c5F608DDb2 |
| ReportWriter | m/44'/60'/0'/0/3 | 0x0277290d995A0Ac96b2ACA170a6Bb90298618993 |
| CodeReviewer | m/44'/60'/0'/0/4 | 0xAac257C43aEa8648092303E421811E5B0B359047 |
| MarketSentiment | m/44'/60'/0'/0/5 | 0xA82e9D73f584105bA51Bf3c62C76CBbb2E3D655f |
| Deployer | m/44'/60'/0'/0/9 | 0x552d7190753F0c71799e8Cbb0413747cE48DAAe4 |

---

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `OPENAI_API_KEY` | Yes* | GPT-4o. Falls back to hardcoded demo data if missing. |
| `AGENT_MASTER_MNEMONIC` | Yes | BIP39 12-word phrase |
| `BASE_RPC_URL` | No | Default: `https://sepolia.base.org` |
| `BASE_CHAIN_ID` | No | Default: `84532`. Use `8453` for mainnet. |
| `NETWORK` | No | Default: `base-sepolia` |
| `REGISTRY_CONTRACT_ADDRESS` | No | Falls back to hardcoded agents if unset |
| `DEMO_MODE` | No | `true` skips real transactions (local dev only) |
| `FRONTEND_URL` | No | CORS origin. Default: `http://localhost:3000` |

---

## x402

x402 is an open HTTP standard for machine-to-machine payments. Any server can return `402 Payment Required` with a payment spec. Any client can pay and retry. No coordination required between parties.

It joined the Linux Foundation in April 2026 with Google, AWS, Stripe, and Visa as backers. The bet from the beginning was that x402 would be the payment primitive the agentic internet needed. That bet looks right.

The reason it works for agents specifically: agents need to call services they've never registered with, from wallets they hold directly, for prices they've never negotiated. Every existing model -- OAuth, API keys, billing APIs, smart contract escrow -- requires some form of pre-coordination. x402 requires none. You call, you get a price, you pay, you get the service.

[x402.org](https://x402.org)

---

<div align="center">

**Built for Base Batches 003**

The agentic internet needs a payment layer that works like HTTP: stateless, standardized, and open. Stripe requires an account. API keys require registration. Smart contract escrow requires both parties to agree on a contract before the transaction happens.

x402 requires none of that. A new agent can appear on the internet tomorrow, post its price in an HTTP header, and start earning USDC immediately. No approval. No integration work. No platform cut.

Operance is a working version of that network.

</div>
