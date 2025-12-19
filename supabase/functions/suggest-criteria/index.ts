import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SuggestCriteriaRequest {
  decision: string;
  existingCriteria: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { decision, existingCriteria } = await req.json() as SuggestCriteriaRequest;

    console.log("Suggesting criteria for decision:", decision);
    console.log("Existing criteria:", existingCriteria);

    const existingList = existingCriteria.length > 0 
      ? `\n\nThe user has already added these criteria:\n${existingCriteria.map(c => `- ${c}`).join('\n')}\n\nDo NOT suggest any criteria that overlap with these.`
      : '';

    const systemPrompt = `You are a decision analysis expert. Your role is to suggest important criteria that people often overlook when making decisions.
Be practical and specific. Avoid generic suggestions.`;

    const userPrompt = `For this decision: "${decision}"${existingList}

Suggest 3-4 additional criteria the person should consider. Focus on:
- Factors they might have overlooked
- Long-term implications
- Hidden costs or benefits
- Personal values that might be relevant

Return your response as a JSON object with a "suggestions" array, where each item has "name" (short, 2-4 words) and "description" (one sentence explaining why this matters).

Example format:
{"suggestions": [{"name": "Exit Options", "description": "Consider how easy it would be to reverse this decision if needed."}]}`;

    console.log("Calling Lovable AI Gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log("Raw AI response:", content);

    // Parse JSON from the response
    let suggestions = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        suggestions = parsed.suggestions || [];
      }
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Fallback: return empty suggestions
      suggestions = [];
    }

    console.log("Parsed suggestions:", suggestions);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in suggest-criteria function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
