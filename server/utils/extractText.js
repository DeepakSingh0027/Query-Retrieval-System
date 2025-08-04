import fs from "fs/promises";
import fss from "fs"; // For createWriteStream
import pdf from "pdf-parse";
import axios from "axios";
import path from "path";
import os from "os";

// Helper to check if a page contains meaningful text
const isMeaningful = (text) => {
  const cleaned = text.replace(/\s+/g, ""); // Remove all spaces, tabs, newlines
  const isMostlySymbols = /^[^a-zA-Z0-9]{5,}$/.test(cleaned);
  return cleaned.length > 10 && !isMostlySymbols;
};

// Helper to download remote PDF to temp file
const downloadToTempFile = async (url) => {
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
};

// Main function (unchanged name)
const extractCleanText = async (filePathOrUrl) => {
  let actualPath = filePathOrUrl;

  // If input is a URL, download to temp file
  if (/^https?:\/\//.test(filePathOrUrl)) {
    actualPath = await downloadToTempFile(filePathOrUrl);
  }

  const dataBuffer = await fs.readFile(actualPath);

  const options = {
    pagerender: (pageData) => {
      return pageData.getTextContent().then((content) => {
        const pageText = content.items.map((item) => item.str).join(" ");
        return isMeaningful(pageText) ? pageText : "";
      });
    },
  };

  const data = await pdf(dataBuffer, options);

  // If we downloaded a temp file, delete it
  if (actualPath !== filePathOrUrl) {
    try {
      await fs.unlink(actualPath);
    } catch (err) {
      console.warn("Could not delete temp file:", err.message);
    }
  }

  return data.text.trim();
};

export default extractCleanText;
