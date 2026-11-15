import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, publicView } from "@/lib/store";
import { hasKey, providerName } from "@/lib/ai";
import { runStep } from "@/agents/orchestrator";
export const runtime = "nodejs"; export const maxDuration = 300;
const Body = z.object({ sessionId: z.string().min(1), agent: z.enum(["document", "summarizer", "comparative", "gap", "report"]), topic: z.string().max(500).optional() });
export async function GET() { return NextResponse.json({ aiConfigured: hasKey() }); }
export async function POST(req: NextRequest) {
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (!hasKey()) return NextResponse.json({ error: `${providerName()} API key is not configured. See README setup.` }, { status: 503 });
  const s = getSession(b.data.sessionId); if (b.data.topic !== undefined) s.topic = b.data.topic;
  try { await runStep(s, b.data.agent); return NextResponse.json({ session: publicView(s) }); }
  catch (e) {
    const message = e instanceof Error ? e.message : "The analysis step failed.";
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
    const responseStatus = rateLimited ? 429 : status && status >= 400 && status <= 599 ? status : 500;
    return NextResponse.json({ error, session: publicView(s) }, { status: responseStatus });
  }
}
