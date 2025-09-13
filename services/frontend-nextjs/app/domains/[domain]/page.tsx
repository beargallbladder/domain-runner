"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface ModelResponse {
  model: string;
  response: string;
  sentiment: "positive" | "neutral" | "negative";
  confidence: number;
  memory_strength: "strong" | "weak";
  last_response_at: string;
}

interface DomainData {
  domain: string;
  memory_score: number;
  ai_consensus_score: number;
  reputation_risk_score: number;
  brand_confusion_alert: boolean;
  perception_decline_alert: boolean;
  last_updated: string;
  model_responses: ModelResponse[];
  competitive_context: {
    memory_percentile: number;
    consensus_percentile: number;
    risk_percentile: number;
    grade: string;
    rank: number;
    total_domains: number;
  };
  alerts: Array<{
    type: string;
    severity: string;
    message: string;
    triggered_at: string;
  }>;
  time_series_preview: {
    trend: string;
    "7_day_change": string;
    "30_day_change": string;
    volatility: string;
  };
}

// Mock data based on API payload
const mockDomainData: DomainData = {
  domain: "apple.com",
  memory_score: 85.7,
  ai_consensus_score: 92.3,
  reputation_risk_score: 15.2,
  brand_confusion_alert: false,
  perception_decline_alert: false,
  last_updated: "2025-06-18T04:30:00Z",
  model_responses: [
    {
      model: "gpt-4",
      response: "Apple Inc. is a multinational technology company known for innovative consumer electronics, software, and services.",
      sentiment: "positive",
      confidence: 0.94,
      memory_strength: "strong",
      last_response_at: "2025-06-18T03:45:00Z"
    },
    {
      model: "claude-3",
      response: "Apple is a leading technology company that designs and manufactures premium consumer electronics.",
      sentiment: "positive",
      confidence: 0.91,
      memory_strength: "strong",
      last_response_at: "2025-06-18T03:47:00Z"
    },
    {
      model: "gemini-pro",
      response: "Apple... I think it's a tech company? They make phones and computers.",
      sentiment: "neutral",
      confidence: 0.67,
      memory_strength: "weak",
      last_response_at: "2025-06-18T03:50:00Z"
    }
  ],
  competitive_context: {
    memory_percentile: 87.5,
    consensus_percentile: 91.2,
    risk_percentile: 12.3,
    grade: "A+",
    rank: 1,
    total_domains: 549
  },
  alerts: [
    {
      type: "fire_alarm",
      severity: "low",
      message: "Brand perception stable across all models",
      triggered_at: "2025-06-18T04:00:00Z"
    }
  ],
  time_series_preview: {
    trend: "stable",
    "7_day_change": "+1.2%",
    "30_day_change": "+4.7%",
    volatility: "low"
  }
};

export default function DomainPage() {
  const params = useParams();
  const domain = params?.domain as string;
  const [data, setData] = useState<DomainData | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  useEffect(() => {
    // In real app, fetch data from API using domain parameter
    // For now, use mock data
    setData(mockDomainData);
  }, [domain]);

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading domain analysis...</div>
      </div>
    );
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "🟢";
      case "negative": return "🔴";
      default: return "🟡";
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive": return "border-green-200 bg-green-50";
      case "negative": return "border-red-200 bg-red-50";
      default: return "border-yellow-200 bg-yellow-50";
    }
  };

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">{data.domain}</h1>
          <p className="text-xl text-gray-600">
            AI Memory Analysis • Last updated {new Date(data.last_updated).toLocaleString()}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Memory Scores KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Memory Score</h3>
                <div className="text-3xl font-bold text-black">{data.memory_score}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {data.competitive_context.memory_percentile}th percentile
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">AI Consensus</h3>
                <div className="text-3xl font-bold text-black">{data.ai_consensus_score}%</div>
                <div className="text-sm text-gray-600 mt-1">
                  {data.competitive_context.consensus_percentile}th percentile
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Risk Score</h3>
                <div className="text-3xl font-bold text-black">{data.reputation_risk_score}</div>
                <div className="text-sm text-gray-600 mt-1">
                  Grade: {data.competitive_context.grade}
                </div>
              </div>
            </div>

            {/* Live Consensus Panel */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-black mb-6">Live Model Consensus</h2>
              <div className="space-y-4">
                {data.model_responses.slice(0, 3).map((response, index) => (
                  <div 
                    key={response.model}
                    className={`p-4 border rounded-lg ${getSentimentColor(response.sentiment)}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">{response.model}</span>
                        <span className="text-sm">{getSentimentIcon(response.sentiment)}</span>
                        <span className="text-xs text-gray-600 capitalize">
                          {response.memory_strength} memory
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(response.last_response_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-gray-700 text-sm leading-relaxed">
                      {response.response}
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Confidence: {Math.round(response.confidence * 100)}%
                    </div>
                  </div>
                ))}
              </div>

              {/* Upgrade Prompt for More Models */}
              <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">See All {data.model_responses.length}+ Model Responses</h3>
                    <p className="text-sm text-gray-600">Unlock full model memory panel including GPT-4, Claude-3, and more</p>
                  </div>
                  <button 
                    onClick={() => setShowUpgradePrompt(true)}
                    className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
                  >
                    Upgrade to PRO →
                  </button>
                </div>
              </div>
            </div>

            {/* Tensor Timeline Preview */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-black mb-6">Memory Timeline</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-800">{data.time_series_preview.trend}</div>
                  <div className="text-xs text-gray-500">Overall Trend</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">{data.time_series_preview["7_day_change"]}</div>
                  <div className="text-xs text-gray-500">7-Day Change</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">{data.time_series_preview["30_day_change"]}</div>
                  <div className="text-xs text-gray-500">30-Day Change</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-600">{data.time_series_preview.volatility}</div>
                  <div className="text-xs text-gray-500">Volatility</div>
                </div>
              </div>
              
              {/* Sparkline Placeholder */}
              <div className="h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-500 text-sm">📈 Sparkline visualization (30-day memory trend)</span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Competitive Context */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-black mb-4">Competitive Position</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Rank</span>
                  <span className="font-semibold">
                    #{data.competitive_context.rank} of {data.competitive_context.total_domains}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Grade</span>
                  <span className="font-semibold">{data.competitive_context.grade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Memory Percentile</span>
                  <span className="font-semibold">{data.competitive_context.memory_percentile}th</span>
                </div>
              </div>
            </div>

            {/* Alerts */}
            {data.alerts.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-black mb-4">Active Alerts</h3>
                <div className="space-y-3">
                  {data.alerts.map((alert, index) => (
                    <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="font-medium text-blue-800 text-sm mb-1">
                        {alert.type.replace('_', ' ').toUpperCase()}
                      </div>
                      <div className="text-blue-700 text-sm">{alert.message}</div>
                      <div className="text-blue-600 text-xs mt-1">
                        {new Date(alert.triggered_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upgrade CTA */}
            <div className="bg-black text-white rounded-lg p-6">
              <h3 className="text-lg font-bold mb-2">Unlock Full Analysis</h3>
              <p className="text-gray-300 text-sm mb-4">
                Get complete model responses, time series data, and competitive insights.
              </p>
              <button className="w-full bg-white text-black py-2 px-4 rounded-md font-medium hover:bg-gray-100">
                Upgrade to PRO - $99/mo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 