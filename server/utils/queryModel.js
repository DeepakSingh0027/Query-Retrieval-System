import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import "dotenv/config";

const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4.1-mini";
const temperature = 0.7; // Adjusted temperature for more balanced responses

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
    case 6:
      return process.env.GITHUB_TOKEN6;
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
    console.error(`Query failed (key=${key}):`, errorMessage);
    return questions.map(() => "Error fetching answer.");
  }
}

export default queryModel;
