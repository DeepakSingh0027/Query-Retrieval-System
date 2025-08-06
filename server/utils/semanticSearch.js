import { pipeline } from "@xenova/transformers";

let embedder = null;
let embeddedChunks = []; // This will store { text, embedding }

export async function initEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
}

export async function embedChunks(chunks) {
  await initEmbedder();
  embeddedChunks = []; // Clear previous embeddings

  for (const text of chunks) {
    const { data } = await embedder(text, { pooling: "mean", normalize: true });
    embeddedChunks.push({ text, embedding: data });
  }

  return { success: true, count: embeddedChunks.length };
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (normA * normB);
}

// Replaces the old axios call to /query
export async function findMatches(question, top_k = 5) {
  await initEmbedder();
  const { data: questionEmbedding } = await embedder(question, {
    pooling: "mean",
    normalize: true,
  });

  const similarities = embeddedChunks.map(({ text, embedding }) => ({
    chunk: text,
    score: cosineSimilarity(embedding, questionEmbedding),
  }));

  return similarities.sort((a, b) => b.score - a.score).slice(0, top_k);
}
