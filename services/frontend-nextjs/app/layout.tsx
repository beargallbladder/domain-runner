import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LLMPageRank - AI Brand Intelligence",
  description: "Discover how AI models perceive your brand. Real-time tracking of brand memory across LLMs.",
  keywords: ["AI", "brand intelligence", "LLM", "brand perception", "artificial intelligence"],
  openGraph: {
    title: "LLMPageRank - AI Brand Intelligence",
    description: "Discover how AI models perceive your brand",
    url: "https://llmpagerank.com",
    siteName: "LLMPageRank",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-white text-black`}>
        <Navigation />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
} 