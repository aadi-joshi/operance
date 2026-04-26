"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import {
  CheckCircle2, AlertCircle, Loader2, ExternalLink, Info,
  Database, Shield, FileText, Code2, BarChart3, Globe, Image, Cpu,
  type LucideIcon,
} from "lucide-react";
import { clsx } from "clsx";

interface Capability {
  value: string;
  label: string;
  Icon: LucideIcon;
}

const CAPABILITIES: Capability[] = [
  { value: "data_fetching", label: "Data Fetching", Icon: Database },
  { value: "risk_analysis", label: "Risk Analysis", Icon: Shield },
  { value: "report_writing", label: "Report Writing", Icon: FileText },
  { value: "code_review", label: "Code Review", Icon: Code2 },
  { value: "sentiment_analysis", label: "Sentiment Analysis", Icon: BarChart3 },
  { value: "translation", label: "Translation", Icon: Globe },
  { value: "image_generation", label: "Image Generation", Icon: Image },
  { value: "other", label: "Other", Icon: Cpu },
];

const PRICE_PRESETS = [
  { label: "$0.001", value: "0.001" },
  { label: "$0.005", value: "0.005" },
  { label: "$0.010", value: "0.010" },
  { label: "$0.020", value: "0.020" },
  { label: "$0.050", value: "0.050" },
  { label: "Custom", value: "custom" },
];

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    description: "",
    capability: "data_fetching",
    endpointUrl: "",
    baseName: "",
    pricePerRequest: "0.010",
    customPrice: "",
  });

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ agentId: number; txHash?: string } | null>(null);
  const [priceMode, setPriceMode] = useState<string>("0.010");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError("");

    const price = priceMode === "custom" ? form.customPrice : priceMode;

    const RAW = process.env.NEXT_PUBLIC_BACKEND_URL;
    const BACKEND = RAW && RAW.startsWith("http") ? RAW : "/backend";

    try {
      const res = await fetch(`${BACKEND}/api/registry/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          capability: form.capability,
          endpointUrl: form.endpointUrl,
          baseName: form.baseName || `${form.name.toLowerCase().replace(/\s+/g, "")}.base.eth`,
          pricePerRequest: price,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Registration failed");
      }

      const data = await res.json();
      setResult(data);
      setStatus("success");
    } catch (e: any) {
      setError(e.message || "Registration failed");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 pt-28 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <p className="text-[11px] font-semibold text-blue uppercase tracking-[0.15em] mb-2">
            Developer Portal
          </p>
          <h1 className="text-3xl font-bold text-text-primary mb-3">Register an Agent</h1>
          <p className="text-text-secondary text-[15px] leading-relaxed">
            Publish any AI capability behind an x402 endpoint. Earn USDC per request.
            Your agent will be listed in the Operance marketplace and discoverable by the Orchestrator.
          </p>
        </motion.div>

        {status === "success" && result ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border border-green/30 bg-green-dim p-8 text-center"
          >
            <CheckCircle2 size={48} className="text-green mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-text-primary mb-2">Agent Registered</h2>
            <p className="text-text-secondary mb-6">
              Your agent <strong className="text-text-primary">{form.name}</strong> has been added
              to the Operance marketplace.
            </p>
            <div className="inline-flex flex-col items-center gap-3">
              <div className="px-6 py-3 rounded-xl bg-bg-secondary border border-border-default text-[13px] font-mono text-text-secondary">
                Agent ID: #{result.agentId}
              </div>
              {result.txHash && (
                <a
                  href={`https://sepolia.basescan.org/tx/${result.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[12px] text-blue hover:text-blue-light"
                >
                  View onchain registration <ExternalLink size={11} />
                </a>
              )}
              <button
                onClick={() => {
                  setStatus("idle");
                  setResult(null);
                  setForm({ name: "", description: "", capability: "data_fetching", endpointUrl: "", baseName: "", pricePerRequest: "0.010", customPrice: "" });
                }}
                className="mt-2 text-[13px] text-text-muted hover:text-text-secondary underline"
              >
                Register another agent
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Agent Name */}
            <div className="rounded-xl border border-border-default bg-bg-card p-5 space-y-4">
              <h3 className="text-[13px] font-semibold text-text-primary">Agent Identity</h3>

              <div>
                <label className="block text-[12px] text-text-secondary mb-1.5">Agent Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. DataFetcher, CodeReviewer, TranslatorAgent"
                  className="w-full bg-bg-secondary border border-border-default rounded-lg px-3.5 py-2.5 text-[14px] text-text-primary placeholder:text-text-muted outline-none focus:border-border-blue transition-colors"
                />
              </div>

              <div>
                <label className="block text-[12px] text-text-secondary mb-1.5">Description *</label>
                <textarea
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What does your agent do? What inputs does it accept? What does it return?"
                  rows={3}
                  className="w-full bg-bg-secondary border border-border-default rounded-lg px-3.5 py-2.5 text-[14px] text-text-primary placeholder:text-text-muted outline-none focus:border-border-blue transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-[12px] text-text-secondary mb-1.5">Basename (optional)</label>
                <div className="flex items-center">
                  <input
                    value={form.baseName}
                    onChange={(e) => setForm({ ...form, baseName: e.target.value })}
                    placeholder="myagent"
                    className="flex-1 bg-bg-secondary border border-border-default rounded-l-lg px-3.5 py-2.5 text-[14px] text-text-primary placeholder:text-text-muted outline-none focus:border-border-blue transition-colors"
                  />
                  <span className="px-3 py-2.5 bg-bg-tertiary border border-l-0 border-border-default rounded-r-lg text-[12px] text-text-muted font-mono">
                    .base.eth
                  </span>
                </div>
              </div>
            </div>

            {/* Capability */}
            <div className="rounded-xl border border-border-default bg-bg-card p-5">
              <h3 className="text-[13px] font-semibold text-text-primary mb-3">Capability Type</h3>
              <div className="grid grid-cols-4 gap-2">
                {CAPABILITIES.map((cap) => (
                  <button
                    key={cap.value}
                    type="button"
                    onClick={() => setForm({ ...form, capability: cap.value })}
                    className={clsx(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all",
                      form.capability === cap.value
                        ? "border-blue/40 bg-blue-dim text-text-primary"
                        : "border-border-subtle bg-bg-secondary text-text-muted hover:border-border-default"
                    )}
                  >
                    <cap.Icon
                      size={18}
                      className={form.capability === cap.value ? "text-blue-light" : "text-text-muted"}
                    />
                    <span className="text-[10px] font-medium leading-tight">{cap.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Endpoint & Pricing */}
            <div className="rounded-xl border border-border-default bg-bg-card p-5 space-y-4">
              <h3 className="text-[13px] font-semibold text-text-primary">Endpoint &amp; Pricing</h3>

              <div>
                <label className="block text-[12px] text-text-secondary mb-1.5">API Endpoint URL *</label>
                <input
                  required
                  type="url"
                  value={form.endpointUrl}
                  onChange={(e) => setForm({ ...form, endpointUrl: e.target.value })}
                  placeholder="https://your-agent-api.com/execute"
                  className="w-full bg-bg-secondary border border-border-default rounded-lg px-3.5 py-2.5 text-[14px] text-text-primary placeholder:text-text-muted outline-none focus:border-border-blue transition-colors font-mono"
                />
                <p className="mt-1.5 text-[11px] text-text-muted">
                  This endpoint must implement the x402 payment protocol (return 402 when unpaid).
                </p>
              </div>

              <div>
                <label className="block text-[12px] text-text-secondary mb-1.5">Price per Request (USDC)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRICE_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setPriceMode(preset.value)}
                      className={clsx(
                        "px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all",
                        priceMode === preset.value
                          ? "border-blue/40 bg-blue-dim text-blue-light"
                          : "border-border-subtle bg-bg-secondary text-text-muted hover:border-border-default"
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                {priceMode === "custom" && (
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={form.customPrice}
                    onChange={(e) => setForm({ ...form, customPrice: e.target.value })}
                    placeholder="0.025"
                    className="w-40 bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-[14px] text-text-primary outline-none focus:border-border-blue"
                  />
                )}
                <div className="mt-2 flex items-start gap-1.5 text-[11px] text-text-muted">
                  <Info size={11} className="mt-0.5 flex-shrink-0" />
                  <span>Payments go directly to your wallet. Operance takes 1% routing fee on orchestrated requests.</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-dim border border-red/20 text-[13px] text-red">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className={clsx(
                "w-full py-3.5 rounded-xl text-[14px] font-semibold transition-all flex items-center justify-center gap-2",
                status === "loading"
                  ? "bg-bg-tertiary text-text-muted cursor-not-allowed"
                  : "bg-blue text-white hover:bg-blue-light shadow-blue-glow"
              )}
            >
              {status === "loading" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Registering...
                </>
              ) : (
                "Register Agent"
              )}
            </button>
          </motion.form>
        )}
      </div>
    </div>
  );
}
