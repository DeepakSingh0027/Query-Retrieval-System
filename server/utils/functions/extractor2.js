import fs from "fs/promises";
import path from "path";
import libre from "libreoffice-convert";

/**
 * Convert any supported document to PDF
 * @param {string} inputPath - Path to the original file
 * @returns {Promise<string>} - Path to the generated PDF
 */
export async function convertToPdf(inputPath) {
  const outputPath = path.join(
    path.dirname(inputPath),
    path.basename(inputPath, path.extname(inputPath)) + ".pdf"
  );

  let data;
  try {
    data = await fs.readFile(inputPath);
  } catch (err) {
    throw new Error(`File read error (${inputPath}): ${err.message}`);
  }

  return new Promise((resolve, reject) => {
    libre.convert(data, ".pdf", undefined, async (err, done) => {
      if (err) {
        return reject(
          new Error(`LibreOffice conversion failed: ${err.message}`)
        );
      }

      try {
        await fs.writeFile(outputPath, done);
        resolve(outputPath);
      } catch (writeErr) {
        reject(new Error(`Failed to save PDF: ${writeErr.message}`));
      }
    });
  });
}
