import extractCleanText from "../utils/extractText.js";
import smartExtractText from "../utils/smartExtractText.js";
import { chunkText } from "../utils/chunkText.js";
import queryModel from "../utils/queryModel.js";
import axios from "axios";
import "dotenv/config";
const MAX_CONTEXT_LENGTH = 29999;
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const LINK1 = process.env.LINK1 || "http://localhost:5005/embed";
const LINK2 = process.env.LINK2 || "http://localhost:5005/query";

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

async function preProcessParts(questionsGroup, chunks, key) {
  const splitter = 2;
  const questionParts = splitQuestionsIntoParts(questionsGroup, splitter);
  const results = [];

  for (let part of questionParts) {
    const res = await processPart(part, chunks, key);
    results.push(...res);
    await delay(8000);
  }

  return results;
}
function transpose(matrix) {
  const maxLength = Math.max(...matrix.map((row) => row.length));
  return Array.from({ length: maxLength }, (_, i) =>
    matrix.map((row) => row[i]).filter(Boolean)
  ).flat();
}

async function processPart(questionsGroup, chunks, key) {
  const relevantChunksSet = await Promise.all(
    questionsGroup.map((q) => findMatches(q))
  );
  const transposedChunks = transpose(relevantChunksSet);

  const relevantChunks = Array.from(
    new Set(transposedChunks.flat().map((item) => item.chunk))
  );

  let context = "";
  for (const chunk of relevantChunks) {
    // Add with separator only if it fits
    if ((context + "\n\n" + chunk).length <= MAX_CONTEXT_LENGTH) {
      context += "\n\n" + chunk;
    } else {
      break; // Stop if adding more exceeds limit
    }
  }
  console.log(`Context length: ${context.length} for key ${key}`);

  try {
    console.log("Sends", key);
    const answerArray = await queryModel(context, questionsGroup, key);
    console.log("Received", key);
    if (Array.isArray(answerArray)) {
      return answerArray;
    } else {
      return questionsGroup.map(() => "Unexpected response format.");
    }
  } catch (err) {
    console.error(`Error in queryModel (key ${key}):`, err?.message || err);
    return questionsGroup.map(() => "Error in LLM response.");
  }
}

async function findMatches(question) {
  const res = await axios.post(LINK2, {
    question,
    top_k: 30,
  });
  return res.data;
}

async function embedChunks(chunks) {
  const res = await axios.post(LINK1, { chunks });
  return res.data;
}

export const hackrx = async (req, res) => {
  try {
    const { documents, questions } = req.body;

    if (!documents || !Array.isArray(questions)) {
      return res.status(400).json({
        error: "Missing or invalid 'documents' or 'questions' array",
      });
    }

    console.log("Total questions:", questions.length);

    const text = await smartExtractText(documents);
    const chunks = chunkText(text);

    // Embed chunks
    await embedChunks(chunks);

    // Split questions into 6 parts
    const questionGroups = splitQuestionsIntoParts(questions, 6);

    const answerPromises = questionGroups.map((group, idx) =>
      preProcessParts(group, chunks, idx + 1)
    );

    const groupedAnswers = await Promise.all(answerPromises);
    const allAnswers = groupedAnswers.flat();
    console.log("All answers received:", allAnswers.length);
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
