// Import Tesseract.js to perform OCR (Optical Character Recognition) on images
import { createWorker } from "tesseract.js";

// os module to detect number of CPU cores for concurrency control
import os from "os";

// createCanvas from the 'canvas' package allows us to render PDF pages into images in memory
import { createCanvas } from "canvas";

// pdfjs-dist lets us parse and render PDFs in Node.js (legacy build supports more environments)
import pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

// p-limit helps control concurrency (how many OCR tasks run at the same time)
import pLimit from "p-limit";

// Extract just the getDocument function from pdfjsLib for loading PDFs
const { getDocument } = pdfjsLib;

// This will store our pool of Tesseract workers for reuse
let workerPool = [];

/**
 * Initialize a pool of persistent Tesseract workers
 *
 * @param {number} count - Number of workers to create (defaults to min(CPU cores, 4))
 * @returns {Promise<object[]>} - Array of initialized Tesseract workers
 */
export async function initWorkerPool(count = Math.min(os.cpus().length, 4)) {
  // If workers already exist, reuse them (avoids re-creating)
  if (workerPool.length > 0) return workerPool;

  console.time("Worker pool init"); // Start timing for performance logs

  // Create and store multiple OCR workers
  for (let i = 0; i < count; i++) {
    const worker = await createWorker("eng"); // Initialize for English OCR
    workerPool.push(worker);
  }

  console.timeEnd("Worker pool init"); // Log how long initialization took
  return workerPool;
}

/**
 * Extracts text from a PDF using OCR (slower than direct extraction, but works on scanned PDFs)
 *
 * @param {string} pdfPath - Path to the PDF file
 * @param {number} scale - Rendering scale (higher = better OCR quality but slower)
 * @returns {Promise<string>} - Extracted text
 */
export async function extractTextFromPdf(pdfPath, scale = 2) {
  // Limit concurrency to min(CPU cores, 4) so we don’t overwhelm the system
  const concurrency = Math.min(os.cpus().length, 4);

  // Ensure our worker pool is ready
  const workers = await initWorkerPool(concurrency);

  // Create a concurrency limiter
  const limit = pLimit(concurrency);

  console.log("📄 Loading PDF...");

  // Disable font rendering (improves performance since OCR doesn’t need fonts)
  pdfjsLib.disableFontFace = true;

  // Load the PDF document
  const pdf = await getDocument(pdfPath).promise;

  // Create an array of tasks — one for each PDF page
  const tasks = Array.from({ length: pdf.numPages }, (_, index) =>
    limit(async () => {
      const pageNum = index + 1;
      console.log(`🔍 Rendering page ${pageNum}`);

      // Load a specific page from the PDF
      const page = await pdf.getPage(pageNum);

      // Create a "viewport" — the page dimensions scaled up for better OCR
      const viewport = page.getViewport({ scale });

      // Create an in-memory canvas to render the page into
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d", { alpha: false });

      // Fill background with white — improves OCR accuracy
      context.fillStyle = "white";
      context.fillRect(0, 0, viewport.width, viewport.height);

      // Render the PDF page onto the canvas
      await page.render({ canvasContext: context, viewport }).promise;

      // Convert the canvas into a PNG image buffer for OCR
      const pngBuffer = canvas.toBuffer("image/png");

      // Assign the OCR task to a specific worker in the pool
      const workerIndex = index % workers.length;
      const { data } = await workers[workerIndex].recognize(pngBuffer);

      // If OCR confidence is too low OR no text detected, skip this page
      if (data.confidence < 40 || !data.text.trim()) return "";

      // Return the extracted text with a page header
      return `\n\n--- Page ${pageNum} ---\n${data.text.trim()}`;
    })
  );

  // Run all tasks and collect their text results
  const textPerPage = await Promise.all(tasks);

  console.log("✅ OCR Extraction Complete.");

  // Join all pages into one string and remove leading/trailing whitespace
  return textPerPage.join("\n").trim();
}

/**
 * Cleans up the worker pool to free resources
 * Should be called when shutting down the app
 */
export async function closeWorkerPool() {
  await Promise.all(workerPool.map((w) => w.terminate())); // Terminate all workers
  workerPool = []; // Reset pool
}
