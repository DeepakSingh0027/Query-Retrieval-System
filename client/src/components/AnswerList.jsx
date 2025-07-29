export default function AnswerList({ answers }) {
  return (
    <div className="mt-6 space-y-4">
      {answers.map((ans, idx) => (
        <div key={idx} className="bg-gray-100 p-4 rounded shadow">
          <h4 className="font-semibold">Q{idx + 1}</h4>
          <p>{ans}</p>
        </div>
      ))}
    </div>
  );
}
