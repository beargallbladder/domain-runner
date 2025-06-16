import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from sklearn.metrics.pairwise import cosine_similarity

class SimilarityAnalyzer:
    def __init__(self):
        """Initialize similarity analyzer"""
        pass
    
    def cosine_similarity_single(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Calculate cosine similarity between two embeddings
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Cosine similarity score (0-1, higher = more similar)
        """
        # Ensure embeddings are 2D for sklearn
        emb1 = embedding1.reshape(1, -1)
        emb2 = embedding2.reshape(1, -1)
        
        similarity = cosine_similarity(emb1, emb2)[0][0]
        
        # Convert to 0-1 range (cosine similarity is -1 to 1)
        return (similarity + 1) / 2
    
    def cosine_similarity_matrix(self, embeddings: List[np.ndarray]) -> np.ndarray:
        """
        Calculate cosine similarity matrix for multiple embeddings
        
        Args:
            embeddings: List of embedding vectors
            
        Returns:
            Similarity matrix where [i][j] is similarity between embeddings[i] and embeddings[j]
        """
        if len(embeddings) == 0:
            return np.array([])
        
        # Stack embeddings into matrix
        embedding_matrix = np.vstack(embeddings)
        
        # Calculate similarity matrix
        similarity_matrix = cosine_similarity(embedding_matrix)
        
        # Convert to 0-1 range
        return (similarity_matrix + 1) / 2
    
    def calculate_self_similarity(self, responses_by_model: Dict[str, List[Dict[str, Any]]]) -> Dict[str, float]:
        """
        Calculate self-similarity for each model (consistency over time)
        
        Args:
            responses_by_model: Dict mapping model_name to list of responses
            
        Returns:
            Dict mapping model_name to average self-similarity score
        """
        self_similarities = {}
        
        for model_name, responses in responses_by_model.items():
            if len(responses) < 2:
                self_similarities[model_name] = 1.0  # Perfect consistency if only one response
                continue
            
            # Get embeddings from responses
            embeddings = [resp['embedding'] for resp in responses if 'embedding' in resp]
            
            if len(embeddings) < 2:
                self_similarities[model_name] = 1.0
                continue
            
            # Calculate pairwise similarities
            similarity_matrix = self.cosine_similarity_matrix(embeddings)
            
            # Get upper triangular part (excluding diagonal)
            similarities = []
            for i in range(len(similarity_matrix)):
                for j in range(i + 1, len(similarity_matrix)):
                    similarities.append(similarity_matrix[i][j])
            
            # Average similarity
            avg_similarity = np.mean(similarities) if similarities else 1.0
            self_similarities[model_name] = float(avg_similarity)
        
        return self_similarities
    
    def calculate_peer_similarity(self, responses_by_domain: Dict[str, Dict[str, List[Dict[str, Any]]]]) -> Dict[str, Dict[str, float]]:
        """
        Calculate peer similarity for each model (agreement with other models)
        
        Args:
            responses_by_domain: Dict mapping domain to model responses
            
        Returns:
            Dict mapping domain to dict mapping model_name to peer similarity score
        """
        peer_similarities = {}
        
        for domain, model_responses in responses_by_domain.items():
            peer_similarities[domain] = {}
            
            model_names = list(model_responses.keys())
            
            if len(model_names) < 2:
                # Only one model for this domain
                for model_name in model_names:
                    peer_similarities[domain][model_name] = 1.0
                continue
            
            # Get representative embedding for each model (average if multiple responses)
            model_embeddings = {}
            for model_name, responses in model_responses.items():
                embeddings = [resp['embedding'] for resp in responses if 'embedding' in resp]
                if embeddings:
                    # Average embeddings for this model
                    avg_embedding = np.mean(embeddings, axis=0)
                    model_embeddings[model_name] = avg_embedding
            
            # Calculate peer similarities
            for model_name in model_embeddings:
                similarities = []
                
                for other_model, other_embedding in model_embeddings.items():
                    if other_model != model_name:
                        similarity = self.cosine_similarity_single(
                            model_embeddings[model_name], 
                            other_embedding
                        )
                        similarities.append(similarity)
                
                # Average similarity with all other models
                avg_peer_similarity = np.mean(similarities) if similarities else 1.0
                peer_similarities[domain][model_name] = float(avg_peer_similarity)
        
        return peer_similarities
    
    def calculate_canonical_similarity(self, responses: List[Dict[str, Any]], 
                                     canonical_embeddings: Optional[Dict[str, np.ndarray]] = None) -> Dict[str, float]:
        """
        Calculate canonical similarity (adherence to established knowledge)
        
        Args:
            responses: List of response objects with embeddings
            canonical_embeddings: Optional pre-computed canonical embeddings by domain
            
        Returns:
            Dict mapping response_id to canonical similarity score
        """
        canonical_similarities = {}
        
        # Group responses by domain
        responses_by_domain = {}
        for response in responses:
            domain = response['domain']
            if domain not in responses_by_domain:
                responses_by_domain[domain] = []
            responses_by_domain[domain].append(response)
        
        for domain, domain_responses in responses_by_domain.items():
            if canonical_embeddings and domain in canonical_embeddings:
                # Use pre-computed canonical embedding
                canonical_embedding = canonical_embeddings[domain]
            else:
                # Use consensus embedding (average of all responses for this domain)
                embeddings = [resp['embedding'] for resp in domain_responses if 'embedding' in resp]
                if not embeddings:
                    continue
                canonical_embedding = np.mean(embeddings, axis=0)
            
            # Calculate similarity to canonical for each response
            for response in domain_responses:
                if 'embedding' not in response:
                    continue
                
                similarity = self.cosine_similarity_single(
                    response['embedding'], 
                    canonical_embedding
                )
                
                response_id = response.get('id', response.get('response_id'))
                canonical_similarities[str(response_id)] = float(similarity)
        
        return canonical_similarities
    
    def find_outliers(self, similarities: List[float], threshold: float = 0.2) -> List[int]:
        """
        Find outlier responses based on similarity scores
        
        Args:
            similarities: List of similarity scores
            threshold: Threshold below which responses are considered outliers
            
        Returns:
            List of indices of outlier responses
        """
        outliers = []
        for i, similarity in enumerate(similarities):
            if similarity < threshold:
                outliers.append(i)
        
        return outliers 