import { Router, Request, Response } from "express";
import { getAgents, syncAgentsFromChain, getPlatformStats } from "../services/registryService";
import { EXPLORER_URL, config } from "../config";
import { deriveAllAddresses } from "../services/walletService";
import { store } from "../db/store";

const router = Router();

// Get all agents
router.get("/agents", async (_req: Request, res: Response) => {
  try {
    const agents = await getAgents();
    res.json(
      agents.map((a) => ({
        ...a,
        basescanUrl: `${EXPLORER_URL}/address/${a.paymentWallet}`,
        priceFormatted: `$${parseFloat(a.pricePerRequest).toFixed(4)}`,
      }))
    );
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Register a new agent (from frontend form)
router.post("/register", async (req: Request, res: Response) => {
  const { name, description, capability, endpointUrl, baseName, pricePerRequest } = req.body;

  if (!name || !description || !endpointUrl) {
    return res.status(400).json({ error: "name, description, and endpointUrl are required" });
  }

  const priceNum = parseFloat(pricePerRequest || "0.010");
  if (isNaN(priceNum) || priceNum < 0.001) {
    return res.status(400).json({ error: "Price must be at least $0.001 USDC" });
  }

  // For now, register locally (the deployer will optionally push to contract)
  const existingAgents = store.getCachedAgents(true);
  const newId = existingAgents.length > 0 ? Math.max(...existingAgents.map((a) => a.id)) + 1 : 10;

  const newAgent = {
    id: newId,
    name,
    description,
    capability: capability || "other",
    endpointUrl,
    baseName: baseName || `${name.toLowerCase().replace(/\s+/g, "")}.base.eth`,
    paymentWallet: "0x0000000000000000000000000000000000000000", // user-provided in production
    pricePerRequest: priceNum.toFixed(6),
    totalRequests: 0,
    totalEarned: "0",
    active: true,
  };

  store.cacheAgent(newAgent);

  res.json({
    success: true,
    agentId: newId,
    message: "Agent registered in marketplace. To register onchain, deploy contracts and re-register.",
  });
});

// Sync from chain
router.post("/sync", async (_req: Request, res: Response) => {
  try {
    const agents = await syncAgentsFromChain();
    res.json({ synced: agents.length, agents });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Platform stats
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await getPlatformStats();
    res.json({ ...stats, explorerUrl: EXPLORER_URL });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Wallet addresses (for setup)
router.get("/wallets", (_req: Request, res: Response) => {
  try {
    const addresses = deriveAllAddresses();
    res.json({
      addresses,
      network: config.network,
      note: "Fund the orchestrator wallet with USDC + ETH for gas before running the demo",
    });
  } catch {
    res.json({ error: "Mnemonic not configured. Set AGENT_MASTER_MNEMONIC in .env" });
  }
});

export default router;
