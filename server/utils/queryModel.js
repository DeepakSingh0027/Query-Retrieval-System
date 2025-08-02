import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import "dotenv/config";

const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4.1";
const temperature = 0.3;

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

async function queryModel(context, questions, key = 1) {
  const token = getTokenByKey(key);

  const messages = [
    {
      role: "system",
      content: `You are a professional insurance policy assistant tasked with answering questions strictly based on the provided document context.

Instructions:
- Answer each question using only the document context.
- If a direct answer is missing, respond with whatever relevant you feel about that question.
- Format your response as JSON only:

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
    console.error(`Query failed (key=${key}):`, errorMessage);
    return questions.map(() => "Error fetching answer.");
  }
}

export default queryModel;
