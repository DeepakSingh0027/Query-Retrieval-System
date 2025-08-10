// Import the OCR-based text extraction function from ocrExtractor.js
// This function is responsible for reading the text from a PDF using OCR (Optical Character Recognition)
// Useful for scanned PDFs or PDFs that don't contain selectable text
import { extractTextFromPdf } from "./ocrExtractor.js";

// Import the clean text extraction function from extractText.js
// This function attempts to extract text directly from a PDF in a "clean" way
// without OCR, which is faster and more accurate if the PDF has real text layers
import extractCleanText from "./extractText.js";

/**
 * smartExtractText
 * ----------------
 * This function tries to extract text from a PDF in the most efficient way possible:
 *   1. First, it tries "clean" extraction (non-OCR) for speed and accuracy.
 *   2. If clean extraction fails OR results in very short text, it falls back to OCR.
 *
 * @param {string} filePathOrUrl - The path or URL of the PDF file to extract text from.
 * @returns {Promise<string>} - The extracted text from the PDF.
 */
const smartExtractText = async (filePathOrUrl) => {
  // Initialize an empty string to store extracted text
  let text = "";

  try {
    // Try to extract text using the clean extraction method
    // This usually works well for PDFs with selectable text
    text = await extractCleanText(filePathOrUrl);
  } catch (e) {
    // If clean extraction throws an error (e.g., PDF parsing issues),
    // log a warning and prepare to use OCR as a fallback
    console.warn("Clean extract failed, forcing OCR fallback");
  }

  // Check if the extracted text is long enough to be considered valid
  // If it's longer than 30 characters, we assume it's a successful extraction
  if (text.length > 30) {
    return text; // Return the successfully extracted clean text
  }

  // If we get here, either:
  //   - Clean extraction failed
  //   - OR it returned too little text (probably not usable)
  // So we fall back to OCR extraction
  console.log("Falling back to OCR...");
  return await extractTextFromPdf(filePathOrUrl);
};

// Export the smart extraction function so it can be used in other files
export default smartExtractText;
