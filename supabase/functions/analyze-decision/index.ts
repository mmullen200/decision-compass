import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvidenceItem {
  id: string;
  type: 'past_outcome' | 'emotional' | 'data' | 'constraint';
  label: string;
  value: number;
  weight: number;
  description: string;
}

interface DecisionAnalysisRequest {
  decision: string;
  category: string;
  initialConfidence: number;
  posteriorProbability: number;
  credibleInterval: [number, number];
  evidence: EvidenceItem[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { decision, category, initialConfidence, posteriorProbability, credibleInterval, evidence } = await req.json() as DecisionAnalysisRequest;

    console.log("Analyzing decision:", decision);
    console.log("Category:", category);
    console.log("Prior:", initialConfidence, "Posterior:", posteriorProbability);

    const confidenceChange = posteriorProbability - initialConfidence;
    const evidenceSummary = evidence.map(e => 
      `- ${e.label} (${e.type}): ${e.value}% support, weight ${e.weight}%`
    ).join('\n');

    const systemPrompt = `You are a decision analysis expert specializing in Bayesian reasoning and cognitive psychology. 
Your role is to provide thoughtful, balanced insights about decisions based on the evidence provided.
Be concise but insightful. Focus on actionable wisdom.
Never be preachy or condescending. Speak as a trusted advisor.`;

    const userPrompt = `Analyze this decision and provide insights:

**Decision:** ${decision}
**Category:** ${category}

**Bayesian Analysis Results:**
- Initial Confidence (Prior): ${Math.round(initialConfidence)}%
- Updated Confidence (Posterior): ${Math.round(posteriorProbability)}%
- Change: ${confidenceChange > 0 ? '+' : ''}${Math.round(confidenceChange)}%
- 95% Credible Interval: ${Math.round(credibleInterval[0])}% - ${Math.round(credibleInterval[1])}%

**Evidence Considered:**
${evidenceSummary || 'No specific evidence was provided.'}

Please provide:
1. **Key Insight** (1-2 sentences): What does this analysis reveal about the decision?
2. **Confidence Assessment** (1 sentence): Is the current confidence level appropriate given the evidence?
3. **Blind Spots** (1-2 sentences): What important factors might be missing from this analysis?
4. **Recommendation** (1-2 sentences): A practical next step to consider.

Keep your total response under 200 words. Be direct and actionable.`;

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
    const analysis = data.choices?.[0]?.message?.content;

    console.log("Analysis generated successfully");

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-decision function:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
