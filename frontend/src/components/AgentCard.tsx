"use client";

import { motion } from "framer-motion";
import { ExternalLink, Database, Shield, FileText, Code2, BarChart3, type LucideIcon } from "lucide-react";
import { Agent, CAPABILITY_META } from "@/lib/types";
import { truncateAddress } from "@/lib/api";
import Link from "next/link";

interface AgentCardProps {
  agent: Agent;
  index?: number;
  featured?: boolean;
}

const CAPABILITY_ICONS: Record<string, LucideIcon> = {
  data_fetching: Database,
  risk_analysis: Shield,
  report_writing: FileText,
  code_review: Code2,
  sentiment_analysis: BarChart3,
};

const GRADIENT_CLASSES: Record<string, string> = {
  data_fetching: "from-blue-500/10 to-transparent",
  risk_analysis: "from-amber-500/10 to-transparent",
  report_writing: "from-purple-500/10 to-transparent",
  code_review: "from-red-500/10 to-transparent",
  sentiment_analysis: "from-emerald-500/10 to-transparent",
};

export function AgentCard({ agent, index = 0, featured = false }: AgentCardProps) {
  const meta = CAPABILITY_META[agent.capability] || {
    color: "#0052ff",
    label: "Agent",
  };

  const CapIcon = CAPABILITY_ICONS[agent.capability] || Database;
  const gradientClass = GRADIENT_CLASSES[agent.capability] || "from-blue/10 to-transparent";

  return (
    <Link href={`/agents/${agent.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, duration: 0.3 }}
        className="group relative rounded-xl border border-border-default bg-bg-card hover:border-border-blue transition-all duration-300 overflow-hidden cursor-pointer shadow-card hover:shadow-card-hover"
      >
        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

        <div className="relative p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}25` }}
              >
                <CapIcon size={18} style={{ color: meta.color }} />
              </div>
              <div>
                <h3 className="font-semibold text-[15px] text-text-primary leading-tight">
                  {agent.name}
                </h3>
                <p className="text-[11px] text-text-muted font-mono mt-0.5">{agent.baseName}</p>
              </div>
            </div>
            <div
              className="px-2 py-0.5 rounded-md text-[10px] font-medium"
              style={{
                background: `${meta.color}15`,
                color: meta.color,
                border: `1px solid ${meta.color}20`,
              }}
            >
              {meta.label}
            </div>
          </div>

          {/* Description */}
          <p className="text-[13px] text-text-secondary leading-relaxed mb-4 line-clamp-2">
            {agent.description}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 bg-bg-secondary rounded-lg px-3 py-2">
              <div className="text-[10px] text-text-muted mb-0.5 uppercase tracking-wider">Price</div>
              <div className="text-[14px] font-semibold text-text-primary tabular-nums font-mono">
                {agent.priceFormatted}
                <span className="text-[10px] text-text-muted font-normal ml-1">USDC</span>
              </div>
            </div>
            <div className="flex-1 bg-bg-secondary rounded-lg px-3 py-2">
              <div className="text-[10px] text-text-muted mb-0.5 uppercase tracking-wider">Requests</div>
              <div className="text-[14px] font-semibold text-text-primary tabular-nums font-mono">
                {agent.totalRequests.toLocaleString()}
              </div>
            </div>
            <div className="flex-1 bg-bg-secondary rounded-lg px-3 py-2">
              <div className="text-[10px] text-text-muted mb-0.5 uppercase tracking-wider">Earned</div>
              <div className="text-[14px] font-semibold text-green tabular-nums font-mono">
                ${parseFloat(agent.totalEarned).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <a
              href={agent.basescanUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-secondary transition-colors font-mono"
            >
              <span>{truncateAddress(agent.paymentWallet)}</span>
              <ExternalLink size={10} />
            </a>

            <div
              onClick={(e) => e.preventDefault()}
            >
              <Link
                href="/orchestrate"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue text-white text-[12px] font-medium hover:bg-blue-light transition-all group/btn"
              >
                Hire
                <span className="group-hover/btn:translate-x-0.5 transition-transform">-&gt;</span>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
