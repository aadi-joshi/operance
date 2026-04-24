"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ExternalLink, ArrowLeft, Zap, Copy, Check } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { fetchAgents, truncateAddress } from "@/lib/api";
import { Agent, CAPABILITY_META } from "@/lib/types";

export default function AgentDetailPage() {
  const { id } = useParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchAgents()
      .then((agents) => {
        const found = agents.find((a) => String(a.id) === String(id));
        setAgent(found || null);
      })
      .catch(() => setAgent(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Navbar />
        <div className="max-w-3xl mx-auto px-6 pt-28">
          <div className="h-64 rounded-xl bg-bg-card animate-pulse" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <Navbar />
        <div className="max-w-3xl mx-auto px-6 pt-28 text-center">
          <p className="text-text-muted text-[16px] mb-4">Agent not found.</p>
          <Link href="/" className="text-blue hover:underline text-[14px]">← Back to Marketplace</Link>
        </div>
      </div>
    );
  }

  const meta = CAPABILITY_META[agent.capability] || { icon: "🤖", color: "#0052ff", label: "Agent" };

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 pt-28 pb-20">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text-secondary mb-8 transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Marketplace
          </Link>

          {/* Agent Header */}
          <div className="rounded-xl border border-border-default bg-bg-card p-6 mb-5">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}20` }}
              >
                {meta.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold text-text-primary">{agent.name}</h1>
                    <p className="text-text-muted font-mono text-[13px] mt-0.5">{agent.baseName}</p>
                  </div>
                  <div
                    className="px-3 py-1 rounded-full text-[11px] font-medium"
                    style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}20` }}
                  >
                    {meta.label}
                  </div>
                </div>
                <p className="text-[14px] text-text-secondary mt-3 leading-relaxed">{agent.description}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            {[
              { label: "Price / Request", value: agent.priceFormatted, sub: "USDC" },
              { label: "Total Requests", value: agent.totalRequests.toLocaleString(), sub: "served" },
              { label: "Total Earned", value: `$${parseFloat(agent.totalEarned).toFixed(4)}`, sub: "USDC" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border-default bg-bg-card p-4">
                <div className="text-[22px] font-bold text-text-primary font-mono">{stat.value}</div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Wallet */}
          <div className="rounded-xl border border-border-default bg-bg-card p-5 mb-5">
            <h3 className="text-[12px] text-text-muted uppercase tracking-wider mb-3">Payment Wallet</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green" />
                <code className="text-[13px] font-mono text-text-secondary">{agent.paymentWallet}</code>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(agent.paymentWallet);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-1.5 rounded hover:bg-bg-hover transition-colors"
                >
                  {copied ? <Check size={13} className="text-green" /> : <Copy size={13} className="text-text-muted" />}
                </button>
                <a
                  href={agent.basescanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[12px] text-blue hover:text-blue-light"
                >
                  Basescan <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </div>

          {/* x402 Integration */}
          <div className="rounded-xl border border-border-default bg-bg-card p-5 mb-5">
            <h3 className="text-[12px] text-text-muted uppercase tracking-wider mb-3">x402 Integration</h3>
            <div className="bg-bg-secondary rounded-lg p-4 font-mono text-[12px] text-text-secondary overflow-x-auto">
              <div className="text-text-muted mb-1"># Try this agent directly via x402</div>
              <div>
                <span className="text-blue">curl</span>
                <span> -X POST {agent.endpointUrl} \</span>
              </div>
              <div>
                <span>{"  -H 'Content-Type: application/json' \\"}</span>
              </div>
              <div>
                <span>{"  -d '{\"query\": \"your task here\"}'"}  </span>
              </div>
              <div className="mt-2 text-text-muted"># Returns 402 with payment spec</div>
              <div className="text-text-muted"># Pay {agent.priceFormatted} USDC to {truncateAddress(agent.paymentWallet)}</div>
              <div className="text-text-muted"># Include X-PAYMENT header and retry</div>
            </div>
          </div>

          {/* CTA */}
          <Link
            href="/orchestrate"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-blue text-white rounded-xl text-[14px] font-semibold hover:bg-blue-light transition-all shadow-blue-glow group"
          >
            <Zap size={16} fill="white" />
            Hire via Orchestrator
            <ArrowLeft size={14} className="rotate-180 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
