import os
from flask import Flask, request, jsonify
from utils import embed_text, find_similar_chunks, init_model

app = Flask(__name__)

# Memory store for embeddings
stored_chunks = []

@app.route("/embed", methods=["POST"])
def embed_chunks():
    try:
        data = request.json.get("chunks", [])
        if not data:
            return jsonify({"error": "No chunks provided"}), 400
        result = []
        for chunk in data:
            try:
                embedding = embed_text(chunk)
                stored_chunks.append({"chunk": chunk, "embedding": embedding})
                result.append({"chunk": chunk, "embedding": embedding})
            except Exception as e:
                print(f"Error embedding chunk '{chunk}': {str(e)}")
                return jsonify({"error": f"Failed to embed chunk: {str(e)}"}), 500
        print(f"Stored {len(stored_chunks)} chunks in memory.")
        return jsonify(result)
    except Exception as e:
        print(f"Error in /embed endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/query", methods=["POST"])
def query_embedding():
    try:
        question = request.json.get("question", "")
        top_k = request.json.get("top_k", 3)
        if not question:
            return jsonify({"error": "No question provided"}), 400
        matches = find_similar_chunks(question, stored_chunks, top_k)
        return jsonify(matches)
    except Exception as e:
        print(f"Error in /query endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    try:
        port = int(os.environ.get("PORT", 5000))
        print(f"Starting Flask app on port {port}...")
        init_model()  # Initialize model at startup
        app.run(host="0.0.0.0", port=port)
    except Exception as e:
        print(f"Failed to start Flask app: {str(e)}")
        raise