import { z } from "zod";
import { Session } from "@/lib/types";
import { genJson } from "@/lib/ai";
import { chunkPaper } from "@/lib/chunk";
const Meta = z.object({ title: z.string(), authors: z.array(z.string()), year: z.string(), abstract: z.string(), methodology: z.string(), conclusions: z.string() });
/** Agent 1: metadata extraction (LLM) and page-tagged chunking for retrieval. */
export async function documentAnalyst(s: Session) {
  s.chunks = [];
  for (let i = 0; i < s.papers.length; i += 3) {
    await Promise.all(s.papers.slice(i, i + 3).map(async (p) => {
      if (p.meta) return;
      const front = p.pages.slice(0, 2).join("\n").slice(0, 3000), back = p.pages.slice(-2).join("\n").slice(0, 1800);
      const meta = await genJson(`Extract bibliographic metadata and brief methodology/conclusion notes from this excerpt of a paper. JSON keys: title, authors(array), year, abstract, methodology, conclusions. Use "Not stated" if missing.\n<document>\n${front}\n---END OF FRONT---\n${back}\n</document>`, Meta, 500);
      p.meta = { ...meta, title: !meta.title.trim() || /^not stated$/i.test(meta.title.trim()) ? p.name.replace(/\.pdf$/i, "") : meta.title };
    }));
  }
  s.chunks = s.papers.flatMap((p) => chunkPaper(p));
}
