function preprocessQuestions(questions, minWordLength = 4) {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "that",
    "with",
    "this",
    "have",
    "from",
    "you",
    "your",
    "but",
    "not",
    "are",
    "was",
    "what",
    "when",
    "which",
    "will",
    "they",
    "them",
    "been",
    "their",
    "how",
    "would",
    "can",
    "there",
    "why",
    "these",
    "could",
    "into",
    "then",
    "than",
    "more",
    "also",
    "some",
    "like",
  ]);

  const wordSet = new Set();

  for (const question of questions) {
    const words = question
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .split(/\s+/);

    for (const word of words) {
      if (word.length >= minWordLength && !stopWords.has(word)) {
        wordSet.add(word);
      }
    }
  }

  return wordSet;
}

function relevanceScore(chunk, questionWords) {
  const normalized = chunk.toLowerCase().replace(/[^\w\s]/g, "");
  const wordsInChunk = new Set(normalized.split(/\s+/));

  let score = 0;

  for (const qWord of questionWords) {
    for (const cWord of wordsInChunk) {
      // Exact match or prefix match (e.g., "compute" in "computing")
      if (cWord === qWord || cWord.startsWith(qWord)) {
        score++;
        break;
      }
    }
  }

  return score;
}

function trimChunkSmart(chunk, maxLength) {
  if (chunk.length <= maxLength) return chunk;

  // Try to trim at last sentence-ending punctuation before limit
  const trimmed = chunk.slice(0, maxLength);
  const lastPunct = trimmed.lastIndexOf(".");
  if (lastPunct > maxLength * 0.7) return trimmed.slice(0, lastPunct + 1);

  const lastSpace = trimmed.lastIndexOf(" ");
  return lastSpace > 0 ? trimmed.slice(0, lastSpace) + "..." : trimmed;
}

function selectRelevantChunks(chunks, questions, options = {}) {
  const {
    maxLength = 29899,
    minWordLength = 4,
    minChunkLength = 100,
    maxChunkLength = 10000,
  } = options;

  const questionWords = preprocessQuestions(questions, minWordLength);

  // Prefilter too-short or too-long chunks
  const validChunks = chunks.filter(
    (c) => c.length >= minChunkLength && c.length <= maxChunkLength
  );

  const scoredChunks = validChunks.map((chunk) => ({
    chunk,
    score: relevanceScore(chunk, questionWords),
    length: chunk.length,
  }));

  let relevantChunks = scoredChunks.filter((entry) => entry.score > 0);

  if (relevantChunks.length === 0) {
    console.warn("No relevant chunks found. Using fallback.");
    relevantChunks = scoredChunks;
  } else {
    relevantChunks.sort((a, b) => b.score - a.score);
  }

  const result = [];
  let totalLength = 0;

  for (const { chunk, length } of relevantChunks) {
    if (totalLength + length <= maxLength) {
      result.push(chunk);
      totalLength += length;
    } else {
      const remaining = maxLength - totalLength;
      if (remaining > 50) {
        const smartTrimmed = trimChunkSmart(chunk, remaining);
        result.push(smartTrimmed);
      }
      break;
    }
  }

  return result;
}

export { selectRelevantChunks };
