// Import the promise-based version of Node's file system module
import fs from "fs/promises";

// Import Node's path utilities to handle file and folder paths
import path from "path";

// Import LibreOffice document converter
// This library uses LibreOffice to convert files between formats (e.g., DOCX -> PDF)
import libre from "libreoffice-convert";

/**
 * Convert any supported document to PDF using LibreOffice
 * @param {string} inputPath - Path to the original file on disk
 * @returns {Promise<string>} - Path to the generated PDF file
 */
export async function convertToPdf(inputPath) {
  // Determine the output path by keeping the original file's name
  // but changing the extension to ".pdf"
  const outputPath = path.join(
    path.dirname(inputPath), // Same directory as input file
    path.basename(inputPath, path.extname(inputPath)) + ".pdf" // Same name but with .pdf
  );

  let data;
  try {
    // Read the file into memory as a buffer
    data = await fs.readFile(inputPath);
  } catch (err) {
    // Throw a clear error if the file couldn't be read
    throw new Error(`File read error (${inputPath}): ${err.message}`);
  }

  // Convert the file to PDF using LibreOffice
  return new Promise((resolve, reject) => {
    libre.convert(data, ".pdf", undefined, async (err, done) => {
      if (err) {
        // Reject if LibreOffice fails during conversion
        return reject(
          new Error(`LibreOffice conversion failed: ${err.message}`)
        );
      }

      try {
        // Save the converted PDF buffer to disk
        await fs.writeFile(outputPath, done);

        // Resolve with the path to the saved PDF
        resolve(outputPath);
      } catch (writeErr) {
        // Reject if saving the PDF fails
        reject(new Error(`Failed to save PDF: ${writeErr.message}`));
      }
    });
  });
}
