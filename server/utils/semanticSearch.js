import { pipeline } from "@xenova/transformers";

let embedder = null;
let embeddedChunks = []; // Stores { text, embedding }

export async function initEmbedder() {
  if (!embedder) {
    embedder = await pipeline(
      "feature-extraction",
      "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
    );
  }
}

export async function embedChunks(chunks, batchSize = 32) {
  console.log("Embedding chunks:", chunks.length);
  await initEmbedder();
  embeddedChunks = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    // Embed the batch
    const { data, dims } = await embedder(batch, {
      pooling: "mean",
      normalize: true,
    });

    const embeddingSize = dims[1];
    for (let j = 0; j < batch.length; j++) {
      const start = j * embeddingSize;
      const end = start + embeddingSize;
      embeddedChunks.push({
        text: batch[j],
        embedding: Array.from(data.slice(start, end)),
      });
    }
  }

  console.log(
    "Embedding complete. Total chunks embedded:",
    embeddedChunks.length
  );
  return { success: true, count: embeddedChunks.length };
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (normA * normB);
}

export async function findMatches(question) {
  await initEmbedder();

  const { data, dims } = await embedder([question], {
    pooling: "mean",
    normalize: true,
  });

  const questionEmbedding = Array.from(data.slice(0, dims[1]));

  const similarities = embeddedChunks.map(({ text, embedding }) => ({
    chunk: text,
    score: cosineSimilarity(embedding, questionEmbedding),
  }));

  return similarities
    .filter(({ score }) => score > 0.1)
    .sort((a, b) => b.score - a.score);
}
