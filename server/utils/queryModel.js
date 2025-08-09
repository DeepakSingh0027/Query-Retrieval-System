import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import "dotenv/config";
import fs from "fs/promises";

// Simple in-memory lock
let keyLock = Promise.resolve();

const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4.1-mini";
const temperature = 0.7;

async function getTokenByKey() {
  // Chain promises so each call waits for the previous one
  keyLock = keyLock.then(async () => {
    let key;
    try {
      const keyContent = await fs.readFile("key.txt", "utf8");
      key = Number(keyContent.trim()) || 1;
      if (isNaN(key) || key < 1 || key > 12) {
        console.error("Invalid key in key.txt, defaulting to 1");
        key = 1;
        await fs.writeFile("key.txt", "1", "utf8");
      }
    } catch (err) {
      console.error("Error reading key.txt, defaulting to 1:", err.message);
      key = 1;
      await fs.writeFile("key.txt", "1", "utf8");
    }

    const newKey = (key % 12) + 1;
    console.log(`Rotating key: ${key} -> ${newKey}`);
    await fs.writeFile("key.txt", newKey.toString(), "utf8");

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

  return keyLock;
}

async function queryModel(context, questions) {
  const token = await getTokenByKey();

  const messages = [
    {
      role: "system",
      content: `You are an insurance policy assistant. Answer questions based only on the provided document and make it accurate. Make sure the count of answers matches the count of questions. Format responses as a JSON array of answers:

{
  "answers": [
    "Answer to question 1",
    "Answer to question 2",
    ...
  ]
}

Do not include anything outside this JSON block.`,
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
        top_p: 0.9,
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
    console.error(`Query failed:`, errorMessage);
    return questions.map(() => "Error fetching answer.");
  }
}

export default queryModel;
