"use client";

import React from "react";

const faqs = [
  {
    question: "What is LLMPageRank?",
    answer: "LLMPageRank is an AI brand intelligence platform that tracks how large language models (LLMs) remember and perceive your brand. We measure brand memory across 16+ AI models including GPT-4, Claude-3, Gemini-Pro, and more to give you unprecedented insights into your digital brand presence."
  },
  {
    question: "Why does memory in LLMs matter?",
    answer: "As AI becomes the primary interface for information discovery, how AI models remember your brand directly impacts your visibility and reputation. When someone asks an AI about your industry, you want to be remembered accurately and positively. Memory decay in AI models can signal declining brand relevance before it shows up in traditional metrics."
  },
  {
    question: "What's a Memory Score?",
    answer: "Your Memory Score (0-100) measures how well AI models recall your brand when prompted. It combines factors like recognition accuracy, response consistency, sentiment, and confidence levels across multiple models. A higher score means stronger, more positive AI memory of your brand."
  },
  {
    question: "How is this different than SEO?",
    answer: "Traditional SEO optimizes for search engines, but AI models don't crawl the web in real-time. They're trained on historical data and develop persistent 'memories' of brands. LLMPageRank measures these memories directly, giving you insights into how AI will represent your brand in conversations, recommendations, and decisions."
  },
  {
    question: "What do I get at each tier?",
    answer: "Free tier gives you public brand pages with basic memory scores. PRO ($99/mo) unlocks tracking for your domain, full model responses, time series analysis, and competitive benchmarks. Enterprise ($249/mo) includes multi-domain tracking, API access, and advanced cohort comparisons."
  },
  {
    question: "How often is data updated?",
    answer: "We continuously monitor AI model responses and update memory scores every few hours. Our system tracks changes in real-time, so you'll know immediately when your brand perception shifts across AI models."
  },
  {
    question: "Which AI models do you track?",
    answer: "We monitor 16+ leading AI models including GPT-4, Claude-3, Gemini-Pro, LLaMA-2, PaLM-2, Mistral, Cohere, and others. Our coverage expands as new models gain prominence in the AI landscape."
  },
  {
    question: "Can I improve my AI memory score?",
    answer: "Yes. Strong, consistent content creation, thought leadership, and positive brand associations help improve AI memory over time. We provide specific recommendations based on your current perception patterns and competitive positioning."
  }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-black mb-6">About LLMPageRank</h1>
          <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
            We measure the shadows so you can shape the light. Understanding how AI models perceive your brand is the new frontier of digital intelligence.
          </p>
        </div>

        {/* Mission Statement */}
        <div className="mb-16 p-8 bg-gray-50 rounded-lg">
          <h2 className="text-2xl font-bold text-black mb-4">Our Mission</h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            As artificial intelligence becomes the primary interface between humans and information, brand perception in AI models will determine business success. We provide the tools and insights needed to monitor, understand, and optimize how AI remembers your brand.
          </p>
        </div>

        {/* FAQ Section */}
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-black text-center mb-12">Frequently Asked Questions</h2>
          
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-200 pb-8">
              <h3 className="text-xl font-semibold text-black mb-4">{faq.question}</h3>
              <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-black text-white rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Ready to Track Your Brand?</h2>
            <p className="text-gray-300 mb-6">
              See how AI models perceive your brand and get actionable insights to improve your digital presence.
            </p>
            <button className="bg-white text-black px-8 py-3 rounded-md font-semibold hover:bg-gray-100 transition-colors">
              Start Free Analysis →
            </button>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-16 text-center text-gray-600">
          <p>Questions? Reach out to us at hello@llmpagerank.com</p>
        </div>
      </div>
    </div>
  );
} 