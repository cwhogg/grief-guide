"use client";

import { useState, useEffect } from "react";

interface FuneralHomeSearchProps {
  zipCode: string;
  onComplete?: () => void;
}

interface SearchResult {
  zipCode: string;
  searchUrl: string;
  guidance: string;
  questionsToAsk: string[];
}

export function FuneralHomeSearch({ zipCode, onComplete }: FuneralHomeSearchProps) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function search() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/search/funeral-homes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ zipCode }),
        });

        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data = await response.json();
        setResult(data);
        onComplete?.();
      } catch (err) {
        setError("Couldn't search right now. Try searching Google Maps directly.");
        console.error("Funeral home search error:", err);
      } finally {
        setLoading(false);
      }
    }

    search();
  }, [zipCode, onComplete]);

  if (loading) {
    return (
      <div className="my-3 p-4 bg-white border border-[var(--gray-200)] rounded-[var(--radius-lg)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--primary-100)] flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--primary-500)] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <span className="text-[var(--gray-600)]">Finding funeral homes near {zipCode}...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-3 p-4 bg-white border border-[var(--gray-200)] rounded-[var(--radius-lg)]">
        <p className="text-[var(--gray-600)] mb-3">{error}</p>
        <a
          href={`https://www.google.com/maps/search/funeral+homes+near+${zipCode}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--primary-500)] text-white rounded-[var(--radius-md)] font-medium hover:bg-[var(--primary-600)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search on Google Maps
        </a>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="my-3 space-y-3">
      {/* Search Results Card */}
      <div className="p-4 bg-white border border-[var(--primary-200)] rounded-[var(--radius-lg)] shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[var(--primary-100)] flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[var(--primary-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-[var(--gray-900)]">Funeral Homes Near {zipCode}</h3>
            <p className="text-sm text-[var(--gray-600)] mt-1">{result.guidance}</p>
          </div>
        </div>

        {/* Search Button */}
        <a
          href={result.searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-[var(--primary-500)] text-white rounded-[var(--radius-md)] font-medium hover:bg-[var(--primary-600)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          View Funeral Homes on Google Maps
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Questions to Ask */}
      {result.questionsToAsk && result.questionsToAsk.length > 0 && (
        <div className="p-4 bg-[var(--accent-400)]/10 border border-[var(--accent-400)]/30 rounded-[var(--radius-lg)]">
          <h4 className="font-medium text-[var(--gray-900)] mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--accent-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Questions to Ask When You Call
          </h4>
          <ul className="space-y-2">
            {result.questionsToAsk.map((question, i) => (
              <li key={i} className="text-sm text-[var(--gray-700)] flex items-start gap-2">
                <span className="text-[var(--accent-500)] mt-0.5">•</span>
                {question}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Parser to extract funeral home search from message content
export function parseFuneralHomeSearch(content: string): { hasSearch: boolean; zipCode: string | null; remainingContent: string } {
  const pattern = /\[funeral-home-search:(\d{5})\]/;
  const match = content.match(pattern);

  if (match) {
    return {
      hasSearch: true,
      zipCode: match[1],
      remainingContent: content.replace(pattern, "").trim(),
    };
  }

  return {
    hasSearch: false,
    zipCode: null,
    remainingContent: content,
  };
}
