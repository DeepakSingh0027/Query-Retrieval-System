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
 * Initialize persistent Tesseract worker pool
 */
export async function initWorkerPool(count = Math.min(os.cpus().length, 4)) {
  if (workerPool.length > 0) return workerPool; // Reuse
  console.time("Worker pool init");
  for (let i = 0; i < count; i++) {
    const worker = await createWorker("eng");
    workerPool.push(worker);
  }
  console.timeEnd("Worker pool init");
  return workerPool;
}

/**
 * Extract text from a PDF file via OCR
 */
export async function extractTextFromPdf(pdfPath, scale = 2) {
  const concurrency = Math.min(os.cpus().length, 4);
  const workers = await initWorkerPool(concurrency);
  const limit = pLimit(concurrency);

  console.log("📄 Loading PDF...");
  pdfjsLib.disableFontFace = true;
  const pdf = await getDocument(pdfPath).promise;

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
