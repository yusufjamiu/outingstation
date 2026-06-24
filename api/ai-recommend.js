// api/ai-recommend.js
// Vercel serverless function — OutingStation AI recommendation engine
//
// SETUP:
//   1. Drop this file in your project's /api folder
//   2. Add ANTHROPIC_API_KEY to your Vercel environment variables
//      (Vercel Dashboard → Your Project → Settings → Environment Variables)
//   3. That's it. Vercel auto-deploys it as /api/ai-recommend

export default async function handler(req, res) {
  // CORS — allow your frontend origin
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, history, events, vendors, universities } = req.body || {};

  if (!message) return res.status(400).json({ error: "message is required" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set in environment variables" });

  // ── Build context string from Firestore data ────────────────────────────────
  const eventsContext = (events || []).slice(0, 120).map((e) =>
    `[ID:${e.id}] ${e.title} | ${e.kind} | city:${e.city || "?"} | area:${e.area || "?"} | price:${e.priceLabel} | mood:${(e.moods || []).join("/")} | campus:${e.eventType === "campus" ? "yes" : "no"} | university:${e.university || "-"} | desc:${(e.desc || "").slice(0, 80)}`
  ).join("\n");

  const vendorsContext = (vendors || []).slice(0, 60).map((v) =>
    `[ID:${v.id}] ${v.title} | vendor | university:${v.university || "?"} | category:${v.category} | whatsapp:${v.whatsapp || "-"}`
  ).join("\n");

  const uniList = (universities || []).join(", ");

  const systemPrompt = `You are OutingStation AI, a smart and friendly Nigerian event & experience guide built into the OutingStation app. You help users find events, places, and campus vendors that match their vibe.

AVAILABLE DATA:
Universities: ${uniList || "none listed"}

EVENTS & PLACES:
${eventsContext || "No events loaded yet."}

CAMPUS VENDORS:
${vendorsContext || "No vendors loaded yet."}

YOUR JOB:
- Understand what the user wants (city, mood, budget, who they're going with, campus or town, etc.)
- Recommend the best matching items from the data above
- If you need more info (e.g. city or mood), ask ONE short question
- Be warm, conversational, and use a Nigerian-friendly tone — casual but helpful
- Use light emoji where it feels natural 🎉

RESPONSE FORMAT (STRICT JSON):
Always reply with this exact JSON structure and nothing else:
{
  "reply": "Your conversational message to the user (1-3 sentences max)",
  "results": [
    {
      "id": "exact ID from the data above",
      "reason": "one short sentence on why this fits the user"
    }
  ],
  "needsMoreInfo": false
}

- "results" can be empty [] if you need more info or nothing matches
- "needsMoreInfo": true means you asked a follow-up question and are waiting
- Pick 3-5 best matches max — quality over quantity
- ONLY use IDs that exist in the data above — never invent IDs
- Return ONLY the JSON object, no markdown, no extra text`;

  // ── Build conversation history ───────────────────────────────────────────────
  const messages = [
    ...(history || []).slice(-6), // last 3 turns (6 messages) for context
    { role: "user", content: message },
  ];

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        // prompt caching on the system prompt (saves ~90% on repeated calls)
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001", // cheapest, fastest — perfect for recommendations
        max_tokens: 600,
        system: [
          {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" }, // cache the big system prompt
          },
        ],
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic API error:", err);
      return res.status(502).json({ error: "AI service error", detail: err });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || "{}";

    // Parse JSON from AI response
    let parsed;
    try {
      parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      // fallback if AI didn't return clean JSON
      parsed = { reply: rawText, results: [], needsMoreInfo: false };
    }

    return res.status(200).json({
      reply: parsed.reply || "Let me help you find something great! What are you looking for?",
      resultIds: (parsed.results || []).map((r) => r.id),
      reasons: Object.fromEntries((parsed.results || []).map((r) => [r.id, r.reason])),
      needsMoreInfo: parsed.needsMoreInfo || false,
      // pass back usage for monitoring
      usage: data.usage,
    });
  } catch (err) {
    console.error("ai-recommend error:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}