import { Chunk, Paper } from "./types";
export function chunkPaper(p: Paper, size = 1200, overlap = 150): Chunk[] {
  const out: Chunk[] = [];
  p.pages.forEach((t, i) => { const s = t.replace(/\s+/g, " ").trim(); for (let a = 0; a < s.length; a += size - overlap) { const x = s.slice(a, a + size); if (x.length > 80) out.push({ paperId: p.id, page: i + 1, text: x }); } });
  return out;
}
const tokenize = (text: string) => text.toLocaleLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [];
export function rankChunks<T extends { text: string }>(chunks: T[], query: string): { chunk: T; score: number }[] {
  const terms = [...new Set(tokenize(query))];
  const documents = chunks.map((chunk) => {
    const words = tokenize(chunk.text), counts = new Map<string, number>();
    words.forEach((word) => counts.set(word, (counts.get(word) ?? 0) + 1));
    return { chunk, words, counts };
  });
  const averageLength = documents.reduce((sum, doc) => sum + doc.words.length, 0) / (documents.length || 1);
  const documentFrequencies = new Map<string, number>();
  documents.forEach(({ counts }) => {
    counts.forEach((_, term) => documentFrequencies.set(term, (documentFrequencies.get(term) ?? 0) + 1));
  });
  return documents.map((doc) => {
    let score = 0;
    for (const term of terms) {
      const frequency = doc.counts.get(term) ?? 0;
      if (!frequency) continue;
      const documentFrequency = documentFrequencies.get(term) ?? 0;
      const inverseFrequency = Math.log(1 + (documents.length - documentFrequency + 0.5) / (documentFrequency + 0.5));
      score += inverseFrequency * (frequency * 2.2) / (frequency + 1.2 * (0.25 + 0.75 * doc.words.length / (averageLength || 1)));
    }
    return { chunk: doc.chunk, score };
  }).sort((a, b) => b.score - a.score);
}
/** Page-tagged page samples across the paper, capped to protect provider token limits. */
export function taggedText(p: Paper, cap = 40000): string {
  const pages = p.pages.map((text, index) => ({ index, text: text.replace(/\s+/g, " ").trim() }));
  const pageCount = Math.min(pages.length, Math.max(1, Math.floor(cap / 900)));
  const selected = pageCount === pages.length
    ? pages
    : pageCount === 1
      ? [pages[0]]
      : Array.from({ length: pageCount }, (_, i) => pages[Math.round(i * (pages.length - 1) / (pageCount - 1))]);
  const perPage = Math.max(100, Math.floor(cap / (selected.length || 1)) - 12);
  return selected.map(({ index, text }) => `[p.${index + 1}] ${text.slice(0, perPage)}`).join("\n").slice(0, cap);
}
