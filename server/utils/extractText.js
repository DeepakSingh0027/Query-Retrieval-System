import fs from "fs/promises";
import fss from "fs"; // For createWriteStream
import pdf from "pdf-parse";
import axios from "axios";
import path from "path";
import os from "os";

// Fast regex precompiled
const SYMBOLS_ONLY = /^[^a-zA-Z0-9]{5,}$/;

// Check if text has actual value
const isMeaningful = (text) => {
  const cleaned = text.replace(/\s+/g, "");
  return cleaned.length > 10 && !SYMBOLS_ONLY.test(cleaned);
};

// Stream PDF from URL
const fetchPdfStream = async (url) => {
  const response = await axios.get(url, { responseType: "stream" });
  if (response.status !== 200) {
    throw new Error(`Failed to download PDF. Status: ${response.status}`);
  }
  if (!response.headers["content-type"]?.includes("application/pdf")) {
    throw new Error(
      `Expected a PDF file but got: ${response.headers["content-type"]}`
    );
  }
  return response.data; // Readable stream
};

// Optional: Save temp file if you must
const downloadToTempFile = async (url) => {
  const tempPath = path.join(os.tmpdir(), `temp_${Date.now()}.pdf`);
  const stream = await fetchPdfStream(url);
  await new Promise((resolve, reject) => {
    const fileStream = fss.createWriteStream(tempPath);
    stream.pipe(fileStream);
    fileStream.on("finish", resolve);
    fileStream.on("error", reject);
  });
  return tempPath;
};

export default async function extractCleanText(
  filePathOrUrl,
  { keepTemp = false } = {}
) {
  let input;

  if (/^https?:\/\//.test(filePathOrUrl)) {
    // Stream directly unless keeping a local file
    if (keepTemp) {
      const tempFile = await downloadToTempFile(filePathOrUrl);
      input = await fs.readFile(tempFile);
      filePathOrUrl = tempFile;
    } else {
      input = await fetchPdfStream(filePathOrUrl);
    }
  } else {
    input = await fs.readFile(filePathOrUrl);
  }

  const options = {
    pagerender: (pageData) =>
      pageData.getTextContent().then((content) => {
        const text = content.items.map((item) => item.str).join(" ");
        return isMeaningful(text) ? text : "";
      }),
  };

  let result;
  try {
    result = await pdf(input, options);
  } catch (err) {
    console.warn("PDF parse failed:", err.message);
    result = { text: "" };
  }

  // Cleanup temp file if made
  if (/^https?:\/\//.test(filePathOrUrl) && !keepTemp) {
    try {
      await fs.unlink(filePathOrUrl);
    } catch {}
  }

  return result.text.trim();
}
