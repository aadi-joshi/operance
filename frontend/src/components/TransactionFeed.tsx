"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { fetchTransactions } from "@/lib/api";
import { Transaction } from "@/lib/types";
import { truncateHash, truncateAddress, timeAgo } from "@/lib/api";
import { CAPABILITY_META } from "@/lib/types";

const AGENT_CAPABILITY_KEYS = ["data_fetching", "risk_analysis", "report_writing", "code_review", "sentiment_analysis"];

interface TransactionFeedProps {
  newTxs?: Transaction[];
}

export function TransactionFeed({ newTxs = [] }: TransactionFeedProps) {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const prevNewTxsRef = useRef<string[]>([]);

  useEffect(() => {
    fetchTransactions(15)
      .then((data) => {
        if (data.length > 0) setTxs(data);
      })
      .catch(() => {});
  }, []);

  // Inject new txs from orchestrator execution
  useEffect(() => {
    if (!newTxs.length) return;
    const newHashes = newTxs.map((t) => t.txHash);
    const added = newHashes.filter((h) => !prevNewTxsRef.current.includes(h));
    if (added.length > 0) {
      setTxs((prev) => [...newTxs.filter((t) => added.includes(t.txHash)), ...prev].slice(0, 20));
      prevNewTxsRef.current = newHashes;
    }
  }, [newTxs]);

  // Poll for new transactions
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTransactions(15)
        .then((data) => {
          if (data.length > 0) setTxs(data);
        })
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl border border-border-default bg-bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="relative w-2 h-2">
            <div className="w-2 h-2 rounded-full bg-green" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-green animate-ping opacity-50" />
          </div>
          <span className="text-[12px] font-semibold text-text-primary uppercase tracking-wider">
            Live Activity
          </span>
        </div>
        <span className="text-[11px] text-text-muted">Base {process.env.NEXT_PUBLIC_NETWORK === "base" ? "Mainnet" : "Sepolia"}</span>
      </div>

      {txs.length === 0 ? (
        <div className="px-4 py-8 text-center text-[12px] text-text-muted">
          No transactions yet -- run a task to see live onchain activity here.
        </div>
      ) : null}

      <div className="divide-y divide-border-subtle">
        <AnimatePresence>
          {txs.slice(0, 8).map((tx, i) => {
            const capKey = AGENT_CAPABILITY_KEYS[tx.agentId] || "data_fetching";
            const meta = CAPABILITY_META[capKey] || { color: "#0052ff" };

            return (
              <motion.a
                key={tx.txHash}
                href={tx.basescanUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-bg-hover transition-colors group"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${meta.color}18` }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ background: meta.color }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-text-primary">{tx.agentName}</span>
                    <span className="text-[11px] font-semibold text-green tabular-nums font-mono">
                      ${parseFloat(tx.amountUsdc).toFixed(4)} USDC
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-text-muted font-mono">
                      {truncateHash(tx.txHash)}
                    </span>
                    <span className="text-text-muted">·</span>
                    <span className="text-[11px] text-text-muted">
                      {timeAgo(tx.timestamp)}
                    </span>
                  </div>
                </div>
                <ExternalLink size={12} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </motion.a>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
