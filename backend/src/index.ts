import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";

dotenv.config();

import { config } from "./config";
import agentRoutes from "./routes/agentRoutes";
import orchestratorRoutes from "./routes/orchestratorRoutes";
import registryRoutes from "./routes/registryRoutes";
import { syncAgentsFromChain } from "./services/registryService";
import { deriveAllAddresses } from "./services/walletService";

const app = express();

app.use(cors({
  origin: [config.frontendUrl, "http://localhost:3000", "http://localhost:3001"],
  credentials: true,
}));

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/agents", agentRoutes);
app.use("/api/orchestrator", orchestratorRoutes);
app.use("/api/registry", registryRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    network: config.network,
    demoMode: config.demoMode,
    registry: config.registryAddress,
    timestamp: new Date().toISOString(),
  });
});

// x402 info endpoint
app.get("/api/x402-info", (_req, res) => {
  res.json({
    x402Version: "1",
    platform: "Operance",
    description: "x402-native AI Agent Marketplace on Base",
    network: config.network,
    agents: [
      { endpoint: "/api/agents/data-fetch", price: "$0.008 USDC", name: "DataFetcher" },
      { endpoint: "/api/agents/risk-analyze", price: "$0.015 USDC", name: "RiskAnalyzer" },
      { endpoint: "/api/agents/report-write", price: "$0.010 USDC", name: "ReportWriter" },
      { endpoint: "/api/agents/code-review", price: "$0.020 USDC", name: "CodeReviewer" },
      { endpoint: "/api/agents/market-sentiment", price: "$0.005 USDC", name: "MarketSentiment" },
    ],
  });
});

async function start() {
  app.listen(config.port, () => {
    console.log(`\n  Operance Backend running at http://localhost:${config.port}`);
    console.log(`  Network: ${config.network}`);
    console.log(`  Registry: ${config.registryAddress}`);
    console.log(`  Demo mode: ${config.demoMode}`);

    if (config.mnemonic) {
      const addresses = deriveAllAddresses();
      console.log("\n  Wallet Addresses:");
      Object.entries(addresses).forEach(([name, addr]) => {
        console.log(`    ${name.padEnd(22)}: ${addr}`);
      });
      console.log("\n  Fund the 'orchestrator' wallet with USDC + ETH on", config.network);
    } else {
      console.log("\n  AGENT_MASTER_MNEMONIC not set. Set it in .env to enable payments.");
    }
  });

  // Sync agents from chain in background
  setTimeout(async () => {
    try {
      await syncAgentsFromChain();
      console.log("\n  Agents synced from registry.");
    } catch (e: any) {
      console.log("\n  Note:", e.message);
    }
  }, 2000);
}

start().catch(console.error);
