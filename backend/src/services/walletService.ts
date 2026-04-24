import {
  createWalletClient,
  createPublicClient,
  http,
  formatUnits,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { baseSepolia, base } from "viem/chains";
import { config, USDC_ADDRESS, EXPLORER_URL } from "../config";

const USDC_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
];

const chain = config.chainId === 8453 ? base : baseSepolia;

export const publicClient = createPublicClient({
  chain,
  transport: http(config.baseRpc),
});

function getAccount(path: string) {
  if (!config.mnemonic) throw new Error("AGENT_MASTER_MNEMONIC not set in .env");
  return mnemonicToAccount(config.mnemonic, { path: path as any });
}

export function getOrchestratorAccount() {
  return getAccount("m/44'/60'/0'/0/0");
}

export function getAgentAccount(index: number) {
  return getAccount(`m/44'/60'/0'/0/${index + 1}`);
}

export function getDeployerAccount() {
  return getAccount("m/44'/60'/0'/0/9");
}

export function getWalletClient(account: ReturnType<typeof getOrchestratorAccount>) {
  return createWalletClient({
    account,
    chain,
    transport: http(config.baseRpc),
  });
}

export async function getUsdcBalance(address: `0x${string}`): Promise<string> {
  try {
    const balance = await (publicClient.readContract as any)({
      address: USDC_ADDRESS,
      abi: USDC_ABI,
      functionName: "balanceOf",
      args: [address],
    }) as bigint;
    return formatUnits(balance, 6);
  } catch {
    return "0";
  }
}

export async function transferUsdc(
  fromAccount: ReturnType<typeof getOrchestratorAccount>,
  to: `0x${string}`,
  amountUsdc: bigint
): Promise<{ txHash: `0x${string}`; basescanUrl: string }> {
  if (config.demoMode) {
    const fakeTx = ("0x" + Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("")) as `0x${string}`;
    return {
      txHash: fakeTx,
      basescanUrl: `${EXPLORER_URL}/tx/${fakeTx}`,
    };
  }

  const walletClient = getWalletClient(fromAccount);
  const txHash = await (walletClient.writeContract as any)({
    address: USDC_ADDRESS,
    abi: USDC_ABI,
    functionName: "transfer",
    args: [to, amountUsdc],
  }) as `0x${string}`;

  await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });

  return {
    txHash,
    basescanUrl: `${EXPLORER_URL}/tx/${txHash}`,
  };
}

export async function verifyUsdcTransfer(
  txHash: `0x${string}`,
  expectedTo: `0x${string}`,
  minAmount: bigint
): Promise<{ valid: boolean; amount: bigint; from: string }> {
  if (config.demoMode) {
    return { valid: true, amount: minAmount, from: "0xdemo" };
  }

  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    if (!receipt || receipt.status !== "success") {
      return { valid: false, amount: 0n, from: "" };
    }

    for (const log of receipt.logs as any[]) {
      if (
        log.address?.toLowerCase() === USDC_ADDRESS.toLowerCase() &&
        log.topics?.length === 3
      ) {
        const to = `0x${log.topics[2]?.slice(26)}`.toLowerCase();
        if (to === expectedTo.toLowerCase()) {
          const amount = BigInt(log.data || "0");
          if (amount >= minAmount) {
            const from = `0x${log.topics[1]?.slice(26)}`;
            return { valid: true, amount, from };
          }
        }
      }
    }

    return { valid: false, amount: 0n, from: "" };
  } catch {
    return { valid: false, amount: 0n, from: "" };
  }
}

export function deriveAllAddresses(): Record<string, string> {
  if (!config.mnemonic) return {};
  try {
    return {
      orchestrator: getOrchestratorAccount().address,
      "agent0_DataFetcher": getAgentAccount(0).address,
      "agent1_RiskAnalyzer": getAgentAccount(1).address,
      "agent2_ReportWriter": getAgentAccount(2).address,
      "agent3_CodeReviewer": getAgentAccount(3).address,
      "agent4_MarketSentiment": getAgentAccount(4).address,
      deployer: getDeployerAccount().address,
    };
  } catch {
    return {};
  }
}
