from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

model = None

def init_model():
    global model
    if model is None:
        try:
            model = SentenceTransformer('all-MiniLM-L6-v2')
            print("Model loaded successfully")
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            raise

def embed_text(text):
    if model is None:
        init_model()
    return model.encode(text).tolist()

def find_similar_chunks(query, chunks, top_k=3):
    if model is None:
        init_model()
    query_vec = embed_text(query)
    similarities = []
    for item in chunks:
        sim = cosine_similarity([query_vec], [item['embedding']])[0][0]
        similarities.append((item['chunk'], sim))
    similarities.sort(key=lambda x: x[1], reverse=True)
    return [{"chunk": c, "score": s} for c, s in similarities[:top_k]]