declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { image, hint, apiKey: clientApiKey } = body;
    if (!image) throw new Error("Missing image");

    // Use configured Supabase secret first; fall back to the publishable key
    // sent from the client in the request body (safe — it is a client-side key by design).
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") || clientApiKey || "";
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not set. Either add it as a Supabase Edge Function secret or provide it via the client.");

    const systemPrompt = `You are an OCR + form extraction assistant for a Barangay Health Worker (BHW) system. You will be given a photo of a paper health form (Filipino / English). Extract the form's title and every visible field.

Return STRICT JSON with this shape:
{
  "title": "string (short title of the form)",
  "description": "string (one sentence describing the form)",
  "fields": [
    { "label": "Field label", "type": "text|number|date|textarea|checkbox", "value": "value written on the paper or empty string", "section": "section name or omit if no sections" }
  ]
}

Rules:
- Replicate everything from the uploaded form exactly—including the layout, field positioning, and specific text—to create the digital version.
- Use lines instead of boxes for fields.
- Use "date" for date fields, "number" for numeric-only, "checkbox" for yes/no boxes, "textarea" for long remarks, else "text".
- Restrict input so that letters cannot be entered when only numbers are required, and vice versa, unless both are needed.
- If a field is blank on the paper, still include it with an empty "value".
- Group fields into sections using the "section" property when the form has labeled sections.
- Do NOT include commentary. Output ONLY the JSON.`;

    const userText = hint ? `Additional hint from BHW: ${hint}` : "Extract all fields from this form.";

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${errText}`);
    }

    const aiJson = await aiResp.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "";

    // Strip markdown fences if present
    const cleaned = content
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```$/, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Attempt to locate first { ... last }
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start >= 0 && end > start) {
        parsed = JSON.parse(cleaned.slice(start, end + 1));
      } else {
        throw new Error("Model did not return valid JSON");
      }
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});