import Link from "next/link";
const F=[["Document Analyst","Extracts text, metadata and chunks from PDFs"],["Research Summarizer","Grounded, page-referenced summaries"],["Comparative Analyst","Matrix of methods, findings, conflicts"],["Research Gap Agent","Evidence-backed hypotheses, not claims"],["Citation & Report","IEEE/APA references and a downloadable report"],["RAG Chat","Ask questions with cited sources"]];
export default function Home(){return <main className="mx-auto max-w-5xl px-6 py-20">
<h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">ResearchMate AI</h1>
<p className="mt-4 text-lg text-gray-300 max-w-2xl">A multi-agent literature review assistant. Upload research papers, run five specialised agents, and chat with your collection.</p>
<Link href="/workspace" className="btn inline-block mt-8">Start Researching</Link>
<div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{F.map(([t,d])=><div key={t} className="panel"><h3 className="font-semibold">{t}</h3><p className="text-sm text-gray-400 mt-1">{d}</p></div>)}</div></main>}
