import OpenAI from "openai";
import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { config, EXPLORER_URL } from "../config";
import {
  getOrchestratorAccount,
  getAgentAccount,
  transferUsdc,
  getUsdcBalance,
} from "./walletService";
import { dataFetcherAgent } from "../agents/dataFetcher";
import { riskAnalyzerAgent } from "../agents/riskAnalyzer";
import { reportWriterAgent } from "../agents/reportWriter";
import { store } from "../db/store";

const openai = new OpenAI({ apiKey: config.openaiKey });

// Agent config (index matches wallet derivation path)
const AGENT_CONFIG = [
  {
    id: 0,
    name: "DataFetcher",
    baseName: "datafetcher.base.eth",
    priceUsdc: 8000n,        // $0.008
    capability: "data_fetching",
  },
  {
    id: 1,
    name: "RiskAnalyzer",
    baseName: "riskanalyzer.base.eth",
    priceUsdc: 15000n,       // $0.015
    capability: "risk_analysis",
  },
  {
    id: 2,
    name: "ReportWriter",
    baseName: "reportwriter.base.eth",
    priceUsdc: 10000n,       // $0.010
    capability: "report_writing",
  },
] as const;

type AgentId = 0 | 1 | 2;

interface SubTask {
  agentId: AgentId;
  agentName: string;
  baseName: string;
  priceUsdc: bigint;
  description: string;
  capability: string;
}

// SSE event sender
function sendEvent(res: Response, event: Record<string, any>) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

async function decomposeTask(task: string): Promise<SubTask[]> {
  // Always run all 3 agents in sequence - this is the core value prop of the platform
  // GPT-4o generates tailored descriptions for each agent based on the task
  const prompt = `You are the Operance AI orchestrator. Given a user task, write a specific instruction for each of the 3 agents below.

Agents (always use all 3 in this order):
- DataFetcher (id=0): Fetches real-time DeFi protocol data, TVL, prices, onchain metrics
- RiskAnalyzer (id=1): Analyzes smart contract and protocol risk for investment
- ReportWriter (id=2): Writes professional investment reports and recommendations

User task: "${task}"

Return ONLY this JSON with all 3 agents:
{
  "subtasks": [
    { "agentId": 0, "description": "Specific data to fetch for this task" },
    { "agentId": 1, "description": "Specific risk analysis to perform" },
    { "agentId": 2, "description": "Specific report to write" }
  ]
}`;

  const defaultSubtasks = [
    { agentId: 0 as AgentId, description: `Fetch real-time DeFi protocol data relevant to: ${task}` },
    { agentId: 1 as AgentId, description: `Analyze risk profiles of the fetched protocols for: ${task}` },
    { agentId: 2 as AgentId, description: `Write a professional investment report for: ${task}` },
  ];

  let agentIds: Array<{ agentId: AgentId; description: string }> = defaultSubtasks;

  if (config.openaiKey) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });
      const parsed = JSON.parse(response.choices[0].message.content || "{}");
      const subtasks = parsed.subtasks || [];
      // Ensure all 3 agents are present; fall back to defaults for missing ones
      agentIds = [0, 1, 2].map((id) => {
        const found = subtasks.find((s: any) => s.agentId === id);
        return found || defaultSubtasks[id];
      });
    } catch {
      agentIds = defaultSubtasks;
    }
  }

  return agentIds.map(({ agentId, description }) => {
    const agent = AGENT_CONFIG[agentId];
    return {
      agentId,
      agentName: agent.name,
      baseName: agent.baseName,
      priceUsdc: agent.priceUsdc,
      description,
      capability: agent.capability,
    };
  });
}

export async function executeOrchestrator(task: string, res: Response): Promise<void> {
  const runId = uuidv4();
  const txHashes: string[] = [];
  let totalCostUsdc = 0n;

  store.startRun(runId, task);

  let orchestratorAccount: any;
  try {
    orchestratorAccount = getOrchestratorAccount();
  } catch {
    orchestratorAccount = { address: "0xDemoOrchestratorWallet0000000000000000000" };
  }

  // Send initial event
  sendEvent(res, {
    type: "started",
    runId,
    task,
    orchestratorWallet: orchestratorAccount.address,
  });

  // Step 1: Decompose task
  sendEvent(res, { type: "thinking", message: "Analyzing task and selecting agents..." });

  await new Promise((r) => setTimeout(r, 600));

  let subtasks: SubTask[];
  try {
    subtasks = await decomposeTask(task);
  } catch {
    subtasks = AGENT_CONFIG.map((a, i) => ({
      agentId: i as AgentId,
      agentName: a.name,
      baseName: a.baseName,
      priceUsdc: a.priceUsdc,
      description: task,
      capability: a.capability,
    }));
  }

  sendEvent(res, {
    type: "decomposed",
    subtasks: subtasks.map((s) => ({
      agentId: s.agentId,
      agentName: s.agentName,
      baseName: s.baseName,
      priceUsdc: s.priceUsdc.toString(),
      priceFormatted: `$${(Number(s.priceUsdc) / 1_000_000).toFixed(4)}`,
      description: s.description,
    })),
    totalCost: `$${subtasks.reduce((sum, s) => sum + Number(s.priceUsdc), 0) / 1_000_000}`,
  });

  await new Promise((r) => setTimeout(r, 400));

  // Check orchestrator balance in non-demo mode
  if (!config.demoMode && orchestratorAccount.address !== "0xDemoOrchestratorWallet0000000000000000000") {
    try {
      const balance = await getUsdcBalance(orchestratorAccount.address);
      const requiredTotal = subtasks.reduce((sum, s) => sum + s.priceUsdc, 0n);
      const balanceRaw = BigInt(Math.floor(parseFloat(balance) * 1_000_000));
      if (balanceRaw < requiredTotal) {
        sendEvent(res, {
          type: "error",
          message: `Insufficient USDC balance. Need $${Number(requiredTotal) / 1_000_000} but have $${balance}. Fund the orchestrator wallet: ${orchestratorAccount.address}`,
        });
        return;
      }
    } catch {}
  }

  // Step 2: Execute each agent with payment
  let protocolData: any = null;
  let riskAnalyses: any = null;
  let finalReport: any = null;

  for (const subtask of subtasks) {
    let agentAccount: any;
    try {
      agentAccount = getAgentAccount(subtask.agentId);
    } catch {
      agentAccount = { address: `0x${"0".repeat(39)}${subtask.agentId}` };
    }

    sendEvent(res, {
      type: "agent_selected",
      agentId: subtask.agentId,
      agentName: subtask.agentName,
      baseName: subtask.baseName,
      agentWallet: agentAccount.address,
      priceUsdc: subtask.priceUsdc.toString(),
      priceFormatted: `$${(Number(subtask.priceUsdc) / 1_000_000).toFixed(4)}`,
    });

    await new Promise((r) => setTimeout(r, 300));

    // Pay the agent
    sendEvent(res, {
      type: "payment_initiated",
      agentId: subtask.agentId,
      agentName: subtask.agentName,
      amount: `$${(Number(subtask.priceUsdc) / 1_000_000).toFixed(4)} USDC`,
      from: orchestratorAccount.address,
      to: agentAccount.address,
    });

    let txHash: string;
    let basescanUrl: string;

    try {
      const result = await transferUsdc(
        orchestratorAccount,
        agentAccount.address,
        subtask.priceUsdc
      );
      txHash = result.txHash;
      basescanUrl = result.basescanUrl;
      txHashes.push(txHash);
      totalCostUsdc += subtask.priceUsdc;
    } catch (e: any) {
      sendEvent(res, {
        type: "error",
        message: `Payment failed for ${subtask.agentName}: ${e.message}`,
      });
      return;
    }

    sendEvent(res, {
      type: "payment_confirmed",
      agentId: subtask.agentId,
      agentName: subtask.agentName,
      txHash,
      basescanUrl,
      amount: `$${(Number(subtask.priceUsdc) / 1_000_000).toFixed(4)} USDC`,
    });

    // Record in local DB and registry
    store.recordTransaction({
      txHash,
      agentId: subtask.agentId,
      agentName: subtask.agentName,
      payer: orchestratorAccount.address as string,
      agentWallet: agentAccount.address as string,
      amountUsdc: (Number(subtask.priceUsdc) / 1_000_000).toFixed(6),
      task: task.slice(0, 100),
    });

    await new Promise((r) => setTimeout(r, 200));

    // Execute the agent
    sendEvent(res, {
      type: "agent_processing",
      agentId: subtask.agentId,
      agentName: subtask.agentName,
      message: `${subtask.agentName} is working...`,
    });

    try {
      if (subtask.agentId === 0) {
        // DataFetcher
        const result = await dataFetcherAgent({ query: task });
        protocolData = result;
        sendEvent(res, {
          type: "agent_responded",
          agentId: subtask.agentId,
          agentName: subtask.agentName,
          preview: result.summary,
          data: { protocols: result.protocols.map((p) => ({ name: p.name, tvl: p.tvl, chain: p.chain })) },
        });
      } else if (subtask.agentId === 1) {
        // RiskAnalyzer
        const result = await riskAnalyzerAgent(protocolData?.protocols || []);
        riskAnalyses = result;
        sendEvent(res, {
          type: "agent_responded",
          agentId: subtask.agentId,
          agentName: subtask.agentName,
          preview: result.summary,
          data: {
            analyses: result.analyses.map((a) => ({
              protocol: a.protocol,
              overallRisk: a.overallRisk,
              riskScore: a.riskScore,
            })),
          },
        });
      } else if (subtask.agentId === 2) {
        // ReportWriter
        const result = await reportWriterAgent({
          protocols: protocolData?.protocols || [],
          analyses: riskAnalyses?.analyses || [],
          originalTask: task,
        });
        finalReport = result;
        sendEvent(res, {
          type: "agent_responded",
          agentId: subtask.agentId,
          agentName: subtask.agentName,
          preview: result.recommendation,
          data: { topPick: result.topPick },
        });
      }
    } catch (e: any) {
      sendEvent(res, {
        type: "error",
        message: `${subtask.agentName} execution failed: ${e.message}`,
      });
      return;
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  // Step 3: Assemble final result
  sendEvent(res, { type: "assembling", message: "Assembling final report..." });
  await new Promise((r) => setTimeout(r, 500));

  const totalCostFormatted = `$${(Number(totalCostUsdc) / 1_000_000).toFixed(4)} USDC`;

  const fullResult = JSON.stringify({
    report: finalReport?.report || "",
    recommendation: finalReport?.recommendation || "",
    topPick: finalReport?.topPick || "",
    protocols: protocolData?.protocols || [],
    analyses: riskAnalyses?.analyses || [],
  });

  store.completeRun(runId, "completed", totalCostFormatted, txHashes, fullResult);

  sendEvent(res, {
    type: "completed",
    runId,
    totalCost: totalCostFormatted,
    txCount: txHashes.length,
    txHashes,
    basescanUrls: txHashes.map(
      (h) => `${EXPLORER_URL}/tx/${h}`
    ),
    report: finalReport?.report || "",
    recommendation: finalReport?.recommendation || "",
    topPick: finalReport?.topPick || "",
    protocols: protocolData?.protocols || [],
    analyses: riskAnalyses?.analyses || [],
  });
}
