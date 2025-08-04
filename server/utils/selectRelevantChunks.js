function preprocessQuestions(questions, minWordLength = 4) {
  const stopWords = new Set([
    // Common English filler
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "if",
    "then",
    "when",
    "which",
    "that",
    "this",
    "these",
    "those",
    "with",
    "without",
    "from",
    "into",
    "onto",
    "in",
    "on",
    "at",
    "by",
    "to",
    "of",
    "for",
    "under",
    "over",
    "have",
    "has",
    "had",
    "be",
    "been",
    "being",
    "is",
    "are",
    "was",
    "were",
    "do",
    "does",
    "did",
    "can",
    "could",
    "would",
    "should",
    "will",
    "shall",
    "may",
    "might",
    "must",
    "not",
    "no",
    "yes",
    "as",
    "also",
    "some",
    "more",
    "than",
    "about",
    "including",
    "however",
    "where",
    "there",
    "here",
    "any",
    "all",
    "each",
    "every",
    "either",
    "neither",
    "both",
    "said",
    "above",
    "below",
    "per",
    "upon",
    "before",
    "after",
    "until",
    "within",
    "during",
    "such",
    "etc",
    "respectively",

    // Legal/insurance boilerplate
    "hereby",
    "herein",
    "hereafter",
    "therein",
    "thereof",
    "hereof",
    "hereto",
    "notwithstanding",
    "means",
    "shall mean",
    "refers",
    "defined",
    "defined as",
    "stipulated",
    "provided that",
    "subject",
    "term",
    "terms",
    "condition",
    "conditions",
    "clause",
    "section",
    "document",
    "policy",
    "certificate",
    "form",
    "agreement",
    "details",
    "statement",
    "provided",
    "coverage",
    "limit",
    "limits",

    // Question templates (from your example)
    "what",
    "is",
    "are",
    "does",
    "do",
    "how",
    "available",
    "included",
    "cover",
    "covered",
    "include",
    "provides",
    "provide",
    "offered",
    "offering",
    "options",
    "option",
    "define",
    "definition",
    "process",
    "required",
    "required for",
    "needed",
    "determined",
    "procedure",
    "procedures",
    "treatment",
    "treatments",
  ]);

  const wordSet = new Set();

  for (const question of questions) {
    const words = question
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
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

  const trimmed = chunk.slice(0, maxLength);
  const lastPunct = trimmed.lastIndexOf(".");
  if (lastPunct > maxLength * 0.7) return trimmed.slice(0, lastPunct + 1);

  const lastSpace = trimmed.lastIndexOf(" ");
  return lastSpace > 0 ? trimmed.slice(0, lastSpace) + "..." : trimmed;
}

function addChunksToResult(chunks, result, totalLength, maxLength) {
  for (const { chunk, length } of chunks) {
    if (totalLength + length <= maxLength) {
      result.push(chunk);
      totalLength += length;
    } else {
      const remaining = maxLength - totalLength;
      if (remaining > 50) {
        const smartTrimmed = trimChunkSmart(chunk, remaining);
        result.push(smartTrimmed);
        totalLength += smartTrimmed.trim().length; // ✅ FIXED HERE
      }
      break;
    }
  }
  return totalLength;
}

function selectRelevantChunks(chunks, questions, options = {}) {
  const {
    maxLength = 28499,
    minWordLength = 4,
    minChunkLength = 10,
    maxChunkLength = 10000,
  } = options;

  const questionWords = preprocessQuestions(questions, minWordLength);

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

  totalLength = addChunksToResult(
    relevantChunks,
    result,
    totalLength,
    maxLength
  );

  if (totalLength < maxLength) {
    const usedChunks = new Set(result);
    const nonRelevantChunks = scoredChunks
      .filter((entry) => !usedChunks.has(entry.chunk))
      .sort(() => Math.random() - 0.5);

    addChunksToResult(nonRelevantChunks, result, totalLength, maxLength);
  }

  return result;
}

export { selectRelevantChunks };
