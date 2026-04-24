import OpenAI from "openai";
import { config } from "../config";
import { ProtocolData } from "./dataFetcher";
import { RiskAnalysis } from "./riskAnalyzer";

const openai = new OpenAI({ apiKey: config.openaiKey || "sk-placeholder" });

export interface ReportRequest {
  protocols: ProtocolData[];
  analyses: RiskAnalysis[];
  investorType?: "conservative" | "moderate" | "aggressive";
  originalTask: string;
}

function generateDemoReport(req: ReportRequest): { report: string; recommendation: string; topPick: string } {
  const { protocols, analyses, originalTask } = req;

  const topProtocol = [...analyses].sort((a, b) => a.riskScore - b.riskScore)[0];
  const topData = protocols.find((p) => p.name === topProtocol?.protocol) || protocols[0];

  if (!topData) {
    return {
      report: "## Analysis Complete\n\nInsufficient data to generate report.",
      recommendation: "No recommendation available.",
      topPick: "N/A",
    };
  }

  const protocolSections = protocols.map((p) => {
    const analysis = analyses.find((a) => a.protocol === p.name);
    const riskEmoji = analysis?.overallRisk === "low" ? "🟢" : analysis?.overallRisk === "medium" ? "🟡" : "🔴";
    return `### ${p.name} (${p.chain})
**TVL:** $${(p.tvl / 1e9).toFixed(2)}B | **24h Change:** ${p.tvl24hChange > 0 ? "+" : ""}${p.tvl24hChange.toFixed(1)}% | **Risk:** ${riskEmoji} ${analysis?.overallRisk?.toUpperCase() || "MEDIUM"} (${analysis?.riskScore || 50}/100)

${analysis?.strengths?.slice(0, 2).map((s) => `- ${s}`).join("\n") || "- Established DeFi protocol"}

**Key Risk:** ${analysis?.risks?.[0] || "Market volatility"}`;
  }).join("\n\n");

  const report = `## DeFi Investment Analysis

*Task: ${originalTask}*

---

## Executive Summary

This analysis evaluates ${protocols.length} DeFi protocol${protocols.length > 1 ? "s" : ""} across risk, TVL stability, and return potential. **${topData.name}** emerges as the top recommendation with a risk score of ${topProtocol?.riskScore || 30}/100, backed by $${(topData.tvl / 1e9).toFixed(2)}B TVL and ${topData.audits || 3}+ security audits. For moderate-risk investors, a diversified allocation across ${analyses.filter((a) => a.overallRisk !== "high").map((a) => a.protocol).join(" and ")} is advised.

---

## Protocol Analysis

${protocolSections}

---

## Risk-Return Assessment

| Protocol | TVL | Risk Score | Recommendation |
|----------|-----|------------|----------------|
${protocols.map((p) => {
  const a = analyses.find((x) => x.protocol === p.name);
  const rec = a?.overallRisk === "low" ? "Strong Buy" : a?.overallRisk === "medium" ? "Buy" : "Speculative";
  return `| ${p.name} | $${(p.tvl / 1e9).toFixed(2)}B | ${a?.riskScore || 50}/100 | ${rec} |`;
}).join("\n")}

---

## Recommendation

**Top Pick: ${topData.name}**

${topData.name} offers the optimal risk-adjusted return profile in the current DeFi landscape. With $${(topData.tvl / 1e9).toFixed(2)}B TVL demonstrating deep liquidity and institutional trust, combined with a low risk score of ${topProtocol?.riskScore || 30}/100, it represents a compelling entry point. Suggested allocation: 60% ${topData.name}, 40% split across remaining protocols for diversification.

*Analysis powered by Operance AI - autonomous agent intelligence on Base*`;

  return {
    report,
    recommendation: `${topData.name} is the top pick with risk score ${topProtocol?.riskScore || 30}/100 and $${(topData.tvl / 1e9).toFixed(2)}B TVL - optimal risk-adjusted return for the current DeFi market.`,
    topPick: topData.name,
  };
}

export async function reportWriterAgent(req: ReportRequest): Promise<{
  report: string;
  recommendation: string;
  topPick: string;
}> {
  if (!config.openaiKey) {
    return generateDemoReport(req);
  }

  const investorType = req.investorType || "moderate";

  const prompt = `You are a professional investment analyst writing a concise, authoritative report for a ${investorType} risk investor.

Original task: "${req.originalTask}"

Protocol Data:
${JSON.stringify(req.protocols, null, 2)}

Risk Analyses:
${JSON.stringify(req.analyses, null, 2)}

Write a professional investment report that:
1. Opens with an executive summary (2-3 sentences)
2. Analyzes each protocol (2-3 sentences each): TVL, category, chain, key risks
3. Provides a clear recommendation for the ${investorType} investor
4. Ends with a specific "Top Pick" recommendation

Format: Use markdown with ## headers. Be specific with numbers. Tone: Bloomberg/Wall Street Research.
Length: 300-400 words.

Return ONLY a JSON object:
{
  "report": "## Full markdown report here...",
  "recommendation": "One sentence key recommendation",
  "topPick": "Protocol Name"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  try {
    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    return {
      report: parsed.report || generateDemoReport(req).report,
      recommendation: parsed.recommendation || generateDemoReport(req).recommendation,
      topPick: parsed.topPick || (req.protocols[0]?.name ?? "N/A"),
    };
  } catch {
    return generateDemoReport(req);
  }
}
