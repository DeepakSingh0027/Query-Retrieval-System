import extractTextFromImagePdf from "./ocrExtractor.js";
import extractCleanText from "./extractText.js";

const smartExtractText = async (filePathOrUrl) => {
  const text = await extractCleanText(filePathOrUrl);

  if (text.length > 30) {
    return text;
  }

  console.log("Falling back to OCR...");
  return await extractTextFromImagePdf(filePathOrUrl);
};

export default smartExtractText;
