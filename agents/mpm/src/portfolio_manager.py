#!/usr/bin/env python3
"""
MPM (Model Portfolio Manager)
Manages the optimal mix of models based on performance, cost, and coverage goals.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

@dataclass
class ModelProfile:
    """Profile for a model in the portfolio"""
    provider: str
    model: str
    tier: str  # primary, secondary, fallback
    weight: float  # 0.0 to 1.0
    performance_score: float  # 0-100
    cost_per_1k: float
    reliability: float  # 0.0 to 1.0
    use_cases: List[str]  # summarization, extraction, analysis, etc.

@dataclass
class PortfolioRecommendation:
    """Recommendation for portfolio adjustment"""
    action: str  # promote, demote, add, remove
    provider: str
    model: str
    reason: str
    impact_mii: float  # Expected MII change
    impact_cost: float  # Expected cost change per hour

class ModelPortfolioManager:
    """
    Manages the portfolio of models to optimize for:
    1. Coverage (hitting 95% target)
    2. Cost efficiency
    3. Performance (MII score)
    4. Reliability
    """

    def __init__(self):
        self.portfolio: Dict[str, ModelProfile] = {}
        self.performance_history: List[Dict] = []
        self.recommendations: List[PortfolioRecommendation] = []

    def analyze_portfolio(
        self,
        registry: List[Dict],
        run_stats: Dict,
        contracts: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """
        Analyze current portfolio performance and composition.

        Args:
            registry: Current model registry
            run_stats: Recent run statistics
            contracts: Contract validation results

        Returns:
            Portfolio analysis with recommendations
        """
        logger.info("Analyzing model portfolio...")

        # Build current portfolio from registry
        self._build_portfolio(registry, contracts)

        # Calculate portfolio metrics
        metrics = self._calculate_metrics(run_stats)

        # Generate recommendations
        self.recommendations = self._generate_recommendations(metrics)

        analysis = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "portfolio_size": len(self.portfolio),
            "metrics": metrics,
            "recommendations": [asdict(r) for r in self.recommendations],
            "tier_distribution": self._get_tier_distribution(),
            "cost_projection": self._project_costs(),
            "optimal_mix": self._calculate_optimal_mix(metrics)
        }

        return analysis

    def _build_portfolio(self, registry: List[Dict], contracts: Optional[List[Dict]]) -> None:
        """Build portfolio from registry and contracts"""
        self.portfolio.clear()

        # Create contract lookup
        contract_scores = {}
        if contracts:
            for contract in contracts:
                key = f"{contract['provider']}/{contract['model']}"
                contract_scores[key] = contract.get('score', 0.5)

        for entry in registry:
            if entry['status'] not in ['active', 'trial']:
                continue

            key = f"{entry['provider']}/{entry['model']}"

            # Determine tier based on capabilities and cost
            tier = self._assign_tier(entry)

            # Calculate performance score
            contract_score = contract_scores.get(key, 0.5)
            perf_score = self._calculate_performance_score(entry, contract_score)

            profile = ModelProfile(
                provider=entry['provider'],
                model=entry['model'],
                tier=tier,
                weight=self._calculate_weight(tier, perf_score),
                performance_score=perf_score,
                cost_per_1k=entry.get('capabilities', {}).get('cost_per_1k_tokens', 0.001),
                reliability=contract_score,
                use_cases=self._determine_use_cases(entry)
            )

            self.portfolio[key] = profile

    def _assign_tier(self, entry: Dict) -> str:
        """Assign tier based on model characteristics"""
        caps = entry.get('capabilities', {})
        cost = caps.get('cost_per_1k_tokens', 0.001)

        # Primary tier: High capability, reasonable cost
        if caps.get('tools') and caps.get('max_context', 0) >= 100000 and cost <= 0.005:
            return 'primary'
        # Fallback tier: Low cost, basic capability
        elif cost <= 0.0005:
            return 'fallback'
        # Secondary tier: Everything else
        else:
            return 'secondary'

    def _calculate_performance_score(self, entry: Dict, contract_score: float) -> float:
        """Calculate overall performance score (0-100)"""
        caps = entry.get('capabilities', {})

        # Weight different factors
        reliability_weight = 0.4
        capability_weight = 0.3
        cost_weight = 0.3

        # Capability score (based on features)
        cap_score = 0.0
        if caps.get('tools'):
            cap_score += 0.3
        if caps.get('search_augmented'):
            cap_score += 0.2
        if caps.get('max_context', 0) >= 100000:
            cap_score += 0.3
        if caps.get('max_context', 0) >= 32000:
            cap_score += 0.2

        # Cost score (inverse - lower is better)
        cost = caps.get('cost_per_1k_tokens', 0.001)
        if cost <= 0.0001:
            cost_score = 1.0
        elif cost <= 0.001:
            cost_score = 0.8
        elif cost <= 0.005:
            cost_score = 0.6
        elif cost <= 0.01:
            cost_score = 0.4
        else:
            cost_score = 0.2

        # Combined score
        score = (
            reliability_weight * contract_score +
            capability_weight * cap_score +
            cost_weight * cost_score
        ) * 100

        return round(score, 1)

    def _calculate_weight(self, tier: str, perf_score: float) -> float:
        """Calculate portfolio weight based on tier and performance"""
        base_weight = {
            'primary': 0.6,
            'secondary': 0.3,
            'fallback': 0.1
        }.get(tier, 0.1)

        # Adjust by performance
        if perf_score >= 80:
            return min(1.0, base_weight * 1.2)
        elif perf_score >= 60:
            return base_weight
        else:
            return max(0.05, base_weight * 0.8)

    def _determine_use_cases(self, entry: Dict) -> List[str]:
        """Determine suitable use cases for a model"""
        use_cases = []
        caps = entry.get('capabilities', {})

        # All models can do basic summarization
        use_cases.append('summarization')

        # Models with tools can do extraction
        if caps.get('tools'):
            use_cases.append('extraction')
            use_cases.append('function_calling')

        # Search-augmented models for research
        if caps.get('search_augmented'):
            use_cases.append('research')
            use_cases.append('fact_checking')

        # Large context for analysis
        if caps.get('max_context', 0) >= 100000:
            use_cases.append('deep_analysis')
            use_cases.append('document_processing')

        # Low-cost models for high-volume
        if caps.get('cost_per_1k_tokens', 1.0) <= 0.001:
            use_cases.append('bulk_processing')

        return use_cases

    def _calculate_metrics(self, run_stats: Dict) -> Dict[str, Any]:
        """Calculate portfolio-level metrics"""
        total_models = len(self.portfolio)

        # Tier counts
        tier_counts = {'primary': 0, 'secondary': 0, 'fallback': 0}
        total_cost = 0.0
        avg_performance = 0.0
        avg_reliability = 0.0

        for profile in self.portfolio.values():
            tier_counts[profile.tier] += 1
            total_cost += profile.cost_per_1k * profile.weight
            avg_performance += profile.performance_score * profile.weight
            avg_reliability += profile.reliability * profile.weight

        # Normalize weighted averages
        total_weight = sum(p.weight for p in self.portfolio.values())
        if total_weight > 0:
            avg_performance /= total_weight
            avg_reliability /= total_weight

        return {
            'total_models': total_models,
            'tier_distribution': tier_counts,
            'weighted_cost_per_1k': round(total_cost, 4),
            'avg_performance_score': round(avg_performance, 1),
            'avg_reliability': round(avg_reliability, 3),
            'coverage': run_stats.get('actual_coverage', 0.0),
            'mii_contribution': self._estimate_mii_contribution()
        }

    def _estimate_mii_contribution(self) -> float:
        """Estimate portfolio's contribution to MII score"""
        # Simplified calculation
        if not self.portfolio:
            return 0.0

        contribution = 0.0
        for profile in self.portfolio.values():
            # Higher performance and reliability increase MII
            contribution += (profile.performance_score / 100) * profile.reliability * profile.weight

        return round(contribution * 100, 1)

    def _generate_recommendations(self, metrics: Dict) -> List[PortfolioRecommendation]:
        """Generate portfolio optimization recommendations"""
        recommendations = []

        # Check coverage target
        if metrics['coverage'] < 0.95:
            # Need more primary models
            for key, profile in self.portfolio.items():
                if profile.tier == 'secondary' and profile.performance_score >= 70:
                    recommendations.append(PortfolioRecommendation(
                        action='promote',
                        provider=profile.provider,
                        model=profile.model,
                        reason=f"Performance score {profile.performance_score} warrants promotion",
                        impact_mii=2.5,
                        impact_cost=profile.cost_per_1k * 100
                    ))

        # Check cost optimization
        if metrics['weighted_cost_per_1k'] > 0.003:
            # Too expensive, find cheaper alternatives
            for key, profile in self.portfolio.items():
                if profile.cost_per_1k > 0.005 and profile.tier != 'fallback':
                    recommendations.append(PortfolioRecommendation(
                        action='demote',
                        provider=profile.provider,
                        model=profile.model,
                        reason=f"High cost ${profile.cost_per_1k}/1k tokens",
                        impact_mii=-1.0,
                        impact_cost=-profile.cost_per_1k * 100
                    ))

        # Check reliability
        for key, profile in self.portfolio.items():
            if profile.reliability < 0.5 and profile.tier == 'primary':
                recommendations.append(PortfolioRecommendation(
                    action='demote',
                    provider=profile.provider,
                    model=profile.model,
                    reason=f"Low reliability {profile.reliability:.1%}",
                    impact_mii=-3.0,
                    impact_cost=0.0
                ))

        return recommendations[:5]  # Top 5 recommendations

    def _get_tier_distribution(self) -> Dict[str, float]:
        """Get percentage distribution by tier"""
        total = len(self.portfolio)
        if total == 0:
            return {'primary': 0.0, 'secondary': 0.0, 'fallback': 0.0}

        distribution = {'primary': 0, 'secondary': 0, 'fallback': 0}
        for profile in self.portfolio.values():
            distribution[profile.tier] += 1

        return {
            tier: round(count / total * 100, 1)
            for tier, count in distribution.items()
        }

    def _project_costs(self) -> Dict[str, float]:
        """Project costs at different volume levels"""
        base_cost = sum(p.cost_per_1k * p.weight for p in self.portfolio.values())

        return {
            '1k_tokens': round(base_cost, 4),
            '100k_tokens': round(base_cost * 100, 2),
            '1m_tokens': round(base_cost * 1000, 2),
            'hourly_estimate': round(base_cost * 500, 2)  # ~500k tokens/hour
        }

    def _calculate_optimal_mix(self, metrics: Dict) -> Dict[str, int]:
        """Calculate optimal model mix for 95% coverage"""
        current_coverage = metrics['coverage']

        if current_coverage >= 0.95:
            # Already optimal
            return {
                'primary': metrics['tier_distribution']['primary'],
                'secondary': metrics['tier_distribution']['secondary'],
                'fallback': metrics['tier_distribution']['fallback']
            }

        # Calculate needed adjustment
        coverage_gap = 0.95 - current_coverage
        additional_primary = max(1, int(coverage_gap * 10))  # Rough estimate

        return {
            'primary': metrics['tier_distribution']['primary'] + additional_primary,
            'secondary': metrics['tier_distribution']['secondary'],
            'fallback': max(1, metrics['tier_distribution']['fallback'])
        }

    def apply_recommendations(
        self,
        recommendations: List[PortfolioRecommendation],
        auto_apply: bool = False
    ) -> Dict[str, Any]:
        """
        Apply portfolio recommendations.

        Args:
            recommendations: List of recommendations to apply
            auto_apply: If True, automatically apply all recommendations

        Returns:
            Application results
        """
        applied = []
        skipped = []

        for rec in recommendations:
            if auto_apply or rec.impact_mii > 0:
                # Apply recommendation
                key = f"{rec.provider}/{rec.model}"

                if rec.action == 'promote' and key in self.portfolio:
                    self.portfolio[key].tier = 'primary'
                    self.portfolio[key].weight = min(1.0, self.portfolio[key].weight * 1.5)
                    applied.append(rec)

                elif rec.action == 'demote' and key in self.portfolio:
                    self.portfolio[key].tier = 'secondary'
                    self.portfolio[key].weight = max(0.1, self.portfolio[key].weight * 0.7)
                    applied.append(rec)

                elif rec.action == 'remove' and key in self.portfolio:
                    del self.portfolio[key]
                    applied.append(rec)

                else:
                    skipped.append(rec)
            else:
                skipped.append(rec)

        return {
            'applied': len(applied),
            'skipped': len(skipped),
            'new_portfolio_size': len(self.portfolio),
            'expected_mii_change': sum(r.impact_mii for r in applied),
            'expected_cost_change': sum(r.impact_cost for r in applied)
        }

    def export_portfolio(self, filepath: str) -> None:
        """Export portfolio to JSON file"""
        export_data = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'portfolio': {
                key: asdict(profile)
                for key, profile in self.portfolio.items()
            },
            'metrics': self._calculate_metrics({}),
            'recommendations': [asdict(r) for r in self.recommendations]
        }

        with open(filepath, 'w') as f:
            json.dump(export_data, f, indent=2)

        logger.info(f"Portfolio exported to {filepath}")

def main():
    """Test MPM functionality"""
    mpm = ModelPortfolioManager()

    # Sample registry data
    registry = [
        {
            'provider': 'openai',
            'model': 'gpt-4o',
            'status': 'active',
            'capabilities': {
                'tools': True,
                'max_context': 128000,
                'cost_per_1k_tokens': 0.005
            }
        },
        {
            'provider': 'anthropic',
            'model': 'claude-3-5-sonnet',
            'status': 'active',
            'capabilities': {
                'tools': True,
                'max_context': 200000,
                'cost_per_1k_tokens': 0.003
            }
        },
        {
            'provider': 'deepseek',
            'model': 'deepseek-chat',
            'status': 'active',
            'capabilities': {
                'tools': False,
                'max_context': 32768,
                'cost_per_1k_tokens': 0.0001
            }
        }
    ]

    # Sample run stats
    run_stats = {
        'actual_coverage': 0.87,
        'tier': 'Degraded'
    }

    # Analyze portfolio
    analysis = mpm.analyze_portfolio(registry, run_stats)

    print("MPM Portfolio Analysis")
    print("=" * 50)
    print(f"Portfolio Size: {analysis['portfolio_size']} models")
    print(f"Tier Distribution: {analysis['tier_distribution']}")
    print(f"Cost Projection: ${analysis['cost_projection']['hourly_estimate']}/hour")
    print(f"Recommendations: {len(analysis['recommendations'])}")

    # Export
    mpm.export_portfolio("artifacts/model_portfolio.json")

if __name__ == "__main__":
    main()