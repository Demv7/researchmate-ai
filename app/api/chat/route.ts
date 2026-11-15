import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { peek } from "@/lib/store";
import { genText, hasKey, providerName } from "@/lib/ai";
import { rankChunks } from "@/lib/chunk";
export const runtime = "nodejs"; export const maxDuration = 120;
const Body = z.object({ sessionId: z.string(), question: z.string().min(2).max(1000) });
export async function POST(req: NextRequest) {
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (!hasKey()) return NextResponse.json({ error: "The selected AI provider API key is not configured." }, { status: 503 });
  const s = peek(b.data.sessionId);
  if (!s || !s.chunks.length) return NextResponse.json({ error: "Run the Document Analyst agent first so papers are chunked." }, { status: 409 });
  try {
    const top = rankChunks(s.chunks, b.data.question).slice(0, 6);
    const title = (id: string) => s.papers.find((p) => p.id === id)?.meta?.title ?? id;
    const ctx = top.map((t, i) => `[${i + 1}] (${title(t.chunk.paperId)}, p.${t.chunk.page})\n${t.chunk.text}`).join("\n\n");
    const answer = await genText(`Answer the question using ONLY the excerpts. Cite as [n]. If excerpts are insufficient, say so.\nQuestion: ${b.data.question}\n<document>\n${ctx}\n</document>`);
    return NextResponse.json({ answer, sources: top.map((t, i) => ({ n: i + 1, paper: title(t.chunk.paperId), page: t.chunk.page, score: +t.score.toFixed(3) })) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "The chat request failed.";
    const status = typeof e === "object" && e !== null && "status" in e && typeof e.status === "number" ? e.status : undefined;
    const rateLimited = status === 429 || /Too Many Requests|rate limit/i.test(message);
    const quotaExhausted = /quota|resource_exhausted|exceeded your current/i.test(message);
    const requestTimedOut = /operation was aborted|AbortError|timed out|TimeoutError/i.test(message);
    const error = quotaExhausted
      ? `${providerName()} quota is exhausted for this key or project. Check usage and billing in the Groq console, then retry.`
      : rateLimited
        ? `${providerName()} rate limit reached. Check your Groq usage/billing limits and retry after it resets.`
        : requestTimedOut
          ? `${providerName()} timed out. Check your connection and Groq usage limits, then retry.`
          : message;
    return NextResponse.json({ error }, { status: rateLimited ? 429 : status && status >= 500 ? 503 : 500 });
  }
}
