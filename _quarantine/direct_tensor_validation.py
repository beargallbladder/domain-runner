#!/usr/bin/env python3
"""
Direct Tensor System Validation
Test tensor computation logic directly through database operations
This validates the tensor system even if the service isn't deployed
"""

import psycopg2
import numpy as np
import json
import time
from typing import Dict, List, Any, Tuple
import hashlib

# Database connection string
DATABASE_URL = "postgresql://raw_capture_db_user:wjFesUM8ISNEvE2b4kZtRAKgGYJVtKK5@dpg-d11fqgndiees73fb35dg-a.oregon-postgres.render.com/raw_capture_db"

class DirectTensorValidator:
    def __init__(self):
        self.conn = None
        self.results = {
            'database_connected': False,
            'tensor_computations': {},
            'validation_results': {},
            'errors': []
        }
        
    def connect_to_database(self):
        """Connect to the database"""
        try:
            self.conn = psycopg2.connect(DATABASE_URL, sslmode='require')
            self.results['database_connected'] = True
            print("✅ Connected to database successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to connect to database: {e}")
            self.results['errors'].append(f"Database connection failed: {e}")
            return False

    def compute_memory_tensor(self, domain_id: str) -> Dict[str, Any]:
        """Compute memory tensor directly from database"""
        try:
            cursor = self.conn.cursor()
            
            # Calculate recency score
            cursor.execute("""
                SELECT 
                    MAX(created_at) as latest_memory,
                    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as recent_24h,
                    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent_7d,
                    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as recent_30d
                FROM competitive_memories
                WHERE domain_id = %s
            """, (domain_id,))
            
            recency_data = cursor.fetchone()
            
            if not recency_data[0]:  # No memories
                recency_score = 0
            else:
                hours_since_latest = (time.time() * 1000 - recency_data[0].timestamp() * 1000) / (1000 * 60 * 60)
                time_decay = np.exp(-hours_since_latest / 168)  # Weekly half-life
                activity_score = (recency_data[1] * 1.0 + recency_data[2] * 0.5 + recency_data[3] * 0.25) / max(recency_data[3], 1)
                recency_score = min(1, time_decay * 0.6 + activity_score * 0.4)
            
            # Calculate frequency score
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_memories,
                    COUNT(DISTINCT DATE_TRUNC('day', created_at)) as unique_days,
                    AVG(confidence) as avg_confidence
                FROM competitive_memories
                WHERE domain_id = %s
                AND created_at > NOW() - INTERVAL '90 days'
            """, (domain_id,))
            
            freq_data = cursor.fetchone()
            frequency_score = min(1, freq_data[0] / 100) * 0.6 + min(1, freq_data[1] / 30) * 0.4 if freq_data[0] else 0
            
            # Calculate significance score
            cursor.execute("""
                SELECT 
                    AVG(confidence) as avg_confidence,
                    MAX(confidence) as max_confidence,
                    COUNT(*) FILTER (WHERE alert_priority IN ('high', 'critical')) as high_priority_count,
                    AVG(effectiveness) as avg_effectiveness
                FROM competitive_memories
                WHERE domain_id = %s
            """, (domain_id,))
            
            sig_data = cursor.fetchone()
            if sig_data[0]:
                confidence_score = sig_data[0] * 0.7 + sig_data[1] * 0.3
                priority_score = min(1, sig_data[2] / 10)
                effectiveness_score = sig_data[3] or 0
                significance_score = confidence_score * 0.5 + priority_score * 0.3 + effectiveness_score * 0.2
            else:
                significance_score = 0
            
            # Calculate persistence score (simplified)
            cursor.execute("""
                SELECT 
                    COUNT(DISTINCT DATE_TRUNC('week', created_at)) as active_weeks,
                    AVG(confidence) as overall_confidence
                FROM competitive_memories
                WHERE domain_id = %s
                AND created_at > NOW() - INTERVAL '84 days'
            """, (domain_id,))
            
            pers_data = cursor.fetchone()
            persistence_score = (pers_data[0] / 12) * 0.7 + (pers_data[1] or 0) * 0.3 if pers_data[0] else 0
            
            # Calculate composite memory score
            memory_score = (
                recency_score * 0.25 +
                frequency_score * 0.25 +
                significance_score * 0.3 +
                persistence_score * 0.2
            )
            
            # Apply sigmoid for bounded output
            memory_score = 1 / (1 + np.exp(-4 * (memory_score - 0.5)))
            
            cursor.close()
            
            result = {
                'domainId': domain_id,
                'memoryScore': memory_score,
                'components': {
                    'recency': recency_score,
                    'frequency': frequency_score,
                    'significance': significance_score,
                    'persistence': persistence_score
                },
                'computedAt': time.time()
            }
            
            print(f"✅ Memory tensor computed for {domain_id}: score {memory_score:.3f}")
            return result
            
        except Exception as e:
            print(f"❌ Memory tensor computation failed: {e}")
            self.results['errors'].append(f"Memory tensor failed for {domain_id}: {e}")
            return {}

    def compute_sentiment_tensor(self, domain_id: str) -> Dict[str, Any]:
        """Compute sentiment tensor directly from database"""
        try:
            cursor = self.conn.cursor()
            
            # Get domain responses for sentiment analysis
            cursor.execute("""
                SELECT 
                    response,
                    COALESCE(sentiment_score, detail_score, 0.5) as confidence_score,
                    model
                FROM domain_responses 
                WHERE domain_id = %s
                AND created_at > NOW() - INTERVAL '90 days'
                ORDER BY created_at DESC
                LIMIT 50
            """, (domain_id,))
            
            responses = cursor.fetchall()
            
            if not responses:
                print(f"⚠️ No responses found for sentiment analysis: {domain_id}")
                return {
                    'domainId': domain_id,
                    'sentimentScore': 0.5,
                    'sentimentDistribution': {'positive': 0, 'negative': 0, 'neutral': 1, 'mixed': 0},
                    'marketSentiment': 'neutral',
                    'computedAt': time.time()
                }
            
            # Simple sentiment analysis
            sentiments = {'positive': 0, 'negative': 0, 'neutral': 0, 'mixed': 0}
            
            positive_words = ['growth', 'success', 'innovative', 'leading', 'strong', 'opportunity', 'advantage', 'positive', 'excellent', 'superior']
            negative_words = ['risk', 'threat', 'weakness', 'concern', 'challenge', 'decline', 'loss', 'negative', 'poor', 'inferior']
            
            for response_content, confidence, model in responses:
                content = response_content.lower()
                pos_count = sum(1 for word in positive_words if word in content)
                neg_count = sum(1 for word in negative_words if word in content)
                
                weight = float(confidence or 0.5)
                
                if pos_count > neg_count * 1.5:
                    sentiments['positive'] += weight
                elif neg_count > pos_count * 1.5:
                    sentiments['negative'] += weight
                elif abs(pos_count - neg_count) <= 1 and (pos_count + neg_count) > 2:
                    sentiments['mixed'] += weight
                else:
                    sentiments['neutral'] += weight
            
            # Normalize sentiments
            total = sum(sentiments.values())
            if total > 0:
                for key in sentiments:
                    sentiments[key] /= total
            
            # Calculate sentiment score
            sentiment_score = (
                sentiments['positive'] * 1.0 +
                sentiments['negative'] * -1.0 +
                sentiments['neutral'] * 0.0 +
                sentiments['mixed'] * -0.2
            )
            sentiment_score = (sentiment_score + 1) / 2  # Normalize to 0-1
            
            # Determine market sentiment
            pos_neg_ratio = sentiments['positive'] / (sentiments['negative'] + 0.001)
            if sentiments['mixed'] > 0.6:
                market_sentiment = 'volatile'
            elif pos_neg_ratio > 2:
                market_sentiment = 'bullish'
            elif pos_neg_ratio < 0.5:
                market_sentiment = 'bearish'
            else:
                market_sentiment = 'neutral'
            
            cursor.close()
            
            result = {
                'domainId': domain_id,
                'sentimentScore': sentiment_score,
                'sentimentDistribution': sentiments,
                'marketSentiment': market_sentiment,
                'computedAt': time.time()
            }
            
            print(f"✅ Sentiment tensor computed for {domain_id}: {market_sentiment} ({sentiment_score:.3f})")
            return result
            
        except Exception as e:
            print(f"❌ Sentiment tensor computation failed: {e}")
            self.results['errors'].append(f"Sentiment tensor failed for {domain_id}: {e}")
            return {}

    def compute_grounding_tensor(self, domain_id: str) -> Dict[str, Any]:
        """Compute grounding tensor directly from database"""
        try:
            cursor = self.conn.cursor()
            
            # Calculate factual accuracy (using confidence as proxy)
            cursor.execute("""
                SELECT 
                    AVG(COALESCE(sentiment_score, detail_score, 0.5)) as avg_confidence,
                    COUNT(DISTINCT model) as model_diversity,
                    COUNT(*) as total_responses
                FROM domain_responses
                WHERE domain_id = %s
            """, (domain_id,))
            
            accuracy_data = cursor.fetchone()
            factual_accuracy = float(accuracy_data[0] or 0.5)
            
            # Calculate data consistency (variance in confidence)
            cursor.execute("""
                SELECT 
                    STDDEV(COALESCE(sentiment_score, detail_score, 0.5)) as confidence_stddev,
                    COUNT(DISTINCT MD5(response)) / COUNT(*)::FLOAT as response_diversity
                FROM domain_responses
                WHERE domain_id = %s
                GROUP BY prompt_type
            """, (domain_id,))
            
            consistency_data = cursor.fetchall()
            if consistency_data:
                avg_stddev = np.mean([row[0] or 0 for row in consistency_data])
                data_consistency = 1 / (1 + avg_stddev * 10)
            else:
                data_consistency = 0.5
            
            # Calculate source reliability (model diversity and confidence)
            source_reliability = min(1, accuracy_data[1] / 10) * 0.5 + factual_accuracy * 0.5
            
            # Calculate temporal stability (simplified)
            cursor.execute("""
                SELECT 
                    DATE_TRUNC('week', created_at) as week,
                    AVG(COALESCE(sentiment_score, detail_score, 0.5)) as avg_confidence
                FROM domain_responses
                WHERE domain_id = %s 
                AND created_at > NOW() - INTERVAL '90 days'
                GROUP BY DATE_TRUNC('week', created_at)
                ORDER BY week
            """, (domain_id,))
            
            temporal_data = cursor.fetchall()
            if len(temporal_data) > 1:
                confidences = [row[1] for row in temporal_data]
                temporal_stability = 1 / (1 + np.std(confidences) * 10)
            else:
                temporal_stability = 0.5
            
            # Calculate cross-validation (model agreement)
            cursor.execute("""
                WITH model_responses AS (
                    SELECT 
                        model,
                        prompt_type,
                        COUNT(*) as response_count,
                        AVG(COALESCE(sentiment_score, detail_score, 0.5)) as avg_confidence
                    FROM domain_responses
                    WHERE domain_id = %s
                    GROUP BY model, prompt_type
                )
                SELECT 
                    STDDEV(avg_confidence) as confidence_variance,
                    COUNT(DISTINCT model) as models
                FROM model_responses
            """, (domain_id,))
            
            validation_data = cursor.fetchone()
            if validation_data[0] is not None:
                cross_validation = 1 / (1 + validation_data[0] * 10)
            else:
                cross_validation = 0.5
            
            # Calculate composite grounding score
            grounding_score = (
                factual_accuracy * 0.3 +
                data_consistency * 0.25 +
                source_reliability * 0.2 +
                temporal_stability * 0.15 +
                cross_validation * 0.1
            )
            
            # Apply non-linear scaling to penalize low scores
            grounding_score = grounding_score ** 1.2
            
            # Determine grounding strength
            if grounding_score >= 0.8:
                grounding_strength = 'strong'
            elif grounding_score >= 0.6:
                grounding_strength = 'moderate'
            elif grounding_score >= 0.4:
                grounding_strength = 'weak'
            else:
                grounding_strength = 'unstable'
            
            cursor.close()
            
            result = {
                'domainId': domain_id,
                'groundingScore': grounding_score,
                'components': {
                    'factualAccuracy': factual_accuracy,
                    'dataConsistency': data_consistency,
                    'sourceReliability': source_reliability,
                    'temporalStability': temporal_stability,
                    'crossValidation': cross_validation
                },
                'groundingStrength': grounding_strength,
                'computedAt': time.time()
            }
            
            print(f"✅ Grounding tensor computed for {domain_id}: {grounding_strength} ({grounding_score:.3f})")
            return result
            
        except Exception as e:
            print(f"❌ Grounding tensor computation failed: {e}")
            self.results['errors'].append(f"Grounding tensor failed for {domain_id}: {e}")
            return {}

    def compute_drift_detection(self, domain_id: str) -> Dict[str, Any]:
        """Compute drift detection directly from database"""
        try:
            cursor = self.conn.cursor()
            
            # Simple drift detection based on temporal patterns
            cursor.execute("""
                WITH temporal_data AS (
                    SELECT 
                        DATE_TRUNC('week', created_at) as week,
                        AVG(COALESCE(sentiment_score, detail_score, 0.5)) as avg_confidence,
                        COUNT(*) as response_count
                    FROM domain_responses 
                    WHERE domain_id = %s
                    AND created_at > NOW() - INTERVAL '60 days'
                    GROUP BY DATE_TRUNC('week', created_at)
                    ORDER BY week
                ),
                drift_metrics AS (
                    SELECT 
                        STDDEV(avg_confidence) as confidence_drift,
                        STDDEV(response_count) as volume_drift,
                        COUNT(*) as weeks_active
                    FROM temporal_data
                )
                SELECT * FROM drift_metrics
            """, (domain_id,))
            
            drift_data = cursor.fetchone()
            
            if not drift_data[2]:  # No data
                return {
                    'domainId': domain_id,
                    'driftScore': 0,
                    'driftType': 'none',
                    'driftDirection': 'neutral',
                    'severity': 'low',
                    'computedAt': time.time()
                }
            
            # Calculate drift components
            confidence_drift = min(1, (drift_data[0] or 0) * 10)
            volume_drift = min(1, (drift_data[1] or 0) / 10)
            
            # Simplified drift calculation
            concept_drift = confidence_drift * 0.5
            data_drift = volume_drift * 0.5
            model_drift = 0.1  # Simplified
            temporal_drift = confidence_drift * 0.3
            
            # Calculate composite drift score
            drift_score = (
                concept_drift * 0.35 +
                data_drift * 0.3 +
                model_drift * 0.2 +
                temporal_drift * 0.15
            )
            
            # Determine drift characteristics
            if drift_score < 0.3:
                drift_type = 'none'
                severity = 'low'
            elif drift_score < 0.5:
                drift_type = 'gradual'
                severity = 'medium'
            elif drift_score < 0.7:
                drift_type = 'sudden'
                severity = 'high'
            else:
                drift_type = 'sudden'
                severity = 'critical'
            
            drift_direction = 'positive' if confidence_drift > volume_drift else 'negative'
            
            cursor.close()
            
            result = {
                'domainId': domain_id,
                'driftScore': drift_score,
                'driftType': drift_type,
                'driftDirection': drift_direction,
                'components': {
                    'conceptDrift': concept_drift,
                    'dataDrift': data_drift,
                    'modelDrift': model_drift,
                    'temporalDrift': temporal_drift
                },
                'severity': severity,
                'computedAt': time.time()
            }
            
            print(f"✅ Drift detection computed for {domain_id}: {drift_type} drift, severity: {severity} ({drift_score:.3f})")
            return result
            
        except Exception as e:
            print(f"❌ Drift detection computation failed: {e}")
            self.results['errors'].append(f"Drift detection failed for {domain_id}: {e}")
            return {}

    def compute_consensus_scoring(self, domain_id: str) -> Dict[str, Any]:
        """Compute consensus scoring directly from database"""
        try:
            cursor = self.conn.cursor()
            
            # Calculate model agreement
            cursor.execute("""
                WITH model_pairs AS (
                    SELECT 
                        a.model as model_a,
                        b.model as model_b,
                        a.prompt_type,
                        ABS(COALESCE(a.sentiment_score, a.detail_score, 0.5) - COALESCE(b.sentiment_score, b.detail_score, 0.5)) as confidence_diff,
                        CASE WHEN MD5(a.response) = MD5(b.response) THEN 1.0 ELSE 0.0 END as exact_match
                    FROM domain_responses a
                    JOIN domain_responses b ON a.prompt_type = b.prompt_type AND a.domain_id = b.domain_id
                    WHERE a.domain_id = %s AND a.model < b.model
                )
                SELECT 
                    AVG(1 - confidence_diff) as confidence_agreement,
                    AVG(exact_match) as exact_agreement,
                    COUNT(*) as comparisons
                FROM model_pairs
            """, (domain_id,))
            
            agreement_data = cursor.fetchone()
            
            if not agreement_data[2]:  # No comparisons
                model_agreement = 0.5
            else:
                model_agreement = (agreement_data[0] * 0.6 + agreement_data[1] * 0.4) or 0.5
            
            # Calculate temporal consistency
            cursor.execute("""
                SELECT 
                    model,
                    STDDEV(COALESCE(sentiment_score, detail_score, 0.5)) as confidence_variance
                FROM domain_responses
                WHERE domain_id = %s
                GROUP BY model
            """, (domain_id,))
            
            temporal_data = cursor.fetchall()
            if temporal_data:
                avg_variance = np.mean([row[1] or 0 for row in temporal_data])
                temporal_consistency = 1 / (1 + avg_variance * 10)
            else:
                temporal_consistency = 0.5
            
            # Simplified calculations for other components
            cross_prompt_alignment = model_agreement * 0.9  # Simplified
            confidence_alignment = temporal_consistency * 0.8  # Simplified
            
            # Calculate composite consensus score
            consensus_score = (
                model_agreement * 0.4 +
                temporal_consistency * 0.25 +
                cross_prompt_alignment * 0.2 +
                confidence_alignment * 0.15
            )
            
            # Apply sigmoid for smooth scaling
            consensus_score = 1 / (1 + np.exp(-5 * (consensus_score - 0.5)))
            
            # Determine agreement level
            if consensus_score >= 0.7:
                agreement_level = 'strong'
            elif consensus_score >= 0.6:
                agreement_level = 'moderate'
            elif consensus_score >= 0.4:
                agreement_level = 'weak'
            else:
                agreement_level = 'conflicted'
            
            cursor.close()
            
            result = {
                'domainId': domain_id,
                'consensusScore': consensus_score,
                'agreementLevel': agreement_level,
                'components': {
                    'modelAgreement': model_agreement,
                    'temporalConsistency': temporal_consistency,
                    'crossPromptAlignment': cross_prompt_alignment,
                    'confidenceAlignment': confidence_alignment
                },
                'computedAt': time.time()
            }
            
            print(f"✅ Consensus scoring computed for {domain_id}: {agreement_level} ({consensus_score:.3f})")
            return result
            
        except Exception as e:
            print(f"❌ Consensus scoring computation failed: {e}")
            self.results['errors'].append(f"Consensus scoring failed for {domain_id}: {e}")
            return {}

    def compute_composite_tensor(self, domain_id: str) -> Dict[str, Any]:
        """Compute comprehensive tensor analysis for a domain"""
        print(f"\n🔍 Computing tensor analysis for domain: {domain_id}")
        
        # Compute all tensor components
        memory = self.compute_memory_tensor(domain_id)
        sentiment = self.compute_sentiment_tensor(domain_id)
        grounding = self.compute_grounding_tensor(domain_id)
        drift = self.compute_drift_detection(domain_id)
        consensus = self.compute_consensus_scoring(domain_id)
        
        if not all([memory, sentiment, grounding, drift, consensus]):
            print(f"❌ Failed to compute all tensors for {domain_id}")
            return {}
        
        # Calculate composite score
        composite_score = (
            memory['memoryScore'] * 0.25 +
            sentiment['sentimentScore'] * 0.15 +
            grounding['groundingScore'] * 0.3 +
            (1 - drift['driftScore']) * 0.15 +  # Invert drift score
            consensus['consensusScore'] * 0.15
        )
        
        # Apply sigmoid for bounded output
        composite_score = 1 / (1 + np.exp(-4 * (composite_score - 0.5)))
        
        # Generate insights
        insights = []
        
        if memory['memoryScore'] < 0.3:
            insights.append('Low memory retention detected - increase monitoring frequency')
        elif memory['memoryScore'] > 0.8:
            insights.append('Strong memory patterns established - high domain significance')
        
        if sentiment['marketSentiment'] == 'volatile':
            insights.append('High sentiment volatility - monitor for rapid changes')
        elif sentiment['marketSentiment'] == 'bullish':
            insights.append('Positive sentiment trend - potential growth opportunity')
        
        if grounding['groundingStrength'] in ['weak', 'unstable']:
            insights.append('Weak data grounding - verify sources and increase validation')
        
        if drift['severity'] == 'critical':
            insights.append(f"Critical {drift['driftType']} drift detected - immediate attention required")
        
        if consensus['agreementLevel'] == 'conflicted':
            insights.append('Model consensus conflict - review divergent predictions')
        elif consensus['agreementLevel'] == 'strong':
            insights.append('Strong model consensus - high confidence in predictions')
        
        result = {
            'domainId': domain_id,
            'memory': memory,
            'sentiment': sentiment,
            'grounding': grounding,
            'drift': drift,
            'consensus': consensus,
            'compositeScore': composite_score,
            'insights': insights,
            'computedAt': time.time()
        }
        
        print(f"🎯 Composite tensor analysis complete for {domain_id}: score {composite_score:.3f}")
        print(f"💡 Generated {len(insights)} insights")
        
        return result

    def run_validation(self, test_domains: List[str]) -> Dict[str, Any]:
        """Run comprehensive tensor validation"""
        print("🧠 Starting Direct Tensor System Validation...")
        print(f"🔬 Testing {len(test_domains)} domains")
        
        if not self.connect_to_database():
            return self.results
        
        try:
            for i, domain_id in enumerate(test_domains[:3], 1):  # Test first 3 domains
                print(f"\n{'='*60}")
                print(f"🔬 DOMAIN {i}/3: {domain_id}")
                print(f"{'='*60}")
                
                tensor_result = self.compute_composite_tensor(domain_id)
                
                if tensor_result:
                    self.results['tensor_computations'][domain_id] = tensor_result
                    self.results['validation_results'][domain_id] = {
                        'success': True,
                        'composite_score': tensor_result['compositeScore'],
                        'insights_count': len(tensor_result['insights']),
                        'components_computed': 5
                    }
                else:
                    self.results['validation_results'][domain_id] = {
                        'success': False,
                        'error': 'Failed to compute tensor analysis'
                    }
                
                # Brief pause between domains
                time.sleep(1)
            
            self.generate_final_report()
            
        finally:
            if self.conn:
                self.conn.close()
                print("📡 Database connection closed")
        
        return self.results

    def generate_final_report(self):
        """Generate comprehensive validation report"""
        print(f"\n{'='*80}")
        print("🧠 DIRECT TENSOR SYSTEM VALIDATION REPORT")
        print(f"{'='*80}")
        
        # Database connection status
        db_status = "✅ CONNECTED" if self.results['database_connected'] else "❌ FAILED"
        print(f"Database Connection: {db_status}")
        
        # Tensor computation statistics
        total_domains = len(self.results['validation_results'])
        successful_computations = sum(1 for result in self.results['validation_results'].values() if result.get('success'))
        failed_computations = total_domains - successful_computations
        success_rate = (successful_computations / total_domains * 100) if total_domains > 0 else 0
        
        print(f"Domains Tested: {total_domains}")
        print(f"Successful Computations: {successful_computations}")
        print(f"Failed Computations: {failed_computations}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        # Tensor analysis summary
        if self.results['tensor_computations']:
            print(f"\n📊 TENSOR ANALYSIS SUMMARY:")
            
            composite_scores = [result['compositeScore'] for result in self.results['tensor_computations'].values()]
            avg_composite = np.mean(composite_scores)
            
            print(f"Average Composite Score: {avg_composite:.3f}")
            print(f"Score Range: {min(composite_scores):.3f} - {max(composite_scores):.3f}")
            
            # Component analysis
            print(f"\n🔍 COMPONENT ANALYSIS:")
            components = ['memory', 'sentiment', 'grounding', 'drift', 'consensus']
            
            for component in components:
                if component == 'drift':
                    scores = [result[component]['driftScore'] for result in self.results['tensor_computations'].values()]
                    avg_score = np.mean(scores)
                    print(f"  {component.capitalize()} (lower is better): {avg_score:.3f}")
                else:
                    score_key = f"{component}Score" if component != 'grounding' else 'groundingScore'
                    scores = [result[component][score_key] for result in self.results['tensor_computations'].values()]
                    avg_score = np.mean(scores)
                    print(f"  {component.capitalize()}: {avg_score:.3f}")
            
            # Insights summary
            total_insights = sum(len(result['insights']) for result in self.results['tensor_computations'].values())
            print(f"\n💡 Total Insights Generated: {total_insights}")
        
        # Overall system status
        if success_rate >= 90:
            print("\n🟢 OVERALL STATUS: EXCELLENT - Tensor computation system fully operational")
        elif success_rate >= 75:
            print("\n🟡 OVERALL STATUS: GOOD - Minor issues detected")
        elif success_rate >= 50:
            print("\n🟠 OVERALL STATUS: DEGRADED - Significant issues detected")
        else:
            print("\n🔴 OVERALL STATUS: CRITICAL - Major computation failures")
        
        # Error summary
        if self.results['errors']:
            print(f"\n❌ ERRORS DETECTED ({len(self.results['errors'])}):")
            for i, error in enumerate(self.results['errors'], 1):
                print(f"  {i}. {error}")
        
        print(f"{'='*80}")
        
        # Save results
        with open('/Users/samkim/domain-runner/direct_tensor_validation_results.json', 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        
        print("📊 Detailed results saved to: direct_tensor_validation_results.json")

def main():
    # Load test configuration
    try:
        with open('/Users/samkim/domain-runner/tensor_test_config.json', 'r') as f:
            config = json.load(f)
        test_domains = config['test_domains']
    except Exception as e:
        print(f"❌ Failed to load test configuration: {e}")
        print("Using fallback domain IDs...")
        test_domains = [
            "c4a449d0-38f8-45e3-9686-8304ac220573",
            "4174f6b3-7181-457b-a591-392765e0b5e1",
            "e4e8dfea-9422-4143-a62b-c4c3afac96c4"
        ]
    
    validator = DirectTensorValidator()
    results = validator.run_validation(test_domains)
    
    # Exit with appropriate code
    success_rate = (len([r for r in results['validation_results'].values() if r.get('success')]) / 
                   len(results['validation_results']) * 100) if results['validation_results'] else 0
    
    return 0 if success_rate >= 75 else 1

if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)