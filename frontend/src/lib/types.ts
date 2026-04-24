export interface Agent {
  id: number;
  name: string;
  description: string;
  capability: string;
  endpointUrl: string;
  baseName: string;
  paymentWallet: string;
  pricePerRequest: string;
  priceFormatted: string;
  totalRequests: number;
  totalEarned: string;
  active: boolean;
  basescanUrl: string;
}

export interface Transaction {
  txHash: string;
  agentName: string;
  agentId: number;
  payer: string;
  agentWallet: string;
  amountUsdc: string;
  timestamp: number;
  basescanUrl: string;
}

export interface PlatformStats {
  totalAgents: number;
  totalRequests: number;
  totalVolume: number;
  contractAddress: string;
  network: string;
  explorerUrl: string;
}

export type OrchestratorEventType =
  | "started"
  | "thinking"
  | "decomposed"
  | "agent_selected"
  | "payment_initiated"
  | "payment_confirmed"
  | "agent_processing"
  | "agent_responded"
  | "assembling"
  | "completed"
  | "error"
  | "done";

export interface SubTaskInfo {
  agentId: number;
  agentName: string;
  baseName: string;
  priceUsdc: string;
  priceFormatted: string;
  description: string;
}

export interface OrchestratorEvent {
  type: OrchestratorEventType;
  [key: string]: any;
}

export interface OrchestratorStep {
  type: string;
  agentName?: string;
  agentId?: number;
  baseName?: string;
  message?: string;
  txHash?: string;
  basescanUrl?: string;
  amount?: string;
  preview?: string;
  data?: any;
  timestamp: number;
}

export const CAPABILITY_META: Record<string, { icon: string; color: string; label: string }> = {
  data_fetching: { icon: "🔍", color: "#3b82f6", label: "Data" },
  risk_analysis: { icon: "🛡️", color: "#f59e0b", label: "Risk" },
  report_writing: { icon: "📝", color: "#8b5cf6", label: "Reports" },
  code_review: { icon: "🔒", color: "#ef4444", label: "Security" },
  sentiment_analysis: { icon: "📊", color: "#10b981", label: "Sentiment" },
};
