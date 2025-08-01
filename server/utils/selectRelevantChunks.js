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

function selectRelevantChunks(chunks, questions) {
  const questionWords = preprocessQuestions(questions);

  const scoredChunks = [];
  for (const chunk of chunks) {
    const lowered = chunk.toLowerCase();
    const score = relevanceScore(lowered, questionWords);
    if (score > 0) scoredChunks.push({ chunk, lowered, score });
  }

  scoredChunks.sort((a, b) => b.score - a.score);

  const result = [];
  let totalLength = 0;

  for (const { chunk } of scoredChunks) {
    if (totalLength + chunk.length >= 29999) break;
    result.push(chunk);
    totalLength += chunk.length;
  }

  return result;
}

export { selectRelevantChunks };
