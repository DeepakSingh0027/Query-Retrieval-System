import fs from "fs/promises";
import pdf from "pdf-parse";

// Helper to check if a page contains meaningful text
const isMeaningful = (text) => {
  const cleaned = text.replace(/\s+/g, ""); // remove all spaces, tabs, newlines
  const isMostlySymbols = /^[^a-zA-Z0-9]{5,}$/.test(cleaned);
  return cleaned.length > 10 && !isMostlySymbols;
};

const extractCleanText = async (filePath) => {
  const dataBuffer = await fs.readFile(filePath);

  const options = {
    pagerender: (pageData) => {
      // Extract raw text from the page
      const text = pageData.getTextContent().then((content) => {
        const pageText = content.items.map((item) => item.str).join(" ");
        return isMeaningful(pageText) ? pageText : ""; // Skip blank/noisy pages
      });
      return text;
    },
  };

  const data = await pdf(dataBuffer, options);
  return data.text.trim(); // Final clean output
};

export default extractCleanText;
