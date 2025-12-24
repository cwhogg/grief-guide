"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import {
  CATEGORY_META,
  US_STATES,
  type Resource,
  type ResourceCategory,
  type CategoryInfo,
} from "@/lib/resources/types";

const CATEGORY_ICONS: Record<string, ReactNode> = {
  heart: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  scale: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  ),
  calculator: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  tag: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  gift: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  ),
  truck: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  phone: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
};

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  violet: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  green: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  rose: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  stone: { bg: "bg-stone-100", text: "text-stone-700", border: "border-stone-200" },
  red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

export default function ResourcesPage() {
  const router = useRouter();
  const { user, profile, isLoading: userLoading, initialize } = useUser();

  const [resources, setResources] = useState<Resource[]>([]);
  const [guidance, setGuidance] = useState<CategoryInfo | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory | null>(null);
  const [selectedState, setSelectedState] = useState<string>("");
  const [showNationalOnly, setShowNationalOnly] = useState(false);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showGuidance, setShowGuidance] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
  }, [userLoading, user, router]);

  // Set default state from user profile
  useEffect(() => {
    if (profile?.state && !selectedState) {
      setSelectedState(profile.state);
    }
  }, [profile, selectedState]);

  const fetchResources = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      if (selectedState) params.set("state", selectedState);
      if (showNationalOnly) params.set("isNational", "true");
      if (showFreeOnly) params.set("isFree", "true");
      if (searchQuery) params.set("query", searchQuery);
      if (selectedCategory) params.set("includeGuidance", "true");

      const response = await fetch(`/api/resources?${params}`);
      if (!response.ok) throw new Error("Failed to fetch resources");

      const data = await response.json();
      setResources(data.resources);
      setGuidance(data.guidance);
    } catch (error) {
      console.error("Error fetching resources:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, selectedState, showNationalOnly, showFreeOnly, searchQuery]);

  useEffect(() => {
    if (user) {
      fetchResources();
    }
  }, [user, fetchResources]);

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const categories = Object.entries(CATEGORY_META).filter(
    ([key]) => key !== "crisis"
  );

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-stone-900">
                Find Help
              </h1>
              <p className="text-stone-500 mt-1">
                Professional services to help you through this process
              </p>
            </div>
            <nav className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-stone-600 hover:text-stone-900"
              >
                Dashboard
              </Link>
              <Link
                href="/tasks"
                className="text-stone-600 hover:text-stone-900"
              >
                Tasks
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Crisis Banner */}
        <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              {CATEGORY_ICONS.phone}
            </div>
            <div className="flex-1">
              <p className="font-medium text-red-900">
                In crisis or need immediate support?
              </p>
              <p className="text-sm text-red-700">
                Call or text <strong>988</strong> for the Suicide & Crisis
                Lifeline, available 24/7
              </p>
            </div>
            <a
              href="tel:988"
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Call 988
            </a>
          </div>
        </div>

        {/* Category Selection */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">
            What do you need help with?
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map(([key, meta]) => {
              const isSelected = selectedCategory === key;
              const colors = COLOR_CLASSES[meta.color];
              return (
                <button
                  key={key}
                  onClick={() =>
                    setSelectedCategory(isSelected ? null : (key as ResourceCategory))
                  }
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? `${colors.bg} ${colors.border} ring-2 ring-offset-2 ring-${meta.color}-300`
                      : "bg-white border-stone-200 hover:border-stone-300"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg ${colors.bg} ${colors.text} flex items-center justify-center mb-2`}
                  >
                    {CATEGORY_ICONS[meta.icon]}
                  </div>
                  <p
                    className={`font-medium text-sm ${
                      isSelected ? colors.text : "text-stone-900"
                    }`}
                  >
                    {meta.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resources..."
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:border-amber-600"
              />
            </div>
            <div className="min-w-[180px]">
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-600 focus:border-amber-600"
              >
                <option value="">All locations</option>
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showNationalOnly}
                onChange={(e) => setShowNationalOnly(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-600"
              />
              <span className="text-sm text-stone-600">National/Online only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showFreeOnly}
                onChange={(e) => setShowFreeOnly(e.target.checked)}
                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-600"
              />
              <span className="text-sm text-stone-600">Free services only</span>
            </label>
          </div>
        </div>

        {/* Category Guidance */}
        {guidance && selectedCategory && (
          <div className="mb-6">
            <button
              onClick={() => setShowGuidance(!showGuidance)}
              className="flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium"
            >
              <svg
                className={`w-5 h-5 transition-transform ${
                  showGuidance ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              {showGuidance
                ? "Hide guidance"
                : `What to look for in ${guidance.title.toLowerCase()}`}
            </button>

            {showGuidance && (
              <div className="mt-4 bg-white rounded-xl border border-stone-200 p-6 space-y-6">
                <div>
                  <h3 className="font-semibold text-stone-900 mb-2">
                    When to seek this help
                  </h3>
                  <ul className="space-y-1">
                    {guidance.whenToSeek.map((item, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-stone-600"
                      >
                        <svg
                          className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-stone-900 mb-2">
                    What to look for
                  </h3>
                  <div className="space-y-3">
                    {guidance.whatToLookFor.map((item, index) => (
                      <div key={index} className="bg-stone-50 rounded-lg p-3">
                        <p className="font-medium text-stone-900">
                          {item.criteria}
                        </p>
                        <p className="text-sm text-stone-600 mt-1">{item.why}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-red-800 mb-2">
                      Red flags to avoid
                    </h3>
                    <ul className="space-y-1">
                      {guidance.redFlags.map((flag, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-red-700 text-sm"
                        >
                          <svg
                            className="w-4 h-4 mt-0.5 flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-stone-900 mb-2">
                      Questions to ask
                    </h3>
                    <ul className="space-y-1">
                      {guidance.questionsToAsk.slice(0, 5).map((q, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-stone-600 text-sm"
                        >
                          <span className="text-amber-600 font-medium">Q:</span>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <h3 className="font-semibold text-amber-900 mb-1">
                    Typical costs
                  </h3>
                  <p className="text-amber-800">
                    ${guidance.costRange.low.toLocaleString()} - $
                    {guidance.costRange.high.toLocaleString()}{" "}
                    {guidance.costRange.unit}
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    {guidance.costRange.notes}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resources List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-stone-500">Loading resources...</div>
          </div>
        ) : resources.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
            <svg
              className="w-12 h-12 mx-auto text-stone-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-stone-900">
              No resources found
            </h3>
            <p className="mt-2 text-stone-500">
              Try adjusting your filters or search terms
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-stone-500">
              {resources.length} resource{resources.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {resources.map((resource) => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  const meta = CATEGORY_META[resource.category];
  const colors = COLOR_CLASSES[meta?.color || "stone"];

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-lg ${colors.bg} ${colors.text} flex items-center justify-center flex-shrink-0`}
        >
          {CATEGORY_ICONS[meta?.icon || "heart"]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-stone-900">{resource.name}</h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {resource.isNational && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  National
                </span>
              )}
              {resource.isFree && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Free
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-stone-600 mt-1 line-clamp-2">
            {resource.description}
          </p>
          {resource.notes && (
            <p className="text-xs text-stone-500 mt-2 italic">
              {resource.notes}
            </p>
          )}
          <div className="flex items-center gap-4 mt-3">
            {resource.website && (
              <a
                href={resource.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
              >
                Visit website
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            )}
            {resource.phone && (
              <a
                href={`tel:${resource.phone}`}
                className="text-sm text-stone-600 hover:text-stone-900 flex items-center gap-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                {resource.phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
