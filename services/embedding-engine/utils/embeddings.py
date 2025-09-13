import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Optional
import hashlib
import pickle
import os

class EmbeddingGenerator:
    def __init__(self, model_name: str = 'all-MiniLM-L6-v2'):
        """
        Initialize embedding generator
        
        Args:
            model_name: Sentence transformer model to use
                       'all-MiniLM-L6-v2' is fast and good quality
        """
        self.model_name = model_name
        self.model = None
        self.cache_dir = ".embedding_cache"
        self._ensure_cache_dir()
    
    def _ensure_cache_dir(self):
        """Create cache directory if it doesn't exist"""
        if not os.path.exists(self.cache_dir):
            os.makedirs(self.cache_dir)
    
    def _load_model(self):
        """Lazy load the sentence transformer model"""
        if self.model is None:
            print(f"Loading sentence transformer model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            print("Model loaded successfully")
    
    def _get_cache_key(self, text: str) -> str:
        """Generate cache key for text"""
        return hashlib.md5(f"{self.model_name}:{text}".encode()).hexdigest()
    
    def _get_cache_path(self, cache_key: str) -> str:
        """Get full path for cache file"""
        return os.path.join(self.cache_dir, f"{cache_key}.pkl")
    
    def _load_from_cache(self, text: str) -> Optional[np.ndarray]:
        """Load embedding from cache if available"""
        cache_key = self._get_cache_key(text)
        cache_path = self._get_cache_path(cache_key)
        
        if os.path.exists(cache_path):
            try:
                with open(cache_path, 'rb') as f:
                    return pickle.load(f)
            except Exception:
                # If cache is corrupted, remove it
                os.remove(cache_path)
        
        return None
    
    def _save_to_cache(self, text: str, embedding: np.ndarray):
        """Save embedding to cache"""
        cache_key = self._get_cache_key(text)
        cache_path = self._get_cache_path(cache_key)
        
        try:
            with open(cache_path, 'wb') as f:
                pickle.dump(embedding, f)
        except Exception as e:
            print(f"Warning: Could not cache embedding: {e}")
    
    def generate_embedding(self, text: str) -> np.ndarray:
        """
        Generate embedding for text with caching
        
        Args:
            text: Text to embed
            
        Returns:
            Normalized embedding vector
        """
        # Check cache first
        cached_embedding = self._load_from_cache(text)
        if cached_embedding is not None:
            return cached_embedding
        
        # Generate new embedding
        self._load_model()
        embedding = self.model.encode([text])
        
        # Normalize the embedding
        normalized_embedding = embedding[0] / np.linalg.norm(embedding[0])
        
        # Cache the result
        self._save_to_cache(text, normalized_embedding)
        
        return normalized_embedding
    
    def generate_embeddings_batch(self, texts: List[str]) -> List[np.ndarray]:
        """
        Generate embeddings for multiple texts efficiently
        
        Args:
            texts: List of texts to embed
            
        Returns:
            List of normalized embedding vectors
        """
        embeddings = []
        uncached_texts = []
        uncached_indices = []
        
        # Check cache for each text
        for i, text in enumerate(texts):
            cached_embedding = self._load_from_cache(text)
            if cached_embedding is not None:
                embeddings.append(cached_embedding)
            else:
                embeddings.append(None)
                uncached_texts.append(text)
                uncached_indices.append(i)
        
        # Generate embeddings for uncached texts
        if uncached_texts:
            self._load_model()
            print(f"Generating embeddings for {len(uncached_texts)} texts...")
            
            batch_embeddings = self.model.encode(uncached_texts)
            
            # Normalize and cache
            for i, embedding in enumerate(batch_embeddings):
                normalized_embedding = embedding / np.linalg.norm(embedding)
                original_index = uncached_indices[i]
                embeddings[original_index] = normalized_embedding
                
                # Cache the result
                self._save_to_cache(uncached_texts[i], normalized_embedding)
        
        return embeddings
    
    def clear_cache(self):
        """Clear the embedding cache"""
        import shutil
        if os.path.exists(self.cache_dir):
            shutil.rmtree(self.cache_dir)
            self._ensure_cache_dir()
            print("Embedding cache cleared")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not os.path.exists(self.cache_dir):
            return {"cached_embeddings": 0, "cache_size_mb": 0}
        
        cache_files = [f for f in os.listdir(self.cache_dir) if f.endswith('.pkl')]
        
        total_size = 0
        for filename in cache_files:
            filepath = os.path.join(self.cache_dir, filename)
            total_size += os.path.getsize(filepath)
        
        return {
            "cached_embeddings": len(cache_files),
            "cache_size_mb": round(total_size / (1024 * 1024), 2)
        } 