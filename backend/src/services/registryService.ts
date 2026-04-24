import { createPublicClient, http } from "viem";
import { baseSepolia, base } from "viem/chains";
import { config } from "../config";
import { store, AgentCache } from "../db/store";
import { getAgentAccount } from "./walletService";

const AGENT_REGISTRY_ABI = [
  {
    name: "getAllAgents",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "id", type: "uint256" },
          { name: "owner", type: "address" },
          { name: "paymentWallet", type: "address" },
          { name: "pricePerRequest", type: "uint256" },
          { name: "name", type: "string" },
          { name: "description", type: "string" },
          { name: "capability", type: "string" },
          { name: "endpointUrl", type: "string" },
          { name: "baseName", type: "string" },
          { name: "active", type: "bool" },
          { name: "createdAt", type: "uint256" },
          { name: "totalRequests", type: "uint256" },
          { name: "totalEarned", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "agentCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getPlatformStats",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "totalAgents", type: "uint256" },
      { name: "totalRequests", type: "uint256" },
      { name: "totalVolume", type: "uint256" },
    ],
  },
] as const;

const chain = config.chainId === 8453 ? base : baseSepolia;
const publicClient = createPublicClient({
  chain,
  transport: http(config.baseRpc),
});

function safeGetAgentAddress(index: number): string {
  try {
    return getAgentAccount(index).address;
  } catch {
    return `0x${"0".repeat(40 - index.toString().length)}${index}`;
  }
}

function getFallbackAgents(): AgentCache[] {
  return [
    {
      id: 0,
      name: "DataFetcher",
      description: "Fetches real-time DeFi protocol data from DeFiLlama, CoinGecko, and onchain sources.",
      capability: "data_fetching",
      endpointUrl: `http://localhost:${config.port}/api/agents/data-fetch`,
      baseName: "datafetcher.base.eth",
      paymentWallet: safeGetAgentAddress(0),
      pricePerRequest: "0.008000",
      totalRequests: 0,
      totalEarned: "0",
      active: true,
    },
    {
      id: 1,
      name: "RiskAnalyzer",
      description: "Analyzes DeFi protocol risk using smart contract audits, TVL stability, and threat intelligence.",
      capability: "risk_analysis",
      endpointUrl: `http://localhost:${config.port}/api/agents/risk-analyze`,
      baseName: "riskanalyzer.base.eth",
      paymentWallet: safeGetAgentAddress(1),
      pricePerRequest: "0.015000",
      totalRequests: 0,
      totalEarned: "0",
      active: true,
    },
    {
      id: 2,
      name: "ReportWriter",
      description: "Synthesizes data and analysis into professional investment reports.",
      capability: "report_writing",
      endpointUrl: `http://localhost:${config.port}/api/agents/report-write`,
      baseName: "reportwriter.base.eth",
      paymentWallet: safeGetAgentAddress(2),
      pricePerRequest: "0.010000",
      totalRequests: 0,
      totalEarned: "0",
      active: true,
    },
    {
      id: 3,
      name: "CodeReviewer",
      description: "Reviews Solidity smart contracts for security vulnerabilities and gas optimizations.",
      capability: "code_review",
      endpointUrl: `http://localhost:${config.port}/api/agents/code-review`,
      baseName: "codereviewer.base.eth",
      paymentWallet: safeGetAgentAddress(3),
      pricePerRequest: "0.020000",
      totalRequests: 0,
      totalEarned: "0",
      active: true,
    },
    {
      id: 4,
      name: "MarketSentiment",
      description: "Analyzes social and onchain activity to gauge market sentiment for crypto assets.",
      capability: "sentiment_analysis",
      endpointUrl: `http://localhost:${config.port}/api/agents/market-sentiment`,
      baseName: "sentiment.base.eth",
      paymentWallet: safeGetAgentAddress(4),
      pricePerRequest: "0.005000",
      totalRequests: 0,
      totalEarned: "0",
      active: true,
    },
  ];
}

export async function syncAgentsFromChain(): Promise<AgentCache[]> {
  if (config.registryAddress === "0x0000000000000000000000000000000000000000") {
    // No contract deployed yet, use fallback
    getFallbackAgents().forEach((a) => store.cacheAgent(a));
    return getFallbackAgents();
  }

  try {
    const onchainAgents = await (publicClient.readContract as any)({
      address: config.registryAddress,
      abi: AGENT_REGISTRY_ABI,
      functionName: "getAllAgents",
    }) as any[];

    const agents: AgentCache[] = onchainAgents.map((a: any) => ({
      id: Number(a.id),
      name: a.name,
      description: a.description,
      capability: a.capability,
      endpointUrl: a.endpointUrl,
      baseName: a.baseName,
      paymentWallet: a.paymentWallet,
      pricePerRequest: (Number(a.pricePerRequest) / 1_000_000).toFixed(6),
      totalRequests: Number(a.totalRequests),
      totalEarned: (Number(a.totalEarned) / 1_000_000).toFixed(6),
      active: a.active,
    }));

    agents.forEach((a) => store.cacheAgent(a));
    return agents;
  } catch (e) {
    // Contract not yet deployed or RPC issues, use cache or fallback
    const cached = store.getCachedAgents();
    if (cached.length > 0) return cached;
    getFallbackAgents().forEach((a) => store.cacheAgent(a));
    return getFallbackAgents();
  }
}

export async function getAgents(): Promise<AgentCache[]> {
  const cached = store.getCachedAgents();
  if (cached.length > 0) return cached;
  return syncAgentsFromChain();
}

export async function getPlatformStats(): Promise<{
  totalAgents: number;
  totalRequests: number;
  totalVolume: number;
  contractAddress: string;
  network: string;
}> {
  const localStats = store.getPlatformStats();

  let onchainRequests = 0;
  let onchainVolume = 0;

  if (config.registryAddress !== "0x0000000000000000000000000000000000000000") {
    try {
      const stats = await (publicClient.readContract as any)({
        address: config.registryAddress,
        abi: AGENT_REGISTRY_ABI,
        functionName: "getPlatformStats",
      }) as [bigint, bigint, bigint];

      onchainRequests = Number(stats[1]);
      onchainVolume = Number(stats[2]);
    } catch {}
  }

  return {
    totalAgents: Math.max(5, localStats.totalTxs > 0 ? 5 : 0),
    totalRequests: Math.max(localStats.totalTxs, onchainRequests),
    totalVolume: Math.max(localStats.totalVolume, onchainVolume / 1_000_000),
    contractAddress: config.registryAddress,
    network: config.network,
  };
}
