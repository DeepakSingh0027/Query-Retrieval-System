// Import the 'pipeline' function from @xenova/transformers
// This lets us load pre-trained models for various NLP tasks, like feature extraction.
import { pipeline } from "@xenova/transformers";

// This variable will hold the loaded embedding model (lazy-loaded on first use)
let embedder = null;

// This will store all processed text chunks and their corresponding embeddings.
// Structure: [{ text: "chunk text", embedding: [vector values] }]
let embeddedChunks = [];

/**
 * Initializes the embedding model if it isn't already loaded.
 *
 * The model "Xenova/paraphrase-multilingual-MiniLM-L12-v2" is:
 *   - Multilingual (supports many languages)
 *   - Good for semantic similarity search
 *   - Outputs vector embeddings for sentences
 */
export async function initEmbedder() {
  if (!embedder) {
    embedder = await pipeline(
      "feature-extraction", // Task type: extract numerical features from text
      "Xenova/paraphrase-multilingual-MiniLM-L12-v2" // Model name
    );
  }
}

/**
 * Embeds an array of text chunks into numerical vectors for semantic search.
 *
 * @param {string[]} chunks - Array of text strings to embed.
 * @param {number} batchSize - Number of chunks to process at once.
 * @returns {Promise<{success: boolean, count: number}>}
 */
export async function embedChunks(chunks, batchSize = 32) {
  console.log("Embedding chunks:", chunks.length);

  // Ensure the embedder model is loaded before processing
  await initEmbedder();

  // Reset previous embeddings
  embeddedChunks = [];

  // Process chunks in batches (to avoid memory overload for large inputs)
  for (let i = 0; i < chunks.length; i += batchSize) {
    // Extract a batch slice
    const batch = chunks.slice(i, i + batchSize);

    // Generate embeddings for the batch
    // Options:
    //   - pooling: "mean" averages token embeddings into one vector
    //   - normalize: true makes vector length = 1 (important for cosine similarity)
    const { data, dims } = await embedder(batch, {
      pooling: "mean",
      normalize: true,
    });

    const embeddingSize = dims[1]; // Number of values in one embedding vector

    // Extract individual embeddings for each chunk in the batch
    for (let j = 0; j < batch.length; j++) {
      const start = j * embeddingSize; // Start index in flattened array
      const end = start + embeddingSize; // End index
      embeddedChunks.push({
        text: batch[j],
        embedding: Array.from(data.slice(start, end)), // Convert to JS array
      });
    }
  }

  console.log(
    "Embedding complete. Total chunks embedded:",
    embeddedChunks.length
  );

  // Return a success message and the number of chunks processed
  return { success: true, count: embeddedChunks.length };
}

/**
 * Calculates cosine similarity between two embedding vectors.
 *
 * Cosine similarity formula:
 *   similarity = (A · B) / (||A|| * ||B||)
 * where:
 *   - A · B is the dot product of the two vectors
 *   - ||A|| and ||B|| are the magnitudes (norms) of the vectors
 *
 * @param {number[]} a - First vector
 * @param {number[]} b - Second vector
 * @returns {number} - Similarity score between -1 and 1
 */
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0); // Dot product
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0)); // Magnitude of A
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0)); // Magnitude of B
  return dot / (normA * normB); // Cosine similarity score
}

/**
 * Finds the most relevant embedded chunks for a given question.
 *
 * @param {string} question - User's search query.
 * @returns {Promise<{chunk: string, score: number}[]>} - List of matching chunks with similarity scores.
 */
export async function findMatches(question) {
  // Ensure model is loaded
  await initEmbedder();

  // Embed the question into a single vector
  const { data, dims } = await embedder([question], {
    pooling: "mean",
    normalize: true,
  });

  // Extract the question's embedding
  const questionEmbedding = Array.from(data.slice(0, dims[1]));

  // Calculate cosine similarity between the question and all embedded chunks
  const similarities = embeddedChunks.map(({ text, embedding }) => ({
    chunk: text,
    score: cosineSimilarity(embedding, questionEmbedding),
  }));

  // Filter out very low similarity scores (below threshold)
  // Sort the remaining results from most to least relevant
  return similarities
    .filter(({ score }) => score > 0.1)
    .sort((a, b) => b.score - a.score);
}
