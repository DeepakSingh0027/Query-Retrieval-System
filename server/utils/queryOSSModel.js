// Import the OpenAI client to interact with models through the Hugging Face router API
import { OpenAI } from "openai";

// Import dotenv to load environment variables from a .env file
// Required if we are storing HF_TOKEN securely in a local .env file
import "dotenv/config";

// Create an OpenAI client instance configured to use Hugging Face's router
// - baseURL: points to Hugging Face's API router endpoint for OpenAI-compatible calls
// - apiKey: Hugging Face token, stored in environment variable HF_TOKEN
const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN, // Set this in your .env file: HF_TOKEN=your_huggingface_token
});

/**
 * Removes <think>...</think> blocks from model responses.
 * Some OSS models include hidden reasoning text inside <think> tags.
 * Since we only want clean JSON output, this strips those parts.
 *
 * @param {string} responseText - Raw text from model
 * @returns {string} - Cleaned text without <think> tags
 */
function stripThinkBlock(responseText) {
  return responseText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

/**
 * Queries an open-source LLM through Hugging Face to answer questions
 * strictly based on a provided document context.
 *
 * @param {string} context - The full document text to base answers on.
 * @param {string[]} questions - Array of user questions.
 * @returns {Promise<string[]>} - Array of answers matching the order of questions.
 */
export async function queryOSSModel(context, questions) {
  // Construct conversation messages for the model:
  // SYSTEM role → instructions for how to behave
  // USER role → document text + questions in numbered order
  const messages = [
    {
      role: "system",
      content: `You are a professional insurance policy assistant tasked with answering questions strictly based on the provided document context.

Instructions:
- Answer each question using only the document context.
- If the document does not provide a direct answer, respond with any partially relevant or inferred information from the context. Do not hallucinate or assume facts not present in the document.
- Ensure that the nth question has the nth answer in the output.
- Format your response strictly as valid JSON:

{
  "answers": [
    "Answer to question 1",
    "Answer to question 2",
    ...
  ]
}

Do not include anything outside this JSON block. Your output must only be this JSON object.
`,
    },
    {
      role: "user",
      content: `Document:\n\n${context}\n\nQuestions:\n${questions
        .map((q, i) => `${i + 1}. ${q}`) // Number each question for clarity
        .join("\n")}`,
    },
  ];

  try {
    // Send the conversation to the model for processing
    const chatCompletion = await client.chat.completions.create({
      model: "openai/gpt-oss-120b:novita", // OSS model served by Hugging Face
      messages,
      temperature: 0.7, // Slight creativity allowed, but still controlled
    });

    // Extract the model's text output from the first completion choice
    const answerText = chatCompletion.choices[0].message.content;

    // Remove any <think> blocks that may contain hidden reasoning
    const cleaned = stripThinkBlock(answerText);

    // Attempt to parse the model's response as JSON
    const parsed = JSON.parse(cleaned);

    // Ensure we have an array of answers; return them if valid
    if (Array.isArray(parsed.answers)) {
      return parsed.answers;
    } else {
      // If the JSON is valid but doesn't match the expected structure
      console.error("Invalid format from model:", parsed);
      return questions.map(() => "No answer found."); // Default fallback
    }
  } catch (error) {
    // Handle any network/model errors
    console.error("Query failed:", error.message || error);
    return questions.map(() => "Error fetching answer."); // Fallback answers
  }
}
