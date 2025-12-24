export type ResourceCategory =
  | "grief_counselor"
  | "estate_attorney"
  | "estate_cpa"
  | "estate_sale"
  | "donation_pickup"
  | "junk_removal"
  | "crisis";

export interface Resource {
  id: string;
  name: string;
  category: ResourceCategory;
  description: string;
  phone?: string;
  website?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  isNational: boolean;
  isFree: boolean;
  isOnline?: boolean;
  rating?: number;
  reviewCount?: number;
  notes?: string;
  tags?: string[];
}

export interface CategoryInfo {
  title: string;
  icon: string;
  description: string;
  whenToSeek: string[];
  whatToLookFor: Array<{
    criteria: string;
    why: string;
  }>;
  redFlags: string[];
  questionsToAsk: string[];
  costRange: {
    low: number;
    high: number;
    unit: string;
    notes: string;
  };
}

export interface ResourceFilters {
  category?: ResourceCategory;
  state?: string;
  isNational?: boolean;
  isFree?: boolean;
  query?: string;
}

// Category metadata for UI
export const CATEGORY_META: Record<
  ResourceCategory,
  { label: string; icon: string; color: string }
> = {
  grief_counselor: {
    label: "Grief Counselors",
    icon: "heart",
    color: "violet",
  },
  estate_attorney: {
    label: "Estate Attorneys",
    icon: "scale",
    color: "blue",
  },
  estate_cpa: {
    label: "CPAs & Tax Help",
    icon: "calculator",
    color: "green",
  },
  estate_sale: {
    label: "Estate Sales",
    icon: "tag",
    color: "amber",
  },
  donation_pickup: {
    label: "Donation Services",
    icon: "gift",
    color: "rose",
  },
  junk_removal: {
    label: "Junk Removal",
    icon: "truck",
    color: "stone",
  },
  crisis: {
    label: "Crisis Support",
    icon: "phone",
    color: "red",
  },
};

export const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];
