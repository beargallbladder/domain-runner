"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/about", label: "About" },
    { href: "/api", label: "API" }
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-black">
            LLMPageRank
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "text-black border-b-2 border-black"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA Button */}
          <div className="flex items-center space-x-4">
            <button className="bg-black text-white px-4 py-2 text-sm font-medium rounded hover:bg-gray-800 transition-colors">
              Track Your Brand
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 