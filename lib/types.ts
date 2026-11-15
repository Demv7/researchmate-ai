export type AgentId = "document" | "summarizer" | "comparative" | "gap" | "report";
export type Status = "pending" | "running" | "completed" | "failed";
export const AGENT_ORDER: AgentId[] = ["document", "summarizer", "comparative", "gap", "report"];
export interface Meta { title: string; authors: string[]; year: string; abstract: string; methodology: string; conclusions: string }
export interface Chunk { paperId: string; page: number; text: string }
export interface Paper { id: string; name: string; hash: string; pages: string[]; meta?: Meta }
export interface Session {
  id: string; topic: string; papers: Paper[]; chunks: Chunk[];
  steps: Record<AgentId, { status: Status; error?: string }>;
  summaries: Record<string, any>; comparison?: any; gaps?: any; report?: string; refs?: { ieee: string[]; apa: string[] };
}
