import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const DEMO_AGENTS = [
  {
    paymentWallet: process.env.AGENT_WALLET_0 || "0x0000000000000000000000000000000000000001",
    pricePerRequest: 8000n,      // $0.008 USDC
    name: "DataFetcher",
    description: "Fetches real-time DeFi protocol data from DeFiLlama, CoinGecko, and onchain sources. Provides TVL, volume, and market metrics.",
    capability: "data_fetching",
    endpointUrl: `${process.env.BACKEND_URL || "http://localhost:3001"}/api/agents/data-fetch`,
    baseName: "datafetcher.base.eth",
  },
  {
    paymentWallet: process.env.AGENT_WALLET_1 || "0x0000000000000000000000000000000000000002",
    pricePerRequest: 15000n,     // $0.015 USDC
    name: "RiskAnalyzer",
    description: "Analyzes DeFi protocol risk using smart contract audits, TVL stability, and onchain threat intelligence.",
    capability: "risk_analysis",
    endpointUrl: `${process.env.BACKEND_URL || "http://localhost:3001"}/api/agents/risk-analyze`,
    baseName: "riskanalyzer.base.eth",
  },
  {
    paymentWallet: process.env.AGENT_WALLET_2 || "0x0000000000000000000000000000000000000003",
    pricePerRequest: 10000n,     // $0.010 USDC
    name: "ReportWriter",
    description: "Synthesizes data and analysis into professional investment reports with actionable recommendations.",
    capability: "report_writing",
    endpointUrl: `${process.env.BACKEND_URL || "http://localhost:3001"}/api/agents/report-write`,
    baseName: "reportwriter.base.eth",
  },
  {
    paymentWallet: process.env.AGENT_WALLET_3 || "0x0000000000000000000000000000000000000004",
    pricePerRequest: 20000n,     // $0.020 USDC
    name: "CodeReviewer",
    description: "Reviews Solidity smart contracts for security vulnerabilities, gas optimizations, and best practices.",
    capability: "code_review",
    endpointUrl: `${process.env.BACKEND_URL || "http://localhost:3001"}/api/agents/code-review`,
    baseName: "codereviewer.base.eth",
  },
  {
    paymentWallet: process.env.AGENT_WALLET_4 || "0x0000000000000000000000000000000000000005",
    pricePerRequest: 5000n,      // $0.005 USDC
    name: "MarketSentiment",
    description: "Analyzes social media and onchain activity to gauge market sentiment for crypto assets.",
    capability: "sentiment_analysis",
    endpointUrl: `${process.env.BACKEND_URL || "http://localhost:3001"}/api/agents/market-sentiment`,
    baseName: "sentiment.base.eth",
  },
];

async function main() {
  const deploymentsFile = path.join(__dirname, `../deployments/${network.name}.json`);
  if (!fs.existsSync(deploymentsFile)) {
    throw new Error(`Deploy the contract first: npm run deploy:${network.name}`);
  }

  const { address } = JSON.parse(fs.readFileSync(deploymentsFile, "utf-8"));
  console.log("Seeding AgentRegistry at:", address);

  const [deployer] = await ethers.getSigners();
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const registry = AgentRegistry.attach(address) as any;

  for (const agent of DEMO_AGENTS) {
    console.log(`Registering: ${agent.name}...`);
    const tx = await registry.registerAgent(
      agent.paymentWallet,
      agent.pricePerRequest,
      agent.name,
      agent.description,
      agent.capability,
      agent.endpointUrl,
      agent.baseName
    );
    await tx.wait();
    console.log(`  Registered ${agent.name} at tx: ${tx.hash}`);
  }

  console.log("\nAll demo agents registered successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
