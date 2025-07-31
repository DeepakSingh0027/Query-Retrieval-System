const extractText = require("../utils/extractText");
const chunkText = require("../utils/chunkText");
const axios = require("axios");
const selectRelevantChunks = require("../utils/selectRelevantChunks");
const queryModel = require("../utils/queryModel");

function splitIntoThreeParts(array) {
  const total = array.length;
  const partSize = Math.floor(total / 3);
  const remainder = total % 3;

  const result = [];

  // First chunk
  result.push(array.slice(0, partSize));

  // Second chunk
  result.push(array.slice(partSize, partSize * 2));

  // Third chunk (includes remainder)
  result.push(array.slice(partSize * 2));

  return result;
}

async function processPart(questionsGroup, model, chunks, key) {
  const allAnswers = [];

  // Step 1: Collect all relevant chunks for the group of questions
  const allRelevantChunks = selectRelevantChunks(chunks, questionsGroup, 30);
  const context = allRelevantChunks.join("\n\n");

  // Step 2: Send all questions together
  const answerArray = await queryModel(model, context, questionsGroup, key);

  // Step 3: Push all answers (they're already in an array)
  if (Array.isArray(answerArray)) {
    allAnswers.push(...answerArray);
  } else {
    // Fallback: push a single fallback answer
    allAnswers.push("Failed to get structured answer.");
  }

  return allAnswers;
}

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

    const [part1, part2, part3] = splitIntoThreeParts(questions, 3);

    const [answers1, answers2, answers3] = await Promise.all([
      processPart(part1, "qwen/qwen3-4b:free", chunks, 1),
      processPart(part2, "qwen/qwen3-4b:free", chunks, 2),
      processPart(part3, "qwen/qwen3-4b:free", chunks, 3),
    ]);

    const combinedAnswers = [...answers1, ...answers2, ...answers3];
    //OPENROUTER_API_KEY=
    return res.json({ answers: combinedAnswers });
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
