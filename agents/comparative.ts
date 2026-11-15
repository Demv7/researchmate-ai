import { z } from "zod";
import { Session } from "@/lib/types";
import { genJson } from "@/lib/ai";
const Cmp = z.object({ similarities: z.array(z.string()), methodologyDifferences: z.array(z.string()), conflictingResults: z.array(z.string()), themes: z.array(z.string()), trends: z.array(z.string()), matrix: z.array(z.object({ paper: z.string(), methodology: z.string(), dataset: z.string(), keyFinding: z.string(), limitation: z.string() })) });
/** Agent 3: works only from structured summaries (never raw PDFs). */
export async function comparative(s: Session) {
  const excerpt = (value: unknown, max: number) => typeof value === "string" ? value.slice(0, max) : "";
  const excerptList = (value: unknown, maxItems: number, maxChars: number) =>
    Array.isArray(value) ? value.slice(0, maxItems).map((item) => excerpt(item, maxChars)) : [];
  const input = s.papers.map((p) => {
    const summary = s.summaries[p.id];
    return {
      paper: p.meta?.title ?? p.name,
      year: p.meta?.year,
      summary: {
        objective: excerpt(summary?.objective, 220),
        methodology: excerpt(summary?.methodology, 280),
        dataset: excerpt(summary?.dataset, 140),
        keyFindings: excerptList(summary?.keyFindings, 3, 120),
        limitations: excerptList(summary?.limitations, 3, 120),
        conclusion: excerpt(summary?.conclusion, 250),
      },
    };
  });
  s.comparison = await genJson(`Compare these papers using ONLY the summaries below. Do not claim a paper says something its summary does not. If nothing conflicts, return an empty conflictingResults array. Keep each list to at most 2 concise items and each matrix field under 8 words.\nJSON keys: similarities, methodologyDifferences, conflictingResults, themes, trends (string arrays), matrix (array of {paper, methodology, dataset, keyFinding, limitation}).\n<document>${JSON.stringify(input)}</document>`, Cmp, 1400);
}
