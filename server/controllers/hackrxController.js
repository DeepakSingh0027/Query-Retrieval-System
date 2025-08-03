import extractText from "../utils/extractText.js";
import { chunkText } from "../utils/chunkText.js";
import { selectRelevantChunks } from "../utils/selectRelevantChunks.js";
import queryModel from "../utils/queryModel.js";

// Generic question splitter
function splitQuestionsIntoParts(questions, parts) {
  const result = [];
  const total = questions.length;

  const baseSize = Math.floor(total / parts);
  let remainder = total % parts;
  let index = 0;

  for (let i = 0; i < parts; i++) {
    const currentSize = baseSize + (remainder > 0 ? 1 : 0);
    if (currentSize > 0) {
      result.push(questions.slice(index, index + currentSize));
      index += currentSize;
    }
    if (remainder > 0) remainder--;
  }

  return result;
}

// Preprocess and batch questions
async function preProcessParts(questionsGroup, chunks, key) {
  const splitter = 2; // early groups get smaller splits
  const questionParts = splitQuestionsIntoParts(questionsGroup, splitter);

  const partPromises = questionParts.map((part) =>
    processPart(part, chunks, key)
  );

  const resultArrays = await Promise.all(partPromises);
  return resultArrays.flat();
}

// Process one group of questions with relevant chunks
async function processPart(questionsGroup, chunks, key) {
  const relevantChunks = selectRelevantChunks(chunks, questionsGroup);
  const context = relevantChunks.join("\n\n");
  console.log(`Context length: ${context.length} for key ${key}`);

  try {
    console.log("Sends", key);
    const answerArray = await queryModel(context, questionsGroup, key, 1);
    console.log("Received", key);
    if (Array.isArray(answerArray)) {
      return answerArray;
    } else {
      console.warn("Unexpected answer format");
      return questionsGroup.map(() => "Unexpected response format.");
    }
  } catch (err) {
    console.error(`Error in queryModel (key ${key}):`, err?.message || err);
    return questionsGroup.map(() => "Error in LLM response.");
  }
}

// Main handler
export const hackrx = async (req, res) => {
  try {
    const { documents, questions } = req.body;

    if (!documents || !questions || !Array.isArray(questions)) {
      return res.status(400).json({
        error: "Missing or invalid 'documents' or 'questions' array",
      });
    }
    console.log("Total questions:", questions.length);

    // Step 1: Extract text and chunk it
    const text = await extractText(documents);
    const chunks = chunkText(text);

    // Step 2: Divide questions into 5 logical batches
    const questionGroups = splitQuestionsIntoParts(questions, 5);

    // Step 3: Run all batches in parallel
    const answerPromises = questionGroups.map((group, idx) =>
      preProcessParts(group, chunks, idx + 1)
    );

    const groupedAnswers = await Promise.all(answerPromises);
    const allAnswers = groupedAnswers.flat();

    console.log("THE END.");
    return res.json({ answers: allAnswers });
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
