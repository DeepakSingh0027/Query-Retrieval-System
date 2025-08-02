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

  // Step 1: Score and prepare each chunk
  const scoredChunks = chunks
    .map((chunk) => {
      const lowered = chunk.toLowerCase();
      const score = relevanceScore(lowered, questionWords);
      const length = chunk.length;
      return { chunk, lowered, score, length };
    })
    .filter((entry) => entry.score > 0); // keep only relevant

  // Step 2: Sort by descending relevance score
  scoredChunks.sort((a, b) => b.score - a.score);

  // Step 3: Select chunks within character limit
  const result = [];
  let totalLength = 0;

  for (const { chunk, length } of scoredChunks) {
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
