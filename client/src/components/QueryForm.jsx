import { useState } from "react";
import { fetchAnswers } from "../api/api";
import { Plus, Trash } from "lucide-react";

export default function QueryForm({ onSubmit }) {
  const [docURL, setDocURL] = useState("");
  const [questions, setQuestions] = useState([""]);
  const [loading, setLoading] = useState(false);

  const handleChange = (index, value) => {
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
  };

  const addQuestion = () => setQuestions([...questions, ""]);
  const removeQuestion = (index) =>
    setQuestions(questions.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const answers = await fetchAnswers(docURL, questions);
    setLoading(false);
    onSubmit(answers);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="url"
        placeholder="Enter Document URL"
        value={docURL}
        onChange={(e) => setDocURL(e.target.value)}
        required
        className="w-full p-2 border rounded"
      />

      {questions.map((q, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type="text"
            value={q}
            placeholder={`Question ${idx + 1}`}
            onChange={(e) => handleChange(idx, e.target.value)}
            className="w-full p-2 border rounded"
          />
          {questions.length > 1 && (
            <button type="button" onClick={() => removeQuestion(idx)}>
              <Trash size={18} />
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addQuestion}
        className="flex items-center gap-1"
      >
        <Plus size={18} /> Add Question
      </button>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
