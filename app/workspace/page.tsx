"use client";
import { useEffect, useState } from "react";
import { Upload, Play, RotateCcw, Trash2, Download, Send, Loader2, CheckCircle2, XCircle, Circle, AlertTriangle } from "lucide-react";
import { AGENT_ORDER, AgentId } from "@/lib/types";
const NAMES: Record<AgentId, string> = { document: "Document Analyst", summarizer: "Research Summarizer", comparative: "Comparative Analysis", gap: "Research Gap", report: "Citation & Report" };
const TABS = ["Papers", "Summaries", "Comparison", "Gaps", "References", "Report", "Chat"] as const;
const Icon = ({ x }: { x: string }) => x === "running" ? <Loader2 className="h-4 w-4 animate-spin text-blue-400" /> : x === "completed" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : x === "failed" ? <XCircle className="h-4 w-4 text-red-400" /> : <Circle className="h-4 w-4 text-gray-500" />;
const List = ({ a }: { a?: string[] }) => <ul className="list-disc pl-5 space-y-1 text-gray-300">{(a?.length ? a : ["None identified"]).map((x, i) => <li key={i}>{x}</li>)}</ul>;
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Unexpected request error.";
export default function Workspace() {
  const [s, setS] = useState<any>(null); const [topic, setTopic] = useState(""); const [errs, setErrs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false); const [ai, setAi] = useState(true); const [tab, setTab] = useState<(typeof TABS)[number]>("Papers");
  const [q, setQ] = useState(""); const [chat, setChat] = useState<any[]>([]); const [chatBusy, setChatBusy] = useState(false);
  useEffect(() => {
    fetch("/api/step").then((r) => r.json()).then((d) => setAi(d.aiConfigured)).catch((error) => {
      setAi(false);
      setErrs([`Could not check Groq configuration: ${errorMessage(error)}`]);
    });
    setTopic(localStorage.getItem("rm_topic") || "");
  }, []);
  async function upload(files: FileList | null) {
    if (!files?.length) return; setBusy(true); const fd = new FormData(); fd.set("sessionId", s?.id || ""); fd.set("topic", topic);
    Array.from(files).forEach((f) => fd.append("files", f));
    try {
      const response = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await response.json();
      if (!response.ok) throw new Error(d.error || `Upload failed (${response.status}).`);
      setErrs(d.errors || []); setS(d.session);
    } catch (error) { setErrs([`Upload failed: ${errorMessage(error)}`]); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/upload?sessionId=${s.id}&paperId=${id}`, { method: "DELETE" });
      const d = await response.json();
      if (!response.ok) throw new Error(d.error || `Remove failed (${response.status}).`);
      setS(d.session);
    } catch (error) { setErrs([`Could not remove paper: ${errorMessage(error)}`]); }
    finally { setBusy(false); }
  }
  async function run(agents: AgentId[]) {
    setBusy(true); setErrs([]);
    try {
      localStorage.setItem("rm_topic", topic);
      for (const agent of agents) {
        setS((p: any) => ({ ...p, steps: { ...p.steps, [agent]: { status: "running" } } }));
        const response = await fetch("/api/step", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: s.id, agent, topic }) });
        const d = await response.json();
        if (d.session) setS(d.session);
        if (!response.ok) { setErrs([`${NAMES[agent]}: ${d.error || `Request failed (${response.status}).`}`]); break; }
      }
    } catch (error) { setErrs([`Analysis request failed: ${errorMessage(error)}`]); }
    finally { setBusy(false); }
  }
  async function ask() {
    if (!s || !q.trim()) return;
    const question = q; setQ(""); setChat((c) => [...c, { role: "user", text: question }]); setChatBusy(true);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: s.id, question }) });
      const d = await response.json();
      setChat((c) => [...c, response.ok ? { role: "ai", text: d.answer, sources: d.sources } : { role: "err", text: d.error || `Chat failed (${response.status}).` }]);
    } catch (error) { setChat((c) => [...c, { role: "err", text: errorMessage(error) }]); }
    finally { setChatBusy(false); }
  }
  const st = (a: AgentId) => s?.steps?.[a]?.status ?? "pending"; const papers = s?.papers ?? [];
  const todo = AGENT_ORDER.filter((a) => st(a) !== "completed");
  return <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
    <header className="flex items-center justify-between"><a href="/" className="text-2xl font-bold">ResearchMate AI</a><span className="text-xs text-gray-400">Workspace</span></header>
    {!ai && <div className="panel border-amber-500/40 flex gap-2 text-sm text-amber-200"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />Groq API key not configured. You can upload PDFs, but analysis and chat are disabled. Add GROQ_API_KEY to .env.local and restart.</div>}
    {errs.map((e, i) => <div key={i} role="alert" className="panel border-red-500/40 text-sm text-red-200">{e}</div>)}
    <section className="grid gap-4 lg:grid-cols-3">
      <div className="panel lg:col-span-2 space-y-3">
        <label className="text-sm text-gray-400" htmlFor="t">Research topic / question</label>
        <input id="t" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Retrieval-augmented generation for medical diagnosis" className="w-full rounded-lg bg-black/40 border border-white/10 px-3 py-2 text-sm" />
        <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-white/20 p-6 text-sm text-gray-400 hover:border-blue-400"><Upload className="h-5 w-5" />Click to upload PDF papers (multiple allowed)<input type="file" accept="application/pdf" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = ""; }} /></label>
        {papers.length === 0 ? <p className="text-sm text-gray-500">No papers yet. Upload PDFs to begin.</p> : papers.map((p: any) => <div key={p.id} className="flex items-center justify-between text-sm rounded-lg bg-black/30 px-3 py-2"><span className="truncate">{p.meta?.title || p.name} <span className="text-gray-500">· {p.pageCount} pages</span></span><button aria-label={`Remove ${p.name}`} disabled={busy} onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-gray-400 hover:text-red-400" /></button></div>)}
        <button className="btn flex items-center gap-2" disabled={busy || !ai || !papers.length || !todo.length} onClick={() => run(todo)}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Run analysis</button>
      </div>
      <div className="panel"><h2 className="font-semibold mb-3">Agent progress</h2><ol className="space-y-3">{AGENT_ORDER.map((a) => <li key={a} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><Icon x={st(a)} />{NAMES[a]}</span>
        {st(a) === "failed" ? <button className="text-xs text-blue-300 flex items-center gap-1" disabled={busy} onClick={() => run(AGENT_ORDER.slice(AGENT_ORDER.indexOf(a)).filter((x) => st(x) !== "completed" || x === a))}><RotateCcw className="h-3 w-3" />Retry</button> : <span className="text-xs text-gray-500 capitalize">{st(a)}</span>}</li>)}</ol></div>
    </section>
    <nav className="flex gap-1 overflow-x-auto" role="tablist">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === t ? "bg-white/10" : "text-gray-400 hover:text-white"}`}>{t}</button>)}</nav>
    <section className="panel min-h-[260px] space-y-4 text-sm">
      {tab === "Papers" && (papers.some((p: any) => p.meta) ? papers.map((p: any) => p.meta && <div key={p.id}><h3 className="font-semibold">{p.meta.title}</h3><p className="text-gray-400">{p.meta.authors.join(", ")} · {p.meta.year}</p><p className="mt-1 text-gray-300"><b>Abstract:</b> {p.meta.abstract}</p></div>) : <p className="text-gray-500">Metadata appears after the Document Analyst agent runs.</p>)}
      {tab === "Summaries" && (Object.keys(s?.summaries ?? {}).length ? papers.map((p: any) => { const x = s.summaries[p.id]; return x && <div key={p.id} className="space-y-1"><h3 className="font-semibold">{p.meta?.title}</h3><p><b>Objective:</b> {x.objective}</p><p><b>Methodology:</b> {x.methodology}</p><p><b>Dataset:</b> {x.dataset}</p><b>Findings</b><List a={x.keyFindings} /><b>Limitations</b><List a={x.limitations} /><p><b>Conclusion:</b> {x.conclusion}</p><p className="text-gray-500 text-xs">{x.pageRefs?.join(" · ")}</p></div>; }) : <p className="text-gray-500">Run the analysis to see summaries.</p>)}
      {tab === "Comparison" && (s?.comparison ? <>{(["similarities", "methodologyDifferences", "conflictingResults", "themes", "trends"] as const).map((k) => <div key={k}><h3 className="font-semibold capitalize">{k.replace(/([A-Z])/g, " $1")}</h3><List a={s.comparison[k]} /></div>)}<div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-gray-400"><tr>{["Paper", "Methodology", "Dataset", "Key finding", "Limitation"].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{s.comparison.matrix.map((r: any, i: number) => <tr key={i} className="border-t border-white/10 align-top">{[r.paper, r.methodology, r.dataset, r.keyFinding, r.limitation].map((v, j) => <td key={j} className="p-2">{v}</td>)}</tr>)}</tbody></table></div></> : <p className="text-gray-500">Comparison appears after the Comparative agent runs.</p>)}
      {tab === "Gaps" && (s?.gaps ? <><p className="text-amber-300 text-xs">These are hypotheses requiring verification, not proven discoveries.</p>{s.gaps.gaps.map((g: any, i: number) => <div key={i}><h3 className="font-semibold">{g.title}</h3><p>{g.hypothesis}</p><p className="text-gray-400"><b>Evidence:</b> {g.evidence}</p><p className="text-gray-500 text-xs">Papers: {g.supportingPapers.join("; ")}</p></div>)}</> : <p className="text-gray-500">Gaps appear after the Research Gap agent runs.</p>)}
      {tab === "References" && (s?.refs ? <>{(["ieee", "apa"] as const).map((k) => <div key={k}><h3 className="font-semibold uppercase">{k}</h3>{s.refs[k].map((r: string, i: number) => <p key={i} className="text-gray-300">{r}</p>)}<button className="text-xs text-blue-300 mt-1" onClick={() => navigator.clipboard.writeText(s.refs[k].join("\n"))}>Copy {k.toUpperCase()}</button></div>)}</> : <p className="text-gray-500">References appear after the final agent runs.</p>)}
      {tab === "Report" && (s?.report ? <><a className="btn inline-flex items-center gap-2" href={`/api/export?sessionId=${s.id}`}><Download className="h-4 w-4" />Download Markdown</a><button className="ml-2 text-xs text-blue-300" onClick={() => navigator.clipboard.writeText(s.report)}>Copy</button><pre className="whitespace-pre-wrap text-xs text-gray-300">{s.report}</pre></> : <p className="text-gray-500">The report is generated by the final agent.</p>)}
      {tab === "Chat" && <div className="space-y-3">
        {chat.length === 0 && <p className="text-gray-500">Ask about your papers (needs the Document Analyst step to have run).</p>}
        {chat.map((m, i) => <div key={i} className={m.role === "user" ? "text-right" : ""}><div className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-left whitespace-pre-wrap ${m.role === "user" ? "bg-blue-600/30" : m.role === "err" ? "bg-red-500/20 text-red-200" : "bg-white/10"}`}>{m.text}</div>{m.sources && <p className="text-xs text-gray-500 mt-1">{m.sources.map((x: any) => `[${x.n}] ${x.paper}, p.${x.page}`).join(" · ")}</p>}</div>)}
        <div className="flex gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && q.trim() && !chatBusy && s && ask()} placeholder="What limitations are mentioned across the papers?" className="flex-1 rounded-lg bg-black/40 border border-white/10 px-3 py-2" /><button aria-label="Send" className="btn" disabled={chatBusy || !q.trim() || !s || !ai} onClick={ask}>{chatBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></div></div>}
    </section></main>;
}
