import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_FILE = path.join(DATA_DIR, "operance.json");

interface DB {
  transactions: TxRecord[];
  agents: AgentCache[];
  runs: RunRecord[];
}

export interface TxRecord {
  txHash: string;
  agentId: number | string;
  agentName: string;
  payer: string;
  agentWallet: string;
  amountUsdc: string;
  timestamp?: number;
  task?: string;
  resultPreview?: string;
}

export interface AgentCache {
  id: number;
  name: string;
  description: string;
  capability: string;
  endpointUrl: string;
  baseName: string;
  paymentWallet: string;
  pricePerRequest: string;
  totalRequests: number;
  totalEarned: string;
  active: boolean;
}

export interface RunRecord {
  runId: string;
  task: string;
  status: string;
  totalCost?: string;
  totalTxs?: number;
  txHashes?: string[];
  result?: string;
  createdAt: number;
  completedAt?: number;
}

function readDB(): DB {
  if (!fs.existsSync(DB_FILE)) {
    return { transactions: [], agents: [], runs: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch {
    return { transactions: [], agents: [], runs: [] };
  }
}

function writeDB(db: DB) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

export const store = {
  recordTransaction(tx: TxRecord) {
    const db = readDB();
    // Avoid duplicates
    if (!db.transactions.find((t) => t.txHash === tx.txHash)) {
      db.transactions.unshift({ ...tx, timestamp: tx.timestamp || Math.floor(Date.now() / 1000) });
      db.transactions = db.transactions.slice(0, 200); // Keep last 200
      writeDB(db);
    }
  },

  getRecentTransactions(limit = 20): TxRecord[] {
    const db = readDB();
    return db.transactions.slice(0, limit);
  },

  getPlatformStats(): { totalTxs: number; totalVolume: number } {
    const db = readDB();
    const totalTxs = db.transactions.length;
    const totalVolume = db.transactions.reduce(
      (sum, tx) => sum + parseFloat(tx.amountUsdc || "0"),
      0
    );
    return { totalTxs, totalVolume };
  },

  cacheAgent(agent: AgentCache) {
    const db = readDB();
    const idx = db.agents.findIndex((a) => a.id === agent.id);
    if (idx >= 0) {
      db.agents[idx] = agent;
    } else {
      db.agents.push(agent);
    }
    writeDB(db);
  },

  getCachedAgents(includeInactive = false): AgentCache[] {
    const db = readDB();
    return includeInactive ? db.agents : db.agents.filter((a) => a.active);
  },

  startRun(runId: string, task: string) {
    const db = readDB();
    db.runs.unshift({ runId, task, status: "running", createdAt: Math.floor(Date.now() / 1000) });
    db.runs = db.runs.slice(0, 50);
    writeDB(db);
  },

  completeRun(runId: string, status: string, totalCost: string, txHashes: string[], result: string) {
    const db = readDB();
    const run = db.runs.find((r) => r.runId === runId);
    if (run) {
      run.status = status;
      run.totalCost = totalCost;
      run.totalTxs = txHashes.length;
      run.txHashes = txHashes;
      run.result = result;
      run.completedAt = Math.floor(Date.now() / 1000);
      writeDB(db);
    }
  },

  getRecentRuns(limit = 10): RunRecord[] {
    const db = readDB();
    return db.runs.slice(0, limit);
  },
};

export default store;
