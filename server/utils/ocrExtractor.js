import { createWorker } from "tesseract.js";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { createCanvas } from "canvas";
import pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import pLimit from "p-limit";

const { getDocument } = pdfjsLib;

let workerPool = [];

/**
<<<<<<< HEAD
 * Initialize persistent Tesseract worker pool
 */
export async function initWorkerPool(count = Math.min(os.cpus().length, 4)) {
  if (workerPool.length > 0) return workerPool; // Reuse
  console.time("Worker pool init");
  for (let i = 0; i < count; i++) {
    const worker = await createWorker("eng");
    workerPool.push(worker);
=======
 * Downloads a remote PDF file to a temporary location.
 */
async function downloadPdfToTempFile(url) {
  const tempPath = path.join(os.tmpdir(), `temp_${Date.now()}.pdf`);
  const response = await axios.get(url, { responseType: "stream" });

  if (response.status !== 200) {
    throw new Error(`Failed to download PDF. Status: ${response.status}`);
>>>>>>> c1cb39a789f928abd07dfaeb93c359dcbf23d82d
  }
  console.timeEnd("Worker pool init");
  return workerPool;
}

/**
<<<<<<< HEAD
 * Extract text from a PDF file via OCR
 */
export async function extractTextFromPdf(pdfPath, scale = 2) {
  const concurrency = Math.min(os.cpus().length, 4);
  const workers = await initWorkerPool(concurrency);
  const limit = pLimit(concurrency);
=======
 * Initializes a pool of Tesseract workers.
 */
async function createWorkerPool(count) {
  const workers = [];
  for (let i = 0; i < count; i++) {
    const worker = await createWorker("eng");
    workers.push(worker);
  }
  return workers;
}

/**
 * Extracts text from a canvas using a specific Tesseract worker.
 */
async function extractTextFromCanvas(canvas, worker) {
  const buffer = canvas.toBuffer("image/png");
  const { data } = await worker.recognize(buffer);

  // Skip empty/low-confidence results if needed
  if (data.confidence < 40 || !data.text.trim()) {
    return "";
  }

  return data.text.trim();
}

/**
 * Extracts OCR text from an image-based PDF.
 */
export async function extractTextFromPdf(pdfUrl) {
  const cpuCount = os.cpus().length;
  const concurrency = Math.min(cpuCount, 4); // Cap at 4 for safety

  const limit = pLimit(concurrency); // Limit concurrent processing
  const pdfPath = await downloadPdfToTempFile(pdfUrl); // Temp path for PDF

  const workers = await createWorkerPool(concurrency); // Worker pool
>>>>>>> c1cb39a789f928abd07dfaeb93c359dcbf23d82d

  console.log("📄 Loading PDF...");
  pdfjsLib.disableFontFace = true;
  const pdf = await getDocument(pdfPath).promise;

<<<<<<< HEAD
  const tasks = Array.from({ length: pdf.numPages }, (_, index) =>
    limit(async () => {
      const pageNum = index + 1;
      console.log(`🔍 Rendering page ${pageNum}`);

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d", { alpha: false });
      context.fillStyle = "white"; // Improves OCR contrast
      context.fillRect(0, 0, viewport.width, viewport.height);

      await page.render({ canvasContext: context, viewport }).promise;

      // Instead of PNG encoding, pass raw buffer
      const pngBuffer = canvas.toBuffer("image/png");
      const workerIndex = index % workers.length;
      const { data } = await workers[workerIndex].recognize(pngBuffer);

      if (data.confidence < 40 || !data.text.trim()) return "";
      return `\n\n--- Page ${pageNum} ---\n${data.text.trim()}`;
    })
  );

  const textPerPage = await Promise.all(tasks);
=======
  // Parallel processing with concurrency limits
  const textPerPage = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, index) =>
      limit(async () => {
        const pageNum = index + 1;
        console.log(`🔍 Processing page ${pageNum}`);

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.5 }); // High-res for better OCR

        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext("2d");

        await page.render({ canvasContext: context, viewport }).promise;

        const workerIndex = index % workers.length;
        const text = await extractTextFromCanvas(canvas, workers[workerIndex]);

        return `\n\n--- Page ${pageNum} ---\n${text}`;
      })
    )
  );

  // Cleanup
  await Promise.all(workers.map((worker) => worker.terminate()));
  await fs.remove(pdfPath); // Delete temp file

>>>>>>> c1cb39a789f928abd07dfaeb93c359dcbf23d82d
  console.log("✅ OCR Extraction Complete.");
  return textPerPage.join("\n").trim();
}

/**
 * Cleanup worker pool when shutting down
 */
export async function closeWorkerPool() {
  await Promise.all(workerPool.map((w) => w.terminate()));
  workerPool = [];
}
