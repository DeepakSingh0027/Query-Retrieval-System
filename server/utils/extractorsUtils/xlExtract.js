// XLSX library for reading Excel files and extracting cell data
import xlsx from "xlsx";

// AdmZip allows us to read the XLSX file as a ZIP archive to access embedded images
import AdmZip from "adm-zip";

// Node core modules for file handling and temp folder creation
import fs from "fs";
import path from "path";
import os from "os";

// Tesseract.js for OCR (optical character recognition)
import { createWorker } from "tesseract.js";

// p-limit helps control how many OCR jobs run in parallel (avoid RAM/CPU overload)
import pLimit from "p-limit";

// Create a single OCR worker at module load time
// This prevents reloading the OCR model for every call — huge performance gain
const worker = await createWorker("eng");

/**
 * Extracts text from both cells and embedded images in an Excel (.xlsx) file.
 * - Reads all sheet data and formats it as text
 * - Finds and OCRs all embedded images
 * @param {string} filePath - Path to the Excel file
 * @returns {Promise<string>} - Combined text content
 */
export async function extractTextFromExcel(filePath) {
  let result = "";

  /**
   * STEP 1: Extract visible cell data from the Excel sheets
   * - Each sheet becomes a block of text
   * - Each row is turned into a comma-separated line
   */
  const workbook = xlsx.readFile(filePath);

  workbook.SheetNames.forEach((sheet) => {
    // Convert the sheet into a 2D array of rows (header: 1 keeps raw row/column data)
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheet], {
      header: 1,
    });

    if (rows.length > 0) {
      // Add a header so we know which sheet the text came from
      result += `--- Sheet: ${sheet} ---\n`;

      // Join each row's cells into a comma-separated string
      rows.forEach((row) => {
        const line = row.join(", ");
        result += line + "\n";
      });
    }
  });

  /**
   * STEP 2: Extract images from the Excel file
   * - XLSX files are actually ZIP archives with XML + media files
   * - Images are stored inside "xl/media/"
   */
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "excel_images_")); // temp folder for OCR
  const zip = new AdmZip(filePath);
  const entries = zip.getEntries();

  // Find only supported image formats
  const imageEntries = entries.filter(
    (entry) =>
      entry.entryName.startsWith("xl/media/") &&
      /\.(jpe?g|png|bmp|gif)$/i.test(entry.entryName)
  );

  /**
   * STEP 3: Limit OCR concurrency
   * - Maximum 5 images processed in parallel
   * - Prevents CPU/RAM from being overloaded with many large images
   */
  const limit = pLimit(5);

  /**
   * STEP 4: OCR every embedded image
   * - Save each to temp folder first (Tesseract reads from file path)
   * - Recognize text and clean it before adding to output
   */
  const ocrResults = await Promise.all(
    imageEntries.map((entry) =>
      limit(async () => {
        // Save image temporarily to disk
        const imgPath = path.join(tempDir, path.basename(entry.entryName));
        fs.writeFileSync(imgPath, entry.getData());

        // Run OCR on the image
        const {
          data: { text },
        } = await worker.recognize(imgPath);

        // If OCR found text, clean it and return it with a label
        if (text.trim()) {
          const cleanText = text
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .trim();
          return `\n[Image OCR from ${path.basename(
            entry.entryName
          )}]:\n${cleanText}\n`;
        }
        return ""; // No text detected
      })
    )
  );

  /**
   * STEP 5: Append all OCR results to the main text output
   * - Filter out any empty OCR results
   */
  result += ocrResults.filter(Boolean).join("");

  /**
   * STEP 6: Clean up temp directory
   * - Remove temporary images to avoid leaving junk in OS temp folder
   */
  fs.rmSync(tempDir, { recursive: true, force: true });

  /**
   * STEP 7: Final cleanup and return
   * - Normalize line breaks
   * - Remove leading/trailing spaces
   * - Provide a fallback if no content was found
   */
  return (
    result.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim() ||
    "No data found in Excel file."
  );
}
