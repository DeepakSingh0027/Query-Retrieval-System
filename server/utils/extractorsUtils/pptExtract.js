// Node's filesystem module for reading the PPTX file
import fs from "fs";

// unzipit library lets us inspect the internal ZIP contents of a PPTX file
import { unzip } from "unzipit";

// Tesseract.js OCR library for reading text from images
import { createWorker } from "tesseract.js";

/**
 * Create a single Tesseract worker instance when this module loads.
 * - This avoids reloading the OCR model for every file.
 * - Dramatically improves performance if calling this function multiple times.
 */
const worker = await createWorker("eng");

/**
 * Extracts all text from a PowerPoint PPTX file.
 * Includes:
 *  - Direct text inside slides (<a:t> XML tags)
 *  - Text detected in embedded images via OCR
 *
 * @param {string} filePath - Path to the PPTX file
 * @returns {Promise<string>} - Extracted and combined text
 */
export async function extractTextFromPptxWithOCR(filePath) {
  // STEP 1: Read the PPTX file into memory as a buffer
  const buffer = await fs.promises.readFile(filePath);

  // STEP 2: Unzip the PPTX (PowerPoint files are just ZIP archives containing XML & media)
  const { entries } = await unzip(buffer);

  // We'll collect both slide text and OCR text here
  let textParts = [];

  /**
   * STEP 3: Extract visible slide text from <a:t> XML tags
   * - Each slide file is located under "ppt/slides/slideN.xml"
   * - <a:t> tags hold the actual visible text strings on a slide
   */
  for (const name in entries) {
    if (name.includes("ppt/slides/slide") && name.endsWith(".xml")) {
      // Read slide XML content as text
      const content = await entries[name].text();

      // Regex to capture everything inside <a:t>...</a:t>
      const matches = [...content.matchAll(/<a:t>(.*?)<\/a:t>/g)];

      if (matches.length > 0) {
        // Extract just the text content, ignoring XML tags
        const slideText = matches.map((m) => m[1]).join(" ");
        textParts.push(slideText);
      }
    }
  }

  /**
   * STEP 4: Find embedded images
   * - Images are stored under "ppt/media/"
   * - These might contain scanned or photographed text
   */
  const imageEntries = Object.entries(entries).filter(([name]) =>
    name.includes("ppt/media/")
  );

  /**
   * STEP 5: OCR each image
   * - Uses the shared worker created earlier
   * - No need to create new workers for each image (faster & more memory efficient)
   */
  const ocrResults = await Promise.all(
    imageEntries.map(async ([name, entry]) => {
      try {
        // Convert image file entry to Buffer
        const fileData = await entry.arrayBuffer();
        const bufferData = Buffer.from(fileData);

        // Run OCR on the image
        const {
          data: { text: ocrText },
        } = await worker.recognize(bufferData);

        return ocrText.trim();
      } catch (err) {
        console.error(`OCR failed for ${name}:`, err);
        return ""; // Skip failed OCR results
      }
    })
  );

  // STEP 6: Add OCR results (ignore empty ones)
  textParts.push(...ocrResults.filter(Boolean));

  /**
   * STEP 7: Combine all extracted text
   * - Separate sections with newlines
   * - Trim to remove leading/trailing whitespace
   */
  const finalText = textParts.join("\n").trim();

  // Return extracted text, or a fallback message if nothing found
  return finalText || "No text found in PPT slides or images.";
}
