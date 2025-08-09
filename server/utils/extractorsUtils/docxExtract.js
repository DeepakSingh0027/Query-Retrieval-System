import fs from "fs";
import mammoth from "mammoth";
import { unzip } from "unzipit";
import { createWorker } from "tesseract.js";
import pLimit from "p-limit"; // To limit parallel OCR tasks

export async function extractTextFromDocxWithOCR(filePath) {
  // Create and initialize a single shared Tesseract worker
  const worker = await createWorker("eng");

  try {
    // Read the DOCX file into memory
    const buffer = await fs.promises.readFile(filePath);

    // 1. Extract normal text with Mammoth (ignores formatting)
    const result = await mammoth.extractRawText({ buffer });
    let textParts = [];
    const cleanText = result.value?.trim();
    if (cleanText) {
      textParts.push(cleanText);
    }

    // 2. Unzip DOCX to access embedded images
    const { entries } = await unzip(buffer);

    // 3. Locate all images inside "word/media/"
    const imageEntries = Object.entries(entries).filter(([name]) =>
      name.includes("word/media/")
    );

    // 4. Limit concurrency to 5 parallel OCR jobs
    const limit = pLimit(5);

    // 5. OCR all images with the shared worker
    const ocrResults = await Promise.all(
      imageEntries.map(([name, entry]) =>
        limit(async () => {
          try {
            const fileData = await entry.arrayBuffer();
            const {
              data: { text: ocrText },
            } = await worker.recognize(Buffer.from(fileData));
            return ocrText.trim();
          } catch (err) {
            console.error(`OCR failed for ${name}:`, err);
            return "";
          }
        })
      )
    );

    // 6. Merge OCR results
    textParts.push(...ocrResults.filter(Boolean));

    // 7. Combine all text into a single string
    const finalText = textParts.join("\n").trim();
    return finalText || "No text found in DOCX or images.";
  } finally {
    // Clean up the worker when finished
    await worker.terminate();
  }
}
