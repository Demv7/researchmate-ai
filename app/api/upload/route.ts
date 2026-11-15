import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { extractText, getDocumentProxy } from "unpdf";
import { getSession, publicView, resetAnalysis } from "@/lib/store";
export const runtime = "nodejs"; export const maxDuration = 60;
export async function POST(req: NextRequest) {
  const fd = await req.formData(); const s = getSession(String(fd.get("sessionId") || "") || null);
  const maxMb = Number(process.env.MAX_FILE_MB || 15), maxN = Number(process.env.MAX_PAPERS || 10), errors: string[] = [];
  const topic = fd.get("topic"); if (typeof topic === "string") s.topic = topic.slice(0, 500);
  for (const f of fd.getAll("files")) {
    if (!(f instanceof File)) continue;
    if (s.papers.length >= maxN) { errors.push(`${f.name}: limit of ${maxN} papers reached`); continue; }
    if (!f.name.toLowerCase().endsWith(".pdf") || f.size === 0) { errors.push(`${f.name}: not a PDF`); continue; }
    if (f.size > maxMb * 1048576) { errors.push(`${f.name}: larger than ${maxMb} MB`); continue; }
    const buf = new Uint8Array(await f.arrayBuffer());
    if (new TextDecoder().decode(buf.slice(0, 5)) !== "%PDF-") { errors.push(`${f.name}: invalid PDF header`); continue; }
    const hash = createHash("sha256").update(buf).digest("hex");
    if (s.papers.some((p) => p.hash === hash)) { errors.push(`${f.name}: duplicate file`); continue; }
    try {
      const { text } = await extractText(await getDocumentProxy(buf), { mergePages: false });
      const pages = text as string[]; const avg = pages.join("").length / Math.max(pages.length, 1);
      if (avg < 100) { errors.push(`${f.name}: looks like a scanned/image-only PDF (no extractable text). OCR it first.`); continue; }
      s.papers.push({ id: hash.slice(0, 12), name: f.name, hash, pages }); resetAnalysis(s);
    } catch { errors.push(`${f.name}: could not be parsed`); }
  }
  return NextResponse.json({ session: publicView(s), errors });
}
export async function DELETE(req: NextRequest) {
  const u = req.nextUrl.searchParams, s = getSession(u.get("sessionId"));
  s.papers = s.papers.filter((p) => p.id !== u.get("paperId")); resetAnalysis(s);
  return NextResponse.json({ session: publicView(s) });
}
