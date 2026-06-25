// api/ai-recommend.js
// Vercel serverless function — Outing AI recommendation engine

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, history, events, vendors, universities } = req.body || {};

  if (!message) return res.status(400).json({ error: "message is required" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set in environment variables" });

  // ── Build context string from Firestore data ──────────────────────────────
  // ✅ priceNaira included so Claude can compare actual numbers against user budget
  const eventsContext = (events || []).slice(0, 120).map((e) =>
    `[ID:${e.id}] ${e.title} | ${e.kind} | city:${e.city || "?"} | area:${e.area || "?"} | price:${e.priceLabel} | priceNaira:${e.priceNaira ?? 0} | mood:${(e.moods || []).join("/")} | campus:${e.eventType === "campus" ? "yes" : "no"} | university:${e.university || "-"} | desc:${(e.desc || "").slice(0, 80)}`
  ).join("\n");

  const vendorsContext = (vendors || []).slice(0, 60).map((v) =>
    `[ID:${v.id}] ${v.title} | vendor | university:${v.university || "?"} | category:${v.category} | whatsapp:${v.whatsapp || "-"}`
  ).join("\n");

  const uniList = (universities || []).join(", ");

  const systemPrompt = `You are Outing AI, a smart and friendly Nigerian event & experience guide built into the OutingStation app. You help users find events, places, and campus vendors that match their vibe.

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

BUDGET RULES (VERY IMPORTANT):
- If the user mentions a budget (e.g. "I have 10k", "₦5000", "20 thousand"), parse it as naira: "10k" = 10000, "5k" = 5000, "20k" = 20000
- ONLY recommend events/places where priceNaira is less than or equal to the user's budget
- Free events (priceNaira: 0) always qualify regardless of budget
- NEVER recommend an event whose priceNaira exceeds the stated budget — this is a hard rule
- If the user wants to "spend" a budget on experiences, prefer paid events/places that make good use of that budget — not just the cheapest ones, but nothing that exceeds it
- If no events fit within the budget, say so honestly and suggest the closest affordable options
- "Ticketed" means there is a ticket price but it was not specified — treat these cautiously when a strict budget is mentioned

CRITICAL RESPONSE FORMAT:
You MUST return ONLY a valid JSON object — no text before it, no text after it, no markdown, no backticks, no explanation.
Return exactly this structure and nothing else:
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

RULES:
- "results" can be empty [] if you need more info or nothing matches
- "needsMoreInfo": true means you asked a follow-up question and are waiting
- Pick 3-5 best matches max — quality over quantity
- ONLY use IDs that exist in the data above — never invent IDs
- DO NOT wrap your response in markdown code blocks
- DO NOT add any text before or after the JSON object
- The very first character of your response must be {
- The very last character of your response must be }`;

  // ── Build conversation history ─────────────────────────────────────────────
  const messages = [
    ...(history || []).slice(-6),
    { role: "user", content: message },
  ];

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: [
          {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" },
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
    const rawText = (data.content?.[0]?.text || "{}").trim();

    // ✅ Strip any text before the first { — Claude sometimes adds preamble
    const jsonStart = rawText.indexOf("{");
    const jsonEnd   = rawText.lastIndexOf("}");
    const cleanText = jsonStart !== -1 && jsonEnd !== -1
      ? rawText.slice(jsonStart, jsonEnd + 1)
      : rawText;

    // ✅ Parse JSON from AI response
    let parsed;
    try {
      parsed = JSON.parse(cleanText.replace(/```json|```/g, "").trim());
    } catch {
      const replyMatch = rawText.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      parsed = {
        reply: replyMatch
          ? replyMatch[1].replace(/\\n/g, "\n")
          : "Let me help you find something great! What are you looking for?",
        results: [],
        needsMoreInfo: false,
      };
    }

    return res.status(200).json({
      reply: parsed.reply || "Let me help you find something great! What are you looking for?",
      resultIds: (parsed.results || []).map((r) => r.id),
      reasons: Object.fromEntries((parsed.results || []).map((r) => [r.id, r.reason])),
      needsMoreInfo: parsed.needsMoreInfo || false,
      usage: data.usage,
    });
  } catch (err) {
    console.error("ai-recommend error:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}