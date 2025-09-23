# Metrics module - import existing analysis modules
import sys
import os

# Add services path for existing modules
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(project_root, "services", "embedding-engine"))

try:
    from analysis.similarity import SimilarityAnalyzer
    from analysis.drift import DriftDetector
except ImportError:
    # Fallback if modules not available
    SimilarityAnalyzer = None
    DriftDetector = None
    print("[Metrics] Warning: Similarity/Drift modules not available")

__all__ = ["SimilarityAnalyzer", "DriftDetector"]