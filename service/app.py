from flask import Flask, request, jsonify
from utils import embed_text, find_similar_chunks

app = Flask(__name__)

# Memory store for embeddings (can be upgraded to DB)
stored_chunks = []

@app.route("/embed", methods=["POST"])
def embed_chunks():
    data = request.json.get("chunks", [])
    result = []
    for chunk in data:
        embedding = embed_text(chunk)
        stored_chunks.append({"chunk": chunk, "embedding": embedding})
        result.append({"chunk": chunk, "embedding": embedding})
    return jsonify(result)

@app.route("/query", methods=["POST"])
def query_embedding():
    question = request.json.get("question", "")
    top_k = request.json.get("top_k", 5)
    matches = find_similar_chunks(question, stored_chunks, top_k)
    return jsonify(matches)

if __name__ == "__main__":
    app.run(port=5005)
