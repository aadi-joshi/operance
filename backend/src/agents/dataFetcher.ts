import OpenAI from "openai";
import { config } from "../config";
import axios from "axios";

const openai = new OpenAI({ apiKey: config.openaiKey || "sk-placeholder" });

export interface DataFetchRequest {
  query: string;
  limit?: number;
}

export interface ProtocolData {
  name: string;
  symbol?: string;
  tvl: number;
  tvl24hChange: number;
  chain: string;
  category: string;
  audits?: number;
  url?: string;
}

const DEMO_PROTOCOLS: Record<string, ProtocolData[]> = {
  default: [
    {
      name: "Aave",
      symbol: "AAVE",
      tvl: 12400000000,
      tvl24hChange: 1.8,
      chain: "Multi-chain",
      category: "Lending",
      audits: 8,
      url: "https://aave.com",
    },
    {
      name: "Uniswap",
      symbol: "UNI",
      tvl: 5900000000,
      tvl24hChange: -0.4,
      chain: "Multi-chain",
      category: "DEX",
      audits: 6,
      url: "https://uniswap.org",
    },
    {
      name: "Compound",
      symbol: "COMP",
      tvl: 2100000000,
      tvl24hChange: 0.9,
      chain: "Ethereum",
      category: "Lending",
      audits: 5,
      url: "https://compound.finance",
    },
  ],
};

function getDemoProtocols(query: string): ProtocolData[] {
  const q = query.toLowerCase();
  if (q.includes("lend") || q.includes("borrow") || q.includes("yield")) {
    return [
      DEMO_PROTOCOLS.default[0],
      DEMO_PROTOCOLS.default[2],
      {
        name: "MakerDAO",
        symbol: "MKR",
        tvl: 8800000000,
        tvl24hChange: 0.3,
        chain: "Ethereum",
        category: "CDP",
        audits: 10,
        url: "https://makerdao.com",
      },
    ];
  }
  if (q.includes("dex") || q.includes("swap") || q.includes("trade") || q.includes("liquidity")) {
    return [
      DEMO_PROTOCOLS.default[1],
      {
        name: "Curve",
        symbol: "CRV",
        tvl: 3600000000,
        tvl24hChange: -1.2,
        chain: "Multi-chain",
        category: "DEX",
        audits: 7,
        url: "https://curve.fi",
      },
      {
        name: "Balancer",
        symbol: "BAL",
        tvl: 1200000000,
        tvl24hChange: 2.1,
        chain: "Multi-chain",
        category: "DEX",
        audits: 5,
        url: "https://balancer.fi",
      },
    ];
  }
  if (q.includes("base")) {
    return [
      {
        name: "Aerodrome",
        symbol: "AERO",
        tvl: 820000000,
        tvl24hChange: 3.4,
        chain: "Base",
        category: "DEX",
        audits: 3,
        url: "https://aerodrome.finance",
      },
      {
        name: "Morpho Blue",
        symbol: "MORPHO",
        tvl: 540000000,
        tvl24hChange: 1.1,
        chain: "Base",
        category: "Lending",
        audits: 4,
        url: "https://morpho.org",
      },
      {
        name: "BaseSwap",
        symbol: "BSX",
        tvl: 95000000,
        tvl24hChange: -0.8,
        chain: "Base",
        category: "DEX",
        audits: 2,
      },
    ];
  }
  return DEMO_PROTOCOLS.default;
}

export async function dataFetcherAgent(req: DataFetchRequest): Promise<{
  protocols: ProtocolData[];
  summary: string;
  fetchedAt: string;
}> {
  const limit = req.limit || 3;

  if (!config.openaiKey) {
    const protocols = getDemoProtocols(req.query).slice(0, limit);
    const summary = `Fetched data for ${protocols.length} DeFi protocols: ${protocols.map((p) => p.name).join(", ")}. Top TVL: $${((protocols[0]?.tvl || 0) / 1e9).toFixed(2)}B (demo data).`;
    return { protocols, summary, fetchedAt: new Date().toISOString() };
  }

  let protocols: ProtocolData[] = [];
  try {
    const response = await axios.get("https://api.llama.fi/protocols", { timeout: 8000 });
    const data = response.data as any[];

    const relevant = data
      .filter((p: any) => p.tvl > 0 && p.chain)
      .slice(0, 100);

    const selectionPrompt = `Given this query: "${req.query}"

From this list of DeFi protocols (name, TVL, chain), select the ${limit} most relevant ones:
${relevant.slice(0, 30).map((p: any) => `- ${p.name}: $${(p.tvl / 1e9).toFixed(2)}B TVL on ${p.chain}`).join("\n")}

Return ONLY a JSON object with key "protocols" containing an array of protocol names. Example: {"protocols": ["Uniswap", "Aave", "Compound"]}`;

    const selection = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: selectionPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    let selectedNames: string[] = [];
    try {
      const parsed = JSON.parse(selection.choices[0].message.content || "{}");
      selectedNames = parsed.protocols || parsed.names || [];
      if (!Array.isArray(selectedNames)) selectedNames = [];
    } catch {
      selectedNames = relevant.slice(0, limit).map((p: any) => p.name);
    }

    protocols = selectedNames.slice(0, limit).map((name: string) => {
      const match = relevant.find((p: any) =>
        p.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(p.name.toLowerCase())
      );
      if (match) {
        return {
          name: match.name,
          symbol: match.symbol,
          tvl: match.tvl,
          tvl24hChange: match.change_1d || 0,
          chain: match.chain || "Multi-chain",
          category: match.category || "DeFi",
          audits: match.audits,
          url: match.url,
        };
      }
      return {
        name,
        tvl: 0,
        tvl24hChange: 0,
        chain: "Unknown",
        category: "DeFi",
      };
    });
  } catch {
    const fallback = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a DeFi data provider. Return accurate, current DeFi protocol data.",
        },
        {
          role: "user",
          content: `Provide data for the top ${limit} DeFi protocols relevant to: "${req.query}". Return as JSON with this structure:
{
  "protocols": [
    {
      "name": "Protocol Name",
      "tvl": 5000000000,
      "tvl24hChange": 2.3,
      "chain": "Ethereum",
      "category": "DEX",
      "audits": 3
    }
  ]
}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    try {
      const parsed = JSON.parse(fallback.choices[0].message.content || "{}");
      protocols = parsed.protocols || [];
    } catch {
      protocols = getDemoProtocols(req.query).slice(0, limit);
    }
  }

  const summary = `Fetched data for ${protocols.length} DeFi protocols: ${protocols.map((p) => p.name).join(", ")}. Top TVL: $${((protocols[0]?.tvl || 0) / 1e9).toFixed(2)}B.`;

  return {
    protocols,
    summary,
    fetchedAt: new Date().toISOString(),
  };
}
