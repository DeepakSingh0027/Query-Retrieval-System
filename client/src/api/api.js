import axios from "axios";

const BASE_URL = "http://localhost:8000/api/v1";
const TOKEN =
  "a96e15d3686ab1aa2ffb0ded7a95c847ac46300fe7d073d0c326fbf61fb445b0";

export async function fetchAnswers(documentUrl, questions) {
  const response = await axios.post(
    `${BASE_URL}/hackrx/run`,
    {
      documents: documentUrl,
      questions,
    },
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data.answers;
}
