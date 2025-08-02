function preprocessQuestions(questions) {
  const questionWords = new Set();
  for (const question of questions) {
    for (const word of question.toLowerCase().split(/\W+/)) {
      if (word.length > 3) questionWords.add(word);
    }
  }
  return questionWords;
}

function relevanceScore(chunkLower, questionWords) {
  let score = 0;
  for (const word of questionWords) {
    if (chunkLower.includes(word)) score++;
  }
  return score;
}

function selectRelevantChunks(chunks, questions, maxLength = 29999) {
  const questionWords = preprocessQuestions(questions);

  let scoredChunks = chunks.map((chunk) => {
    const lowered = chunk.toLowerCase();
    const score = relevanceScore(lowered, questionWords);
    const length = chunk.length;
    return { chunk, score, length };
  });

  // Step 1: Filter relevant chunks
  let relevantChunks = scoredChunks.filter((entry) => entry.score > 0);

  // Step 2: Sort relevant chunks by score (high to low)
  if (relevantChunks.length > 0) {
    relevantChunks.sort((a, b) => b.score - a.score);
  } else {
    // No relevant chunks found, use fallback — original order or random
    console.warn("No relevant chunks found. Using fallback chunks.");
    relevantChunks = scoredChunks; // you can shuffle() here if needed
  }

  // Step 3: Accumulate chunks until maxLength is reached
  const result = [];
  let totalLength = 0;

  for (const { chunk, length } of relevantChunks) {
    if (totalLength + length <= maxLength) {
      result.push(chunk);
      totalLength += length;
    } else {
      const remaining = maxLength - totalLength;
      if (remaining > 0) {
        const trimmed = chunk.slice(0, remaining);
        result.push(trimmed);
      }
      break;
    }
  }

  return result;
}

export { selectRelevantChunks };
