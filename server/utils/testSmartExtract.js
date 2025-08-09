import { handleFile } from "./functions/extractor.js";
import { chunkText } from "./chunkText.js";
import {
  embedChunks as localEmbedChunks,
  findMatches as localFindMatches,
} from "./semanticSearch.js";

const testUrls = [
<<<<<<< HEAD
  "./test/p11.docx",
  "./test/p12.tmt",
  "./test/p9.pptx",
  "./test/p7.zip",
  "./test/p6.xlsx",
  "./test/p5.jpg",
  "./test/p4.pptx",
  "./test/p3.docx",
  "./test/p1.pdf",
  "./test/p13.pdf",
=======
  "https://arxiv.org/pdf/1708.08021.pdf", // PDF with mostly text
>>>>>>> c1cb39a789f928abd07dfaeb93c359dcbf23d82d
];

for (const url of testUrls) {
  console.time("Execution Time");
  console.log(`\n📄 Testing file: ${url}`);

  try {
    console.time("Handle File");
    let text = await handleFile(url);
    console.log(`Extracted text:\n${text.slice(0, 50)}\n`); // preview first 50 chars
    console.timeEnd("Handle File");
    console.time("Chunk Time");
    const chunks = chunkText(text);
    console.log("First chunk:", chunks.slice(0, 1));
    console.timeEnd("Chunk Time");
    console.time("Embed Time");
    await localEmbedChunks(chunks);
    console.timeEnd("Embed Time");
    console.time("Query Time");
    const result = await localFindMatches("What's the Context?", 30);
    console.log("Top matches:", result.slice(0, 2));
    console.timeEnd("Query Time");
  } catch (err) {
    console.error(`Error during extraction: ${err.message}`);
  }

  console.timeEnd("Execution Time");
}
