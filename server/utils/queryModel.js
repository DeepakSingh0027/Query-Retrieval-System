import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import "dotenv/config";

const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4.1";
const temperature = 1.0;
const MAX_ATTEMPTS = 5;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTokenByKey(key) {
  switch (key) {
    case 2:
      return process.env.GITHUB_TOKEN2;
    case 3:
      return process.env.GITHUB_TOKEN3;
    case 4:
      return process.env.GITHUB_TOKEN4;
    case 5:
      return process.env.GITHUB_TOKEN5;
    default:
      return process.env.GITHUB_TOKEN;
  }
}

async function queryModel(context, questions, key = 1, attempt = 1) {
  const token = getTokenByKey(key);

  const messages = [
    {
      role: "system",
      content: `You are a professional insurance policy assistant tasked with answering questions based strictly on the provided document context.

Please follow these instructions:
- For each question, respond only based on the context.
- If the answer is not explicitly stated, respond with *whatever relevant you feel about that question* based on the document.
- Return answers in the following strict JSON format only:

{
  "answers": [
    "Answer to question 1",
    "Answer to question 2",
    ...
  ]
}

Do not include any explanation, notes, or extra text outside this JSON structure.`,
    },
    {
      role: "user",
      content: `Document:\n\n${context}\n\nQuestions:\n${questions
        .map((q, i) => `${i + 1}. ${q}`)
        .join("\n")}`,
    },
  ];

  try {
    const client = ModelClient(endpoint, new AzureKeyCredential(token));
    const response = await client.path("/chat/completions").post({
      body: {
        messages,
        temperature,
        top_p: 1.0,
        model,
      },
    });

    if (isUnexpected(response)) {
      throw new Error(JSON.stringify(response.body));
    }

    const answerText = response.body.choices[0].message.content;
    const parsed = JSON.parse(answerText);

    if (Array.isArray(parsed.answers)) {
      return parsed.answers;
    } else {
      console.error("Invalid format from model:", parsed);
      return questions.map(() => "No answer found.");
    }
  } catch (err) {
    const errorMessage = err?.message || err.toString();

    console.error(
      `Error in queryModel (key=${key}, attempt=${attempt}):`,
      errorMessage
    );

    const isRetryable =
      errorMessage.includes("Too Many Requests") || // HTTP 429
      errorMessage.includes("timeout") ||
      errorMessage.includes("ECONNRESET") ||
      errorMessage.includes("503") ||
      errorMessage.includes("502");

    if (isRetryable && attempt < MAX_ATTEMPTS) {
      const backoff = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s, 8s, 16s
      const jitter = Math.floor(Math.random() * 300); // random 0–300ms
      await delay(backoff + jitter);
      return queryModel(context, questions, key, attempt + 1);
    }

    return questions.map(() => "Error fetching answer.");
  }
}

export default queryModel;
