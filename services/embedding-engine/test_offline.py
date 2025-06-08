#!/usr/bin/env python3

import os
import sys
import numpy as np
from typing import List, Dict, Any
import tempfile
import shutil

# Add the current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.embeddings import EmbeddingGenerator
from analysis.similarity import SimilarityAnalyzer
from analysis.drift import DriftDetector

class EmbeddingEngineTest:
    def __init__(self):
        """Initialize test suite"""
        self.test_results = []
        self.temp_cache_dir = None
        
        # Create temporary cache directory for testing
        self.temp_cache_dir = tempfile.mkdtemp()
        
        print("🧪 Embedding Engine Offline Test Suite")
        print("=====================================")
        print("Testing all components with synthetic data\n")
    
    def cleanup(self):
        """Clean up temporary files"""
        if self.temp_cache_dir and os.path.exists(self.temp_cache_dir):
            shutil.rmtree(self.temp_cache_dir)
    
    def create_synthetic_responses(self) -> List[Dict[str, Any]]:
        """Create synthetic response data for testing"""
        responses = []
        
        # Test data: 3 domains, 5 models, 3 prompt types
        domains = ["climate_science", "quantum_physics", "machine_learning"]
        models = ["gpt-4", "claude-3", "gemini-pro", "llama-2", "mistral-7b"]
        prompt_types = ["summary", "explanation", "analysis"]
        
        response_id = 1
        
        for domain in domains:
            for model in models:
                for prompt_type in prompt_types:
                    # Create 2-3 responses per combination for consistency testing
                    num_responses = 2 if model == "gpt-4" else 3
                    
                    for i in range(num_responses):
                        response_text = self._generate_response_text(domain, model, prompt_type, i)
                        
                        responses.append({
                            'id': response_id,
                            'domain': domain,
                            'model_name': model,
                            'prompt_type': prompt_type,
                            'response_text': response_text,
                            'created_at': f"2024-06-{7 + i:02d}T10:00:00Z"
                        })
                        response_id += 1
        
        return responses
    
    def _generate_response_text(self, domain: str, model: str, prompt_type: str, variation: int) -> str:
        """Generate realistic response text for testing"""
        
        base_responses = {
            "climate_science": {
                "summary": "Climate change refers to long-term shifts in global temperatures and weather patterns.",
                "explanation": "The greenhouse effect occurs when certain gases in Earth's atmosphere trap heat from the sun.",
                "analysis": "Current climate models predict a 1.5-2°C temperature increase by 2050 under current emission trajectories."
            },
            "quantum_physics": {
                "summary": "Quantum mechanics describes the behavior of matter and energy at the atomic and subatomic scale.",
                "explanation": "Quantum entanglement is a phenomenon where particles become interconnected regardless of distance.",
                "analysis": "The uncertainty principle states that position and momentum cannot be simultaneously measured with perfect accuracy."
            },
            "machine_learning": {
                "summary": "Machine learning is a subset of AI that enables systems to learn from data without explicit programming.",
                "explanation": "Neural networks are computing systems inspired by biological neural networks in animal brains.",
                "analysis": "Deep learning models have achieved human-level performance in tasks like image recognition and natural language processing."
            }
        }
        
        base_text = base_responses[domain][prompt_type]
        
        # Add model-specific variations and small random changes
        model_variations = {
            "gpt-4": " This represents a significant advancement in our understanding.",
            "claude-3": " These findings have important implications for the field.",
            "gemini-pro": " Research continues to evolve in this area.",
            "llama-2": " Scientists are actively investigating these phenomena.",
            "mistral-7b": " Further study is needed to fully understand these concepts."
        }
        
        variation_texts = [
            " Additionally, recent research has provided new insights.",
            " Multiple studies have confirmed these observations.",
            " The scientific community continues to build on these foundations."
        ]
        
        result = base_text + model_variations.get(model, "")
        if variation < len(variation_texts):
            result += variation_texts[variation]
        
        return result
    
    def test_embedding_generation(self) -> bool:
        """Test embedding generation functionality"""
        print("🧠 Testing Embedding Generation...")
        
        try:
            # Use temp cache directory
            generator = EmbeddingGenerator()
            generator.cache_dir = self.temp_cache_dir
            generator._ensure_cache_dir()
            
            # Test single embedding
            test_text = "This is a test sentence for embedding generation."
            embedding = generator.generate_embedding(test_text)
            
            # Validate embedding properties
            assert isinstance(embedding, np.ndarray), "Embedding should be numpy array"
            assert len(embedding.shape) == 1, "Embedding should be 1D array"
            assert embedding.shape[0] > 0, "Embedding should have positive dimensions"
            assert abs(np.linalg.norm(embedding) - 1.0) < 0.001, "Embedding should be normalized"
            
            # Test batch generation
            test_texts = [
                "First test sentence.",
                "Second test sentence.",
                "Third test sentence."
            ]
            
            embeddings = generator.generate_embeddings_batch(test_texts)
            assert len(embeddings) == len(test_texts), "Should return embedding for each text"
            
            # Test caching
            cached_embedding = generator.generate_embedding(test_text)
            assert np.allclose(embedding, cached_embedding), "Cached embedding should match original"
            
            # Test cache stats
            cache_stats = generator.get_cache_stats()
            assert cache_stats['cached_embeddings'] > 0, "Should have cached embeddings"
            
            print("   ✓ Single embedding generation")
            print("   ✓ Batch embedding generation")
            print("   ✓ Embedding normalization")
            print("   ✓ Caching functionality")
            
            return True
            
        except Exception as e:
            print(f"   ✗ Error: {e}")
            return False
    
    def test_similarity_analysis(self) -> bool:
        """Test similarity analysis functionality"""
        print("\n📏 Testing Similarity Analysis...")
        
        try:
            analyzer = SimilarityAnalyzer()
            
            # Create test embeddings
            embedding1 = np.array([0.5, 0.5, 0.5, 0.5])
            embedding1 = embedding1 / np.linalg.norm(embedding1)
            
            embedding2 = np.array([0.6, 0.4, 0.5, 0.5])
            embedding2 = embedding2 / np.linalg.norm(embedding2)
            
            embedding3 = np.array([0.1, 0.1, 0.1, 0.9])
            embedding3 = embedding3 / np.linalg.norm(embedding3)
            
            # Test single similarity
            similarity = analyzer.cosine_similarity_single(embedding1, embedding2)
            assert 0 <= similarity <= 1, "Similarity should be between 0 and 1"
            
            # Test similarity matrix
            embeddings = [embedding1, embedding2, embedding3]
            similarity_matrix = analyzer.cosine_similarity_matrix(embeddings)
            
            assert similarity_matrix.shape == (3, 3), "Similarity matrix should be 3x3"
            assert np.allclose(np.diag(similarity_matrix), 1.0), "Diagonal should be 1.0"
            
            # Test that similar embeddings have higher similarity
            sim_12 = analyzer.cosine_similarity_single(embedding1, embedding2)
            sim_13 = analyzer.cosine_similarity_single(embedding1, embedding3)
            assert sim_12 > sim_13, "Similar embeddings should have higher similarity"
            
            print("   ✓ Single similarity calculation")
            print("   ✓ Similarity matrix calculation")
            print("   ✓ Similarity ordering")
            
            return True
            
        except Exception as e:
            print(f"   ✗ Error: {e}")
            return False
    
    def test_drift_detection(self) -> bool:
        """Test drift detection functionality"""
        print("\n📈 Testing Drift Detection...")
        
        try:
            detector = DriftDetector()
            
            # Create synthetic responses with embeddings
            responses = self.create_synthetic_responses()
            
            # Add embeddings to responses
            generator = EmbeddingGenerator()
            generator.cache_dir = self.temp_cache_dir
            generator._ensure_cache_dir()
            
            for response in responses:
                embedding = generator.generate_embedding(response['response_text'])
                response['embedding'] = embedding
            
            # Test drift score calculation
            drift_score = detector.calculate_drift_score(0.8, 0.7, 0.9)
            expected = 0.8 * 0.4 + 0.7 * 0.35 + 0.9 * 0.25
            assert abs(drift_score - expected) < 0.001, "Drift score calculation incorrect"
            
            # Test full processing
            results = detector.process_responses(responses)
            
            # Validate results structure
            assert isinstance(results, dict), "Results should be dictionary"
            assert len(results) > 0, "Should have results for domains"
            
            # Check that all required fields are present
            sample_domain = list(results.keys())[0]
            sample_model = list(results[sample_domain].keys())[0]
            sample_prompt = list(results[sample_domain][sample_model].keys())[0]
            sample_result = results[sample_domain][sample_model][sample_prompt]
            
            required_fields = ['self_similarity', 'peer_similarity', 'canonical_similarity', 'drift_score', 'response_count']
            for field in required_fields:
                assert field in sample_result, f"Missing field: {field}"
                if field != 'response_count':  # response_count is a count, not a 0-1 similarity
                    assert 0 <= sample_result[field] <= 1, f"Field {field} should be 0-1 range"
                else:
                    assert sample_result[field] > 0, "response_count should be positive"
            
            # Test summary statistics
            summary = detector.get_summary_stats(results)
            assert 'total_combinations' in summary
            assert 'drift_score_stats' in summary
            assert summary['total_combinations'] > 0
            
            # Test significant drift detection
            significant_drift = detector.detect_significant_drift(results, threshold=0.5)
            assert isinstance(significant_drift, list), "Should return list of drift cases"
            
            print("   ✓ Drift score calculation")
            print("   ✓ Full response processing")
            print("   ✓ Results structure validation")
            print("   ✓ Summary statistics")
            print("   ✓ Significant drift detection")
            
            return True
            
        except Exception as e:
            print(f"   ✗ Error: {e}")
            return False
    
    def test_integration(self) -> bool:
        """Test full integration workflow"""
        print("\n🔗 Testing Integration Workflow...")
        
        try:
            # Create full workflow simulation
            responses = self.create_synthetic_responses()
            
            # Step 1: Generate embeddings
            generator = EmbeddingGenerator()
            generator.cache_dir = self.temp_cache_dir
            generator._ensure_cache_dir()
            
            texts = [resp['response_text'] for resp in responses]
            embeddings = generator.generate_embeddings_batch(texts)
            
            for i, response in enumerate(responses):
                response['embedding'] = embeddings[i]
            
            # Step 2: Run drift analysis
            detector = DriftDetector()
            results = detector.process_responses(responses)
            
            # Step 3: Validate end-to-end results
            assert len(results) == 3, "Should have 3 domains"  # climate_science, quantum_physics, machine_learning
            
            total_combinations = 0
            for domain_results in results.values():
                for model_results in domain_results.values():
                    total_combinations += len(model_results)
            
            expected_combinations = 3 * 5 * 3  # 3 domains * 5 models * 3 prompt_types
            assert total_combinations == expected_combinations, f"Expected {expected_combinations} combinations, got {total_combinations}"
            
            # Validate drift scores are reasonable
            all_drift_scores = []
            for domain in results.values():
                for model in domain.values():
                    for prompt_result in model.values():
                        all_drift_scores.append(prompt_result['drift_score'])
            
            mean_drift = np.mean(all_drift_scores)
            assert 0.3 <= mean_drift <= 1.0, f"Mean drift score {mean_drift} seems unreasonable"
            
            print("   ✓ End-to-end workflow")
            print("   ✓ Correct number of combinations")
            print("   ✓ Reasonable drift scores")
            print(f"   ✓ Mean drift score: {mean_drift:.3f}")
            
            return True
            
        except Exception as e:
            print(f"   ✗ Error: {e}")
            return False
    
    def run_all_tests(self) -> bool:
        """Run all tests and return overall success"""
        tests = [
            ("Embedding Generation", self.test_embedding_generation),
            ("Similarity Analysis", self.test_similarity_analysis),
            ("Drift Detection", self.test_drift_detection),
            ("Integration", self.test_integration)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            try:
                success = test_func()
                self.test_results.append((test_name, success))
                if success:
                    passed += 1
            except Exception as e:
                print(f"❌ {test_name} test failed with exception: {e}")
                self.test_results.append((test_name, False))
        
        # Print summary
        print(f"\n{'='*50}")
        print(f"🧪 Test Results: {passed}/{total} passed")
        print(f"{'='*50}")
        
        for test_name, success in self.test_results:
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"{status} - {test_name}")
        
        if passed == total:
            print(f"\n🎉 All tests passed! Embedding Engine is ready for production.")
        else:
            print(f"\n⚠️  {total - passed} test(s) failed. Please review and fix issues.")
        
        return passed == total

def main():
    """Main test runner"""
    test_suite = EmbeddingEngineTest()
    
    try:
        success = test_suite.run_all_tests()
        exit_code = 0 if success else 1
    finally:
        test_suite.cleanup()
    
    sys.exit(exit_code)

if __name__ == "__main__":
    main() 