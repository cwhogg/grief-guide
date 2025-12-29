"use client";

import { useState, useEffect } from "react";

interface FuneralHomeSearchProps {
  zipCode: string;
  onComplete?: () => void;
}

interface FuneralHome {
  name: string;
  address: string;
  phone: string;
  available24h: boolean;
}

interface SearchResult {
  zipCode: string;
  funeralHomes: FuneralHome[];
  callPrompts: string[];
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
        setError("Couldn't search right now. Try again in a moment.");
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
          Search on Google Maps
        </a>
      </div>
    );
  }

  if (!result) return null;

  // Clean phone number for tel: link
  const cleanPhone = (phone: string) => phone.replace(/[^0-9+]/g, "");

  return (
    <div className="my-3 p-4 bg-white border border-[var(--primary-200)] rounded-[var(--radius-lg)] shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-[var(--primary-100)] flex items-center justify-center">
          <svg className="w-4 h-4 text-[var(--primary-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        </div>
        <h3 className="font-semibold text-[var(--gray-900)]">Funeral Homes Near {zipCode}</h3>
      </div>

      {/* Funeral Home Listings */}
      <div className="space-y-3 mb-4">
        {result.funeralHomes.map((home, i) => (
          <div key={i} className="p-3 bg-[var(--gray-50)] rounded-[var(--radius-md)] border border-[var(--gray-100)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-[var(--gray-900)] text-sm">{home.name}</h4>
                <p className="text-xs text-[var(--gray-500)] mt-0.5">{home.address}</p>
                {home.available24h && (
                  <span className="inline-flex items-center gap-1 mt-1 text-xs text-[var(--primary-600)]">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    24/7
                  </span>
                )}
              </div>
              <a
                href={`tel:${cleanPhone(home.phone)}`}
                className="flex-shrink-0 px-3 py-2 bg-[var(--primary-500)] text-white text-sm font-medium rounded-[var(--radius-md)] hover:bg-[var(--primary-600)] transition-colors"
              >
                {home.phone}
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* What to Say */}
      {result.callPrompts && result.callPrompts.length > 0 && (
        <div className="p-3 bg-[var(--accent-400)]/10 border border-[var(--accent-400)]/30 rounded-[var(--radius-md)]">
          <h4 className="font-medium text-[var(--gray-900)] text-sm mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--accent-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            What to say when you call
          </h4>
          <ul className="space-y-2">
            {result.callPrompts.map((prompt, i) => (
              <li key={i} className="text-sm text-[var(--gray-700)] flex items-start gap-2">
                <span className="text-[var(--accent-500)] font-medium mt-0.5">"</span>
                <span className="italic">{prompt}</span>
                <span className="text-[var(--accent-500)] font-medium mt-0.5">"</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fallback link */}
      <div className="mt-4 pt-3 border-t border-[var(--gray-100)]">
        <a
          href={`https://www.google.com/maps/search/funeral+homes+near+${zipCode}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[var(--primary-600)] hover:text-[var(--primary-700)] flex items-center gap-1"
        >
          See more on Google Maps
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
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
