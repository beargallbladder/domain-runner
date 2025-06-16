import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from .similarity import SimilarityAnalyzer

class DriftDetector:
    def __init__(self, 
                 self_weight: float = 0.4,
                 peer_weight: float = 0.35, 
                 canonical_weight: float = 0.25):
        """
        Initialize drift detector with similarity weights
        
        Args:
            self_weight: Weight for self-similarity score
            peer_weight: Weight for peer similarity score  
            canonical_weight: Weight for canonical similarity score
        """
        self.self_weight = self_weight
        self.peer_weight = peer_weight
        self.canonical_weight = canonical_weight
        
        # Validate weights sum to 1
        total_weight = self_weight + peer_weight + canonical_weight
        if abs(total_weight - 1.0) > 0.001:
            raise ValueError(f"Weights must sum to 1.0, got {total_weight}")
        
        self.similarity_analyzer = SimilarityAnalyzer()
    
    def calculate_drift_score(self, 
                            self_similarity: float,
                            peer_similarity: float, 
                            canonical_similarity: float) -> float:
        """
        Calculate overall drift score from individual similarity scores
        
        Args:
            self_similarity: Self-consistency score (0-1)
            peer_similarity: Peer agreement score (0-1)  
            canonical_similarity: Canonical adherence score (0-1)
            
        Returns:
            Drift score (0-1, higher = less drift/more stable)
        """
        drift_score = (
            self_similarity * self.self_weight +
            peer_similarity * self.peer_weight +
            canonical_similarity * self.canonical_weight
        )
        
        return float(drift_score)
    
    def process_responses(self, responses: List[Dict[str, Any]]) -> Dict[str, Dict[str, float]]:
        """
        Process responses and calculate all similarity scores
        
        Args:
            responses: List of response objects with embeddings
            
        Returns:
            Dict with results for each domain/model/prompt combination
        """
        results = {}
        
        # Group responses by domain, model, and prompt
        grouped_responses = self._group_responses(responses)
        
        for domain in grouped_responses:
            if domain not in results:
                results[domain] = {}
            
            for model_name in grouped_responses[domain]:
                if model_name not in results[domain]:
                    results[domain][model_name] = {}
                
                for prompt_type in grouped_responses[domain][model_name]:
                    prompt_responses = grouped_responses[domain][model_name][prompt_type]
                    
                    # Calculate individual similarity scores
                    self_sim = self._calculate_self_similarity_for_group(prompt_responses)
                    peer_sim = self._calculate_peer_similarity_for_group(
                        domain, model_name, prompt_type, grouped_responses
                    )
                    canonical_sim = self._calculate_canonical_similarity_for_group(
                        domain, prompt_type, grouped_responses
                    )
                    
                    # Calculate overall drift score
                    drift_score = self.calculate_drift_score(self_sim, peer_sim, canonical_sim)
                    
                    results[domain][model_name][prompt_type] = {
                        'self_similarity': self_sim,
                        'peer_similarity': peer_sim,
                        'canonical_similarity': canonical_sim,
                        'drift_score': drift_score,
                        'response_count': len(prompt_responses)
                    }
        
        return results
    
    def _group_responses(self, responses: List[Dict[str, Any]]) -> Dict[str, Dict[str, Dict[str, List[Dict[str, Any]]]]]:
        """Group responses by domain -> model -> prompt_type"""
        grouped = {}
        
        for response in responses:
            domain = response['domain']
            model_name = response['model_name']
            prompt_type = response['prompt_type']
            
            if domain not in grouped:
                grouped[domain] = {}
            if model_name not in grouped[domain]:
                grouped[domain][model_name] = {}
            if prompt_type not in grouped[domain][model_name]:
                grouped[domain][model_name][prompt_type] = []
            
            grouped[domain][model_name][prompt_type].append(response)
        
        return grouped
    
    def _calculate_self_similarity_for_group(self, responses: List[Dict[str, Any]]) -> float:
        """Calculate self-similarity for a group of responses from same model"""
        if len(responses) < 2:
            return 1.0  # Perfect consistency if only one response
        
        embeddings = [resp['embedding'] for resp in responses if 'embedding' in resp]
        
        if len(embeddings) < 2:
            return 1.0
        
        # Calculate pairwise similarities
        similarity_matrix = self.similarity_analyzer.cosine_similarity_matrix(embeddings)
        
        # Get upper triangular part (excluding diagonal)
        similarities = []
        for i in range(len(similarity_matrix)):
            for j in range(i + 1, len(similarity_matrix)):
                similarities.append(similarity_matrix[i][j])
        
        return float(np.mean(similarities)) if similarities else 1.0
    
    def _calculate_peer_similarity_for_group(self, 
                                           domain: str, 
                                           model_name: str, 
                                           prompt_type: str,
                                           grouped_responses: Dict) -> float:
        """Calculate peer similarity for a specific model/domain/prompt combination"""
        
        # Get this model's average embedding
        this_model_responses = grouped_responses[domain][model_name][prompt_type]
        this_model_embeddings = [resp['embedding'] for resp in this_model_responses if 'embedding' in resp]
        
        if not this_model_embeddings:
            return 0.0
        
        this_model_avg = np.mean(this_model_embeddings, axis=0)
        
        # Get other models' average embeddings for same domain/prompt
        peer_similarities = []
        
        for other_model in grouped_responses[domain]:
            if other_model == model_name:
                continue
            
            if prompt_type in grouped_responses[domain][other_model]:
                other_responses = grouped_responses[domain][other_model][prompt_type]
                other_embeddings = [resp['embedding'] for resp in other_responses if 'embedding' in resp]
                
                if other_embeddings:
                    other_avg = np.mean(other_embeddings, axis=0)
                    similarity = self.similarity_analyzer.cosine_similarity_single(
                        this_model_avg, other_avg
                    )
                    peer_similarities.append(similarity)
        
        return float(np.mean(peer_similarities)) if peer_similarities else 1.0
    
    def _calculate_canonical_similarity_for_group(self, 
                                                domain: str, 
                                                prompt_type: str,
                                                grouped_responses: Dict) -> float:
        """Calculate canonical similarity using consensus of all models"""
        
        # Collect all embeddings for this domain/prompt combination
        all_embeddings = []
        
        for model_name in grouped_responses[domain]:
            if prompt_type in grouped_responses[domain][model_name]:
                model_responses = grouped_responses[domain][model_name][prompt_type]
                model_embeddings = [resp['embedding'] for resp in model_responses if 'embedding' in resp]
                all_embeddings.extend(model_embeddings)
        
        if len(all_embeddings) < 2:
            return 1.0
        
        # Calculate consensus embedding (average of all)
        consensus_embedding = np.mean(all_embeddings, axis=0)
        
        # Calculate how similar each embedding is to consensus
        similarities = []
        for embedding in all_embeddings:
            similarity = self.similarity_analyzer.cosine_similarity_single(
                embedding, consensus_embedding
            )
            similarities.append(similarity)
        
        # Return average similarity to consensus
        return float(np.mean(similarities))
    
    def detect_significant_drift(self, 
                               drift_scores: Dict[str, Dict[str, Dict[str, float]]], 
                               threshold: float = 0.7) -> List[Dict[str, Any]]:
        """
        Detect cases of significant drift (low stability scores)
        
        Args:
            drift_scores: Results from process_responses
            threshold: Threshold below which drift is considered significant
            
        Returns:
            List of drift cases with details
        """
        significant_drift = []
        
        for domain in drift_scores:
            for model_name in drift_scores[domain]:
                for prompt_type in drift_scores[domain][model_name]:
                    scores = drift_scores[domain][model_name][prompt_type]
                    
                    if scores['drift_score'] < threshold:
                        significant_drift.append({
                            'domain': domain,
                            'model_name': model_name,
                            'prompt_type': prompt_type,
                            'drift_score': scores['drift_score'],
                            'self_similarity': scores['self_similarity'],
                            'peer_similarity': scores['peer_similarity'],
                            'canonical_similarity': scores['canonical_similarity'],
                            'response_count': scores['response_count']
                        })
        
        # Sort by drift score (most problematic first)
        significant_drift.sort(key=lambda x: x['drift_score'])
        
        return significant_drift
    
    def get_summary_stats(self, drift_scores: Dict[str, Dict[str, Dict[str, float]]]) -> Dict[str, Any]:
        """Get summary statistics from drift analysis results"""
        
        all_drift_scores = []
        all_self_similarities = []
        all_peer_similarities = []
        all_canonical_similarities = []
        
        domain_count = 0
        model_count = set()
        prompt_type_count = set()
        
        for domain in drift_scores:
            domain_count += 1
            for model_name in drift_scores[domain]:
                model_count.add(model_name)
                for prompt_type in drift_scores[domain][model_name]:
                    prompt_type_count.add(prompt_type)
                    scores = drift_scores[domain][model_name][prompt_type]
                    
                    all_drift_scores.append(scores['drift_score'])
                    all_self_similarities.append(scores['self_similarity'])
                    all_peer_similarities.append(scores['peer_similarity'])
                    all_canonical_similarities.append(scores['canonical_similarity'])
        
        return {
            'total_combinations': len(all_drift_scores),
            'domains': domain_count,
            'models': len(model_count),
            'prompt_types': len(prompt_type_count),
            'drift_score_stats': {
                'mean': float(np.mean(all_drift_scores)) if all_drift_scores else 0,
                'std': float(np.std(all_drift_scores)) if all_drift_scores else 0,
                'min': float(np.min(all_drift_scores)) if all_drift_scores else 0,
                'max': float(np.max(all_drift_scores)) if all_drift_scores else 0
            },
            'self_similarity_stats': {
                'mean': float(np.mean(all_self_similarities)) if all_self_similarities else 0,
                'std': float(np.std(all_self_similarities)) if all_self_similarities else 0
            },
            'peer_similarity_stats': {
                'mean': float(np.mean(all_peer_similarities)) if all_peer_similarities else 0,
                'std': float(np.std(all_peer_similarities)) if all_peer_similarities else 0
            },
            'canonical_similarity_stats': {
                'mean': float(np.mean(all_canonical_similarities)) if all_canonical_similarities else 0,
                'std': float(np.std(all_canonical_similarities)) if all_canonical_similarities else 0
            }
        } 