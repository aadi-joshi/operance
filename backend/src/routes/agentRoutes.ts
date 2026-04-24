import { Router, Request, Response } from "express";
import { x402PaymentRequired } from "../middleware/x402";
import { dataFetcherAgent } from "../agents/dataFetcher";
import { riskAnalyzerAgent } from "../agents/riskAnalyzer";
import { reportWriterAgent } from "../agents/reportWriter";
import { store } from "../db/store";

const router = Router();

// DataFetcher — $0.008 USDC
router.post(
  "/data-fetch",
  x402PaymentRequired({
    agentIndex: 0,
    priceUsdc: 8000n,
    agentName: "DataFetcher",
    description: "Fetch real-time DeFi protocol data from onchain sources",
  }),
  async (req: Request, res: Response) => {
    const { query, limit } = req.body;
    const payment = (req as any).paymentVerified;

    try {
      const result = await dataFetcherAgent({ query: query || "top DeFi protocols", limit });
      res.json({
        success: true,
        ...result,
        payment,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
);

// RiskAnalyzer — $0.015 USDC
router.post(
  "/risk-analyze",
  x402PaymentRequired({
    agentIndex: 1,
    priceUsdc: 15000n,
    agentName: "RiskAnalyzer",
    description: "Analyze DeFi protocol risk profiles",
  }),
  async (req: Request, res: Response) => {
    const { protocols } = req.body;
    const payment = (req as any).paymentVerified;

    if (!protocols || !Array.isArray(protocols)) {
      return res.status(400).json({ error: "protocols array required" });
    }

    try {
      const result = await riskAnalyzerAgent(protocols);
      res.json({ success: true, ...result, payment });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
);

// ReportWriter — $0.010 USDC
router.post(
  "/report-write",
  x402PaymentRequired({
    agentIndex: 2,
    priceUsdc: 10000n,
    agentName: "ReportWriter",
    description: "Write professional investment reports",
  }),
  async (req: Request, res: Response) => {
    const { protocols, analyses, task, investorType } = req.body;
    const payment = (req as any).paymentVerified;

    try {
      const result = await reportWriterAgent({
        protocols: protocols || [],
        analyses: analyses || [],
        originalTask: task || "",
        investorType,
      });
      res.json({ success: true, ...result, payment });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
);

// CodeReviewer — $0.020 USDC
router.post(
  "/code-review",
  x402PaymentRequired({
    agentIndex: 3,
    priceUsdc: 20000n,
    agentName: "CodeReviewer",
    description: "Review Solidity smart contracts for security vulnerabilities",
  }),
  async (req: Request, res: Response) => {
    const { code } = req.body;
    const payment = (req as any).paymentVerified;

    // Inline implementation - no separate agent file needed
    const OpenAI = require("openai");
    const { config } = require("../config");
    const openai = new OpenAI.default({ apiKey: config.openaiKey });

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a smart contract security auditor. Review the provided Solidity code for vulnerabilities, gas optimizations, and best practices.",
          },
          {
            role: "user",
            content: `Review this Solidity contract:\n\`\`\`solidity\n${code}\n\`\`\`\n\nProvide a security audit report.`,
          },
        ],
        temperature: 0.2,
      });

      res.json({
        success: true,
        review: completion.choices[0].message.content,
        payment,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
);

// MarketSentiment — $0.005 USDC
router.post(
  "/market-sentiment",
  x402PaymentRequired({
    agentIndex: 4,
    priceUsdc: 5000n,
    agentName: "MarketSentiment",
    description: "Analyze market sentiment for crypto assets",
  }),
  async (req: Request, res: Response) => {
    const { asset } = req.body;
    const payment = (req as any).paymentVerified;

    const OpenAI = require("openai");
    const { config } = require("../config");
    const openai = new OpenAI.default({ apiKey: config.openaiKey });

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a crypto market sentiment analyst. Provide sentiment analysis based on recent market data and social signals.",
          },
          {
            role: "user",
            content: `Analyze market sentiment for ${asset || "the overall crypto market"}. Return JSON with: sentiment (bullish/neutral/bearish), score (0-100), signals (array of key factors).`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      res.json({ success: true, ...result, payment });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }
);

// Public: payment spec for any agent (before paying)
router.get("/payment-spec/:agentIndex", (req: Request, res: Response) => {
  const agentIndex = parseInt(req.params.agentIndex);
  const specs: Record<number, any> = {
    0: { priceUsdc: "8000", name: "DataFetcher", endpoint: "/api/agents/data-fetch" },
    1: { priceUsdc: "15000", name: "RiskAnalyzer", endpoint: "/api/agents/risk-analyze" },
    2: { priceUsdc: "10000", name: "ReportWriter", endpoint: "/api/agents/report-write" },
    3: { priceUsdc: "20000", name: "CodeReviewer", endpoint: "/api/agents/code-review" },
    4: { priceUsdc: "5000", name: "MarketSentiment", endpoint: "/api/agents/market-sentiment" },
  };

  if (!specs[agentIndex]) {
    return res.status(404).json({ error: "Agent not found" });
  }

  res.json(specs[agentIndex]);
});

export default router;
