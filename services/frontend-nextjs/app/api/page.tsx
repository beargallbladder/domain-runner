"use client";

import React, { useState } from "react";

const endpoints = [
  {
    method: "GET",
    path: "/api/domains/{domain}/public",
    description: "Get comprehensive AI memory analysis for a specific domain",
    example: `curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://llm-pagerank-public-api.onrender.com/api/domains/apple.com/public`,
    response: {
      domain: "apple.com",
      memory_score: 85.7,
      ai_consensus_score: 92.3,
      reputation_risk_score: 15.2,
      model_responses: [
        {
          model: "gpt-4",
          response: "Apple Inc. is a multinational technology company...",
          sentiment: "positive",
          confidence: 0.94
        }
      ]
    }
  },
  {
    method: "GET", 
    path: "/api/time-series/{domain}",
    description: "Get historical memory score trends for a domain",
    example: `curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://llm-pagerank-public-api.onrender.com/api/time-series/apple.com?days=30`,
    response: {
      domain: "apple.com",
      time_series: [
        {
          date: "2025-06-17",
          memory_score: 85.7,
          consensus_score: 92.3,
          model_count: 16
        }
      ]
    }
  },
  {
    method: "GET",
    path: "/api/rankings",
    description: "Get brand rankings with filtering and pagination",
    example: `curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://llm-pagerank-public-api.onrender.com/api/rankings?category=technology&limit=10`,
    response: {
      domains: [
        {
          rank: 1,
          domain: "apple.com",
          memory_score: 85.7,
          category: "technology"
        }
      ]
    }
  },
  {
    method: "GET",
    path: "/api/ticker",
    description: "Real-time feed of AI memory scores across domains",
    example: `curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://llm-pagerank-public-api.onrender.com/api/ticker?limit=5`,
    response: {
      topDomains: [
        {
          domain: "apple.com",
          score: 85.7,
          change: "+2.3%",
          trend: "improving"
        }
      ]
    }
  },
  {
    method: "GET",
    path: "/api/fire-alarm-dashboard",
    description: "Get critical brand perception alerts and risks",
    example: `curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://llm-pagerank-public-api.onrender.com/api/fire-alarm-dashboard`,
    response: {
      critical_alerts: [
        {
          domain: "example.com",
          alert_type: "reputation_decline",
          severity: "high",
          memory_score: 45.2
        }
      ]
    }
  }
];

export default function APIPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState(0);
  const [apiKey, setApiKey] = useState("sk_test_...");

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-black mb-4">API Documentation</h1>
          <p className="text-xl text-gray-600">
            Access AI brand intelligence data programmatically
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Account Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-black mb-4">Account Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Plan</span>
                  <span className="font-semibold">PRO</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Domains Tracked</span>
                  <span className="font-semibold">1 / 3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">API Calls Used</span>
                  <span className="font-semibold">47 / 1,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Reset Date</span>
                  <span className="font-semibold">July 1</span>
                </div>
              </div>
            </div>

            {/* API Key */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-black mb-4">API Key</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your API Key
                  </label>
                  <div className="flex">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 text-sm bg-gray-50"
                      readOnly
                    />
                    <button className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded-r-md text-sm">
                      Copy
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Keep your API key secure. Include it in the Authorization header of your requests.
                </p>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Endpoint List */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-black mb-6">Available Endpoints</h2>
              <div className="space-y-4">
                {endpoints.map((endpoint, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedEndpoint === index 
                        ? "border-blue-500 bg-blue-50" 
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setSelectedEndpoint(index)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        endpoint.method === "GET" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {endpoint.method}
                      </span>
                      <code className="text-sm font-mono text-gray-800">{endpoint.path}</code>
                    </div>
                    <p className="text-sm text-gray-600">{endpoint.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Endpoint Details */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-bold text-black mb-4">
                {endpoints[selectedEndpoint].method} {endpoints[selectedEndpoint].path}
              </h3>
              <p className="text-gray-600 mb-6">{endpoints[selectedEndpoint].description}</p>

              {/* Example Request */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-black mb-3">Example Request</h4>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {endpoints[selectedEndpoint].example}
                  </pre>
                </div>
              </div>

              {/* Example Response */}
              <div>
                <h4 className="text-lg font-semibold text-black mb-3">Example Response</h4>
                <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                    {JSON.stringify(endpoints[selectedEndpoint].response, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Rate Limits */}
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-yellow-800 mb-3">Rate Limits & Guidelines</h3>
              <ul className="space-y-2 text-yellow-700">
                <li><strong>PRO Plan:</strong> 1,000 requests per month</li>
                <li><strong>Enterprise Plan:</strong> 10,000 requests per month</li>
                <li><strong>Rate Limit:</strong> 60 requests per minute</li>
                <li><strong>Response Format:</strong> JSON</li>
                <li><strong>Timeout:</strong> 30 seconds</li>
                <li><strong>Authentication:</strong> Bearer token in Authorization header</li>
              </ul>
            </div>

            {/* Support */}
            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Need help with the API? <a href="mailto:api@llmpagerank.com" className="text-blue-600 hover:text-blue-800">Contact our team</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 