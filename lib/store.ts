import { Session, AGENT_ORDER } from "./types";
const g = globalThis as unknown as { __sessions?: Map<string, Session> };
const m = (g.__sessions ??= new Map<string, Session>());
export const blankSteps = () => Object.fromEntries(AGENT_ORDER.map((a) => [a, { status: "pending" }])) as Session["steps"];
export function resetAnalysis(s: Session) {
  s.steps = blankSteps();
  s.chunks = [];
  s.summaries = {};
  s.comparison = undefined;
  s.gaps = undefined;
  s.report = undefined;
  s.refs = undefined;
}
export function getSession(id?: string | null): Session {
  if (id && m.has(id)) return m.get(id)!;
  const s: Session = { id: id || crypto.randomUUID(), topic: "", papers: [], chunks: [], steps: blankSteps(), summaries: {} };
  m.set(s.id, s); return s;
}
export const peek = (id: string) => m.get(id);
/** Strip heavy fields before sending to the browser */
export const publicView = (s: Session) => ({ ...s, chunks: undefined, chunkCount: s.chunks.length, papers: s.papers.map((p) => ({ id: p.id, name: p.name, pageCount: p.pages.length, meta: p.meta })) });
