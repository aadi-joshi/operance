"use client";

import { useEffect, useState } from "react";
import { fetchStats } from "@/lib/api";
import { PlatformStats } from "@/lib/types";
import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";

const DEFAULT_STATS: Partial<PlatformStats> = {
  totalAgents: 5,
  totalRequests: 0,
  totalVolume: 0,
};

interface Stat {
  label: string;
  value: string;
  sub?: string;
  href?: string;
}

export function StatsBar() {
  const [stats, setStats] = useState<Partial<PlatformStats>>(DEFAULT_STATS);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  const items: Stat[] = [
    {
      label: "Agents Active",
      value: String(stats.totalAgents ?? 5),
      sub: "on Base",
    },
    {
      label: "Requests Served",
      value: (stats.totalRequests ?? 0).toLocaleString(),
      sub: "total",
    },
    {
      label: "USDC Transacted",
      value: `$${((stats.totalVolume ?? 0) as number).toFixed(2)}`,
      sub: "on Base",
    },
    {
      label: "Avg Cost / Task",
      value: "$0.033",
      sub: "3 agents",
    },
    {
      label: "Settlement Time",
      value: "< 3s",
      sub: "per payment",
    },
    ...(stats.contractAddress && stats.contractAddress !== "0x0000000000000000000000000000000000000000"
      ? [{
          label: "Registry Contract",
          value: `${stats.contractAddress.slice(0, 6)}...${stats.contractAddress.slice(-4)}`,
          sub: stats.network || "Base Sepolia",
          href: `${stats.explorerUrl}/address/${stats.contractAddress}`,
        }]
      : []),
  ];

  return (
    <div className="border-y border-border-subtle bg-bg-secondary/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 divide-x divide-border-subtle">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="py-4 px-5 first:pl-0 last:pr-0"
            >
              {item.href ? (
                <a href={item.href} target="_blank" rel="noopener noreferrer" className="block group">
                  <div className="flex items-center gap-1">
                    <span className="text-[18px] font-bold text-text-primary font-mono leading-tight">
                      {item.value}
                    </span>
                    <ExternalLink size={10} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-text-muted uppercase tracking-wider">{item.label}</span>
                  </div>
                </a>
              ) : (
                <>
                  <div className="text-[18px] font-bold text-text-primary font-mono leading-tight">
                    {item.value}
                  </div>
                  <div className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">
                    {item.label}
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
