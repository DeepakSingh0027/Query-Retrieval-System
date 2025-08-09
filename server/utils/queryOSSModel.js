import { OpenAI } from "openai";
import "dotenv/config"; // If using .env

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN, // Set this in your .env file
});

function stripThinkBlock(responseText) {
  return responseText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

export async function queryOSSModel(context, questions) {
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
    const chatCompletion = await client.chat.completions.create({
      model: "openai/gpt-oss-120b:novita",
      messages,
      temperature: 0.7,
    });

    const answerText = chatCompletion.choices[0].message.content;
    const cleaned = stripThinkBlock(answerText);
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed.answers)) {
      return parsed.answers;
    } else {
      console.error("Invalid format from model:", parsed);
      return questions.map(() => "No answer found.");
    }
  } catch (error) {
    console.error("Query failed:", error.message || error);
    return questions.map(() => "Error fetching answer.");
  }
}
