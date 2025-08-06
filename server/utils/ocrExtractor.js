import { createWorker } from "tesseract.js";
import fs from "fs-extra";
import fss from "fs";
import path from "path";
import os from "os";
import axios from "axios";
import { createCanvas } from "canvas";
import pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import pLimit from "p-limit";

const { getDocument } = pdfjsLib;

const worker = await createWorker("eng");

// Download PDF to a temp file
async function downloadToTempFile(url) {
  const tempDir = os.tmpdir();
  const tempPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
  const response = await axios.get(url, { responseType: "stream" });

  await new Promise((resolve, reject) => {
    const stream = fss.createWriteStream(tempPath);
    response.data.pipe(stream);
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return tempPath;
}

// OCR from canvas
async function extractTextFromCanvas(canvas) {
  const imageBuffer = canvas.toBuffer("image/png");
  const {
    data: { text },
  } = await worker.recognize(imageBuffer);
  return text.trim();
}

// Extract text from image-based PDF with concurrency
export async function extractTextFromPdf(pdfUrl) {
  const pdfPath = await downloadToTempFile(pdfUrl);
  const outputDir = path.join(
    "output-images",
    path.basename(pdfPath, path.extname(pdfPath))
  );
  await fs.ensureDir(outputDir);

  console.log("📄 Loading PDF...");
  const pdf = await getDocument(pdfPath).promise;
  const concurrencyLimit = pLimit(3); // 👈 Change concurrency here (2–4 is safe)

  const pageTasks = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    pageTasks.push(
      concurrencyLimit(async () => {
        console.log(`📄 Processing page ${pageNum}...`);
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext("2d");
        await page.render({ canvasContext: context, viewport }).promise;

        const pageText = await extractTextFromCanvas(canvas);
        return `\n\n--- Page ${pageNum} ---\n${pageText}`;
      })
    );
  }

  const allText = await Promise.all(pageTasks);
  await worker.terminate();
  console.log("\n✅ OCR Extraction Complete.");

  return allText.join("\n").trim();
}
