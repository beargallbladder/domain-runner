#!/usr/bin/env python3
"""
MII (Memory Integrity Index) Calculator
The system's compass for quality decisions using tensor-based calculations.
"""

import json
import numpy as np
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)

@dataclass
class MIIComponent:
    """Component contributing to MII score"""
    name: str
    weight: float  # 0.0 to 1.0
    value: float   # 0.0 to 1.0
    confidence: float  # 0.0 to 1.0

@dataclass
class MIIDimension:
    """Dimension of MII calculation"""
    dimension: str  # coverage, quality, consistency, reliability
    score: float  # 0.0 to 100.0
    components: List[MIIComponent]
    trend: str  # improving, stable, degrading

class MIICalculator:
    """
    Calculates Memory Integrity Index using multi-dimensional tensor operations.
    MII serves as the north star metric for system health and quality.
    """

    def __init__(self):
        self.dimensions = ['coverage', 'quality', 'consistency', 'reliability']
        self.history: List[Dict] = []
        self.tensor_cache: Dict[str, np.ndarray] = {}

    def calculate(
        self,
        run_stats: Dict,
        portfolio_metrics: Optional[Dict] = None,
        drift_signals: Optional[List[float]] = None,
        contract_scores: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Calculate MII using tensor operations across multiple dimensions.

        Args:
            run_stats: Run manifest statistics
            portfolio_metrics: Model portfolio performance
            drift_signals: Time series of drift detection
            contract_scores: Contract validation scores

        Returns:
            MII calculation with score, dimensions, and recommendations
        """
        logger.info("Calculating Memory Integrity Index...")

        # Build dimension tensors
        dimensions = []

        # 1. Coverage Dimension
        coverage_dim = self._calculate_coverage_dimension(run_stats)
        dimensions.append(coverage_dim)

        # 2. Quality Dimension
        quality_dim = self._calculate_quality_dimension(
            run_stats,
            portfolio_metrics or {}
        )
        dimensions.append(quality_dim)

        # 3. Consistency Dimension
        consistency_dim = self._calculate_consistency_dimension(
            drift_signals or [],
            contract_scores or {}
        )
        dimensions.append(consistency_dim)

        # 4. Reliability Dimension
        reliability_dim = self._calculate_reliability_dimension(
            run_stats,
            portfolio_metrics or {}
        )
        dimensions.append(reliability_dim)

        # Calculate composite MII using tensor operations
        mii_score = self._compute_composite_mii(dimensions)

        # Determine health status
        health_status = self._determine_health_status(mii_score)

        # Generate insights
        insights = self._generate_insights(dimensions, mii_score)

        # Calculate trend
        trend = self._calculate_trend(mii_score)

        result = {
            'mii_score': mii_score,
            'health_status': health_status,
            'dimensions': [asdict(d) for d in dimensions],
            'trend': trend,
            'insights': insights,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'tensor_shape': self._get_tensor_shape(),
            'recommendations': self._generate_recommendations(dimensions, mii_score)
        }

        # Store in history
        self.history.append(result)

        return result

    def _calculate_coverage_dimension(self, run_stats: Dict) -> MIIDimension:
        """Calculate coverage dimension of MII"""
        components = []

        # Actual coverage vs target
        actual_coverage = run_stats.get('actual_coverage', 0.0)
        target_coverage = run_stats.get('target_coverage', 0.95)

        coverage_ratio = min(1.0, actual_coverage / target_coverage)
        components.append(MIIComponent(
            name='coverage_ratio',
            weight=0.5,
            value=coverage_ratio,
            confidence=0.95
        ))

        # Tier health
        tier = run_stats.get('tier', 'Invalid')
        tier_value = {'Healthy': 1.0, 'Degraded': 0.7, 'Invalid': 0.3}.get(tier, 0.3)
        components.append(MIIComponent(
            name='tier_health',
            weight=0.3,
            value=tier_value,
            confidence=1.0
        ))

        # Completion rate
        total_expected = run_stats.get('total_expected', 0)
        total_observed = run_stats.get('total_observed', 0)
        completion_rate = total_observed / total_expected if total_expected > 0 else 0
        components.append(MIIComponent(
            name='completion_rate',
            weight=0.2,
            value=completion_rate,
            confidence=0.9
        ))

        # Calculate dimension score
        score = sum(c.weight * c.value * c.confidence for c in components) * 100

        # Determine trend
        if score >= 90:
            trend = 'improving'
        elif score >= 70:
            trend = 'stable'
        else:
            trend = 'degrading'

        return MIIDimension(
            dimension='coverage',
            score=round(score, 1),
            components=components,
            trend=trend
        )

    def _calculate_quality_dimension(
        self,
        run_stats: Dict,
        portfolio_metrics: Dict
    ) -> MIIDimension:
        """Calculate quality dimension of MII"""
        components = []

        # Model performance score
        perf_score = portfolio_metrics.get('avg_performance_score', 50.0) / 100
        components.append(MIIComponent(
            name='model_performance',
            weight=0.4,
            value=perf_score,
            confidence=0.85
        ))

        # Response quality (based on errors)
        error_rate = run_stats.get('error_rate', 0.0)
        quality_value = 1.0 - min(1.0, error_rate)
        components.append(MIIComponent(
            name='response_quality',
            weight=0.3,
            value=quality_value,
            confidence=0.9
        ))

        # Latency performance
        avg_latency = run_stats.get('avg_latency_ms', 1000)
        latency_score = 1.0 if avg_latency < 500 else (2000 - avg_latency) / 1500
        latency_score = max(0.0, min(1.0, latency_score))
        components.append(MIIComponent(
            name='latency_performance',
            weight=0.3,
            value=latency_score,
            confidence=0.95
        ))

        # Calculate dimension score
        score = sum(c.weight * c.value * c.confidence for c in components) * 100

        trend = 'stable' if 70 <= score <= 90 else ('improving' if score > 90 else 'degrading')

        return MIIDimension(
            dimension='quality',
            score=round(score, 1),
            components=components,
            trend=trend
        )

    def _calculate_consistency_dimension(
        self,
        drift_signals: List[float],
        contract_scores: Dict
    ) -> MIIDimension:
        """Calculate consistency dimension of MII"""
        components = []

        # Drift stability
        if drift_signals:
            drift_variance = np.var(drift_signals) if len(drift_signals) > 1 else 0.0
            drift_stability = 1.0 - min(1.0, drift_variance)
        else:
            drift_stability = 0.8  # Default if no signals

        components.append(MIIComponent(
            name='drift_stability',
            weight=0.4,
            value=drift_stability,
            confidence=0.8
        ))

        # Contract compliance
        if contract_scores:
            avg_compliance = np.mean(list(contract_scores.values()))
        else:
            avg_compliance = 0.7  # Default

        components.append(MIIComponent(
            name='contract_compliance',
            weight=0.35,
            value=avg_compliance,
            confidence=0.9
        ))

        # Temporal consistency (simulated)
        temporal_consistency = 0.85  # Would be calculated from time series
        components.append(MIIComponent(
            name='temporal_consistency',
            weight=0.25,
            value=temporal_consistency,
            confidence=0.75
        ))

        # Calculate dimension score
        score = sum(c.weight * c.value * c.confidence for c in components) * 100

        trend = 'stable' if drift_stability > 0.8 else 'degrading'

        return MIIDimension(
            dimension='consistency',
            score=round(score, 1),
            components=components,
            trend=trend
        )

    def _calculate_reliability_dimension(
        self,
        run_stats: Dict,
        portfolio_metrics: Dict
    ) -> MIIDimension:
        """Calculate reliability dimension of MII"""
        components = []

        # System uptime (simulated)
        uptime = 0.99  # Would come from monitoring
        components.append(MIIComponent(
            name='system_uptime',
            weight=0.3,
            value=uptime,
            confidence=1.0
        ))

        # Model reliability
        model_reliability = portfolio_metrics.get('avg_reliability', 0.8)
        components.append(MIIComponent(
            name='model_reliability',
            weight=0.35,
            value=model_reliability,
            confidence=0.9
        ))

        # Recovery capability
        checkpoint_success = run_stats.get('checkpoint_success', True)
        recovery_score = 1.0 if checkpoint_success else 0.5
        components.append(MIIComponent(
            name='recovery_capability',
            weight=0.35,
            value=recovery_score,
            confidence=0.95
        ))

        # Calculate dimension score
        score = sum(c.weight * c.value * c.confidence for c in components) * 100

        trend = 'improving' if score > 85 else ('stable' if score > 70 else 'degrading')

        return MIIDimension(
            dimension='reliability',
            score=round(score, 1),
            components=components,
            trend=trend
        )

    def _compute_composite_mii(self, dimensions: List[MIIDimension]) -> float:
        """
        Compute composite MII using tensor operations.
        This is where the "tensor magic" happens.
        """
        # Create dimension tensor
        dim_scores = np.array([d.score for d in dimensions])

        # Create weight tensor (could be learned/adjusted)
        weights = np.array([0.3, 0.25, 0.25, 0.2])  # coverage, quality, consistency, reliability

        # Apply non-linear transformation (sigmoid-like)
        transformed = np.tanh(dim_scores / 100) * 100

        # Calculate weighted geometric mean (better for composite scores)
        weighted_scores = transformed * weights
        geometric_mean = np.exp(np.sum(np.log(weighted_scores + 1)) / np.sum(weights)) - 1

        # Apply confidence adjustment
        confidence_factor = np.mean([
            np.mean([c.confidence for c in d.components])
            for d in dimensions
        ])

        # Final MII score
        mii = geometric_mean * confidence_factor

        # Store tensor for analysis
        self.tensor_cache['latest'] = np.stack([
            dim_scores,
            weights * 100,
            transformed,
            weighted_scores
        ])

        return round(float(mii), 1)

    def _determine_health_status(self, mii_score: float) -> str:
        """Determine system health based on MII"""
        if mii_score >= 85:
            return 'Excellent'
        elif mii_score >= 70:
            return 'Good'
        elif mii_score >= 55:
            return 'Fair'
        elif mii_score >= 40:
            return 'Poor'
        else:
            return 'Critical'

    def _generate_insights(self, dimensions: List[MIIDimension], mii_score: float) -> List[str]:
        """Generate actionable insights from MII analysis"""
        insights = []

        # Find weakest dimension
        weakest = min(dimensions, key=lambda d: d.score)
        if weakest.score < 70:
            insights.append(f"⚠️ {weakest.dimension.capitalize()} needs attention (score: {weakest.score})")

        # Find degrading dimensions
        degrading = [d for d in dimensions if d.trend == 'degrading']
        if degrading:
            insights.append(f"📉 {len(degrading)} dimension(s) showing degradation")

        # Check for imbalance
        scores = [d.score for d in dimensions]
        if max(scores) - min(scores) > 30:
            insights.append("⚖️ Significant imbalance between dimensions")

        # Positive insights
        excellent = [d for d in dimensions if d.score >= 85]
        if excellent:
            insights.append(f"✨ {len(excellent)} dimension(s) performing excellently")

        # MII-specific insights
        if mii_score < 50:
            insights.append("🚨 URGENT: System health is critical, immediate action required")
        elif mii_score > 80:
            insights.append("🎯 System is performing at optimal levels")

        return insights

    def _calculate_trend(self, current_mii: float) -> str:
        """Calculate MII trend based on history"""
        if len(self.history) < 2:
            return 'stable'

        recent_scores = [h['mii_score'] for h in self.history[-5:]]
        recent_scores.append(current_mii)

        if len(recent_scores) < 2:
            return 'stable'

        # Calculate trend
        trend_slope = np.polyfit(range(len(recent_scores)), recent_scores, 1)[0]

        if trend_slope > 1.0:
            return 'improving'
        elif trend_slope < -1.0:
            return 'degrading'
        else:
            return 'stable'

    def _get_tensor_shape(self) -> Dict[str, Any]:
        """Get shape of tensor calculations"""
        if 'latest' in self.tensor_cache:
            tensor = self.tensor_cache['latest']
            return {
                'shape': list(tensor.shape),
                'dimensions': self.dimensions,
                'layers': 4
            }
        return {'shape': [4, 4], 'dimensions': self.dimensions, 'layers': 4}

    def _generate_recommendations(self, dimensions: List[MIIDimension], mii_score: float) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []

        # Coverage recommendations
        coverage_dim = next((d for d in dimensions if d.dimension == 'coverage'), None)
        if coverage_dim and coverage_dim.score < 70:
            recommendations.append("🎯 Increase model availability or add fallback models")

        # Quality recommendations
        quality_dim = next((d for d in dimensions if d.dimension == 'quality'), None)
        if quality_dim and quality_dim.score < 70:
            recommendations.append("⚡ Optimize model selection for better performance")

        # Consistency recommendations
        consistency_dim = next((d for d in dimensions if d.dimension == 'consistency'), None)
        if consistency_dim and consistency_dim.score < 70:
            recommendations.append("🔄 Implement stricter contract validation")

        # Reliability recommendations
        reliability_dim = next((d for d in dimensions if d.dimension == 'reliability'), None)
        if reliability_dim and reliability_dim.score < 70:
            recommendations.append("🛡️ Enhance fault tolerance and recovery mechanisms")

        # Overall recommendations
        if mii_score < 60:
            recommendations.insert(0, "🚨 CRITICAL: Consider emergency response plan")
        elif mii_score > 85:
            recommendations.append("✅ Maintain current configuration, monitor for changes")

        return recommendations[:5]  # Top 5 recommendations

    def visualize_tensor(self) -> str:
        """Create ASCII visualization of MII tensor"""
        if 'latest' not in self.tensor_cache:
            return "No tensor data available"

        tensor = self.tensor_cache['latest']
        viz = "MII Tensor Visualization\n"
        viz += "=" * 40 + "\n"

        labels = ['Dimension Scores', 'Weights', 'Transformed', 'Weighted']

        for i, row in enumerate(tensor):
            viz += f"{labels[i]:15s}: "
            for val in row:
                viz += f"{val:6.1f} "
            viz += "\n"

        return viz

def main():
    """Test MII Calculator"""
    calculator = MIICalculator()

    # Sample data
    run_stats = {
        'actual_coverage': 0.87,
        'target_coverage': 0.95,
        'tier': 'Degraded',
        'total_expected': 100,
        'total_observed': 87,
        'error_rate': 0.05,
        'avg_latency_ms': 750,
        'checkpoint_success': True
    }

    portfolio_metrics = {
        'avg_performance_score': 72.5,
        'avg_reliability': 0.85
    }

    drift_signals = [0.1, 0.12, 0.09, 0.11, 0.13]

    contract_scores = {
        'openai/gpt-4': 0.9,
        'anthropic/claude': 0.95,
        'deepseek/chat': 0.75
    }

    # Calculate MII
    result = calculator.calculate(
        run_stats,
        portfolio_metrics,
        drift_signals,
        contract_scores
    )

    print("MII Calculation Results")
    print("=" * 50)
    print(f"MII Score: {result['mii_score']}/100")
    print(f"Health Status: {result['health_status']}")
    print(f"Trend: {result['trend']}")
    print("\nDimensions:")
    for dim in result['dimensions']:
        print(f"  {dim['dimension']:12s}: {dim['score']:5.1f} ({dim['trend']})")
    print("\nInsights:")
    for insight in result['insights']:
        print(f"  {insight}")
    print("\nRecommendations:")
    for rec in result['recommendations']:
        print(f"  {rec}")

    print("\n" + calculator.visualize_tensor())

    # Save results
    with open("artifacts/mii_calculation.json", "w") as f:
        json.dump(result, f, indent=2)

if __name__ == "__main__":
    main()