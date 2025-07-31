const axios = require("axios");

async function queryModel(model, context, questions, key) {
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

Make sure that each answer strictly corresponds to the matching numbered question.
Answer ONLY from the given document. Do not make up any information. No extra text outside the JSON.`,
      },
      {
        role: "user",
        content: `Document:\n\n${context}\n\nQuestions:\n${questions
          .map((q, i) => `${i + 1}. ${q}`)
          .join("\n")}`,
      },
    ];
    let apii = "";
    if (key === 1) {
      apii = process.env.OPENROUTER_API_KEY1;
    } else if (key === 2) {
      apii = process.env.OPENROUTER_API_KEY2;
    } else {
      apii = process.env.OPENROUTER_API_KEY3;
    }
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model,
        messages,
      },
      {
        headers: {
          Authorization: `Bearer ${apii}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const answerText = response.data.choices[0].message.content;

    // Extract the answers array from JSON response
    const parsed = JSON.parse(answerText);

    if (Array.isArray(parsed.answers)) {
      return parsed.answers;
    } else {
      console.error("Invalid format from model:", parsed);
      return questions.map(() => "No answer found."); // fallback
    }
  } catch (error) {
    console.error("Error in queryModel:", error.message);
    return questions.map(() => "Error fetching answer.");
  }
}
module.exports = queryModel;
