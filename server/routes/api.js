const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const extractTextFromPdf = require("../utils/extractText"); // for now, handles PDFs

router.post("/process-document", authenticateToken, async (req, res) => {
  const { documents, questions } = req.body;

  if (!documents || !questions || !Array.isArray(questions)) {
    return res.status(400).json({
      message: "Both 'documents' and 'questions' (as array) are required",
    });
  }

  try {
    // Step 1: Extract text from the PDF document (assuming documents is a single URL string for now)
    const text = await extractTextFromPdf(documents);

    // Step 2: Replace this logic with your actual model call later
    const answers = questions.map((question) => ({
      question,
      answer: `This is a mock answer for: "${question}" based on extracted content.`,
    }));

    res.status(200).json({ answers });
  } catch (error) {
    console.error("Error processing document:", error.message);
    res.status(500).json({
      message: "Failed to process document",
      error: error.message,
    });
  }
});

module.exports = router;
