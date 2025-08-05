import { fromPath } from "pdf2pic";
import Tesseract from "tesseract.js";
import fs from "fs/promises";
import os from "os";
import path from "path";

// Step 1: Convert PDF pages to PNG images
const convertPdfToImages = async (pdfPath) => {
  const tempDir = path.join(os.tmpdir(), `pdf_images_${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });

  const converter = fromPath(pdfPath, {
    density: 150,
    savePath: tempDir,
    format: "png",
    saveFilename: "page",
    width: 1200,
    height: 1600,
  });

  const maxPages = 5; // You can adjust this
  const imagePaths = [];

  for (let page = 1; page <= maxPages; page++) {
    const result = await converter(page);
    if (result.path) imagePaths.push(result.path);
    else break;
  }

  return imagePaths;
};

// Step 2: Use OCR to extract text from each image
const extractTextFromImages = async (imagePaths) => {
  const texts = [];

  for (const imgPath of imagePaths) {
    const {
      data: { text },
    } = await Tesseract.recognize(imgPath, "eng");
    texts.push(text.trim());
  }

  return texts.join("\n\n");
};

// Step 3: Full wrapper function
const extractTextFromImagePdf = async (pdfPath) => {
  const images = await convertPdfToImages(pdfPath);
  const text = await extractTextFromImages(images);

  // Clean up
  for (const img of images) {
    await fs.unlink(img).catch(() => {});
  }

  return text.trim();
};

export default extractTextFromImagePdf;
