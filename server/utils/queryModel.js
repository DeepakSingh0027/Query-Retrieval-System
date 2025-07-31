import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import "dotenv/config";

const endpoint = "https://models.github.ai/inference";
const token = process.env.GITHUB_TOKEN;
const model = "openai/gpt-4.1";

const client = ModelClient(endpoint, new AzureKeyCredential(token));

async function queryModel(context, questions) {
  try {
    const messages = [
      {
        role: "system",
        content: `You are given a list of questions and a document context. Answer each question based on the context. Only respond in the following strict JSON format:

{
  "answers": [
    "Answer to question 1",
    "Answer to question 2",
    ...
  ]
}

Make sure that each answer strictly corresponds to the matching numbered question. No extra text outside the JSON.`,
      },
      {
        role: "user",
        content: `Document:\n\n${context}\n\nQuestions:\n${questions
          .map((q, i) => `${i + 1}. ${q}`)
          .join("\n")}`,
      },
    ];

    const response = await client.path("/chat/completions").post({
      body: {
        messages,
        temperature: 0.7,
        top_p: 1.0,
        model: model,
      },
    });

    //console.log(response);
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
  } catch (error) {
    console.error("Error in queryModel:", error.message || error);
    return questions.map(() => "Error fetching answer.");
  }
}

export default queryModel;
