import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateFactsRequest {
  decision: string;
  criterion: {
    name: string;
    description?: string;
    importance: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { decision, criterion } = await req.json() as GenerateFactsRequest;
    console.log('Generating facts for criterion:', criterion.name, 'decision:', decision);

    const systemPrompt = `You are an expert decision analyst. Your task is to provide the 5 most important contextual facts that would help someone evaluate a decision criterion.

For each fact:
- Be specific and actionable
- Focus on information that would genuinely affect someone's assessment
- Consider both supporting and opposing perspectives
- Draw on research, statistics, or common patterns where relevant

Return a JSON object with a "facts" array containing exactly 5 strings, each being a concise but informative fact (1-2 sentences each).`;

    const userPrompt = `Decision being considered: "${decision}"

Criterion to evaluate: "${criterion.name}"
${criterion.description ? `Description: ${criterion.description}` : ''}
Importance level: ${criterion.importance}%

Generate 5 key contextual facts that would help assess how this criterion relates to this decision.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'provide_facts',
              description: 'Provide 5 contextual facts about the criterion',
              parameters: {
                type: 'object',
                properties: {
                  facts: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 5,
                    maxItems: 5,
                    description: 'Array of exactly 5 contextual facts'
                  }
                },
                required: ['facts'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'provide_facts' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const args = JSON.parse(toolCall.function.arguments);
    const facts = args.facts || [];

    return new Response(JSON.stringify({ facts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating facts:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      facts: [] 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
