const extractText = require("../utils/extractText");
const chunkText = require("../utils/chunkText");
const axios = require("axios");
const selectRelevantChunks = require("../utils/selectRelevantChunks");

const hackrx = async (req, res) => {
  try {
    const { documents, questions } = req.body;

    if (!documents || !questions || !Array.isArray(questions)) {
      return res.status(400).json({
        error: "Missing or invalid 'documents' URL or 'questions' array",
      });
    }

    // Step 1: Extract text from document (PDF or DOCX)
    const text = await extractText(documents);

    // Step 2: Chunk the text (for better LLM processing)
    const chunks = chunkText(text);

    // Step 3: Select only relevant chunks
    const relevantChunks = selectRelevantChunks(chunks, questions, 30);

    // Merge the relevant chunks
    const context = relevantChunks.join("\n\n");

    // Step 4: Construct the prompt and messages
    const messages = [
      {
        role: "system",
        content: `You are a helpful assistant that answers the user's questions based on the provided document. Only respond in the following strict JSON format:

{
  "answers": [
    "Answer to question 1",
    "Answer to question 2",
    ...
  ]
}

Answer ONLY from the given document. Do not make up any information. No extra text outside the JSON.`,
      },
      {
        role: "user",
        content: `Document:\n\n${context}\n\nQuestions:\n${questions.join(
          "\n"
        )}`,
      },
    ];

    // Step 5: Make the API call to OpenRouter
    const openRouterRes = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "qwen/qwen3-4b:free", // Replace with preferred model
        messages,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const answerText = openRouterRes.data.choices[0].message.content;

    // Try to parse the returned JSON if possible
    let parsed;
    try {
      parsed = JSON.parse(answerText);
    } catch (e) {
      // Fallback if response is not valid JSON
      return res.json({
        raw: answerText,
        warning: "Response was not valid JSON",
      });
    }

    return res.json(parsed);
  } catch (err) {
    console.error(
      "HackRx controller error:",
      err?.response?.data || err.message
    );
    return res.status(500).json({
      error:
        "Something went wrong: " +
        (err?.response?.data?.error?.message || err.message),
    });
  }
};

module.exports = hackrx;
