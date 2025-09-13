#!/usr/bin/env python3
"""
🎯 FACEBOOK ADS CONVERSION EXPERIMENT
Test conversion rates with/without AI brand intelligence insights
"""

import os
import json
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from facebook_business.adobjects.adcreative import AdCreative
from facebook_business.adobjects.adimage import AdImage
from facebook_business.adobjects.targeting import Targeting
import requests
import asyncio
import asyncpg

# Facebook API credentials
APP_ID = os.getenv('FACEBOOK_APP_ID')
APP_SECRET = os.getenv('FACEBOOK_APP_SECRET')
ACCESS_TOKEN = os.getenv('FACEBOOK_ACCESS_TOKEN')
AD_ACCOUNT_ID = os.getenv('FACEBOOK_AD_ACCOUNT_ID')

# Initialize Facebook API
FacebookAdsApi.init(APP_ID, APP_SECRET, ACCESS_TOKEN)

class ConversionExperiment:
    def __init__(self):
        self.ad_account = AdAccount(f'act_{AD_ACCOUNT_ID}')
        self.database_url = os.getenv('DATABASE_URL')
        
    async def get_competitor_insight(self, domain):
        """Fetch AI competitive intelligence for a specific domain"""
        async with asyncpg.connect(self.database_url) as conn:
            # Get domain data
            domain_data = await conn.fetchrow("""
                SELECT domain, memory_score, ai_consensus_score, business_focus
                FROM public_domain_cache 
                WHERE domain = $1
                ORDER BY updated_at DESC LIMIT 1
            """, domain)
            
            if not domain_data:
                return None
                
            # Get top competitor in same category
            competitor = await conn.fetchrow("""
                SELECT domain, memory_score 
                FROM public_domain_cache 
                WHERE business_focus = $1 AND domain != $2
                ORDER BY memory_score DESC LIMIT 1
            """, domain_data['business_focus'], domain)
            
            if competitor and competitor['memory_score'] > domain_data['memory_score']:
                score_diff = competitor['memory_score'] - domain_data['memory_score']
                return {
                    'domain': domain,
                    'competitor': competitor['domain'],
                    'score_gap': round(score_diff, 1),
                    'category': domain_data['business_focus']
                }
            
            return None
    
    def create_ad_creative_control(self, page_id):
        """Control group: Generic competitive intelligence ad"""
        return {
            'name': 'Control - Generic Competitive Intelligence',
            'object_story_spec': {
                'page_id': page_id,
                'link_data': {
                    'message': "Stay ahead of your competition with real-time brand intelligence.",
                    'name': "Competitive Intelligence Dashboard",
                    'description': "Track your competitive position across digital channels. Get insights that matter.",
                    'link': "https://llmpagerank.com/register?utm_source=fb&utm_campaign=control",
                    'call_to_action': {
                        'type': 'LEARN_MORE'
                    }
                }
            }
        }
    
    def create_ad_creative_test(self, page_id, insight_data):
        """Test group: Specific AI insights ad"""
        competitor = insight_data['competitor'].replace('.com', '').title()
        
        return {
            'name': f'Test - AI Insight for {insight_data["domain"]}',
            'object_story_spec': {
                'page_id': page_id,
                'link_data': {
                    'message': f"⚠️ ALERT: {competitor} appears in {insight_data['score_gap']}% more AI responses than your brand",
                    'name': "Your Brand is Losing AI Mindshare",
                    'description': f"AI models mention {competitor} first when customers ask about {insight_data['category']}. See how to fix this →",
                    'link': f"https://llmpagerank.com/register?utm_source=fb&utm_campaign=test&competitor={competitor}",
                    'call_to_action': {
                        'type': 'LEARN_MORE'
                    }
                }
            }
        }
    
    def create_targeting(self, interests=['marketing', 'competitive intelligence', 'business strategy']):
        """Create targeting for CMOs and marketing professionals"""
        return {
            Targeting.Field.geo_locations: {
                'countries': ['US', 'CA', 'GB', 'AU']
            },
            Targeting.Field.age_min: 25,
            Targeting.Field.age_max: 55,
            Targeting.Field.interests: [
                {'name': interest} for interest in interests
            ],
            Targeting.Field.job_titles: [
                'Chief Marketing Officer',
                'Marketing Director', 
                'VP Marketing',
                'Brand Manager',
                'Competitive Intelligence'
            ],
            Targeting.Field.behaviors: [
                {'name': 'Small business owners'},
                {'name': 'Technology early adopters'}
            ]
        }
    
    async def create_experiment_campaign(self, test_domain, budget_dollars=100):
        """Create A/B test campaign for specific domain"""
        
        # Get AI insight for this domain
        insight = await self.get_competitor_insight(test_domain)
        if not insight:
            print(f"❌ No competitive insights found for {test_domain}")
            return None
            
        print(f"🎯 Creating experiment for {test_domain}")
        print(f"   Competitor: {insight['competitor']}")
        print(f"   Score gap: {insight['score_gap']}%")
        
        # Create campaign
        campaign = Campaign(parent_id=self.ad_account.get_id())
        campaign.update({
            Campaign.Field.name: f'AI Insights Test - {test_domain}',
            Campaign.Field.objective: Campaign.Objective.conversions,
            Campaign.Field.status: Campaign.Status.paused,  # Start paused for review
            Campaign.Field.buying_type: Campaign.BuyingType.auction
        })
        campaign.remote_create()
        
        # Create ad sets (Control vs Test)
        adsets = []
        creatives = []
        
        for variant in ['control', 'test']:
            adset = AdSet(parent_id=campaign.get_id())
            adset.update({
                AdSet.Field.name: f'{variant.title()} Group - {test_domain}',
                AdSet.Field.campaign_id: campaign.get_id(),
                AdSet.Field.daily_budget: int(budget_dollars / 2 * 100),  # Split budget, convert to cents
                AdSet.Field.billing_event: AdSet.BillingEvent.impressions,
                AdSet.Field.optimization_goal: AdSet.OptimizationGoal.conversions,
                AdSet.Field.bid_strategy: AdSet.BidStrategy.lowest_cost,
                AdSet.Field.targeting: self.create_targeting(),
                AdSet.Field.status: AdSet.Status.paused
            })
            adset.remote_create()
            adsets.append(adset)
            
            # Create ad creative
            if variant == 'control':
                creative_spec = self.create_ad_creative_control(os.getenv('FACEBOOK_PAGE_ID'))
            else:
                creative_spec = self.create_ad_creative_test(os.getenv('FACEBOOK_PAGE_ID'), insight)
                
            creative = AdCreative(parent_id=self.ad_account.get_id())
            creative.update(creative_spec)
            creative.remote_create()
            creatives.append(creative)
            
            # Create ad
            ad = Ad(parent_id=self.ad_account.get_id())
            ad.update({
                Ad.Field.name: f'{variant.title()} Ad - {test_domain}',
                Ad.Field.adset_id: adset.get_id(),
                Ad.Field.creative: {'creative_id': creative.get_id()},
                Ad.Field.status: Ad.Status.paused
            })
            ad.remote_create()
        
        return {
            'campaign_id': campaign.get_id(),
            'adsets': [adset.get_id() for adset in adsets],
            'test_domain': test_domain,
            'insight': insight
        }
    
    def get_campaign_results(self, campaign_id):
        """Get conversion results from campaign"""
        campaign = Campaign(campaign_id)
        insights = campaign.get_insights(fields=[
            'impressions',
            'clicks',
            'ctr',
            'cpc',
            'conversions',
            'conversion_rate',
            'cost_per_conversion',
            'adset_name'
        ])
        return list(insights)

async def main():
    """Run conversion experiment"""
    
    # Test domains - companies that might buy competitive intelligence
    test_domains = [
        'salesforce.com',    # SaaS company
        'hubspot.com',       # Marketing platform  
        'mailchimp.com',     # Email marketing
        'slack.com',         # Business software
        'zoom.us'            # Communication tools
    ]
    
    experiment = ConversionExperiment()
    
    print("🚀 FACEBOOK ADS CONVERSION EXPERIMENT")
    print("=" * 50)
    
    # Create experiments for each domain
    campaigns = []
    for domain in test_domains[:2]:  # Start with 2 domains
        campaign_data = await experiment.create_experiment_campaign(domain, budget_dollars=50)
        if campaign_data:
            campaigns.append(campaign_data)
            print(f"✅ Created campaign for {domain}")
        
        # Wait between campaigns to avoid rate limits
        await asyncio.sleep(2)
    
    print(f"\n🎯 Created {len(campaigns)} A/B test campaigns")
    print("💡 Campaigns are PAUSED - review and activate in Facebook Ads Manager")
    print("\n📊 After 48-72 hours, run:")
    print("   python facebook_ads_experiment.py --results")
    
    return campaigns

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--results':
        # Get results mode
        print("📊 Fetching campaign results...")
        # Add results fetching logic here
    else:
        # Create campaigns mode
        asyncio.run(main()) 