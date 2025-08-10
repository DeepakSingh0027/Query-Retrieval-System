/**
 * Splits a long text into smaller chunks with a max token (word) limit.
 *
 * @param {string} text - The input text to split.
 * @param {number} maxTokens - Maximum number of tokens (approximate word count) per chunk.
 * @returns {string[]} - Array of text chunks.
 */
export function chunkText(text, maxTokens = 500) {
  // STEP 1: Split by periods followed by whitespace.
  // This keeps sentences together while breaking big paragraphs.
  const periodChunks = text.split(/(?<=\.)\s+/);

  let chunks = []; // Final result array

  // STEP 2: Process each sentence chunk
  for (let periodChunk of periodChunks) {
    // Split further by line breaks (\n or \r)
    const lineChunks = periodChunk.split(/\n+|\r+/);

    // Temporary buffer for building up a chunk
    let currentChunk = "";

    // STEP 3: Loop through lines
    for (let line of lineChunks) {
      // Skip empty lines
      if (!line.trim()) continue;

      // Check token count if we add this line to current chunk
      const tokenCount = (currentChunk + line).split(/\s+/).length;

      if (tokenCount > maxTokens) {
        // If adding the line would exceed limit, push current chunk to output
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        // Start a new chunk with this line
        currentChunk = line + " ";
      } else {
        // Otherwise, add the line to the current chunk
        currentChunk += line + " ";
      }
    }

    // STEP 4: Push any leftover text after processing this period chunk
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
  }

  return chunks;
}
