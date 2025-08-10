// File system promises API for async file operations
import fs from "fs/promises";

// Standard FS module for creating write streams
import fss from "fs";

// PDF parsing library (extracts text from PDFs)
import pdf from "pdf-parse";

// HTTP client for downloading PDFs from URLs
import axios from "axios";

// Path utilities for working with file paths
import path from "path";

// OS utilities (used for temp directory)
import os from "os";

// -----------------------------------------
// PRECOMPILED REGEX: Matches strings of only non-alphanumeric symbols (>=5 chars)
// Used to detect text that’s just noise (like lines of dashes or separators)
const SYMBOLS_ONLY = /^[^a-zA-Z0-9]{5,}$/;

/**
 * Checks if extracted text is meaningful.
 * - Removes whitespace.
 * - Rejects if too short or matches the SYMBOLS_ONLY pattern.
 */
const isMeaningful = (text) => {
  const cleaned = text.replace(/\s+/g, "");
  return cleaned.length > 10 && !SYMBOLS_ONLY.test(cleaned);
};

/**
 * Downloads a PDF from a URL as a readable stream.
 * Validates that the file is actually a PDF.
 */
const fetchPdfStream = async (url) => {
  const response = await axios.get(url, { responseType: "stream" });

  // Fail if the HTTP status isn’t 200 OK
  if (response.status !== 200) {
    throw new Error(`Failed to download PDF. Status: ${response.status}`);
  }

  // Fail if Content-Type isn’t application/pdf
  if (!response.headers["content-type"]?.includes("application/pdf")) {
    throw new Error(
      `Expected a PDF file but got: ${response.headers["content-type"]}`
    );
  }

  return response.data; // This is a readable stream
};

/**
 * Downloads a PDF to a temporary file in the OS temp directory.
 * Returns the temp file path.
 */
const downloadToTempFile = async (url) => {
  const tempPath = path.join(os.tmpdir(), `temp_${Date.now()}.pdf`);
  const stream = await fetchPdfStream(url);

  await new Promise((resolve, reject) => {
    const fileStream = fss.createWriteStream(tempPath);
    stream.pipe(fileStream);
    fileStream.on("finish", resolve);
    fileStream.on("error", reject);
  });

  return tempPath;
};

/**
 * Extracts clean text from a PDF file or URL.
 *
 * @param {string} filePathOrUrl - Local path or HTTP/HTTPS URL to the PDF
 * @param {object} options - Optional config
 * @param {boolean} options.keepTemp - Whether to keep a downloaded temp file
 * @returns {Promise<string>} - Cleaned text from the PDF
 */
export default async function extractCleanText(
  filePathOrUrl,
  { keepTemp = false } = {}
) {
  let input; // This will be either a Buffer or a Readable stream

  if (/^https?:\/\//.test(filePathOrUrl)) {
    // Input is a URL
    if (keepTemp) {
      // Save PDF to a temp file
      const tempFile = await downloadToTempFile(filePathOrUrl);
      input = await fs.readFile(tempFile);
      filePathOrUrl = tempFile; // Overwrite path for potential later cleanup
    } else {
      // Stream directly into pdf-parse
      input = await fetchPdfStream(filePathOrUrl);
    }
  } else {
    // Input is a local file
    input = await fs.readFile(filePathOrUrl);
  }

  // PDF-parse options: custom page renderer
  const options = {
    pagerender: (pageData) =>
      pageData.getTextContent().then((content) => {
        // Join all text items into a single string
        const text = content.items.map((item) => item.str).join(" ");
        // Only keep the text if it's meaningful
        return isMeaningful(text) ? text : "";
      }),
  };

  let result;
  try {
    // Extract text from PDF using pdf-parse
    result = await pdf(input, options);
  } catch (err) {
    console.warn("PDF parse failed:", err.message);
    // If parsing fails, return empty text
    result = { text: "" };
  }

  // Cleanup temp file if it was created and not requested to be kept
  if (/^https?:\/\//.test(filePathOrUrl) && !keepTemp) {
    try {
      await fs.unlink(filePathOrUrl);
    } catch {
      // Ignore file deletion errors
    }
  }

  return result.text.trim();
}
