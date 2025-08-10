// Utility functions and imports
import { chunkText } from "../utils/chunkText.js"; // Splits text into smaller chunks for embedding
import queryModel from "../utils/queryModel.js"; // Queries the LLM model with context and questions
import { handleFile } from "../utils/functions/extractor.js"; // Extracts text content from uploaded files
import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import {
  embedChunks as localEmbedChunks, // Function to embed chunks (convert to vector representations)
  findMatches as localFindMatches, // Function to find similar chunks for a question
} from "../utils/semanticSearch.js";

// Max allowed characters in LLM context
const MAX_CONTEXT_LENGTH = 29999;

// Simple delay helper (used for throttling if needed)
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Splits an array of questions into `parts` groups of roughly equal size.
 * Ensures remainder is distributed evenly between groups.
 */
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

/**
 * Runs `processPart` for each split of questions in parallel
 * and flattens all results into a single array.
 */
async function preProcessParts(questionsGroup, chunks) {
  const splitter = 2; // Number of parts to split into for processing
  const questionParts = splitQuestionsIntoParts(questionsGroup, splitter);

  // Process all parts in parallel
  const promises = questionParts.map((part) => processPart(part, chunks));
  const resultsArray = await Promise.all(promises);

  return resultsArray.flat();
}

/**
 * Transposes a matrix so that each index contains elements from
 * all arrays at that position (used for aligning search results).
 */
function transpose(matrix) {
  const maxLength = Math.max(...matrix.map((row) => row.length));
  return Array.from({ length: maxLength }, (_, i) =>
    matrix.map((row) => row[i]).filter(Boolean)
  ).flat();
}

/**
 * For each question in the group:
 *   1. Finds the most relevant chunks.
 *   2. Deduplicates and concatenates them into context (within size limit).
 *   3. Sends the context + questions to the model for answers.
 */
async function processPart(questionsGroup, chunks) {
  // Get matching chunks for each question in the group
  const relevantChunksSet = await Promise.all(
    questionsGroup.map((q) => findMatches(q))
  );

  // Rearrange results so similar ranks align across all questions
  const transposedChunks = transpose(relevantChunksSet);

  // Flatten and deduplicate chunks
  const relevantChunks = Array.from(
    new Set(transposedChunks.flat().map((item) => item.chunk))
  );

  // Build context string up to MAX_CONTEXT_LENGTH
  let context = "";
  for (const chunk of relevantChunks) {
    if ((context + "\n\n" + chunk).length <= MAX_CONTEXT_LENGTH) {
      context += "\n\n" + chunk;
    } else {
      break;
    }
  }

  console.log(`Context length: ${context.length}`);

  try {
    console.log("Sends");
    // Query the model with the built context and all questions in this part
    const answerArray = await queryModel(context, questionsGroup);
    console.log("Received");

    // Ensure we always return an array of answers
    if (Array.isArray(answerArray)) {
      return answerArray;
    } else {
      return questionsGroup.map(() => "Unexpected response format.");
    }
  } catch (err) {
    console.error(`Error in queryModel`, err?.message || err);
    return questionsGroup.map(() => "Error in LLM response.");
  }
}

/**
 * Wrapper for local semantic search's `findMatches` with a limit.
 */
async function findMatches(question) {
  return await localFindMatches(question, 30);
}

/**
 * Wrapper for local semantic search's `embedChunks`.
 */
async function embedChunks(chunks) {
  return await localEmbedChunks(chunks);
}

/**
 * Main controller function for processing documents and questions.
 * Steps:
 *   1. Validate request data.
 *   2. Extract text from documents.
 *   3. Chunk and embed text for semantic search.
 *   4. Split questions into smaller groups for processing.
 *   5. Find relevant chunks and get answers from model.
 *   6. return them in the response.
 */
export const hackrx = async (req, res) => {
  try {
    const { documents, questions } = req.body;

    // Validate request body
    if (!documents || !Array.isArray(questions)) {
      return res.status(400).json({
        error: "Missing or invalid 'documents' or 'questions' array",
      });
    }

    console.log("Total questions:", questions.length);

    // Extract and chunk text from provided documents
    const text = await handleFile(documents);
    const chunks = chunkText(text);

    // Embed chunks for semantic search
    await embedChunks(chunks);

    // Split all questions into 12 groups for batch processing
    const questionGroups = splitQuestionsIntoParts(questions, 12);

    // Process each question group in parallel
    const answerPromises = questionGroups.map((group) =>
      preProcessParts(group, chunks)
    );

    // Wait for all groups to finish and flatten results
    const groupedAnswers = await Promise.all(answerPromises);
    const allAnswers = groupedAnswers.flat();

    console.log("All answers received:", allAnswers.length);

    // Return answers to client
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
