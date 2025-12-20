import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { decision, criteria, evaluations, winPercentage } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const criteriaContext = criteria.map((c: any, i: number) => {
      const evaluation = evaluations.find((e: any) => e.criterionId === c.id);
      const support = evaluation?.supportsDecision ? "supports" : "opposes";
      const strength = evaluation?.strength || 50;
      const confidence = evaluation?.confidence || 50;
      return `- ${c.name} (importance: ${c.importance}%): ${support} the decision with ${strength}% strength, ${confidence}% confidence`;
    }).join('\n');

    const systemPrompt = `You are an expert in experimental design and decision science. Generate simple, actionable experiments that could help someone gather more information before making a decision.

Experiments should be:
- Low-cost and quick to run (hours to a few days, not weeks)
- Concrete and actionable
- Designed to reduce uncertainty about specific criteria
- Varied in approach (some information gathering, some small tests, some conversations)

Return EXACTLY 3 experiments in this JSON format:
{
  "experiments": [
    {
      "title": "Short experiment title",
      "description": "Brief 1-2 sentence description of what to do",
      "targetCriterion": "Which criterion this helps clarify",
      "timeEstimate": "e.g., '2 hours', '1 day'",
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}`;

    const userPrompt = `Decision being considered: "${decision}"

Current analysis shows this decision wins ${winPercentage}% of simulations.

Criteria and current evaluations:
${criteriaContext}

Generate 3 simple experiments to help reduce uncertainty and make a more informed decision.`;

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
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in response");
    }

    const experiments = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(experiments), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating experiments:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
