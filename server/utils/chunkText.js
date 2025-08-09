export function chunkText(text, maxTokens = 500) {
  // First split by periods followed by whitespace
  const periodChunks = text.split(/(?<=\.)\s+/);
  let chunks = [];

  // Then process each period chunk and split by newlines
  for (let periodChunk of periodChunks) {
    const lineChunks = periodChunk.split(/\n+|\r+/);

    let currentChunk = "";

    for (let line of lineChunks) {
      // Skip empty lines
      if (!line.trim()) continue;

      // Check if adding the line exceeds max tokens
      if ((currentChunk + line).split(/\s+/).length > maxTokens) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = line + " ";
      } else {
        currentChunk += line + " ";
      }
    }

    // Add any remaining content from this period chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
  }

  return chunks;
}
