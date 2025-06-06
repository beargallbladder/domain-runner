"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const openai_1 = require("openai");
const sdk_1 = require("@anthropic-ai/sdk");
const axios_1 = __importDefault(require("axios"));
const fs_1 = require("fs");
const path_1 = require("path");
const db_1 = require("./db");
// Load configs
const llmConfig = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../models/llm-config.json'), 'utf-8'));
const promptTemplates = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../prompts/triad-001.json'), 'utf-8'));
// API clients
const openai = new openai_1.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new sdk_1.Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
async function getRawLLMResponse(model, config, prompt) {
    try {
        switch (config.provider) {
            case 'openai':
                const openaiResponse = await openai.chat.completions.create({
                    model: config.model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: config.max_tokens
                });
                return openaiResponse.choices[0].message.content || '';
            case 'anthropic':
                const anthropicResponse = await anthropic.messages.create({
                    model: config.model,
                    max_tokens: config.max_tokens,
                    messages: [{ role: 'user', content: prompt }]
                });
                return anthropicResponse.content[0].text;
            default:
                const apiResponse = await axios_1.default.post(config.endpoint, {
                    model: config.model,
                    prompt: prompt,
                    max_tokens: config.max_tokens
                }, {
                    headers: {
                        'Authorization': `Bearer ${process.env[config.env_key]}`,
                        'Content-Type': 'application/json'
                    }
                });
                const data = apiResponse.data;
                return data.choices?.[0]?.text || data.generations?.[0]?.text || '';
        }
    }
    catch (error) {
        console.error(`Error calling ${model}:`, error);
        return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
}
async function captureDomain(domain) {
    for (const [model, config] of Object.entries(llmConfig)) {
        for (const promptTemplate of promptTemplates.prompts) {
            const prompt = promptTemplate.template.replace('{domain}', domain);
            console.log(`Capturing ${domain} with ${model} using ${promptTemplate.id}`);
            const startTime = Date.now();
            const response = await getRawLLMResponse(model, config, prompt);
            const latencyMs = Date.now() - startTime;
            await (0, db_1.saveRawResponse)({
                domain,
                model,
                prompt_template_id: promptTemplate.id,
                interpolated_prompt: prompt,
                response,
                latency_ms: latencyMs,
                token_usage: {}, // Store empty object, downstream can parse if needed
                cost_estimate: 0 // Removed cost calculation
            });
        }
    }
}
async function main() {
    try {
        const domains = await (0, db_1.getDomains)();
        for (const domain of domains) {
            await captureDomain(domain.domain);
        }
    }
    catch (error) {
        console.error('Error:', error);
    }
    finally {
        await (0, db_1.cleanup)();
    }
}
main();
