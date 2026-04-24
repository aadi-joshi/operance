import OpenAI from "openai";
import { config } from "../config";
import { ProtocolData } from "./dataFetcher";

const openai = new OpenAI({ apiKey: config.openaiKey || "sk-placeholder" });

export interface RiskAnalysis {
  protocol: string;
  overallRisk: "low" | "medium" | "high";
  riskScore: number; // 0-100 (lower is safer)
  factors: {
    smartContractRisk: number;
    liquidityRisk: number;
    regulatoryRisk: number;
    marketRisk: number;
    centralizationRisk: number;
  };
  strengths: string[];
  risks: string[];
  suitability: {
    conservative: boolean;
    moderate: boolean;
    aggressive: boolean;
  };
}

const RISK_PROFILES: Record<string, RiskAnalysis> = {
  Aave: {
    protocol: "Aave",
    overallRisk: "low",
    riskScore: 22,
    factors: {
      smartContractRisk: 15,
      liquidityRisk: 20,
      regulatoryRisk: 35,
      marketRisk: 28,
      centralizationRisk: 12,
    },
    strengths: [
      "Battle-tested with $12B+ TVL over 4 years",
      "8 independent security audits",
      "Decentralized governance via AAVE holders",
      "Multi-chain deployment reduces single-chain risk",
    ],
    risks: [
      "Regulatory pressure on lending protocols in US markets",
      "Oracle manipulation vulnerability (mitigated by Chainlink)",
      "Smart contract complexity increases attack surface",
    ],
    suitability: { conservative: true, moderate: true, aggressive: true },
  },
  Uniswap: {
    protocol: "Uniswap",
    overallRisk: "low",
    riskScore: 28,
    factors: {
      smartContractRisk: 18,
      liquidityRisk: 25,
      regulatoryRisk: 40,
      marketRisk: 30,
      centralizationRisk: 15,
    },
    strengths: [
      "Dominant DEX with $5.9B TVL",
      "Non-custodial, permissionless architecture",
      "v3 concentrated liquidity maximizes capital efficiency",
      "No admin keys or upgrade mechanisms in core contracts",
    ],
    risks: [
      "SEC regulatory scrutiny on DEX protocols",
      "Impermanent loss risk for LPs in volatile markets",
      "Front-running and MEV extraction by searchers",
    ],
    suitability: { conservative: true, moderate: true, aggressive: true },
  },
  Compound: {
    protocol: "Compound",
    overallRisk: "medium",
    riskScore: 42,
    factors: {
      smartContractRisk: 30,
      liquidityRisk: 40,
      regulatoryRisk: 50,
      marketRisk: 45,
      centralizationRisk: 48,
    },
    strengths: [
      "Pioneer DeFi lending protocol with 5-year track record",
      "Well-audited codebase with 5 major audits",
      "COMP governance token with active DAO",
    ],
    risks: [
      "TVL declined significantly from peak ($10B to $2.1B)",
      "Competition from Aave eroding market share",
      "COMP distribution emissions creating selling pressure",
    ],
    suitability: { conservative: false, moderate: true, aggressive: true },
  },
  MakerDAO: {
    protocol: "MakerDAO",
    overallRisk: "low",
    riskScore: 30,
    factors: {
      smartContractRisk: 20,
      liquidityRisk: 25,
      regulatoryRisk: 45,
      marketRisk: 35,
      centralizationRisk: 25,
    },
    strengths: [
      "DAI maintains $1 peg through battle-tested mechanisms",
      "10+ security audits over 6 years",
      "Largest CDP protocol with $8.8B TVL",
    ],
    risks: [
      "RWA collateral exposure to traditional finance risks",
      "DAI depeg risk in extreme market conditions",
      "USDC dependency creates centralization risk",
    ],
    suitability: { conservative: true, moderate: true, aggressive: true },
  },
  Curve: {
    protocol: "Curve",
    overallRisk: "medium",
    riskScore: 38,
    factors: {
      smartContractRisk: 32,
      liquidityRisk: 28,
      regulatoryRisk: 42,
      marketRisk: 40,
      centralizationRisk: 50,
    },
    strengths: [
      "Dominant stablecoin DEX with deep liquidity",
      "veCRV model creates strong protocol alignment",
      "$3.6B TVL across multiple chains",
    ],
    risks: [
      "Founder wallet hack revealed centralization risk",
      "Complex gauge system prone to governance attacks",
      "CRV token inflation from rewards creates sell pressure",
    ],
    suitability: { conservative: false, moderate: true, aggressive: true },
  },
  Aerodrome: {
    protocol: "Aerodrome",
    overallRisk: "medium",
    riskScore: 48,
    factors: {
      smartContractRisk: 40,
      liquidityRisk: 45,
      regulatoryRisk: 35,
      marketRisk: 55,
      centralizationRisk: 42,
    },
    strengths: [
      "Dominant DEX on Base chain with Coinbase ecosystem backing",
      "veAERO model incentivizes long-term liquidity",
      "Rapid TVL growth to $820M in under 12 months",
    ],
    risks: [
      "Newer protocol with limited battle-testing",
      "AERO token inflation from emissions",
      "Heavy reliance on Base chain adoption growth",
    ],
    suitability: { conservative: false, moderate: true, aggressive: true },
  },
};

function getDemoAnalysis(protocol: ProtocolData): RiskAnalysis {
  const known = RISK_PROFILES[protocol.name];
  if (known) return known;

  const riskScore = protocol.audits
    ? Math.max(20, 70 - (protocol.audits * 5))
    : 65;
  const overallRisk: "low" | "medium" | "high" =
    riskScore < 35 ? "low" : riskScore < 60 ? "medium" : "high";

  return {
    protocol: protocol.name,
    overallRisk,
    riskScore,
    factors: {
      smartContractRisk: Math.round(riskScore * 0.9),
      liquidityRisk: Math.round(riskScore * 1.1),
      regulatoryRisk: Math.round(riskScore * 0.8),
      marketRisk: Math.round(riskScore * 1.0),
      centralizationRisk: Math.round(riskScore * 0.95),
    },
    strengths: [
      `${protocol.category} protocol on ${protocol.chain}`,
      protocol.audits ? `${protocol.audits} security audit(s) completed` : "Active development",
    ],
    risks: [
      "Market volatility may impact TVL",
      "Smart contract risk inherent in all DeFi protocols",
    ],
    suitability: {
      conservative: overallRisk === "low",
      moderate: overallRisk !== "high",
      aggressive: true,
    },
  };
}

export async function riskAnalyzerAgent(protocols: ProtocolData[]): Promise<{
  analyses: RiskAnalysis[];
  summary: string;
}> {
  if (!config.openaiKey) {
    const analyses = protocols.map(getDemoAnalysis);
    const lowRisk = analyses.filter((a) => a.overallRisk === "low").length;
    const avgScore = Math.round(analyses.reduce((sum, a) => sum + a.riskScore, 0) / analyses.length);
    const summary = `Analyzed ${analyses.length} protocols. ${lowRisk} suitable for conservative investors. Average risk score: ${avgScore}/100 (demo analysis).`;
    return { analyses, summary };
  }

  const prompt = `You are a DeFi risk analyst with deep expertise in smart contract security, tokenomics, and protocol design.

Analyze the risk profile for each of these DeFi protocols:
${JSON.stringify(protocols, null, 2)}

For each protocol, provide a comprehensive risk assessment. Return ONLY a JSON object with this exact structure:
{
  "analyses": [
    {
      "protocol": "Protocol Name",
      "overallRisk": "low|medium|high",
      "riskScore": 0-100,
      "factors": {
        "smartContractRisk": 0-100,
        "liquidityRisk": 0-100,
        "regulatoryRisk": 0-100,
        "marketRisk": 0-100,
        "centralizationRisk": 0-100
      },
      "strengths": ["strength 1", "strength 2"],
      "risks": ["risk 1", "risk 2"],
      "suitability": {
        "conservative": true/false,
        "moderate": true/false,
        "aggressive": true/false
      }
    }
  ]
}

Consider:
- Smart contract audit history and known vulnerabilities
- TVL stability and liquidity depth
- Regulatory exposure (especially US investors)
- Market volatility and correlation
- Governance centralization
- Track record and time in market`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  let analyses: RiskAnalysis[] = [];
  try {
    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    analyses = parsed.analyses || [];
  } catch {
    analyses = protocols.map(getDemoAnalysis);
  }

  const lowRisk = analyses.filter((a) => a.overallRisk === "low").length;
  const summary = `Analyzed ${analyses.length} protocols. ${lowRisk} are suitable for conservative investors. Average risk score: ${Math.round(analyses.reduce((sum, a) => sum + a.riskScore, 0) / analyses.length)}/100.`;

  return { analyses, summary };
}
