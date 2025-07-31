import axios from "axios";
import pdfParse from "pdf-parse";

const extractText = async (fileUrl) => {
  try {
    // 1. Download PDF from URL
    const response = await axios.get(fileUrl, {
      responseType: "arraybuffer",
    });

    // 2. Extract text using pdf-parse
    const data = await pdfParse(response.data);
    return data.text;
  } catch (error) {
    console.error("Error in extractText:", error.message);
    throw new Error("Failed to extract text: " + error.message);
  }
};

export default extractText;
