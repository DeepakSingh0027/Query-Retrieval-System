import extractText from "../utils/extractText.js";
import { chunkText } from "../utils/chunkText.js";
import axios from "axios";
import { selectRelevantChunks } from "../utils/selectRelevantChunks.js";
import queryModel from "../utils/queryModel.js";

function splitQuestionsIntoFiveParts(questions) {
  const result = [];
  const total = questions.length;

  const baseSize = Math.floor(total / 5);
  let remainder = total % 5;
  let index = 0;

  for (let i = 0; i < 5; i++) {
    const currentSize = baseSize + (remainder > 0 ? 1 : 0);
    if (currentSize > 0) {
      result.push(questions.slice(index, index + currentSize));
      index += currentSize;
    }
    if (remainder > 0) remainder--;
  }

  return result;
}

async function processPart(questionsGroup, chunks) {
  const allAnswers = [];

  const relevantChunks = selectRelevantChunks(chunks, questionsGroup, 7);
  const context = relevantChunks.join("\n\n");

  const answerArray = await queryModel(context, questionsGroup);

  if (Array.isArray(answerArray)) {
    allAnswers.push(...answerArray);
  } else {
    allAnswers.push("Failed to get structured answer.");
  }

  return allAnswers;
}

export const hackrx = async (req, res) => {
  try {
    const { documents, questions } = req.body;

    if (!documents || !questions || !Array.isArray(questions)) {
      return res.status(400).json({
        error: "Missing or invalid 'documents' URL or 'questions' array",
      });
    }

    const text = await extractText(documents);
    const chunks = chunkText(text);

    const questionGroups = splitQuestionsIntoFiveParts(questions);

    const allAnswers = [];
    for (const group of questionGroups) {
      const answers = await processPart(group, chunks);
      allAnswers.push(...answers);
    }

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
