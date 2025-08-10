// Core Node.js module for reading files from disk
import fs from "fs";

// Mammoth library extracts plain text from DOCX without formatting
import mammoth from "mammoth";

// unzipit can read the internal ZIP structure of DOCX/PPTX files
import { unzip } from "unzipit";

// Tesseract.js OCR library - createWorker creates a reusable OCR worker
import { createWorker } from "tesseract.js";

// p-limit restricts the number of tasks running in parallel
import pLimit from "p-limit"; // Used to control OCR concurrency

/**
 * Extract text from a DOCX file, including text found in embedded images via OCR.
 * @param {string} filePath - Path to the DOCX file
 * @returns {Promise<string>} - The combined extracted text
 */
export async function extractTextFromDocxWithOCR(filePath) {
  // Create a Tesseract worker for English OCR.
  // Using one shared worker is faster than creating a new one for each image.
  const worker = await createWorker("eng");

  try {
    // Read the DOCX file contents into a buffer
    const buffer = await fs.promises.readFile(filePath);

    /**
     * STEP 1: Extract regular document text
     * Mammoth reads DOCX XML and returns just the raw text content
     * (ignores styling, headers, footers, and embedded images).
     */
    const result = await mammoth.extractRawText({ buffer });

    // This array will store both normal text and OCR results
    let textParts = [];

    // Clean and add extracted text if available
    const cleanText = result.value?.trim();
    if (cleanText) {
      textParts.push(cleanText);
    }

    /**
     * STEP 2: Access DOCX internal ZIP structure
     * DOCX files are basically ZIP archives containing XML + media files.
     */
    const { entries } = await unzip(buffer);

    /**
     * STEP 3: Find embedded images inside "word/media/"
     * These could contain scanned text that needs OCR.
     */
    const imageEntries = Object.entries(entries).filter(([name]) =>
      name.includes("word/media/")
    );

    /**
     * STEP 4: Set up a concurrency limit
     * Avoid running too many OCR jobs at the same time to save memory & CPU.
     * Here we allow max 5 images to be processed in parallel.
     */
    const limit = pLimit(5);

    /**
     * STEP 5: OCR all embedded images
     * Each image is read as an ArrayBuffer → converted to a Buffer → processed by Tesseract.
     * Any OCR failure is caught and logged without stopping the whole process.
     */
    const ocrResults = await Promise.all(
      imageEntries.map(([name, entry]) =>
        limit(async () => {
          try {
            // Get raw binary image data
            const fileData = await entry.arrayBuffer();

            // Run OCR on the image data
            const {
              data: { text: ocrText },
            } = await worker.recognize(Buffer.from(fileData));

            return ocrText.trim();
          } catch (err) {
            console.error(`OCR failed for ${name}:`, err);
            return ""; // Skip failed OCR images
          }
        })
      )
    );

    /**
     * STEP 6: Add OCR results to our text parts
     * Filter out any empty results before merging.
     */
    textParts.push(...ocrResults.filter(Boolean));

    /**
     * STEP 7: Combine everything into a single final string
     * Join with newlines and trim any extra whitespace.
     */
    const finalText = textParts.join("\n").trim();

    // Return combined text, or a default message if nothing was found
    return finalText || "No text found in DOCX or images.";
  } finally {
    /**
     * Always clean up the Tesseract worker after finishing
     * to free up memory and avoid leaks.
     */
    await worker.terminate();
  }
}
