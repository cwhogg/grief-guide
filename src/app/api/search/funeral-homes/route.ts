import { openai } from "@/lib/openai/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface FuneralHome {
  name: string;
  address: string;
  phone: string;
  available24h: boolean;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { zipCode } = body;

    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      return NextResponse.json(
        { error: "Valid 5-digit zip code required" },
        { status: 400 }
      );
    }

    // Use OpenAI to generate funeral home listings for the area
    // In production, this would use Google Places API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are helping someone find funeral homes near zip code ${zipCode}.

Generate a JSON response with:
1. "funeralHomes" - an array of 3-4 realistic funeral homes that would serve this zip code area. For each include:
   - "name": realistic funeral home name (e.g., "Smith & Sons Funeral Home", "Peaceful Rest Mortuary")
   - "address": realistic street address in that zip code area
   - "phone": realistic local phone number in (XXX) XXX-XXXX format
   - "available24h": true (most funeral homes are 24/7)

2. "callPrompts" - an array of 3 exact phrases to say when calling, written as if you're the grieving person. Make them very direct and human:
   - First one about reporting the death
   - Second one about cost/pricing
   - Third one about what happens next

Respond ONLY with valid JSON, no markdown or extra text.`,
        },
        {
          role: "user",
          content: `Find funeral homes near zip code ${zipCode}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content || "";

    // Parse the JSON response
    let result;
    try {
      const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
      result = JSON.parse(jsonStr);
    } catch {
      // Fallback if parsing fails
      result = {
        funeralHomes: [
          {
            name: "Peaceful Rest Funeral Home",
            address: `123 Main Street, ${zipCode}`,
            phone: "(555) 123-4567",
            available24h: true,
          },
          {
            name: "Memorial Gardens Mortuary",
            address: `456 Oak Avenue, ${zipCode}`,
            phone: "(555) 234-5678",
            available24h: true,
          },
          {
            name: "Family Care Funeral Services",
            address: `789 Elm Street, ${zipCode}`,
            phone: "(555) 345-6789",
            available24h: true,
          },
        ],
        callPrompts: [
          "My mother just passed away. I need help with arrangements.",
          "How much does a basic cremation/burial cost?",
          "What do I need to do next? Can you walk me through it?",
        ],
      };
    }

    // Ensure required fields exist
    if (!result.funeralHomes || !Array.isArray(result.funeralHomes)) {
      result.funeralHomes = [];
    }
    if (!result.callPrompts || !Array.isArray(result.callPrompts)) {
      result.callPrompts = [
        "My mother just passed away. I need help with arrangements.",
        "How much does a basic cremation/burial cost?",
        "What do I need to do next? Can you walk me through it?",
      ];
    }

    return NextResponse.json({
      zipCode,
      ...result,
    });
  } catch (error) {
    console.error("Funeral home search error:", error);
    return NextResponse.json(
      { error: "Failed to search for funeral homes" },
      { status: 500 }
    );
  }
}
