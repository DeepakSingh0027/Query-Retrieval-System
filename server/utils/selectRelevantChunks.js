function preprocessQuestions(questions) {
  const questionWords = new Set();
  for (const question of questions) {
    for (const word of question.toLowerCase().split(/\W+/)) {
      if (word.length > 3) questionWords.add(word);
    }
  }
  return questionWords;
}

function relevanceScore(chunk, questionWords) {
  const loweredChunk = chunk.toLowerCase();
  let score = 0;
  for (const word of questionWords) {
    if (loweredChunk.includes(word)) score++;
  }
  return score;
}

function selectRelevantChunks(chunks, questions, maxChunks) {
  const questionWords = preprocessQuestions(questions);

  const scoredChunks = [];
  for (const chunk of chunks) {
    const score = relevanceScore(chunk, questionWords);
    if (score > 0) scoredChunks.push({ chunk, score });
  }

  scoredChunks.sort((a, b) => b.score - a.score);

  return scoredChunks.slice(0, maxChunks).map((entry) => entry.chunk);
}

// ✅ ESM export
export { selectRelevantChunks };
