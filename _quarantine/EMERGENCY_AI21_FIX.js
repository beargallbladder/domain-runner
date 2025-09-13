// EMERGENCY FIX - Add missing AI21 provider
const AI21_PROVIDER = { 
  name: 'ai21', 
  model: 'j2-ultra', 
  keys: [process.env.AI21_API_KEY, process.env.AI21_API_KEY_2].filter(Boolean), 
  endpoint: 'https://api.ai21.com/studio/v1/j2-ultra/complete', 
  tier: 'medium' 
};

// Add to FAST_PROVIDERS array (xai and perplexity already there)
// Add AI21 to MEDIUM_PROVIDERS array

// Also need to update callLLMWithKey to handle AI21 format:
if (provider.name === 'ai21') {
  headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  requestBody = {
    prompt: promptText,
    maxTokens: 500,
    temperature: 0.7
  };
  
  const response = await fetch(provider.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody)
  });
  
  const data = await response.json();
  return data.completions?.[0]?.data?.text || 'No response';
}
