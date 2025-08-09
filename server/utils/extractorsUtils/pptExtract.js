import fs from "fs";
import { unzip } from "unzipit";
import { createWorker } from "tesseract.js";

// Create a single Tesseract worker instance at module load
// This loads the OCR model into memory only once, speeding up multiple OCR calls
const worker = await createWorker("eng");

export async function extractTextFromPptxWithOCR(filePath) {
  // 1. Read the PPTX file into memory
  const buffer = await fs.promises.readFile(filePath);

  // 2. Unzip PPTX contents (PPTX is just a ZIP with XML + media files)
  const { entries } = await unzip(buffer);

  // This array will collect all extracted text
  let textParts = [];

  // 3. Extract visible slide text from <a:t> XML tags
  //    These tags store text content inside PowerPoint slides
  for (const name in entries) {
    if (name.includes("ppt/slides/slide") && name.endsWith(".xml")) {
      const content = await entries[name].text();
      const matches = [...content.matchAll(/<a:t>(.*?)<\/a:t>/g)];
      if (matches.length > 0) {
        // Join all text elements from the slide into a single string
        textParts.push(matches.map((m) => m[1]).join(" "));
      }
    }
  }

  // 4. Find all embedded images inside ppt/media/
  const imageEntries = Object.entries(entries).filter(([name]) =>
    name.includes("ppt/media/")
  );

  // 5. Perform OCR on each image using the shared worker
  //    No new worker is created for each image, which speeds things up
  const ocrResults = await Promise.all(
    imageEntries.map(async ([name, entry]) => {
      try {
        // Convert image file into a Buffer for Tesseract
        const fileData = await entry.arrayBuffer();
        const bufferData = Buffer.from(fileData);

        // OCR the image using the existing worker
        const {
          data: { text: ocrText },
        } = await worker.recognize(bufferData);

        return ocrText.trim();
      } catch (err) {
        console.error(`OCR failed for ${name}:`, err);
        return "";
      }
    })
  );

  // 6. Add OCR results (ignoring empty strings)
  textParts.push(...ocrResults.filter(Boolean));

  // 7. Combine all text and return clean result
  const finalText = textParts.join("\n").trim();
  return finalText || "No text found in PPT slides or images.";
}
