import { AgentId, AGENT_ORDER, Session } from "@/lib/types";
import { documentAnalyst } from "./documentAnalyst";
import { summarizer } from "./summarizer";
import { comparative } from "./comparative";
import { gapAgent } from "./gap";
import { citationAgent } from "./citation";
const AGENTS: Record<AgentId, (s: Session) => Promise<void>> = { document: documentAnalyst, summarizer, comparative, gap: gapAgent, report: citationAgent };
/** Runs ONE agent. Enforces order (previous agent must be completed) and records real status. Re-calling a failed step = retry. */
export async function runStep(s: Session, agent: AgentId) {
  const prev = AGENT_ORDER[AGENT_ORDER.indexOf(agent) - 1];
  if (prev && s.steps[prev].status !== "completed") throw new Error(`Run "${prev}" first.`);
  if (!s.papers.length) throw new Error("Upload at least one paper first.");
  s.steps[agent] = { status: "running" };
  try { await AGENTS[agent](s); s.steps[agent] = { status: "completed" };
    AGENT_ORDER.slice(AGENT_ORDER.indexOf(agent) + 1).forEach((a) => (s.steps[a] = { status: "pending" }));
  } catch (e) { s.steps[agent] = { status: "failed", error: (e as Error).message }; throw e; }
}
