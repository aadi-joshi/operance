import { Request, Response, NextFunction } from "express";
import { getAgentAccount, verifyUsdcTransfer } from "../services/walletService";
import { USDC_ADDRESS, EXPLORER_URL, config } from "../config";

export interface AgentPaymentConfig {
  agentIndex: number;
  priceUsdc: bigint;
  agentName: string;
  description: string;
}

function getAgentWallet(index: number): string {
  try {
    return getAgentAccount(index).address;
  } catch {
    return `0x${"0".repeat(39 - index.toString().length)}${index}` as string;
  }
}

export function x402PaymentRequired(agentConfig: AgentPaymentConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const agentWallet = getAgentWallet(agentConfig.agentIndex);
    const paymentHeader = req.headers["x-payment"] as string | undefined;

    if (!paymentHeader) {
      return res.status(402).json({
        x402Version: "1",
        error: "Payment required to access this agent",
        accepts: [
          {
            scheme: "exact",
            network: config.network,
            maxAmountRequired: agentConfig.priceUsdc.toString(),
            resource: `${req.protocol}://${req.get("host")}${req.path}`,
            description: agentConfig.description,
            mimeType: "application/json",
            payTo: agentWallet,
            maxTimeoutSeconds: 120,
            asset: USDC_ADDRESS,
            extra: {
              name: agentConfig.agentName,
              priceFormatted: `$${(Number(agentConfig.priceUsdc) / 1_000_000).toFixed(4)} USDC`,
              basescanExplorer: EXPLORER_URL,
            },
          },
        ],
      });
    }

    // Parse payment header
    let payment: { txHash: string; payer?: string; amount?: string };
    try {
      payment = JSON.parse(Buffer.from(paymentHeader, "base64").toString("utf8"));
    } catch {
      return res.status(400).json({ error: "Invalid X-PAYMENT header format" });
    }

    if (!payment.txHash) {
      return res.status(400).json({ error: "X-PAYMENT missing txHash" });
    }

    const verification = await verifyUsdcTransfer(
      payment.txHash as `0x${string}`,
      agentWallet as `0x${string}`,
      agentConfig.priceUsdc
    );

    if (!verification.valid) {
      return res.status(402).json({
        x402Version: "1",
        error: "Payment verification failed.",
        txHash: payment.txHash,
        expectedTo: agentWallet,
        expectedAmount: agentConfig.priceUsdc.toString(),
      });
    }

    (req as any).paymentVerified = {
      txHash: payment.txHash,
      from: verification.from,
      amount: verification.amount.toString(),
      agentWallet,
      basescanUrl: `${EXPLORER_URL}/tx/${payment.txHash}`,
    };

    next();
  };
}

export function encodePayment(txHash: string, payer?: string, amount?: string): string {
  return Buffer.from(JSON.stringify({ txHash, payer, amount })).toString("base64");
}
