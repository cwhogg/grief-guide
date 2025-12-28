"use client";

import type { Resource, ResourceCategory } from "@/lib/resources/types";

interface ChatResourceCardProps {
  resource: Resource;
  onMoreOptions?: () => void;
}

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  grief_counselor: "Grief Counselor",
  estate_attorney: "Estate Attorney",
  estate_cpa: "CPA / Tax Help",
  estate_sale: "Estate Sale",
  donation_pickup: "Donation Service",
  junk_removal: "Junk Removal",
  crisis: "Crisis Support",
};

const CATEGORY_COLORS: Record<ResourceCategory, { bg: string; text: string; border: string }> = {
  grief_counselor: { bg: "bg-[var(--purple-light)]/30", text: "text-[var(--purple-main)]", border: "border-[var(--purple-light)]" },
  estate_attorney: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  estate_cpa: { bg: "bg-[var(--primary-50)]", text: "text-[var(--primary-700)]", border: "border-[var(--primary-200)]" },
  estate_sale: { bg: "bg-[var(--accent-400)]/20", text: "text-[var(--accent-600)]", border: "border-[var(--accent-400)]/40" },
  donation_pickup: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  junk_removal: { bg: "bg-[var(--gray-100)]", text: "text-[var(--gray-700)]", border: "border-[var(--gray-300)]" },
  crisis: { bg: "bg-[var(--error)]/10", text: "text-[var(--error)]", border: "border-[var(--error)]/30" },
};

export function ChatResourceCard({ resource, onMoreOptions }: ChatResourceCardProps) {
  const colors = CATEGORY_COLORS[resource.category];
  const categoryLabel = CATEGORY_LABELS[resource.category];

  // Build tags
  const tags: string[] = [];
  if (resource.isNational) tags.push("National");
  if (resource.isFree) tags.push("Free");
  if (resource.isOnline) tags.push("Online");

  const truncatedDescription = resource.description.length > 100
    ? resource.description.slice(0, 100) + "..."
    : resource.description;

  return (
    <div className={`my-2 bg-white border ${colors.border} rounded-[var(--radius-lg)] overflow-hidden shadow-sm`}>
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-[var(--radius-md)] ${colors.bg} flex items-center justify-center flex-shrink-0`}>
            {resource.category === "grief_counselor" && (
              <svg className={`w-5 h-5 ${colors.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
            {resource.category === "estate_attorney" && (
              <svg className={`w-5 h-5 ${colors.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            )}
            {resource.category === "estate_cpa" && (
              <svg className={`w-5 h-5 ${colors.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            )}
            {(resource.category === "estate_sale" || resource.category === "donation_pickup" || resource.category === "junk_removal") && (
              <svg className={`w-5 h-5 ${colors.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            )}
            {resource.category === "crisis" && (
              <svg className={`w-5 h-5 ${colors.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name and category */}
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-[var(--gray-900)]">{resource.name}</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                {categoryLabel}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm text-[var(--gray-500)] mt-1">{truncatedDescription}</p>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex gap-1.5 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-[var(--gray-100)] text-[var(--gray-600)] rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-3 py-2 border-t border-[var(--gray-100)] flex flex-wrap gap-2">
        {resource.website && (
          <a
            href={resource.website}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 min-w-[100px] px-4 py-2.5 text-sm font-medium ${colors.text} ${colors.bg} border ${colors.border} rounded-[var(--radius-md)] hover:opacity-80 transition-opacity text-center`}
          >
            Visit website
          </a>
        )}
        {resource.phone && (
          <a
            href={`tel:${resource.phone}`}
            className="px-4 py-2.5 text-sm font-medium text-[var(--gray-700)] bg-[var(--gray-50)] border border-[var(--gray-200)] rounded-[var(--radius-md)] hover:bg-[var(--gray-100)] transition-colors"
          >
            Call {resource.phone}
          </a>
        )}
        {onMoreOptions && (
          <button
            onClick={onMoreOptions}
            className="px-4 py-2.5 text-sm text-[var(--gray-500)] border border-[var(--gray-200)] rounded-[var(--radius-md)] hover:bg-[var(--gray-50)] transition-colors"
          >
            More options
          </button>
        )}
      </div>
    </div>
  );
}

// Parser for resource references in message content
// Format: [resource:resource_id] or [[resource:resource_id]]
export function parseResourceReferences(content: string): {
  resourceIds: string[];
  contentWithoutRefs: string;
} {
  const resourcePattern = /\[\[?resource:([a-zA-Z0-9_-]+)\]\]?/g;
  const resourceIds: string[] = [];
  let contentWithoutRefs = content;
  let match;

  while ((match = resourcePattern.exec(content)) !== null) {
    resourceIds.push(match[1]);
    contentWithoutRefs = contentWithoutRefs.replace(match[0], "").trim();
  }

  return { resourceIds, contentWithoutRefs };
}

// Category selector component for asking what kind of help
interface ResourceCategorySelectorProps {
  onSelect: (category: ResourceCategory) => void;
}

export function ResourceCategorySelector({ onSelect }: ResourceCategorySelectorProps) {
  const categories: { id: ResourceCategory; label: string; description: string }[] = [
    { id: "grief_counselor", label: "Grief Counselor", description: "Someone to talk to about your feelings" },
    { id: "estate_attorney", label: "Estate Attorney", description: "Legal help with wills and probate" },
    { id: "estate_cpa", label: "CPA / Tax Help", description: "Help with taxes and financial matters" },
    { id: "estate_sale", label: "Estate Sale Service", description: "Help selling belongings" },
    { id: "donation_pickup", label: "Donation Pickup", description: "Someone to pick up items to donate" },
    { id: "junk_removal", label: "Junk Removal", description: "Help clearing out a home" },
  ];

  return (
    <div className="my-2 bg-white border border-[var(--gray-200)] rounded-[var(--radius-lg)] overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-[var(--gray-100)]">
        <h4 className="font-medium text-[var(--gray-900)]">What kind of help are you looking for?</h4>
      </div>
      <div className="p-2 space-y-1">
        {categories.map((cat) => {
          const colors = CATEGORY_COLORS[cat.id];
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className="w-full p-3 text-left rounded-[var(--radius-md)] hover:bg-[var(--gray-50)] transition-colors flex items-center gap-3"
            >
              <div className={`w-8 h-8 rounded-[var(--radius-md)] ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                <div className={`w-3 h-3 rounded-full ${colors.text.replace('text-', 'bg-')}`} />
              </div>
              <div>
                <div className="font-medium text-[var(--gray-900)] text-sm">{cat.label}</div>
                <div className="text-xs text-[var(--gray-500)]">{cat.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
