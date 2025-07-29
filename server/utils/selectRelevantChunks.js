function relevanceScore(chunk, questions) {
  const loweredChunk = chunk.toLowerCase();
  return questions.reduce((score, question) => {
    const loweredQ = question.toLowerCase();
    const qWords = loweredQ.split(/\W+/).filter((w) => w.length > 3);
    return score + qWords.filter((word) => loweredChunk.includes(word)).length;
  }, 0);
}

function selectRelevantChunks(chunks, questions, maxChunks = 10) {
  const scoredChunks = chunks
    .map((chunk) => ({
      chunk,
      score: relevanceScore(chunk, questions),
    }))
    .filter((entry) => entry.score > 0) // only keep relevant
    .sort((a, b) => b.score - a.score); // sort descending

  return scoredChunks.slice(0, maxChunks).map((entry) => entry.chunk);
}

module.exports = selectRelevantChunks;
