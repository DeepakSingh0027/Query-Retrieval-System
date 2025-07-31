export function chunkText(text, maxTokens = 500) {
  const sentences = text.split(/(?<=[.?!])\s+/);
  let chunks = [];
  let currentChunk = "";

  for (let sentence of sentences) {
    if ((currentChunk + sentence).split(" ").length > maxTokens) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }
    currentChunk += sentence + " ";
  }

  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}
