import * as dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3001"),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",

  openaiKey: process.env.OPENAI_API_KEY || "",

  baseRpc: process.env.BASE_RPC_URL || "https://sepolia.base.org",
  chainId: parseInt(process.env.BASE_CHAIN_ID || "84532"),
  network: (process.env.NETWORK || "base-sepolia") as "base-sepolia" | "base",

  mnemonic: process.env.AGENT_MASTER_MNEMONIC || "",
  registryAddress: (process.env.REGISTRY_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`,

  demoMode: process.env.DEMO_MODE === "true",
};

// USDC addresses
export const USDC = {
  "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`,
  "base": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
};

export const USDC_ADDRESS = USDC[config.network];

// Basescan URLs
export const EXPLORER = {
  "base-sepolia": "https://sepolia.basescan.org",
  "base": "https://basescan.org",
};

export const EXPLORER_URL = EXPLORER[config.network];

// Agent wallet derivation paths
export const WALLET_PATHS = {
  orchestrator: "m/44'/60'/0'/0/0",
  agents: [
    "m/44'/60'/0'/0/1", // DataFetcher
    "m/44'/60'/0'/0/2", // RiskAnalyzer
    "m/44'/60'/0'/0/3", // ReportWriter
    "m/44'/60'/0'/0/4", // CodeReviewer
    "m/44'/60'/0'/0/5", // MarketSentiment
  ],
  deployer: "m/44'/60'/0'/0/9",
};
