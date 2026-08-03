// ai-chemistry-assistant: AI-powered chemistry Q&A.
// Body: { question: string, context?: { compounds?: string[] } }
// Returns: { answer: string }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const SYSTEM_PROMPT = `You are a friendly chemistry tutor for the WChem VR sandbox.
You explain concepts clearly for high-school and early-college students.
You only discuss real chemistry: elements, compounds, reactions, equations, and safety.
If asked about anything non-chemistry, gently redirect the user back to chemistry.
Keep answers short (under 200 words) unless the question clearly needs more.
Use markdown for clarity: bold key terms, bullet lists, and chemical formulas in LaTeX with $\\ce{H2O}$ when helpful.`;

export default async function (req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let body: { question?: string; context?: { compounds?: string[] } } = {};
  try {
    if (req.method === 'POST') body = await req.json();
  } catch { /* empty body OK */ }

  const question = (body.question ?? '').toString().trim();
  if (!question) {
    return new Response(JSON.stringify({ error: 'question is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const ctx = body.context ?? {};
  const compoundNote = ctx.compounds?.length
    ? `The user currently has these compounds loaded in the VR scene: ${ctx.compounds.join(', ')}. `
    : '';

  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!openRouterKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured: OPENROUTER_API_KEY missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openRouterKey}`,
      'HTTP-Referer': 'https://wm7m4mk4.ap-southeast.insforge.app',
      'X-Title': 'WChem VR Chemistry Sandbox',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${compoundNote}${question}` },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => 'Unknown error');
    return new Response(JSON.stringify({ error: `OpenRouter error ${resp.status}: ${text}` }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const data = await resp.json();
  const answer = data?.choices?.[0]?.message?.content ?? '';
  return new Response(JSON.stringify({ answer }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
