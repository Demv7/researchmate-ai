import { z } from "zod";
import { Session } from "@/lib/types";
import { genJson } from "@/lib/ai";
import { taggedText } from "@/lib/chunk";
export const Summary = z.object({ objective: z.string(), methodology: z.string(), dataset: z.string(), keyFindings: z.array(z.string()), limitations: z.array(z.string()), conclusion: z.string(), pageRefs: z.array(z.string()) });
/** Agent 2: one grounded structured summary per paper. */
export async function summarizer(s: Session) {
  for (let i = 0; i < s.papers.length; i += 3) {
    await Promise.all(s.papers.slice(i, i + 3).map(async (p) => {
      if (s.summaries[p.id]) return;
      s.summaries[p.id] = await genJson(`Summarise this paper${s.topic ? ` (user's research topic: ${s.topic})` : ""}. Text is a sample from pages tagged [p.N], selected across the paper. Do not imply omitted pages were reviewed. Keep each field concise and return at most 3 findings and 3 limitations.\nJSON keys: objective, methodology, dataset, keyFindings(array), limitations(array), conclusion, pageRefs(array like "p.3: claim").\n<document title="${p.meta?.title}">\n${taggedText(p, 7000)}\n</document>`, Summary, 650);
    }));
  }
}
