#!/usr/bin/env python3
"""
ADVANCED DRIFT DETECTOR - Ultra-Sophisticated Drift Analysis
- Multi-dimensional drift detection
- Statistical change point detection
- Machine learning drift indicators
- Real-time anomaly detection
- Temporal pattern analysis
"""

import numpy as np
import pandas as pd
from scipy import stats
from scipy.spatial.distance import jensen_shannon_distance, wasserstein_distance
from scipy.signal import find_peaks
from sklearn.decomposition import PCA
from sklearn.ensemble import IsolationForest
from sklearn.cluster import DBSCAN
import warnings
from typing import Dict, List, Tuple, Optional, Any, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import logging
import json
import matplotlib.pyplot as plt
import seaborn as sns
from collections import deque, defaultdict
import time

warnings.filterwarnings('ignore')
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class DriftConfig:
    """Advanced drift detection configuration"""
    window_size: int = 100
    min_samples: int = 30
    statistical_threshold: float = 0.05
    distance_threshold: float = 0.1
    anomaly_threshold: float = 0.1
    enable_visualization: bool = True
    enable_ml_detection: bool = True
    enable_temporal_analysis: bool = True
    sensitivity: str = "medium"  # low, medium, high
    
@dataclass
class DriftResult:
    """Drift detection result"""
    drift_detected: bool
    drift_type: str
    confidence: float
    p_value: float
    distance_metric: float
    timestamp: datetime
    affected_features: List[str]
    severity: str  # low, medium, high, critical
    recommendation: str

class StatisticalDriftDetector:
    """Statistical drift detection methods"""
    
    def __init__(self, config: DriftConfig):
        self.config = config
        
    def kolmogorov_smirnov_test(self, reference: np.ndarray, current: np.ndarray) -> Tuple[float, float]:
        """Kolmogorov-Smirnov test for distribution drift"""
        try:
            statistic, p_value = stats.ks_2samp(reference, current)
            return statistic, p_value
        except Exception as e:
            logger.error(f"KS test failed: {e}")
            return 0.0, 1.0
    
    def mann_whitney_test(self, reference: np.ndarray, current: np.ndarray) -> Tuple[float, float]:
        """Mann-Whitney U test for distribution shifts"""
        try:
            statistic, p_value = stats.mannwhitneyu(reference, current, alternative='two-sided')
            return statistic, p_value
        except Exception as e:
            logger.error(f"Mann-Whitney test failed: {e}")
            return 0.0, 1.0
    
    def chi_square_test(self, reference: np.ndarray, current: np.ndarray, bins: int = 10) -> Tuple[float, float]:
        """Chi-square test for categorical drift"""
        try:
            # Create histograms
            ref_hist, bin_edges = np.histogram(reference, bins=bins)
            cur_hist, _ = np.histogram(current, bins=bin_edges)
            
            # Avoid zero frequencies
            ref_hist = ref_hist + 1
            cur_hist = cur_hist + 1
            
            statistic, p_value = stats.chisquare(cur_hist, ref_hist)
            return statistic, p_value
        except Exception as e:
            logger.error(f"Chi-square test failed: {e}")
            return 0.0, 1.0
    
    def anderson_darling_test(self, reference: np.ndarray, current: np.ndarray) -> Tuple[float, float]:
        """Anderson-Darling test for normality drift"""
        try:
            # Combined sample
            combined = np.concatenate([reference, current])
            statistic, critical_values, significance_level = stats.anderson(combined)
            
            # Approximate p-value
            p_value = 1.0 if statistic < critical_values[0] else 0.01
            return statistic, p_value
        except Exception as e:
            logger.error(f"Anderson-Darling test failed: {e}")
            return 0.0, 1.0

class DistanceDriftDetector:
    """Distance-based drift detection methods"""
    
    def __init__(self, config: DriftConfig):
        self.config = config
    
    def jensen_shannon_divergence(self, reference: np.ndarray, current: np.ndarray, bins: int = 10) -> float:
        """Jensen-Shannon divergence between distributions"""
        try:
            # Create probability distributions
            ref_hist, bin_edges = np.histogram(reference, bins=bins, density=True)
            cur_hist, _ = np.histogram(current, bins=bin_edges, density=True)
            
            # Normalize
            ref_hist = ref_hist / np.sum(ref_hist) + 1e-10
            cur_hist = cur_hist / np.sum(cur_hist) + 1e-10
            
            return jensen_shannon_distance(ref_hist, cur_hist)
        except Exception as e:
            logger.error(f"JS divergence failed: {e}")
            return 0.0
    
    def wasserstein_distance_metric(self, reference: np.ndarray, current: np.ndarray) -> float:
        """Wasserstein (Earth Mover's) distance"""
        try:
            return wasserstein_distance(reference, current)
        except Exception as e:
            logger.error(f"Wasserstein distance failed: {e}")
            return 0.0
    
    def hellinger_distance(self, reference: np.ndarray, current: np.ndarray, bins: int = 10) -> float:
        """Hellinger distance between distributions"""
        try:
            ref_hist, bin_edges = np.histogram(reference, bins=bins, density=True)
            cur_hist, _ = np.histogram(current, bins=bin_edges, density=True)
            
            # Normalize
            ref_hist = ref_hist / np.sum(ref_hist) + 1e-10
            cur_hist = cur_hist / np.sum(cur_hist) + 1e-10
            
            return np.sqrt(0.5 * np.sum((np.sqrt(ref_hist) - np.sqrt(cur_hist)) ** 2))
        except Exception as e:
            logger.error(f"Hellinger distance failed: {e}")
            return 0.0
    
    def bhattacharyya_distance(self, reference: np.ndarray, current: np.ndarray, bins: int = 10) -> float:
        """Bhattacharyya distance between distributions"""
        try:
            ref_hist, bin_edges = np.histogram(reference, bins=bins, density=True)
            cur_hist, _ = np.histogram(current, bins=bin_edges, density=True)
            
            # Normalize
            ref_hist = ref_hist / np.sum(ref_hist) + 1e-10
            cur_hist = cur_hist / np.sum(cur_hist) + 1e-10
            
            bc_coeff = np.sum(np.sqrt(ref_hist * cur_hist))
            return -np.log(bc_coeff + 1e-10)
        except Exception as e:
            logger.error(f"Bhattacharyya distance failed: {e}")
            return 0.0

class MLDriftDetector:
    """Machine learning-based drift detection"""
    
    def __init__(self, config: DriftConfig):
        self.config = config
        self.isolation_forest = IsolationForest(contamination=config.anomaly_threshold, random_state=42)
        self.pca = PCA(n_components=0.95)  # Keep 95% variance
        self.dbscan = DBSCAN(eps=0.5, min_samples=5)
        self.is_fitted = False
    
    def fit_reference(self, reference_data: np.ndarray):
        """Fit models on reference data"""
        try:
            if reference_data.ndim == 1:
                reference_data = reference_data.reshape(-1, 1)
            
            # Fit isolation forest
            self.isolation_forest.fit(reference_data)
            
            # Fit PCA if multidimensional
            if reference_data.shape[1] > 1:
                self.pca.fit(reference_data)
            
            self.is_fitted = True
            logger.info("ML drift detector fitted on reference data")
            
        except Exception as e:
            logger.error(f"ML fitting failed: {e}")
    
    def detect_anomalies(self, current_data: np.ndarray) -> Tuple[np.ndarray, float]:
        """Detect anomalies using isolation forest"""
        try:
            if not self.is_fitted:
                return np.array([]), 0.0
            
            if current_data.ndim == 1:
                current_data = current_data.reshape(-1, 1)
            
            # Predict anomalies (-1 for anomaly, 1 for normal)
            predictions = self.isolation_forest.predict(current_data)
            anomaly_ratio = np.sum(predictions == -1) / len(predictions)
            
            return predictions, anomaly_ratio
            
        except Exception as e:
            logger.error(f"Anomaly detection failed: {e}")
            return np.array([]), 0.0
    
    def detect_dimensional_drift(self, reference_data: np.ndarray, current_data: np.ndarray) -> float:
        """Detect drift in high-dimensional space using PCA"""
        try:
            if reference_data.shape[1] == 1:
                return 0.0  # Skip for 1D data
            
            # Transform data
            ref_transformed = self.pca.transform(reference_data)
            cur_transformed = self.pca.transform(current_data)
            
            # Compare distributions in PCA space
            ref_mean = np.mean(ref_transformed, axis=0)
            cur_mean = np.mean(cur_transformed, axis=0)
            
            # Euclidean distance between means
            drift_distance = np.linalg.norm(ref_mean - cur_mean)
            
            return drift_distance
            
        except Exception as e:
            logger.error(f"Dimensional drift detection failed: {e}")
            return 0.0
    
    def detect_clustering_drift(self, reference_data: np.ndarray, current_data: np.ndarray) -> float:
        """Detect drift using clustering analysis"""
        try:
            if reference_data.ndim == 1:
                reference_data = reference_data.reshape(-1, 1)
            if current_data.ndim == 1:
                current_data = current_data.reshape(-1, 1)
            
            # Cluster reference data
            ref_clusters = self.dbscan.fit_predict(reference_data)
            ref_n_clusters = len(set(ref_clusters)) - (1 if -1 in ref_clusters else 0)
            
            # Cluster current data
            cur_clusters = self.dbscan.fit_predict(current_data)
            cur_n_clusters = len(set(cur_clusters)) - (1 if -1 in cur_clusters else 0)
            
            # Compare cluster structures
            cluster_diff = abs(ref_n_clusters - cur_n_clusters) / max(ref_n_clusters, 1)
            
            return cluster_diff
            
        except Exception as e:
            logger.error(f"Clustering drift detection failed: {e}")
            return 0.0

class TemporalDriftDetector:
    """Temporal pattern drift detection"""
    
    def __init__(self, config: DriftConfig):
        self.config = config
        self.temporal_window = deque(maxlen=config.window_size)
        self.trend_history = deque(maxlen=100)
    
    def detect_trend_changes(self, data: np.ndarray, timestamps: np.ndarray = None) -> Tuple[bool, float]:
        """Detect changes in temporal trends"""
        try:
            if len(data) < self.config.min_samples:
                return False, 0.0
            
            # Create time series if timestamps not provided
            if timestamps is None:
                timestamps = np.arange(len(data))
            
            # Calculate moving averages
            window = min(10, len(data) // 3)
            if window < 2:
                return False, 0.0
            
            moving_avg = pd.Series(data).rolling(window=window).mean().dropna()
            
            # Calculate trend (slope)
            x = np.arange(len(moving_avg))
            slope, _, r_value, p_value, _ = stats.linregress(x, moving_avg)
            
            # Store trend
            self.trend_history.append(slope)
            
            # Detect trend change
            if len(self.trend_history) >= 10:
                recent_trends = list(self.trend_history)[-10:]
                trend_change = np.std(recent_trends) > 0.1  # Threshold for trend volatility
                
                return trend_change, abs(r_value)
            
            return False, 0.0
            
        except Exception as e:
            logger.error(f"Trend change detection failed: {e}")
            return False, 0.0
    
    def detect_seasonality_drift(self, data: np.ndarray, period: int = 24) -> float:
        """Detect changes in seasonal patterns"""
        try:
            if len(data) < period * 2:
                return 0.0
            
            # Split into seasons
            n_seasons = len(data) // period
            seasons = []
            
            for i in range(n_seasons):
                season = data[i*period:(i+1)*period]
                if len(season) == period:
                    seasons.append(season)
            
            if len(seasons) < 2:
                return 0.0
            
            # Compare first and last seasons
            first_season = seasons[0]
            last_season = seasons[-1]
            
            # Calculate correlation
            correlation = np.corrcoef(first_season, last_season)[0, 1]
            seasonality_drift = 1 - abs(correlation)
            
            return seasonality_drift
            
        except Exception as e:
            logger.error(f"Seasonality drift detection failed: {e}")
            return 0.0
    
    def detect_volatility_drift(self, data: np.ndarray, window: int = 20) -> float:
        """Detect changes in data volatility"""
        try:
            if len(data) < window * 2:
                return 0.0
            
            # Calculate rolling volatility
            volatilities = []
            for i in range(window, len(data)):
                segment = data[i-window:i]
                volatility = np.std(segment)
                volatilities.append(volatility)
            
            if len(volatilities) < 2:
                return 0.0
            
            # Compare early and late volatilities
            early_vol = np.mean(volatilities[:len(volatilities)//3])
            late_vol = np.mean(volatilities[-len(volatilities)//3:])
            
            volatility_drift = abs(late_vol - early_vol) / max(early_vol, 1e-8)
            
            return volatility_drift
            
        except Exception as e:
            logger.error(f"Volatility drift detection failed: {e}")
            return 0.0

class AdvancedDriftDetector:
    """Comprehensive advanced drift detection system"""
    
    def __init__(self, config: DriftConfig = None):
        self.config = config or DriftConfig()
        self.statistical_detector = StatisticalDriftDetector(self.config)
        self.distance_detector = DistanceDriftDetector(self.config)
        self.ml_detector = MLDriftDetector(self.config) if self.config.enable_ml_detection else None
        self.temporal_detector = TemporalDriftDetector(self.config) if self.config.enable_temporal_analysis else None
        
        self.reference_data: Optional[np.ndarray] = None
        self.drift_history: List[DriftResult] = []
        self.feature_importance: Dict[str, float] = {}
        
        logger.info("AdvancedDriftDetector initialized")
    
    def set_reference(self, reference_data: np.ndarray, feature_names: List[str] = None):
        """Set reference data for drift detection"""
        try:
            self.reference_data = reference_data
            
            if self.ml_detector:
                self.ml_detector.fit_reference(reference_data)
            
            if feature_names:
                self.feature_names = feature_names
            else:
                self.feature_names = [f"feature_{i}" for i in range(reference_data.shape[1] if reference_data.ndim > 1 else 1)]
            
            logger.info(f"Reference data set: {reference_data.shape}")
            
        except Exception as e:
            logger.error(f"Setting reference data failed: {e}")
    
    def detect_drift(self, current_data: np.ndarray, timestamps: np.ndarray = None) -> DriftResult:
        """Comprehensive drift detection"""
        if self.reference_data is None:
            logger.warning("Reference data not set")
            return DriftResult(
                drift_detected=False,
                drift_type="no_reference",
                confidence=0.0,
                p_value=1.0,
                distance_metric=0.0,
                timestamp=datetime.now(),
                affected_features=[],
                severity="low",
                recommendation="Set reference data first"
            )
        
        try:
            # Statistical tests
            ks_stat, ks_p = self.statistical_detector.kolmogorov_smirnov_test(
                self.reference_data.flatten(), current_data.flatten()
            )
            
            mw_stat, mw_p = self.statistical_detector.mann_whitney_test(
                self.reference_data.flatten(), current_data.flatten()
            )
            
            chi2_stat, chi2_p = self.statistical_detector.chi_square_test(
                self.reference_data.flatten(), current_data.flatten()
            )
            
            # Distance metrics
            js_distance = self.distance_detector.jensen_shannon_divergence(
                self.reference_data.flatten(), current_data.flatten()
            )
            
            wasserstein_dist = self.distance_detector.wasserstein_distance_metric(
                self.reference_data.flatten(), current_data.flatten()
            )
            
            hellinger_dist = self.distance_detector.hellinger_distance(
                self.reference_data.flatten(), current_data.flatten()
            )
            
            # ML-based detection
            anomaly_ratio = 0.0
            dimensional_drift = 0.0
            clustering_drift = 0.0
            
            if self.ml_detector:
                _, anomaly_ratio = self.ml_detector.detect_anomalies(current_data)
                
                if self.reference_data.ndim > 1 and current_data.ndim > 1:
                    dimensional_drift = self.ml_detector.detect_dimensional_drift(
                        self.reference_data, current_data
                    )
                    clustering_drift = self.ml_detector.detect_clustering_drift(
                        self.reference_data, current_data
                    )
            
            # Temporal analysis
            trend_drift = False
            seasonality_drift = 0.0
            volatility_drift = 0.0
            
            if self.temporal_detector and timestamps is not None:
                trend_drift, _ = self.temporal_detector.detect_trend_changes(
                    current_data.flatten(), timestamps
                )
                seasonality_drift = self.temporal_detector.detect_seasonality_drift(
                    current_data.flatten()
                )
                volatility_drift = self.temporal_detector.detect_volatility_drift(
                    current_data.flatten()
                )
            
            # Aggregate results
            p_values = [ks_p, mw_p, chi2_p]
            min_p_value = min(p_values)
            
            distance_metrics = [js_distance, wasserstein_dist, hellinger_dist]
            max_distance = max(distance_metrics)
            
            # Determine drift
            statistical_drift = min_p_value < self.config.statistical_threshold
            distance_drift = max_distance > self.config.distance_threshold
            ml_drift = anomaly_ratio > self.config.anomaly_threshold
            temporal_drift = trend_drift or seasonality_drift > 0.5 or volatility_drift > 1.0
            
            drift_detected = statistical_drift or distance_drift or ml_drift or temporal_drift
            
            # Calculate confidence
            confidence_factors = []
            if statistical_drift:
                confidence_factors.append(1 - min_p_value)
            if distance_drift:
                confidence_factors.append(min(max_distance / self.config.distance_threshold, 1.0))
            if ml_drift:
                confidence_factors.append(min(anomaly_ratio / self.config.anomaly_threshold, 1.0))
            
            confidence = np.mean(confidence_factors) if confidence_factors else 0.0
            
            # Determine drift type
            drift_types = []
            if statistical_drift:
                drift_types.append("statistical")
            if distance_drift:
                drift_types.append("distributional")
            if ml_drift:
                drift_types.append("anomaly")
            if temporal_drift:
                drift_types.append("temporal")
            
            drift_type = "+".join(drift_types) if drift_types else "none"
            
            # Determine severity
            if confidence > 0.8:
                severity = "critical"
            elif confidence > 0.6:
                severity = "high"
            elif confidence > 0.3:
                severity = "medium"
            else:
                severity = "low"
            
            # Generate recommendation
            recommendation = self._generate_recommendation(
                drift_type, severity, confidence, min_p_value, max_distance
            )
            
            result = DriftResult(
                drift_detected=drift_detected,
                drift_type=drift_type,
                confidence=confidence,
                p_value=min_p_value,
                distance_metric=max_distance,
                timestamp=datetime.now(),
                affected_features=self.feature_names,
                severity=severity,
                recommendation=recommendation
            )
            
            self.drift_history.append(result)
            
            return result
            
        except Exception as e:
            logger.error(f"Drift detection failed: {e}")
            return DriftResult(
                drift_detected=False,
                drift_type="error",
                confidence=0.0,
                p_value=1.0,
                distance_metric=0.0,
                timestamp=datetime.now(),
                affected_features=[],
                severity="low",
                recommendation=f"Error in drift detection: {str(e)}"
            )
    
    def _generate_recommendation(self, drift_type: str, severity: str, confidence: float, 
                               p_value: float, distance: float) -> str:
        """Generate actionable recommendations"""
        recommendations = []
        
        if "statistical" in drift_type:
            recommendations.append("Consider retraining models with recent data")
        
        if "distributional" in drift_type:
            recommendations.append("Review data preprocessing and feature engineering")
        
        if "anomaly" in drift_type:
            recommendations.append("Investigate data quality and outlier detection")
        
        if "temporal" in drift_type:
            recommendations.append("Analyze temporal patterns and seasonality adjustments")
        
        if severity in ["critical", "high"]:
            recommendations.append("Immediate intervention recommended")
        
        if confidence > 0.7:
            recommendations.append("High confidence detection - action strongly recommended")
        
        return "; ".join(recommendations) if recommendations else "Continue monitoring"
    
    def get_drift_summary(self) -> Dict[str, Any]:
        """Get comprehensive drift detection summary"""
        if not self.drift_history:
            return {}
        
        recent_results = self.drift_history[-10:]  # Last 10 results
        
        summary = {
            'total_detections': len(self.drift_history),
            'recent_drift_rate': sum(r.drift_detected for r in recent_results) / len(recent_results),
            'average_confidence': np.mean([r.confidence for r in recent_results]),
            'severity_distribution': {
                severity: sum(1 for r in recent_results if r.severity == severity)
                for severity in ['low', 'medium', 'high', 'critical']
            },
            'drift_types': {
                dtype: sum(1 for r in recent_results if dtype in r.drift_type)
                for dtype in ['statistical', 'distributional', 'anomaly', 'temporal']
            },
            'last_detection': self.drift_history[-1].timestamp.isoformat() if self.drift_history else None
        }
        
        return summary
    
    def export_drift_analysis(self, filename: str = None) -> str:
        """Export comprehensive drift analysis"""
        if not filename:
            filename = f"drift_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        analysis = {
            'metadata': {
                'timestamp': datetime.now().isoformat(),
                'config': self.config.__dict__,
                'reference_shape': self.reference_data.shape if self.reference_data is not None else None,
                'feature_names': self.feature_names if hasattr(self, 'feature_names') else []
            },
            'summary': self.get_drift_summary(),
            'history': [
                {
                    'timestamp': r.timestamp.isoformat(),
                    'drift_detected': r.drift_detected,
                    'drift_type': r.drift_type,
                    'confidence': r.confidence,
                    'p_value': r.p_value,
                    'distance_metric': r.distance_metric,
                    'severity': r.severity,
                    'recommendation': r.recommendation
                }
                for r in self.drift_history
            ]
        }
        
        with open(filename, 'w') as f:
            json.dump(analysis, f, indent=2, default=str)
        
        logger.info(f"Drift analysis exported to {filename}")
        return filename

# Example usage
if __name__ == "__main__":
    # Initialize drift detector
    config = DriftConfig(
        window_size=100,
        statistical_threshold=0.05,
        distance_threshold=0.1,
        enable_ml_detection=True,
        enable_temporal_analysis=True
    )
    
    detector = AdvancedDriftDetector(config)
    
    # Generate sample data
    np.random.seed(42)
    reference_data = np.random.normal(0, 1, (1000, 5))
    
    # Set reference
    detector.set_reference(reference_data, [f"feature_{i}" for i in range(5)])
    
    # Simulate drift
    drifted_data = np.random.normal(0.5, 1.2, (500, 5))  # Mean and variance drift
    
    # Detect drift
    result = detector.detect_drift(drifted_data)
    
    print(f"Drift detected: {result.drift_detected}")
    print(f"Drift type: {result.drift_type}")
    print(f"Confidence: {result.confidence:.3f}")
    print(f"Severity: {result.severity}")
    print(f"Recommendation: {result.recommendation}")
    
    # Export analysis
    analysis_file = detector.export_drift_analysis()
    print(f"Analysis exported to: {analysis_file}")