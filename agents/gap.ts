import { z } from "zod";
import { Session } from "@/lib/types";
import { genJson } from "@/lib/ai";
const Gaps = z.object({ gaps: z.array(z.object({ title: z.string(), hypothesis: z.string(), evidence: z.string(), supportingPapers: z.array(z.string()) })) });
/** Agent 4: gaps are hypotheses with cited evidence. */
export async function gapAgent(s: Session) {
  const input = {
    topic: s.topic.slice(0, 300),
    themes: s.comparison?.themes?.slice(0, 3),
    trends: s.comparison?.trends?.slice(0, 3),
    methodologyDifferences: s.comparison?.methodologyDifferences?.slice(0, 3),
    papers: s.papers.map((p) => ({
      paper: p.meta?.title,
      limitations: s.summaries[p.id]?.limitations?.slice(0, 2).map((text: string) => text.slice(0, 160)),
    })),
  };
  s.gaps = await genJson(`Propose at most 2 research gaps supported by this evidence. Each gap needs title, hypothesis (clearly unverified), brief evidence, and supportingPapers (titles from input only). Keep every field concise and return an object with a gaps array.\n<document>${JSON.stringify(input)}</document>`, Gaps, 600);
}
