// Import core Node.js modules
import fs from "fs"; // File system access
import path from "path"; // File path utilities
import os from "os"; // OS-specific temp directory paths

// Third-party libraries
import mammoth from "mammoth"; // Extracts raw text from DOCX files
import Tesseract from "tesseract.js"; // OCR engine for images
import AdmZip from "adm-zip"; // Extracts ZIP files
import { unzip } from "unzipit"; // Async unzip for PPTX/DOCX internal XML
import { fileTypeFromBuffer } from "file-type"; // Detects file MIME type
import axios from "axios"; // HTTP client for downloading remote files
import { v4 as uuidv4 } from "uuid"; // Generates unique IDs for temp files

// Project-local imports (custom modules in your codebase)
import smartExtractText from "../smartExtractText.js";
import { extractTextFromPptxWithOCR } from "../extractorsUtils/pptExtract.js";
import { extractTextFromDocxWithOCR } from "../extractorsUtils/docxExtract.js";
import { extractTextFromExcel } from "../extractorsUtils/xlExtract.js";
import { convertToPdf } from "./extractor2.js"; // Converts non-PDF to PDF

export async function handleFile(fileOrUrl, depth = 0) {
  // Detect if the input is a URL or local file path
  const isUrl = /^https?:\/\//.test(fileOrUrl);

  let filePath = fileOrUrl; // Will hold path to local file (either given or downloaded)
  let deleteAfterProcessing = false; // Flag to remove temp files after processing

  try {
    // If it's a URL, download to a temporary file
    if (isUrl) {
      filePath = await downloadFileFromUrl(fileOrUrl);
      deleteAfterProcessing = true; // Mark for cleanup later
    }

    // Load the file into memory to detect MIME type
    const buffer = await fs.promises.readFile(filePath);
    const type = await fileTypeFromBuffer(buffer);
    const mime = type?.mime || "application/octet-stream"; // Fallback if unknown

    console.log(`📄 Detected MIME type: ${mime}`);

    let result;

    // Select the correct extraction method based on MIME type
    switch (mime) {
      case "application/pdf":
        result = await smartExtractText(filePath); // PDF → smart extraction
        break;

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        result = await extractTextFromDocxWithOCR(filePath); // DOCX with OCR
        break;

      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        result = extractTextFromExcel(filePath); // Excel
        break;

      case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        result = await extractTextFromPptxWithOCR(filePath); // PPTX with OCR
        break;

      case "image/png":
      case "image/jpeg":
        result = await extractTextFromImage(filePath); // OCR on image
        break;

      case "application/zip":
        result = await handleZip(filePath, depth); // Recursively process ZIPs
        break;

      default:
        // If unknown type → try converting to PDF then extracting
        console.time("Pdf Conversion");
        filePath = await convertToPdf(filePath);
        console.timeEnd("Pdf Conversion");
        result = await smartExtractText(filePath);
    }

    return result;
  } catch (err) {
    console.error("Error during extraction:", err);
    return ["Failed to extract text."];
  } finally {
    // Always clean up temporary downloaded files
    if (deleteAfterProcessing) {
      try {
        await fs.promises.unlink(filePath);
        console.log(`🗑️ Deleted temporary file: ${filePath}`);
      } catch (unlinkErr) {
        console.error(`⚠️ Failed to delete file ${filePath}:`, unlinkErr);
      }
    }
  }
}
async function downloadFileFromUrl(url) {
  const res = await axios.get(url, { responseType: "arraybuffer" }); // Download raw binary
  const ext = path.extname(new URL(url).pathname).split("?")[0] || ".tmp"; // Try to keep original ext
  const tempPath = path.join(os.tmpdir(), `remote-${uuidv4()}${ext}`); // Generate unique temp file path
  await fs.promises.writeFile(tempPath, res.data); // Save to disk
  console.log(`Downloaded URL to: ${tempPath}`);
  return tempPath;
}
async function extractTextFromDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer }); // Extract text from DOCX XML
  return result.value || "";
}
async function extractTextFromPptx(filePath) {
  const buffer = await fs.promises.readFile(filePath);
  const { entries } = await unzip(buffer); // Unzip PPTX into entries

  let text = "";
  for (const name in entries) {
    if (name.includes("ppt/slides/slide")) {
      const content = await entries[name].text();
      // Extract all text between <a:t> tags (PPTX stores text like this)
      const matches = [...content.matchAll(/<a:t>(.*?)<\/a:t>/g)];
      text += matches.map((m) => m[1]).join(" ") + "\n";
    }
  }

  return text || "No text found in PPT slides.";
}
async function extractTextFromImage(filePath) {
  const result = await Tesseract.recognize(filePath, "eng");
  return result.data.text || "No text recognized in image.";
}
const MAX_ZIP_DEPTH = 1; // Prevents infinite recursion
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB safety limit

async function handleZip(filePath, depth = 0) {
  // Prevent excessive nesting
  if (depth > MAX_ZIP_DEPTH) {
    return `⚠️ Skipped ZIP: Exceeded max ZIP nesting depth (${MAX_ZIP_DEPTH}).`;
  }

  const zip = new AdmZip(filePath);
  const entries = zip.getEntries();
  let output = "";

  for (const entry of entries) {
    if (entry.isDirectory) continue; // Skip folders

    const entryData = entry.getData();
    if (entryData.length > MAX_FILE_SIZE) {
      // Skip oversized files inside ZIP
      output += `${entry.entryName}:\n⚠️ Skipped: File too large (${(
        entryData.length /
        1024 /
        1024
      ).toFixed(2)} MB)\n\n`;
      continue;
    }

    let tempPath;
    try {
      // Create a unique temp path for the extracted file
      tempPath = path.join(os.tmpdir(), uuidv4(), entry.entryName);
      fs.mkdirSync(path.dirname(tempPath), { recursive: true });
      fs.writeFileSync(tempPath, entryData);

      // Recursively process extracted file (depth + 1)
      const result = await handleFile(tempPath, depth + 1);
      output += `${entry.entryName}:\n${result}\n\n`;
    } catch (err) {
      output += `${entry.entryName}:\n Error processing file: ${err.message}\n\n`;
    } finally {
      // Cleanup extracted temp file
      if (tempPath && fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
          console.log(`🗑️ Deleted extracted ZIP file: ${tempPath}`);
        } catch (unlinkErr) {
          console.error(
            `⚠️ Failed to delete extracted file: ${tempPath}`,
            unlinkErr
          );
        }
      }
    }
  }

  return output || "ZIP file processed, but no extractable text found.";
}
