from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

model = SentenceTransformer('all-MiniLM-L6-v2')

def embed_text(text):
    return model.encode(text).tolist()

def find_similar_chunks(query, chunks, top_k=3):
    query_vec = embed_text(query)
    similarities = []
    for item in chunks:
        sim = cosine_similarity([query_vec], [item['embedding']])[0][0]
        similarities.append((item['chunk'], sim))
    similarities.sort(key=lambda x: x[1], reverse=True)
    return [{"chunk": c, "score": s} for c, s in similarities[:top_k]]
