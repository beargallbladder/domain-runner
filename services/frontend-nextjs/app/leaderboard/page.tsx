"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface DomainRanking {
  rank: number;
  domain: string;
  memory_score: number;
  ai_consensus_score: number;
  reputation_risk_score: number;
  category: string;
  trend: "improving" | "declining" | "stable";
  trend_percentage: string;
  models_positive: number;
  models_total: number;
  last_updated: string;
  grade: string;
  alerts_count: number;
}

// Mock data based on API payload examples
const mockRankings: DomainRanking[] = [
  {
    rank: 1,
    domain: "apple.com",
    memory_score: 85.7,
    ai_consensus_score: 92.3,
    reputation_risk_score: 15.2,
    category: "technology",
    trend: "stable",
    trend_percentage: "+1.2%",
    models_positive: 12,
    models_total: 16,
    last_updated: "2025-06-18T04:30:00Z",
    grade: "A+",
    alerts_count: 0
  },
  {
    rank: 2,
    domain: "microsoft.com",
    memory_score: 82.1,
    ai_consensus_score: 88.9,
    reputation_risk_score: 18.7,
    category: "technology",
    trend: "improving",
    trend_percentage: "+3.4%",
    models_positive: 11,
    models_total: 16,
    last_updated: "2025-06-18T04:27:00Z",
    grade: "A",
    alerts_count: 1
  },
  {
    rank: 3,
    domain: "google.com",
    memory_score: 79.8,
    ai_consensus_score: 85.2,
    reputation_risk_score: 22.1,
    category: "technology",
    trend: "declining",
    trend_percentage: "-2.1%",
    models_positive: 10,
    models_total: 16,
    last_updated: "2025-06-18T04:29:00Z",
    grade: "A-",
    alerts_count: 2
  },
  {
    rank: 4,
    domain: "tesla.com",
    memory_score: 78.4,
    ai_consensus_score: 67.8,
    reputation_risk_score: 28.5,
    category: "automotive",
    trend: "improving",
    trend_percentage: "+5.7%",
    models_positive: 9,
    models_total: 16,
    last_updated: "2025-06-18T04:25:00Z",
    grade: "B+",
    alerts_count: 1
  },
  {
    rank: 5,
    domain: "amazon.com",
    memory_score: 76.2,
    ai_consensus_score: 81.4,
    reputation_risk_score: 31.8,
    category: "retail",
    trend: "stable",
    trend_percentage: "+0.8%",
    models_positive: 10,
    models_total: 16,
    last_updated: "2025-06-18T04:28:00Z",
    grade: "B+",
    alerts_count: 3
  }
];

const categories = [
  { name: "All Categories", key: "all" },
  { name: "Technology", key: "technology" },
  { name: "Automotive", key: "automotive" },
  { name: "Retail", key: "retail" },
  { name: "Finance", key: "finance" }
];

type SortField = "rank" | "memory_score" | "consensus" | "trend";

export default function LeaderboardPage() {
  const [rankings, setRankings] = useState<DomainRanking[]>(mockRankings);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving": return "↗";
      case "declining": return "↘";
      default: return "→";
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "improving": return "text-green-600";
      case "declining": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const handleSort = (field: SortField) => {
    const newDirection = sortField === field && sortDirection === "asc" ? "desc" : "asc";
    setSortField(field);
    setSortDirection(newDirection);

    const sorted = [...rankings].sort((a, b) => {
      let aVal: number, bVal: number;
      
      switch (field) {
        case "memory_score":
          aVal = a.memory_score;
          bVal = b.memory_score;
          break;
        case "consensus":
          aVal = a.ai_consensus_score;
          bVal = b.ai_consensus_score;
          break;
        case "trend":
          aVal = parseFloat(a.trend_percentage.replace(/[+%-]/g, ""));
          bVal = parseFloat(b.trend_percentage.replace(/[+%-]/g, ""));
          break;
        default:
          aVal = a.rank;
          bVal = b.rank;
      }

      return newDirection === "asc" ? aVal - bVal : bVal - aVal;
    });

    setRankings(sorted);
  };

  const filteredRankings = selectedCategory === "all" 
    ? rankings 
    : rankings.filter(r => r.category === selectedCategory);

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-4">Brand Leaderboard</h1>
          <p className="text-xl text-gray-600">
            See how brands rank across AI models
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 bg-white"
            >
              {categories.map(cat => (
                <option key={cat.key} value={cat.key}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("rank")}
                >
                  Rank {sortField === "rank" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Domain
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("memory_score")}
                >
                  Memory {sortField === "memory_score" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("consensus")}
                >
                  Consensus {sortField === "consensus" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort("trend")}
                >
                  Trend {sortField === "trend" && (sortDirection === "asc" ? "↑" : "↓")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alerts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pos. Models
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRankings.map((domain) => (
                <tr key={domain.domain} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {domain.rank}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/domains/${domain.domain}`} className="text-blue-600 hover:text-blue-800 font-medium">
                      {domain.domain}
                    </Link>
                    <div className="text-xs text-gray-500 capitalize">{domain.category}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{domain.memory_score}</div>
                    <div className="text-xs text-gray-500">Grade: {domain.grade}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {domain.ai_consensus_score}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`flex items-center text-sm ${getTrendColor(domain.trend)}`}>
                      <span className="mr-1">{getTrendIcon(domain.trend)}</span>
                      {domain.trend_percentage}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {domain.alerts_count > 0 ? (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        {domain.alerts_count}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {domain.models_positive}/{domain.models_total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          Showing {filteredRankings.length} domains • Updated every hour
        </div>
      </div>
    </div>
  );
} 