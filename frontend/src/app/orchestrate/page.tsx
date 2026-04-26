"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, ExternalLink, CheckCircle2, Loader2,
  AlertCircle, ChevronDown, ChevronUp, Copy, Check,
  Award, Database, Shield, FileText, Wallet, Zap,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { streamOrchestrator, truncateHash, truncateAddress } from "@/lib/api";
import { OrchestratorEvent, SubTaskInfo } from "@/lib/types";
import { clsx } from "clsx";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { erc20Abi, formatUnits } from "viem";
import { baseSepolia, base } from "viem/chains";

const EXAMPLE_TASKS = [
  "Research the top 3 DeFi protocols by TVL, analyze their risk profiles, and recommend the best option for a risk-averse investor.",
  "Analyze Uniswap, Aave, and Compound. Which should a conservative DeFi investor choose in 2024?",
  "Give me a professional investment brief on the top yield-bearing DeFi protocols on Base.",
  "Compare the risk and return profile of the 3 largest DEXs by trading volume.",
];

const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  [baseSepolia.id]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};

const TASK_COST = 33000n; // $0.033 in USDC 6 decimals
const ORCHESTRATOR_ADDRESS = (
  process.env.NEXT_PUBLIC_ORCHESTRATOR_ADDRESS ||
  "0xDDB7B29F0128fe45E8Ef571e7F85E1588bf7c221"
) as `0x${string}`;

type ExecutionStatus = "idle" | "running" | "completed" | "error";
type PaymentMode = "shared" | "wallet";
type WalletPayStatus = "idle" | "signing" | "confirming" | "done" | "failed";

interface Step {
  id: string;
  type: string;
  status: "pending" | "active" | "done" | "error";
  agentName?: string;
  agentId?: number;
  baseName?: string;
  message: string;
  txHash?: string;
  basescanUrl?: string;
  amount?: string;
  preview?: string;
  timestamp: number;
}

interface CompletedResult {
  report: string;
  recommendation: string;
  topPick: string;
  totalCost: string;
  txCount: number;
  txHashes: string[];
  basescanUrls: string[];
}

import type { LucideIcon } from "lucide-react";
import { BarChart3, Code2 } from "lucide-react";

const AGENT_META: { Icon: LucideIcon; color: string; bg: string }[] = [
  { Icon: Database, color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  { Icon: Shield, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  { Icon: FileText, color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  { Icon: Code2, color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  { Icon: BarChart3, color: "#10b981", bg: "rgba(16,185,129,0.12)" },
];

function StepItem({ step, isLast }: { step: Step; isLast: boolean }) {
  const meta = AGENT_META[step.agentId ?? 0] || AGENT_META[0];
  const { Icon: AgentIcon } = meta;

  const icon = () => {
    if (step.status === "active") return <Loader2 size={14} className="animate-spin text-blue" />;
    if (step.status === "done") return <CheckCircle2 size={14} className="text-green" />;
    if (step.status === "error") return <AlertCircle size={14} className="text-red" />;
    return <div className="w-3.5 h-3.5 rounded-full border border-border-default" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={clsx("relative flex gap-3 pb-5", !isLast && "step-line")}
    >
      <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-bg-secondary border border-border-subtle mt-0.5">
        {icon()}
      </div>

      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          {step.agentName && (
            <span
              className="text-[12px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1.5"
              style={{ background: meta.bg, color: meta.color }}
            >
              <AgentIcon size={11} />
              {step.agentName}
            </span>
          )}
          <span
            className={clsx(
              "text-[13px] font-medium",
              step.status === "active" ? "text-text-primary" : "text-text-secondary"
            )}
          >
            {step.message}
          </span>
        </div>

        {step.txHash && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 flex items-center gap-3 text-[11px] font-mono"
          >
            {step.amount && (
              <span className="text-green font-semibold tabular-nums">{step.amount}</span>
            )}
            <a
              href={step.basescanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-text-muted hover:text-text-secondary transition-colors"
            >
              {truncateHash(step.txHash)}
              <ExternalLink size={10} />
            </a>
            <span className="text-green text-[10px] flex items-center gap-1">
              <CheckCircle2 size={10} /> confirmed
            </span>
          </motion.div>
        )}

        {step.preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-[12px] text-text-muted bg-bg-secondary rounded-lg px-3 py-2 border border-border-subtle"
          >
            {step.preview}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1.5 rounded-md hover:bg-bg-hover transition-colors"
    >
      {copied ? <Check size={13} className="text-green" /> : <Copy size={13} className="text-text-muted" />}
    </button>
  );
}

export default function OrchestratePage() {
  const [task, setTask] = useState("");
  const [status, setStatus] = useState<ExecutionStatus>("idle");
  const [steps, setSteps] = useState<Step[]>([]);
  const [result, setResult] = useState<CompletedResult | null>(null);
  const [subtasks, setSubtasks] = useState<SubTaskInfo[]>([]);
  const [showReport, setShowReport] = useState(true);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("shared");
  const [walletPayStatus, setWalletPayStatus] = useState<WalletPayStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);
  const stepsEndRef = useRef<HTMLDivElement>(null);
  const stepCountRef = useRef(0);

  // Wallet hooks
  const { address, isConnected, chain } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const usdcAddress = chain?.id ? USDC_ADDRESSES[chain.id] : USDC_ADDRESSES[baseSepolia.id];

  const { data: rawBalance } = useReadContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!usdcAddress },
  });

  const usdcBalance = rawBalance !== undefined
    ? parseFloat(formatUnits(rawBalance as bigint, 6))
    : 0;
  const hasEnoughUsdc = usdcBalance >= 0.033;

  useEffect(() => {
    stepsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps]);

  // Reset payment mode if wallet disconnects
  useEffect(() => {
    if (!isConnected && paymentMode === "wallet") {
      setPaymentMode("shared");
    }
  }, [isConnected, paymentMode]);

  const addStep = useCallback((step: Partial<Step> & { type: string; message: string }) => {
    const id = `step-${stepCountRef.current++}`;
    setSteps((prev) => [...prev, { id, status: "done", timestamp: Date.now(), ...step }]);
  }, []);

  const updateLastStep = useCallback((update: Partial<Step>) => {
    setSteps((prev) => {
      if (!prev.length) return prev;
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], ...update };
      return next;
    });
  }, []);

  const handleEvent = useCallback((event: OrchestratorEvent) => {
    switch (event.type) {
      case "started":
        addStep({ type: "started", message: "Orchestrator activated", status: "done" });
        break;

      case "thinking":
        addStep({ type: "thinking", message: event.message, status: "active" });
        break;

      case "decomposed":
        updateLastStep({ status: "done" });
        setSubtasks(event.subtasks || []);
        addStep({
          type: "decomposed",
          message: `Task decomposed into ${event.subtasks?.length ?? 0} agent calls · Est. cost: ${event.totalCost}`,
          status: "done",
        });
        break;

      case "agent_selected":
        addStep({
          type: "agent_selected",
          agentId: event.agentId,
          agentName: event.agentName,
          baseName: event.baseName,
          message: `Hiring ${event.agentName} · ${event.priceFormatted} USDC`,
          status: "active",
        });
        break;

      case "payment_initiated":
        updateLastStep({ message: `Initiating payment to ${event.agentName}...`, status: "active" });
        break;

      case "payment_confirmed":
        updateLastStep({
          message: `Payment to ${event.agentName}`,
          status: "done",
          txHash: event.txHash,
          basescanUrl: event.basescanUrl,
          amount: event.amount,
        });
        break;

      case "agent_processing":
        addStep({
          type: "agent_processing",
          agentId: event.agentId,
          agentName: event.agentName,
          message: `${event.agentName} processing...`,
          status: "active",
        });
        break;

      case "agent_responded":
        updateLastStep({
          message: `${event.agentName} completed`,
          status: "done",
          preview: event.preview,
        });
        break;

      case "assembling":
        addStep({ type: "assembling", message: event.message, status: "active" });
        break;

      case "user_payment_verifying":
        addStep({
          type: "user_payment_verifying",
          message: "Verifying your payment on Base...",
          status: "active",
        });
        break;

      case "user_payment_verified":
        updateLastStep({
          message: "Your payment verified",
          status: "done",
          txHash: event.txHash,
          basescanUrl: event.basescanUrl,
          amount: event.amount,
        });
        break;

      case "completed":
        updateLastStep({ status: "done" });
        addStep({
          type: "completed",
          message: `Done · ${event.totalCost} · ${event.txCount} txs · ${new Date().toLocaleTimeString()}`,
          status: "done",
        });
        setResult({
          report: event.report,
          recommendation: event.recommendation,
          topPick: event.topPick,
          totalCost: event.totalCost,
          txCount: event.txCount,
          txHashes: event.txHashes || [],
          basescanUrls: event.basescanUrls || [],
        });
        setStatus("completed");
        break;

      case "error":
        updateLastStep({ status: "error" });
        addStep({ type: "error", message: event.message, status: "error" });
        setStatus("error");
        break;
    }
  }, [addStep, updateLastStep]);

  const startStream = useCallback((taskText: string, userTxHash?: string) => {
    setStatus("running");
    setSteps([]);
    setResult(null);
    setSubtasks([]);
    stepCountRef.current = 0;

    abortRef.current = streamOrchestrator(
      taskText,
      handleEvent,
      () => setStatus((prev) => prev === "running" ? "completed" : prev),
      (err) => {
        addStep({ type: "error", message: err, status: "error" });
        setStatus("error");
      },
      userTxHash,
    );
  }, [handleEvent, addStep]);

  const execute = useCallback(() => {
    if (!task.trim() || status === "running") return;
    startStream(task.trim());
  }, [task, status, startStream]);

  const executeWithWallet = useCallback(async () => {
    if (!task.trim() || status === "running" || !address || !publicClient) return;

    setWalletPayStatus("signing");

    try {
      const txHash = await writeContractAsync({
        address: usdcAddress,
        abi: erc20Abi,
        functionName: "transfer",
        args: [ORCHESTRATOR_ADDRESS, TASK_COST],
        chain,
        account: address,
      } as any);

      setWalletPayStatus("confirming");

      await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });

      setWalletPayStatus("done");
      startStream(task.trim(), txHash);
    } catch (err: any) {
      setWalletPayStatus("failed");
      const isRejected = err?.code === 4001 ||
        err?.message?.toLowerCase().includes("rejected") ||
        err?.message?.toLowerCase().includes("denied");
      if (!isRejected) {
        addStep({
          type: "error",
          message: "Payment failed: " + (err?.shortMessage || err?.message || "Unknown error"),
          status: "error",
        });
        setStatus("error");
      }
      setTimeout(() => setWalletPayStatus("idle"), 2000);
    }
  }, [task, status, address, usdcAddress, writeContractAsync, publicClient, startStream, addStep]);

  const handleExecute = useCallback(() => {
    if (paymentMode === "wallet" && isConnected) {
      executeWithWallet();
    } else {
      execute();
    }
  }, [paymentMode, isConnected, executeWithWallet, execute]);

  const cancel = () => {
    abortRef.current?.abort();
    setStatus("idle");
  };

  const reset = () => {
    setStatus("idle");
    setSteps([]);
    setResult(null);
    setSubtasks([]);
    setTask("");
    setWalletPayStatus("idle");
  };

  const isWalletExecuting = walletPayStatus === "signing" || walletPayStatus === "confirming";
  const executeButtonDisabled = !task.trim() || status === "running" || isWalletExecuting;

  return (
    <div className="min-h-screen bg-bg-primary">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 pt-28 pb-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue rounded-xl flex items-center justify-center">
              <ArrowRight size={16} className="text-white" />
            </div>
            <span className="text-[11px] font-semibold text-blue uppercase tracking-[0.15em]">
              Orchestrator
            </span>
          </div>
          <h1 className="text-4xl font-bold text-text-primary mb-3">
            AI agents hiring AI agents.
          </h1>
          <p className="text-text-secondary text-[15px] max-w-2xl leading-relaxed">
            Submit any complex task. The Orchestrator decomposes it, discovers specialized agents
            in the marketplace, pays each via x402 on Base, and assembles your result.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          {/* Main panel */}
          <div className="space-y-4">
            {/* Task input */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-xl border border-border-default bg-bg-card overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
                <span className="text-[12px] font-medium text-text-secondary">Task Input</span>
                {status === "idle" && (
                  <span className="text-[11px] text-text-muted">
                    Est. cost: ~$0.033 USDC (3 agents)
                  </span>
                )}
              </div>
              <div className="p-4">
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="Describe any complex research or analysis task..."
                  disabled={status === "running" || isWalletExecuting}
                  className={clsx(
                    "w-full bg-transparent text-[14px] text-text-primary placeholder:text-text-muted resize-none outline-none leading-relaxed",
                    "min-h-[100px] font-sans"
                  )}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleExecute();
                  }}
                />
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
                  <span className="text-[11px] text-text-muted">
                    {isWalletExecuting
                      ? walletPayStatus === "signing"
                        ? "Waiting for wallet signature..."
                        : "Confirming on Base..."
                      : status === "running"
                      ? "Running..."
                      : "Cmd+Enter to run"}
                  </span>
                  <div className="flex gap-2">
                    {status === "running" && (
                      <button
                        onClick={cancel}
                        className="px-3 py-1.5 rounded-lg border border-border-default text-[12px] text-text-muted hover:text-text-primary transition-all"
                      >
                        Cancel
                      </button>
                    )}
                    {(status === "completed" || status === "error") && (
                      <button
                        onClick={reset}
                        className="px-3 py-1.5 rounded-lg border border-border-default text-[12px] text-text-muted hover:text-text-primary transition-all"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      onClick={handleExecute}
                      disabled={executeButtonDisabled}
                      className={clsx(
                        "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all",
                        !executeButtonDisabled
                          ? "bg-blue text-white hover:bg-blue-light shadow-blue-glow"
                          : "bg-bg-tertiary text-text-muted cursor-not-allowed"
                      )}
                    >
                      {isWalletExecuting ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          {walletPayStatus === "signing" ? "Confirm in wallet" : "Confirming..."}
                        </>
                      ) : status === "running" ? (
                        <>
                          <Loader2 size={13} className="animate-spin" />
                          Executing
                        </>
                      ) : paymentMode === "wallet" ? (
                        <>
                          <Wallet size={13} />
                          Pay &amp; Execute
                        </>
                      ) : (
                        <>
                          Execute
                          <ArrowRight size={13} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Example tasks */}
            {status === "idle" && !steps.length && !isWalletExecuting && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="space-y-2"
              >
                <p className="text-[11px] text-text-muted uppercase tracking-wider px-1">Try an example</p>
                {EXAMPLE_TASKS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setTask(ex)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-border-subtle bg-bg-secondary hover:border-border-default hover:bg-bg-hover transition-all text-[13px] text-text-secondary leading-relaxed group"
                  >
                    <span className="text-text-muted mr-2">-&gt;</span>
                    {ex}
                  </button>
                ))}
              </motion.div>
            )}

            {/* Wallet pay loading state */}
            <AnimatePresence>
              {isWalletExecuting && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-blue/30 bg-blue-dim p-4 flex items-center gap-3"
                >
                  <Loader2 size={16} className="animate-spin text-blue flex-shrink-0" />
                  <div>
                    <div className="text-[13px] font-medium text-text-primary">
                      {walletPayStatus === "signing"
                        ? "Approve the transaction in your wallet"
                        : "Waiting for Base confirmation..."}
                    </div>
                    <div className="text-[11px] text-text-muted mt-0.5">
                      Sending $0.033 USDC to orchestrator
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Execution steps */}
            <AnimatePresence>
              {steps.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border-default bg-bg-card overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {status === "running" && (
                        <div className="relative w-2 h-2">
                          <div className="w-2 h-2 rounded-full bg-blue" />
                          <div className="absolute inset-0 w-2 h-2 rounded-full bg-blue animate-ping opacity-75" />
                        </div>
                      )}
                      {status === "completed" && <CheckCircle2 size={14} className="text-green" />}
                      {status === "error" && <AlertCircle size={14} className="text-red" />}
                      <span className="text-[12px] font-medium text-text-secondary">
                        {status === "running" ? "Executing..." : status === "completed" ? "Complete" : "Execution Log"}
                      </span>
                    </div>
                    {status === "completed" && result && (
                      <span className="text-[11px] font-mono text-green tabular-nums">
                        {result.totalCost} · {result.txCount} txs
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    {steps.map((step, i) => (
                      <StepItem key={step.id} step={step} isLast={i === steps.length - 1} />
                    ))}
                    <div ref={stepsEndRef} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Final report */}
            <AnimatePresence>
              {result && status === "completed" && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border-default bg-bg-card overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-green" />
                      <span className="text-[12px] font-semibold text-text-primary">
                        Research Report
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {result.report && <CopyButton text={result.report} />}
                      <button
                        onClick={() => setShowReport(!showReport)}
                        className="p-1.5 rounded-md hover:bg-bg-hover transition-colors"
                      >
                        {showReport ? (
                          <ChevronUp size={13} className="text-text-muted" />
                        ) : (
                          <ChevronDown size={13} className="text-text-muted" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Transactions */}
                  <div className="px-4 py-3 border-b border-border-subtle bg-bg-secondary/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-text-muted uppercase tracking-wider">
                        Onchain Transactions
                      </span>
                      <span className="text-[11px] text-green font-mono font-semibold tabular-nums">
                        {result.totalCost} total
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.basescanUrls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-tertiary border border-border-subtle hover:border-border-default transition-all text-[11px] font-mono text-text-secondary hover:text-text-primary group"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-green flex-shrink-0" />
                          {truncateHash(result.txHashes[i])}
                          <ExternalLink size={9} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Report content */}
                  {showReport && result.report && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-5"
                    >
                      {result.topPick && (
                        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-dim border border-green/20">
                          <Award size={20} className="text-green flex-shrink-0" />
                          <div>
                            <div className="text-[10px] text-green/70 uppercase tracking-wider font-medium">Top Pick</div>
                            <div className="text-[14px] font-semibold text-text-primary">{result.topPick}</div>
                          </div>
                          {result.recommendation && (
                            <p className="text-[12px] text-text-secondary ml-4">{result.recommendation}</p>
                          )}
                        </div>
                      )}
                      <div className="report-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.report}</ReactMarkdown>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Payment Method - only show when wallet connected and idle */}
            <AnimatePresence>
              {isConnected && (status === "idle" || status === "error") && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-border-default bg-bg-card p-4"
                >
                  <p className="text-[11px] text-text-muted uppercase tracking-wider mb-3">Payment Method</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => setPaymentMode("shared")}
                      className={clsx(
                        "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                        paymentMode === "shared"
                          ? "border-blue/30 bg-blue-dim"
                          : "border-border-subtle bg-bg-secondary hover:border-border-default"
                      )}
                    >
                      <div>
                        <div className="text-[12px] font-medium text-text-primary">Shared pool</div>
                        <div className="text-[11px] text-text-muted">Demo orchestrator funds</div>
                      </div>
                      <span className="text-[11px] text-green font-mono font-semibold">Free</span>
                    </button>

                    <button
                      onClick={() => hasEnoughUsdc && setPaymentMode("wallet")}
                      className={clsx(
                        "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all",
                        paymentMode === "wallet"
                          ? "border-blue/30 bg-blue-dim"
                          : "border-border-subtle bg-bg-secondary",
                        hasEnoughUsdc
                          ? "hover:border-border-default cursor-pointer"
                          : "opacity-40 cursor-not-allowed"
                      )}
                    >
                      <div>
                        <div className="text-[12px] font-medium text-text-primary flex items-center gap-1.5">
                          <Wallet size={12} className="text-blue" />
                          Your wallet
                        </div>
                        <div className="text-[11px] text-text-muted font-mono tabular-nums">
                          {usdcBalance.toFixed(2)} USDC available
                          {!hasEnoughUsdc && " (need $0.033)"}
                        </div>
                      </div>
                      <span className="text-[11px] text-text-primary font-mono tabular-nums">$0.033</span>
                    </button>
                  </div>
                  {paymentMode === "wallet" && (
                    <p className="text-[10px] text-text-muted mt-2 leading-relaxed">
                      $0.033 USDC transfers from your wallet to the orchestrator before execution begins.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Agent pipeline */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="rounded-xl border border-border-default bg-bg-card p-4"
            >
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-3">Agent Pipeline</p>
              <div className="space-y-3">
                {[
                  { id: 0, name: "DataFetcher", price: "$0.008", Icon: Database, color: "#3b82f6", bg: "rgba(59,130,246,0.12)", desc: "Fetches DeFi data" },
                  { id: 1, name: "RiskAnalyzer", price: "$0.015", Icon: Shield, color: "#f59e0b", bg: "rgba(245,158,11,0.12)", desc: "Risk assessment" },
                  { id: 2, name: "ReportWriter", price: "$0.010", Icon: FileText, color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", desc: "Report generation" },
                ].map((agent) => {
                  const completed = steps.some(
                    (s) => s.agentId === agent.id && s.txHash && s.status === "done"
                  );
                  const active = steps.some(
                    (s) => s.agentId === agent.id && s.status === "active"
                  );
                  return (
                    <div
                      key={agent.id}
                      className={clsx(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all",
                        completed
                          ? "border-green/30 bg-green-dim"
                          : active
                          ? "border-blue/30 bg-blue-dim"
                          : "border-border-subtle bg-bg-secondary"
                      )}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: agent.bg }}
                      >
                        <agent.Icon size={16} style={{ color: agent.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-medium text-text-primary">{agent.name}</span>
                          <span className="text-[11px] font-mono text-text-muted tabular-nums">{agent.price}</span>
                        </div>
                        <span className="text-[11px] text-text-muted">{agent.desc}</span>
                      </div>
                      <div className="flex-shrink-0">
                        {completed && <CheckCircle2 size={14} className="text-green" />}
                        {active && <Loader2 size={14} className="animate-spin text-blue" />}
                        {!completed && !active && <div className="w-3.5 h-3.5 rounded-full border border-border-default" />}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
                <span className="text-[11px] text-text-muted">Total cost</span>
                <span className="text-[13px] font-mono font-semibold text-text-primary tabular-nums">$0.033 USDC</span>
              </div>
            </motion.div>

            {/* x402 info */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="rounded-xl border border-border-default bg-bg-card p-4"
            >
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-3">x402 Protocol</p>
              <div className="space-y-2.5 text-[12px]">
                <div className="flex items-start gap-2">
                  <span className="text-blue mt-0.5">-&gt;</span>
                  <span className="text-text-secondary">Each agent call returns HTTP 402 requiring USDC payment</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue mt-0.5">-&gt;</span>
                  <span className="text-text-secondary">Orchestrator pays from its Base wallet</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue mt-0.5">-&gt;</span>
                  <span className="text-text-secondary">Every payment is an onchain USDC transfer on Base</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue mt-0.5">-&gt;</span>
                  <span className="text-text-secondary">Payment verified by parsing ERC-20 Transfer event</span>
                </div>
              </div>
              <a
                href="https://x402.org"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-1 text-[11px] text-blue hover:text-blue-light transition-colors"
              >
                x402.org -- open standard
                <ExternalLink size={10} />
              </a>
            </motion.div>

            {/* Network info */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-xl border border-border-default bg-bg-card p-4"
            >
              <p className="text-[11px] text-text-muted uppercase tracking-wider mb-3">Network</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative w-2 h-2">
                    <div className="w-2 h-2 rounded-full bg-green" />
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-green animate-ping opacity-50" />
                  </div>
                  <span className="text-[13px] text-text-primary font-medium">
                    {process.env.NEXT_PUBLIC_NETWORK === "base" ? "Base Mainnet" : "Base Sepolia"}
                  </span>
                </div>
                <a
                  href={`https://${process.env.NEXT_PUBLIC_NETWORK === "base" ? "" : "sepolia."}basescan.org`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-text-muted hover:text-text-secondary flex items-center gap-1"
                >
                  Basescan <ExternalLink size={9} />
                </a>
              </div>
              <div className="mt-3 text-[11px] text-text-muted space-y-1 font-mono tabular-nums">
                <div>USDC: 0x036C...F7e</div>
                <div>Settlement: ~2s per tx</div>
                <div>Gas: ~$0.0001/tx</div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
