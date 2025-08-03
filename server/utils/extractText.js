import axios from "axios";
import pdfParse from "pdf-parse";

const extractText = async (fileUrl) => {
  try {
    const response = await axios.get(fileUrl, {
      responseType: "arraybuffer",
    });

    // Suppress specific warning
    const originalWarn = console.warn;
    console.warn = function (...args) {
      if (
        args[0] &&
        typeof args[0] === "string" &&
        args[0].includes("Ran out of space in font private use area")
      ) {
        return; // skip this warning
      }
      originalWarn.apply(console, args);
    };

    const data = await pdfParse(response.data);

    // Restore original console.warn
    console.warn = originalWarn;

    return data.text;
  } catch (error) {
    console.error("Error in extractText:", error.message);
    throw new Error("Failed to extract text: " + error.message);
  }
};

export default extractText;
