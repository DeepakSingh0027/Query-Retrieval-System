import { useState } from "react";
import QueryForm from "./components/QueryForm";
import AnswerList from "./components/AnswerList";

function App() {
  const [answers, setAnswers] = useState([]);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">LLM Query System</h1>
      <QueryForm onSubmit={setAnswers} />
      <AnswerList answers={answers} />
    </div>
  );
}

export default App;
