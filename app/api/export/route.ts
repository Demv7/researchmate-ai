import { NextRequest, NextResponse } from "next/server";
import { peek } from "@/lib/store";
export async function GET(req: NextRequest) {
  const s = peek(req.nextUrl.searchParams.get("sessionId") || "");
  if (!s?.report) return NextResponse.json({ error: "Report not generated yet." }, { status: 404 });
  return new NextResponse(s.report, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": 'attachment; filename="literature-review.md"' } });
}
