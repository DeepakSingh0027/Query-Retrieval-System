import { extractTextFromPdf } from "./ocrExtractor.js";

const testUrls = [
  "./pdf2.pdf", // PDF with mostly text
];

for (const url of testUrls) {
  console.log(`\n📄 Testing PDF: ${url}`);

  try {
    const text = await extractTextFromPdf(url);
    console.log(
      `✅ Extracted text (first 300 chars):\n${text.slice(0, 500)}\n`
    );
  } catch (err) {
    console.error(`❌ Error during extraction: ${err.message}`);
  }
}
