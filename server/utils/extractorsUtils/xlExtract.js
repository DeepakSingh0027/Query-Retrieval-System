import xlsx from "xlsx";
import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";
import os from "os";
import { createWorker } from "tesseract.js";
import pLimit from "p-limit"; // To limit parallel OCR execution

// Create OCR worker once at module load time
const worker = await createWorker("eng");

export async function extractTextFromExcel(filePath) {
  let result = "";

  // 1. Extract cell text from Excel file
  //    Each row of each sheet becomes a line of text in the output
  const workbook = xlsx.readFile(filePath);
  workbook.SheetNames.forEach((sheet) => {
    // Convert sheet to an array of rows (header: 1 means first row is row 0)
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheet], {
      header: 1,
    });

    if (rows.length > 0) {
      // Add sheet name header
      result += `--- Sheet: ${sheet} ---\n`;
      // Join each row's cells into a comma-separated string
      rows.forEach((row) => {
        const line = row.join(", ");
        result += line + "\n";
      });
    }
  });

  // 2. Prepare to extract embedded images from XLSX
  //    XLSX is a ZIP file internally, so AdmZip can list and extract files
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "excel_images_"));
  const zip = new AdmZip(filePath);
  const entries = zip.getEntries();

  // Filter all image files from "xl/media/"
  const imageEntries = entries.filter(
    (entry) =>
      entry.entryName.startsWith("xl/media/") &&
      /\.(jpe?g|png|bmp|gif)$/i.test(entry.entryName)
  );

  // 3. Limit OCR concurrency to avoid CPU/RAM overload (max 5 tasks at once)
  const limit = pLimit(5);

  // 4. Perform OCR on each image in parallel with concurrency control
  const ocrResults = await Promise.all(
    imageEntries.map((entry) =>
      limit(async () => {
        // Save image temporarily to disk for OCR
        const imgPath = path.join(tempDir, path.basename(entry.entryName));
        fs.writeFileSync(imgPath, entry.getData());

        // Recognize text in the image
        const {
          data: { text },
        } = await worker.recognize(imgPath);

        // Clean and format recognized text if present
        if (text.trim()) {
          const cleanText = text
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .trim();
          return `\n[Image OCR from ${path.basename(
            entry.entryName
          )}]:\n${cleanText}\n`;
        }
        return "";
      })
    )
  );

  // 5. Append OCR results to main text output
  result += ocrResults.filter(Boolean).join("");

  // 6. Remove temporary folder used for storing images
  fs.rmSync(tempDir, { recursive: true, force: true });

  // 7. Final cleanup of result text and return
  return (
    result.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim() ||
    "No data found in Excel file."
  );
}
