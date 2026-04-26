import { Router, Request, Response } from "express";
import { executeOrchestrator } from "../services/orchestratorService";
import { getOrchestratorAccount, getUsdcBalance } from "../services/walletService";
import { store } from "../db/store";
import { EXPLORER_URL } from "../config";

const router = Router();

// SSE endpoint — main orchestrator execution
router.post("/execute", async (req: Request, res: Response) => {
  const { task, userTxHash } = req.body;

  if (!task || typeof task !== "string" || task.trim().length < 5) {
    return res.status(400).json({ error: "Task must be at least 5 characters." });
  }

  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Keep alive ping
  const keepAlive = setInterval(() => {
    res.write(": ping\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(keepAlive);
  });

  try {
    await executeOrchestrator(task.trim(), res, userTxHash);
  } catch (e: any) {
    res.write(`data: ${JSON.stringify({ type: "error", message: e.message })}\n\n`);
  } finally {
    clearInterval(keepAlive);
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  }
});

// Orchestrator wallet info
router.get("/wallet", async (_req: Request, res: Response) => {
  try {
    const account = getOrchestratorAccount();
    const balance = await getUsdcBalance(account.address);
    res.json({
      address: account.address,
      usdcBalance: balance,
      basescanUrl: `${EXPLORER_URL}/address/${account.address}`,
    });
  } catch {
    res.json({ address: null, usdcBalance: "0", error: "Wallet not configured" });
  }
});

// Recent runs
router.get("/history", (_req: Request, res: Response) => {
  const runs = store.getRecentRuns(10);
  res.json(runs);
});

// Recent transactions (for live feed)
router.get("/transactions", (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const txs = store.getRecentTransactions(limit);
  res.json(
    txs.map((tx) => ({
      txHash: tx.txHash,
      agentName: tx.agentName,
      agentId: tx.agentId,
      payer: tx.payer,
      agentWallet: tx.agentWallet,
      amountUsdc: tx.amountUsdc,
      timestamp: tx.timestamp,
      basescanUrl: `${EXPLORER_URL}/tx/${tx.txHash}`,
    }))
  );
});

export default router;
