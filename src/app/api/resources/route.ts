import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Resource, ResourceCategory, CategoryInfo } from "@/lib/resources/types";

// Import the guidance data
import resourceData from "../../../../docs/knowledge/resources/what-to-look-for.json";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication (optional for resources, but good to have)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as ResourceCategory | null;
    const state = searchParams.get("state");
    const isNational = searchParams.get("isNational");
    const isFree = searchParams.get("isFree");
    const query = searchParams.get("query");
    const includeGuidance = searchParams.get("includeGuidance") === "true";

    // Start with national resources from our knowledge base
    let resources: Resource[] = resourceData.nationalResources.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category as ResourceCategory,
      description: r.description,
      phone: r.phone,
      website: r.website,
      isNational: r.isNational,
      isFree: r.isFree,
      notes: r.notes,
    }));

    // Note: In production, you would fetch additional resources from a dedicated
    // service_providers table. For MVP, we're using the national resources from
    // the knowledge base. The resources table in Supabase is for user-facing
    // content articles, not service provider listings.

    // Apply filters
    if (category) {
      resources = resources.filter((r) => r.category === category);
    }

    if (state && isNational !== "true") {
      resources = resources.filter(
        (r) => r.isNational || r.state === state
      );
    }

    if (isNational === "true") {
      resources = resources.filter((r) => r.isNational);
    }

    if (isFree === "true") {
      resources = resources.filter((r) => r.isFree);
    }

    if (query) {
      const lowerQuery = query.toLowerCase();
      resources = resources.filter(
        (r) =>
          r.name.toLowerCase().includes(lowerQuery) ||
          r.description.toLowerCase().includes(lowerQuery) ||
          r.notes?.toLowerCase().includes(lowerQuery)
      );
    }

    // Sort: national resources first, then alphabetically
    resources.sort((a, b) => {
      if (a.isNational && !b.isNational) return -1;
      if (!a.isNational && b.isNational) return 1;
      return a.name.localeCompare(b.name);
    });

    // Get category guidance if requested
    let guidance: CategoryInfo | null = null;
    if (includeGuidance && category && category !== "crisis") {
      const categoryData = resourceData.categories[category as keyof typeof resourceData.categories];
      if (categoryData) {
        guidance = categoryData as CategoryInfo;
      }
    }

    // Get user's state from profile if available
    let userState: string | null = null;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("state")
        .eq("id", user.id)
        .single();

      userState = profile?.state || null;
    }

    return NextResponse.json({
      resources,
      guidance,
      userState,
      categories: Object.entries(resourceData.categories).map(([key, value]) => ({
        id: key,
        title: value.title,
        description: value.description,
      })),
    });
  } catch (error) {
    console.error("Resources API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get specific category guidance
export async function POST(request: Request) {
  try {
    const { category } = await request.json();

    if (!category) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    const categoryData =
      resourceData.categories[category as keyof typeof resourceData.categories];

    if (!categoryData) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      guidance: categoryData,
    });
  } catch (error) {
    console.error("Resources POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
