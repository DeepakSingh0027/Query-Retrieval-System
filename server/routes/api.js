const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const extractTextFromPdf = require("../utils/extractText"); // we'll create this file

router.post("/hello", authenticateToken, async (req, res) => {
  const { documents, questions } = req.body;

  if (!documents || !questions) {
    return res
      .status(400)
      .json({ message: "documents and questions are required" });
  }

  try {
    // Step 1: Extract text from the document
    const text = await extractTextFromPdf(documents); // assuming it's a PDF URL

    // Step 2: Mock answer logic (later we can use OpenAI or a model)
    const answers = questions.map((question) => ({
      question,
      answer: `This is a mock answer for: "${question}" based on extracted content.`,
    }));

    res.json({ answers });
  } catch (error) {
    console.error("Error processing document:", error.message);
    res
      .status(500)
      .json({ message: "Failed to process document", error: error.message });
  }
});

module.exports = router;
