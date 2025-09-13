"use client";

import React, { useState, useEffect } from "react";

interface ModelResponse {
  model: string;
  response: string;
  sentiment: "positive" | "neutral" | "negative";
  memory_strength: "strong" | "weak" | "uncertain";
  last_response_at: string;
}

const mockModelResponses: ModelResponse[] = [
  {
    model: "GPT-4",
    response: "Apple Inc. is a multinational technology company known for innovative consumer electronics...",
    sentiment: "positive",
    memory_strength: "strong",
    last_response_at: "2025-06-18T03:45:00Z"
  },
  {
    model: "Claude-3",
    response: "Apple is a leading technology company that designs premium consumer electronics.",
    sentiment: "positive",
    memory_strength: "strong", 
    last_response_at: "2025-06-18T03:47:00Z"
  },
  {
    model: "Gemini-Pro",
    response: "Apple... I think it's a tech company? They make phones and computers.",
    sentiment: "neutral",
    memory_strength: "weak",
    last_response_at: "2025-06-18T03:50:00Z"
  },
  {
    model: "LLaMA-2",
    response: "Apple is recognized globally for its iPhone, Mac, and innovative technology solutions.",
    sentiment: "positive",
    memory_strength: "strong",
    last_response_at: "2025-06-18T03:42:00Z"
  },
  {
    model: "PaLM-2",
    response: "Apple Corporation... or was it Apple Inc? Technology company, definitely.",
    sentiment: "neutral",
    memory_strength: "uncertain",
    last_response_at: "2025-06-18T03:55:00Z"
  },
  {
    model: "Mistral-7B",
    response: "Apple Inc. stands as a premier technology innovator in consumer electronics and software.",
    sentiment: "positive",
    memory_strength: "strong",
    last_response_at: "2025-06-18T03:48:00Z"
  },
  {
    model: "Cohere",
    response: "Apple is a major technology company known for iPhones, MacBooks, and digital services.",
    sentiment: "positive",
    memory_strength: "strong",
    last_response_at: "2025-06-18T03:44:00Z"
  },
  {
    model: "AI21-Jurassic",
    response: "Apple... hmm, the fruit company? No wait, the technology company with phones.",
    sentiment: "neutral",
    memory_strength: "weak",
    last_response_at: "2025-06-18T03:52:00Z"
  }
];

export default function ConsensusGrid() {
  const [visibleModels, setVisibleModels] = useState<number>(0);
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleModels(prev => {
        if (prev < mockModelResponses.length) {
          return prev + 1;
        }
        return prev;
      });
    }, 800);

    return () => clearInterval(timer);
  }, []);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "border-green-400 bg-green-50";
      case "negative": return "border-red-400 bg-red-50";
      default: return "border-yellow-400 bg-yellow-50";
    }
  };

  const getMemoryOpacity = (strength: string) => {
    switch (strength) {
      case "strong": return "opacity-100";
      case "weak": return "opacity-60";
      default: return "opacity-40";
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {mockModelResponses.slice(0, visibleModels).map((model, index) => (
        <div
          key={model.model}
          className={`
            relative p-6 border-2 rounded-lg cursor-pointer transition-all duration-500 transform
            ${getSentimentColor(model.sentiment)}
            ${getMemoryOpacity(model.memory_strength)}
            hover:scale-105 hover:shadow-lg
            animate-in fade-in slide-in-from-bottom-4
          `}
          style={{ animationDelay: `${index * 200}ms` }}
          onMouseEnter={() => setHoveredModel(model.model)}
          onMouseLeave={() => setHoveredModel(null)}
        >
          {/* Model Name */}
          <div className="font-semibold text-sm mb-2 text-gray-800">
            {model.model}
          </div>

          {/* Sentiment Indicator */}
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-3 h-3 rounded-full ${
              model.sentiment === "positive" ? "bg-green-500" :
              model.sentiment === "negative" ? "bg-red-500" : "bg-yellow-500"
            }`} />
            <span className="text-xs text-gray-600 capitalize">{model.sentiment}</span>
          </div>

          {/* Response Preview */}
          <div className="text-xs text-gray-700 line-clamp-3">
            {model.response}
          </div>

          {/* Memory Strength */}
          <div className="mt-3 text-xs text-gray-500 capitalize">
            Memory: {model.memory_strength}
          </div>

          {/* Tooltip on Hover */}
          {hoveredModel === model.model && (
            <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 bg-black text-white text-xs rounded-lg shadow-lg max-w-xs">
              <div className="font-medium mb-1">{model.model}</div>
              <div className="mb-1">Sentiment: {model.sentiment}</div>
              <div className="mb-1">Memory: {model.memory_strength}</div>
              <div>Last response: {new Date(model.last_response_at).toLocaleTimeString()}</div>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
            </div>
          )}
        </div>
      ))}

      {/* Empty slots for animation */}
      {Array.from({ length: mockModelResponses.length - visibleModels }).map((_, index) => (
        <div
          key={`empty-${index}`}
          className="p-6 border-2 border-gray-200 rounded-lg opacity-30 animate-pulse"
        >
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-3 bg-gray-200 rounded mb-3"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
        </div>
      ))}
    </div>
  );
} 