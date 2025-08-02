import natural from "natural";
const TfIdf = natural.TfIdf;

export function selectRelevantChunks(chunks, questions, maxWords = 29999) {
  const tfidf = new TfIdf();

  // Add each chunk as a document
  chunks.forEach((chunk, index) => {
    tfidf.addDocument(chunk.toLowerCase(), index.toString());
  });

  // Join all questions into one query string
  const query = questions.join(" ").toLowerCase();

  // Score each chunk using TF-IDF
  const scored = chunks.map((chunk, index) => {
    const score = tfidf.tfidf(query, index);
    const wordCount = chunk.split(/\s+/).length;
    return { chunk, score, wordCount };
  });

  // Sort chunks by score descending
  scored.sort((a, b) => b.score - a.score);

  // Select chunks until we hit the max word limit
  const result = [];
  let total = 0;
  for (const { chunk, wordCount } of scored) {
    if (total + wordCount <= maxWords) {
      result.push(chunk);
      total += wordCount;
    } else {
      const remaining = maxWords - total;
      if (remaining > 0) {
        // Add a trimmed portion of the next chunk to fill exactly
        const trimmed = chunk.split(/\s+/).slice(0, remaining).join(" ");
        result.push(trimmed);
      }
      break;
    }
  }

  return result;
}
