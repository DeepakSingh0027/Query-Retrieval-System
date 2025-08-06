import { extractTextFromPdf } from "./ocrExtractor.js";
import extractCleanText from "./extractText.js";

const smartExtractText = async (filePathOrUrl) => {
  let text = "";

  try {
    text = await extractCleanText(filePathOrUrl);
  } catch (e) {
    console.warn("Clean extract failed, forcing OCR fallback");
  }

  if (text.length > 30) {
    return text;
  }

  console.log("Falling back to OCR...");
  return await extractTextFromPdf(filePathOrUrl);
};

export default smartExtractText;
