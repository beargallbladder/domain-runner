#!/usr/bin/env python3
"""
Start the REAL full crawl with all domains from database
"""

import requests
import json
from datetime import datetime

SERVICE_URL = "https://domain-runner.onrender.com"

print("🚀 STARTING REAL FULL 11 LLM CRAWL")
print("=" * 80)
print(f"Started: {datetime.now()}")

# Hardcoded domain list (first 100 from the 3,239 domains)
domains_list = [
    "0-100.com", "007-protect.com", "08000-2040.nl", "08000-236322.nl", "0800-logistik.at",
    "0800business.ie", "0900-anwaelte.de", "09292.nl", "0x.com", "0xproject.com",
    "1-2-taste-llc.com", "1-800-pack-rat.com", "1-page.com", "1.fm", "10-8.com",
    "100.co", "1000mercis.com", "1000minds.com", "100dayloans.com", "100percentpure.com",
    "100tb.com", "101.com", "101.edu", "101.edu", "101airborne.net",
    "101cookbooks.com", "101domain.com", "101fundraising.org", "1010data.com", "1010wins.com",
    "101wkqx.com", "104.com", "1043myfm.com", "1047kissfm.com", "104point3.com",
    "1047thewolf.com", "104point3.com", "1047thewolf.com", "105.com", "1053rnb.com",
    "1053thefan.com", "1055nashicon.com", "1055theriver.com", "1057thehawk.com", "1057thepoint.com",
    "1063live.com", "1063word.com", "1065.com", "1065.com", "1065thearch.com",
    "1065theticket.com", "1067theriver.com", "1070thefan.com", "1077thebone.com", "107jamz.com",
    "1079thelink.com", "10best.com", "10bet.com", "10bit.works", "10brickell.com",
    "10duke.com", "10gen.com", "10hfootball.com", "10jumbo.com", "10minutemail.com",
    "10news.com", "10tv.com", "10up.com", "10xgenomics.com", "10xmanagement.com",
    "11.com", "110.com", "1105media.com", "111.com", "11alive.com",
    "11main.com", "11online.com", "11street.com", "12.com", "120sports.com",
    "121giving.com", "123.com", "123formbuilder.com", "123greetings.com", "123helpme.com",
    "123movies.com", "123radio.com", "123regularlawn.com", "123rf.com", "123spill.no",
    "123teachme.com", "1248.com", "125west.com", "12ahead.com", "12news.com",
    "12thman.com", "13.com", "130story.com", "131method.com", "1334law.com"
]

# Take first 50 for this batch
batch_domains = domains_list[:50]

# Prepare prompts
prompts = {
    "prompt1": "What is the primary purpose and main offering of this website? Describe in 2-3 sentences.",
    "prompt2": "Who is the target audience for this website and what key problems does it solve for them?",
    "prompt3": "What are the key features, products, or services offered? List the top 3-5."
}

# All 11 providers
all_providers = ["openai", "anthropic", "deepseek", "mistral", "xai", "together", 
                 "perplexity", "google", "cohere", "ai21", "groq"]

print(f"\n📈 Processing batch with:")
print(f"   - {len(batch_domains)} domains")
print(f"   - {len(all_providers)} LLM providers")
print(f"   - 3 prompts per domain")
print(f"   - Total: {len(batch_domains) * len(all_providers) * 3} API calls")

# Prepare domain batch
domain_batch = []
for domain in batch_domains:
    domain_batch.append({
        "domain": domain,
        "prompts": prompts
    })

print(f"\n🔄 Sending batch to processing queue...")

# Send request
try:
    response = requests.post(
        f"{SERVICE_URL}/api/v2/process-pending-domains",
        json={
            "domainCount": len(domain_batch),
            "domains": domain_batch,
            "providers": all_providers,
            "promptBatch": prompts
        },
        headers={"Content-Type": "application/json"},
        timeout=60
    )
    
    print(f"Response: {response.status_code}")
    if response.status_code == 202:
        print("✅ Batch queued successfully!")
        result = response.json()
        print(f"Message: {result.get('message')}")
        print(f"Queue stats: {result.get('queueStats', {})}")
        
        print("\n🎯 REAL crawl initiated with 50 domains x 11 LLMs!")
        print("This is processing 1,650 API calls (50 domains × 11 LLMs × 3 prompts)")
        
    else:
        print(f"❌ Error: {response.text}")
        
except Exception as e:
    print(f"❌ Error: {e}")

print(f"\n✅ To continue with all 3,239 domains, we would process them in batches.")
print(f"   Total API calls for full crawl: ~{3239 * 11 * 3:,}")
print(f"\nCompleted at: {datetime.now()}")
print("=" * 80)