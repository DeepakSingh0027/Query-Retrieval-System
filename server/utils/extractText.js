import axios from "axios";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.js";

const extractText = async (fileUrl) => {
  try {
    // 1. Download PDF from URL
    const response = await axios.get(fileUrl, {
      responseType: "arraybuffer",
    });

    // 2. Load PDF document using pdfjs-dist
    const pdf = await getDocument({ data: response.data }).promise;

    let fullText = "";

    // 3. Loop through all pages and extract text
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();

      const strings = content.items.map((item) => item.str).join(" ");
      fullText += strings + "\n";
    }

    return fullText.trim();
  } catch (error) {
    console.error("Error in extractText:", error.message);
    throw new Error("Failed to extract text: " + error.message);
  }
};

export default extractText;
