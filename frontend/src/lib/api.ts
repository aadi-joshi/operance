import { Agent, PlatformStats, Transaction } from "./types";

// In production (Vercel HTTPS), use the /backend prefix which is rewritten to EC2 via next.config.js.
// In local dev, NEXT_PUBLIC_BACKEND_URL=http://localhost:3001 from .env.local overrides this.
const RAW = process.env.NEXT_PUBLIC_BACKEND_URL;
const BASE = RAW && RAW.startsWith("http") ? RAW : "/backend";

export async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch(`${BASE}/api/registry/agents`);
  if (!res.ok) throw new Error("Failed to fetch agents");
  return res.json();
}

export async function fetchStats(): Promise<PlatformStats> {
  const res = await fetch(`${BASE}/api/registry/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function fetchTransactions(limit = 20): Promise<Transaction[]> {
  const res = await fetch(`${BASE}/api/orchestrator/transactions?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  return res.json();
}

export async function fetchOrchestratorWallet(): Promise<{
  address: string | null;
  usdcBalance: string;
  basescanUrl: string;
}> {
  const res = await fetch(`${BASE}/api/orchestrator/wallet`);
  if (!res.ok) return { address: null, usdcBalance: "0", basescanUrl: "" };
  return res.json();
}

export function streamOrchestrator(
  task: string,
  onEvent: (event: any) => void,
  onDone: () => void,
  onError: (err: string) => void
): AbortController {
  const controller = new AbortController();

  fetch(`${BASE}/api/orchestrator/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        onError(err.error || "Request failed");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { onError("No stream"); return; }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) { onDone(); break; }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (!data || data === "") continue;
            try {
              const event = JSON.parse(data);
              onEvent(event);
              if (event.type === "done") { onDone(); return; }
            } catch {}
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        onError(err.message || "Connection failed");
      }
    });

  return controller;
}

export function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function truncateHash(hash: string): string {
  if (!hash || hash.length < 10) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

export function formatUsdcAmount(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "$0.000";
  return `$${num.toFixed(4)}`;
}

export function timeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
