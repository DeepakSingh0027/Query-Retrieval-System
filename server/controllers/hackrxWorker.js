/*import { parentPort, workerData } from "node:worker_threads";
import { chunkText } from "../utils/chunkText.js";
import queryModel from "../utils/queryModel.js";
import { handleFile } from "../utils/functions/extractor.js";
import {
  embedChunks as localEmbedChunks,
  findMatches as localFindMatches,
} from "../utils/semanticSearch.js";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { promises as fs } from "fs";

const MAX_CONTEXT_LENGTH = 29999;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    if ((context + "\n\n" + chunk).length <= MAX_CONTEXT_LENGTH) {
      context += "\n\n" + chunk;
    } else {
      break;
    }
  }

  try {
    console.log(`Context length: ${context.length} , Key: ${key} => Sended`); // Debugging
    const answerArray = await queryModel(context, questionsGroup, key);
    console.log(`Recieved <= Key: ${key}`); // Debugging
    if (Array.isArray(answerArray)) return answerArray;
    return questionsGroup.map(() => "Unexpected response format.");
  } catch (err) {
    return questionsGroup.map(() => "Error in LLM response.");
  }
}

async function findMatches(question) {
  return await localFindMatches(question, 30);
}

async function embedChunks(chunks) {
  return await localEmbedChunks(chunks);
}

(async () => {
  const { documents, questions, key } = workerData;

  try {
    const text = await handleFile(documents);
    const chunks = chunkText(text);
    await embedChunks(chunks);

    const questionGroups = splitQuestionsIntoParts(questions, 12);
    const answerPromises = questionGroups.map((group, idx) =>
      preProcessParts(group, chunks, ((key - 1 + idx) % 12) + 1)
    );

    const groupedAnswers = await Promise.all(answerPromises);
    const allAnswers = groupedAnswers.flat();

    parentPort.postMessage({ success: true, answers: allAnswers });
  } catch (error) {
    parentPort.postMessage({
      success: false,
      error: error.message || "Unknown worker error",
    });
  }
})();
*/
