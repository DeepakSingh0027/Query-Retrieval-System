// ------------------------------
// Core Node.js modules
// ------------------------------
import fs from "fs"; // Provides file system read/write access
import path from "path"; // Helps handle file & directory paths in a cross-platform way
import os from "os"; // Gives OS-level info (like the temp directory path)

// ------------------------------
// Third-party dependencies
// ------------------------------
import mammoth from "mammoth"; // DOCX → plain text (XML parsing)
import Tesseract from "tesseract.js"; // OCR (Optical Character Recognition) for images
import AdmZip from "adm-zip"; // ZIP archive extraction (synchronous)
import { unzip } from "unzipit"; // Asynchronous unzip, used for reading PPTX/DOCX XML
import { fileTypeFromBuffer } from "file-type"; // Detect file type by inspecting binary data
import axios from "axios"; // HTTP client for downloading files from URLs
import { v4 as uuidv4 } from "uuid"; // Generates unique IDs (used for temp file paths)

// ------------------------------
// Project-local modules
// ------------------------------
import smartExtractText from "../smartExtractText.js"; // Intelligent PDF text extraction (OCR fallback)
import { extractTextFromPptxWithOCR } from "../extractorsUtils/pptExtract.js"; // PPTX text extraction (OCR included)
import { extractTextFromDocxWithOCR } from "../extractorsUtils/docxExtract.js"; // DOCX text extraction (OCR included)
import { extractTextFromExcel } from "../extractorsUtils/xlExtract.js"; // Excel file text extraction
import { convertToPdf } from "./extractor2.js"; // Converts unsupported file types into PDF

/**
 * Main file handling entry point.
 * Supports:
 * - Local file paths
 * - Remote URLs (auto-downloads to temp file)
 * - Various file formats (PDF, DOCX, PPTX, XLSX, images, ZIP)
 *
 * @param {string} fileOrUrl - Path or URL to the file
 * @param {number} depth - Tracks recursive ZIP processing depth
 */
export async function handleFile(fileOrUrl, depth = 0) {
  const isUrl = /^https?:\/\//.test(fileOrUrl); // Quick regex check for HTTP/HTTPS

  let filePath = fileOrUrl;
  let deleteAfterProcessing = false; // Whether to remove file after processing

  try {
    // ------------------------------
    // If URL → download it first
    // ------------------------------
    if (isUrl) {
      filePath = await downloadFileFromUrl(fileOrUrl);
      deleteAfterProcessing = true;
    }

    // Read file into memory to detect type
    const buffer = await fs.promises.readFile(filePath);
    const type = await fileTypeFromBuffer(buffer); // May return null if type not detected
    const mime = type?.mime || "application/octet-stream"; // Default MIME if unknown

    console.log(`📄 Detected MIME type: ${mime}`);

    let result;

    // ------------------------------
    // MIME-type-based extraction routing
    // ------------------------------
    switch (mime) {
      case "application/pdf":
        result = await smartExtractText(filePath);
        break;

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        result = await extractTextFromDocxWithOCR(filePath);
        break;

      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        result = extractTextFromExcel(filePath);
        break;

      case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        result = await extractTextFromPptxWithOCR(filePath);
        break;

      case "image/png":
      case "image/jpeg":
        result = await extractTextFromImage(filePath);
        break;

      case "application/zip":
        result = await handleZip(filePath, depth);
        break;

      default:
        // Unknown format → try converting to PDF first
        console.time("Pdf Conversion");
        filePath = await convertToPdf(filePath);
        console.timeEnd("Pdf Conversion");
        result = await smartExtractText(filePath);
    }

    return result;
  } catch (err) {
    console.error("Error during extraction:", err);
    return ["Failed to extract text."]; // Standard failure output
  } finally {
    // ------------------------------
    // Cleanup temporary downloads
    // ------------------------------
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

/**
 * Downloads file from a remote URL to a temp directory.
 * @returns {Promise<string>} Path to the saved file
 */
async function downloadFileFromUrl(url) {
  const res = await axios.get(url, { responseType: "arraybuffer" }); // Download binary
  const ext = path.extname(new URL(url).pathname).split("?")[0] || ".tmp"; // Keep original extension if possible
  const tempPath = path.join(os.tmpdir(), `remote-${uuidv4()}${ext}`);
  await fs.promises.writeFile(tempPath, res.data);
  console.log(`Downloaded URL to: ${tempPath}`);
  return tempPath;
}

/**
 * Extracts raw text from DOCX using `mammoth`.
 */
async function extractTextFromDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

/**
 * Extracts raw text from PPTX by unzipping and reading XML slide data.
 */
async function extractTextFromPptx(filePath) {
  const buffer = await fs.promises.readFile(filePath);
  const { entries } = await unzip(buffer); // Asynchronous unzip

  let text = "";
  for (const name in entries) {
    if (name.includes("ppt/slides/slide")) {
      const content = await entries[name].text();
      // Extract <a:t> tags where PPTX stores text
      const matches = [...content.matchAll(/<a:t>(.*?)<\/a:t>/g)];
      text += matches.map((m) => m[1]).join(" ") + "\n";
    }
  }
  return text || "No text found in PPT slides.";
}

/**
 * Runs OCR on image files using Tesseract.js.
 */
async function extractTextFromImage(filePath) {
  const result = await Tesseract.recognize(filePath, "eng");
  return result.data.text || "No text recognized in image.";
}

// ------------------------------
// ZIP handling
// ------------------------------
const MAX_ZIP_DEPTH = 1; // Avoid infinite recursion from nested ZIPs
const MAX_FILE_SIZE = 500 * 1024 * 1024; // Skip files > 500MB for performance/safety

/**
 * Extracts and processes files inside a ZIP archive.
 * Recursively processes nested archives up to MAX_ZIP_DEPTH.
 */
async function handleZip(filePath, depth = 0) {
  if (depth > MAX_ZIP_DEPTH) {
    return `⚠️ Skipped ZIP: Exceeded max nesting depth (${MAX_ZIP_DEPTH}).`;
  }

  const zip = new AdmZip(filePath);
  const entries = zip.getEntries();
  let output = "";

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const entryData = entry.getData();
    if (entryData.length > MAX_FILE_SIZE) {
      output += `${entry.entryName}:\n⚠️ Skipped: File too large (${(
        entryData.length /
        1024 /
        1024
      ).toFixed(2)} MB)\n\n`;
      continue;
    }

    let tempPath;
    try {
      tempPath = path.join(os.tmpdir(), uuidv4(), entry.entryName);
      fs.mkdirSync(path.dirname(tempPath), { recursive: true });
      fs.writeFileSync(tempPath, entryData);

      // Recursively process extracted file
      const result = await handleFile(tempPath, depth + 1);
      output += `${entry.entryName}:\n${result}\n\n`;
    } catch (err) {
      output += `${entry.entryName}:\n Error processing file: ${err.message}\n\n`;
    } finally {
      // Cleanup
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
