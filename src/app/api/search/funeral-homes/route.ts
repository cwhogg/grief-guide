import { openai } from "@/lib/openai/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface FuneralHome {
  name: string;
  address: string;
  phone: string;
  description: string;
  services: string[];
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

    // Use OpenAI to generate helpful funeral home search guidance
    // In production, this could use Google Places API or similar
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are helping someone find funeral homes near zip code ${zipCode}.

Generate a JSON response with:
1. A "searchUrl" field with a Google Maps search URL for "funeral homes near ${zipCode}"
2. A "guidance" field with 2-3 sentences of helpful tips for choosing a funeral home
3. A "questionsToAsk" array with 3 practical questions to ask when calling

Respond ONLY with valid JSON, no markdown or extra text.`,
        },
        {
          role: "user",
          content: `Find funeral homes near zip code ${zipCode}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || "";

    // Parse the JSON response
    let result;
    try {
      // Remove any markdown code blocks if present
      const jsonStr = content.replace(/```json\n?|\n?```/g, "").trim();
      result = JSON.parse(jsonStr);
    } catch {
      // Fallback if parsing fails
      result = {
        searchUrl: `https://www.google.com/maps/search/funeral+homes+near+${zipCode}`,
        guidance: "Most funeral homes offer 24/7 service for immediate needs. Call a few to compare prices and services—they're required by law to provide pricing over the phone.",
        questionsToAsk: [
          "What is your pricing for basic services?",
          "Can you handle transportation from the hospital/home?",
          "What's the timeline for arrangements?"
        ]
      };
    }

    // Ensure searchUrl is present
    if (!result.searchUrl) {
      result.searchUrl = `https://www.google.com/maps/search/funeral+homes+near+${zipCode}`;
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
