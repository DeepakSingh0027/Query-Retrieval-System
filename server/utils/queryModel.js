// Import Azure REST client for AI inference and a helper function to check unexpected responses
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";

// Import Azure authentication utility to pass API credentials
import { AzureKeyCredential } from "@azure/core-auth";

// Load environment variables from a `.env` file
import "dotenv/config";

// File system promises API for async reading/writing of key files
import fs from "fs/promises";

// -----------------------------------------
// In-memory lock to serialize API key usage
// This ensures only one "getTokenByKey" runs at a time
let keyLock = Promise.resolve();

// Azure inference endpoint (for GitHub Models service)
const endpoint = "https://models.github.ai/inference";

// Model name — here using OpenAI's GPT-4.1 hosted on Azure
const model = "openai/gpt-4.1";

// Creativity setting for model output
const temperature = 0.7;

/**
 * Rotates API tokens from environment variables using a counter stored in `key.txt`.
 * This helps distribute API requests across multiple keys to avoid rate limits.
 *
 * @returns {Promise<string>} The selected API token
 */
async function getTokenByKey() {
  // Serialize token fetching to avoid race conditions
  keyLock = keyLock.then(async () => {
    let key;

    try {
      // Read the current key index from `key.txt`
      const keyContent = await fs.readFile("key.txt", "utf8");
      key = Number(keyContent.trim()) || 1;

      // Validate the key number — must be between 1 and 12
      if (isNaN(key) || key < 1 || key > 12) {
        console.error("Invalid key in key.txt, defaulting to 1");
        key = 1;
        await fs.writeFile("key.txt", "1", "utf8");
      }
    } catch (err) {
      // If file doesn't exist or can't be read, reset to key 1
      console.error("Error reading key.txt, defaulting to 1:", err.message);
      key = 1;
      await fs.writeFile("key.txt", "1", "utf8");
    }

    // Rotate the key number: after 12, go back to 1
    const newKey = (key % 12) + 1;
    console.log(`Rotating key: ${key} -> ${newKey}`);
    await fs.writeFile("key.txt", newKey.toString(), "utf8");

    // Select the token from environment variables based on the current key index
    switch (key) {
      case 2:
        return process.env.GITHUB_TOKEN2;
      case 3:
        return process.env.GITHUB_TOKEN3;
      case 4:
        return process.env.GITHUB_TOKEN4;
      case 5:
        return process.env.GITHUB_TOKEN5;
      case 6:
        return process.env.GITHUB_TOKEN6;
      case 7:
        return process.env.GITHUB_TOKEN7;
      case 8:
        return process.env.GITHUB_TOKEN8;
      case 9:
        return process.env.GITHUB_TOKEN9;
      case 10:
        return process.env.GITHUB_TOKEN10;
      case 11:
        return process.env.GITHUB_TOKEN11;
      case 12:
        return process.env.GITHUB_TOKEN12;
      default:
        return process.env.GITHUB_TOKEN;
    }
  });

  // Return the Promise so multiple calls wait for the current operation to finish
  return keyLock;
}

/**
 * Queries the Azure-hosted GPT model with a document context and a list of questions.
 * Ensures strict JSON-formatted responses matching the question count.
 *
 * @param {string} context - The document text to answer from
 * @param {string[]} questions - Array of questions to ask
 * @returns {Promise<string[]>} - Array of answers, one for each question
 */
async function queryModel(context, questions) {
  // Get the next API token (rotated for load balancing)
  const token = await getTokenByKey();

  // Prepare conversation messages for the chat model
  const messages = [
    {
      role: "system",
      content: `You are an insurance policy assistant. Answer questions based on the provided document and make it accurate. Make sure the count of answers matches the count of questions. Format responses as a JSON array of answers:

{
  "answers": [
    "Answer to question 1",
    "Answer to question 2",
    ...
  ]
}

Do not include anything outside this JSON block.Note: if the accurate answer is not mentioned please answers with relative response.`,
    },
    {
      role: "user",
      content: `Document:\n\n${context}\n\nQuestions:\n${questions
        .map((q, i) => `${i + 1}. ${q}`)
        .join("\n")}`,
    },
  ];

  try {
    // Create Azure model client using endpoint and token
    const client = ModelClient(endpoint, new AzureKeyCredential(token));

    // Make POST request to the `/chat/completions` API
    const response = await client.path("/chat/completions").post({
      body: {
        messages,
        temperature,
        top_p: 0.9, // Nucleus sampling setting
        model,
      },
    });

    // Check if the API returned an error response format
    if (isUnexpected(response)) {
      throw new Error(JSON.stringify(response.body));
    }

    // Extract text from the model's response
    const answerText = response.body.choices[0].message.content;

    // Parse the JSON text into an object
    const parsed = JSON.parse(answerText);

    // Validate that the parsed response contains an "answers" array
    if (Array.isArray(parsed.answers)) {
      return parsed.answers;
    } else {
      console.error("Invalid format from model:", parsed);
      return questions.map(() => "No answer found.");
    }
  } catch (err) {
    // Handle API or parsing errors
    const errorMessage = err?.message || err.toString();
    console.error(`Query failed:`, errorMessage);

    // Return placeholder error answers for all questions
    return questions.map(() => "Error fetching answer.");
  }
}

// Export the queryModel function for use in other modules
export default queryModel;
