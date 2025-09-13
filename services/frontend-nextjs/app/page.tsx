import React from "react";
import ConsensusGrid from "@/components/ConsensusGrid";
import Hero from "@/components/Hero";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <Hero />
      
      {/* Consensus Grid */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <ConsensusGrid />
        </div>
      </section>

      {/* Tagline & CTA */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
            Some remember you. Some hesitate. Some already forgot.
          </p>
          <button className="bg-black text-white px-8 py-4 text-lg font-medium hover:bg-gray-800 transition-colors">
            Track Your Brand →
          </button>
        </div>
      </section>
    </div>
  );
} 