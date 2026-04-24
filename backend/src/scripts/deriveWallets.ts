import * as dotenv from "dotenv";
dotenv.config();

import { deriveAllAddresses } from "../services/walletService";

const addresses = deriveAllAddresses();

if (Object.keys(addresses).length === 0) {
  console.error("Error: AGENT_MASTER_MNEMONIC not set in .env");
  process.exit(1);
}

console.log("\nOperance Wallet Addresses");
console.log("=".repeat(60));
Object.entries(addresses).forEach(([name, addr]) => {
  console.log(`${name.padEnd(28)}: ${addr}`);
});

console.log("\nContract Seed Script .env values:");
console.log("=".repeat(60));
const entries = Object.entries(addresses);
const agentEntries = entries.filter(([k]) => k.startsWith("agent"));
agentEntries.forEach(([name, addr], i) => {
  console.log(`AGENT_WALLET_${i}=${addr}`);
});

console.log("\nAction Required:");
console.log("1. Fund orchestrator wallet with USDC + ETH on Base Sepolia");
console.log("   Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet");
console.log("2. Add AGENT_WALLET_0..4 to contracts/.env");
console.log("3. Deploy contract: cd contracts && npm run deploy:sepolia");
console.log("4. Add REGISTRY_CONTRACT_ADDRESS to backend/.env");
