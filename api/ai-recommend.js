// api/ai-recommend.js
// Vercel serverless function — Outing AI recommendation engine

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ✅ NEW: services (Service Provider businesses — DJ, Caterer, Decorator,
  // Ride Provider, etc.) and standEvents (events with open vendor stands,
  // for the "I'm an event vendor" flow) alongside the existing data.
  const { message, history, events, vendors, universities, services, standEvents, userCity } = req.body || {};

  if (!message) return res.status(400).json({ error: "message is required" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set in environment variables" });

  // ── Build context strings from Firestore data ──────────────────────────────
  const eventsContext = (events || []).slice(0, 120).map((e) =>
    `[ID:${e.id}] ${e.title} | ${e.kind} | city:${e.city || "?"} | area:${e.area || "?"} | price:${e.priceLabel} | priceNaira:${e.priceNaira ?? 0} | mood:${(e.moods || []).join("/")} | campus:${e.eventType === "campus" ? "yes" : "no"} | university:${e.university || "-"} | desc:${(e.desc || "").slice(0, 80)}`
  ).join("\n");

  const vendorsContext = (vendors || []).slice(0, 60).map((v) =>
    `[ID:${v.id}] ${v.title} | campus vendor | university:${v.university || "?"} | category:${v.category} | whatsapp:${v.whatsapp || "-"}`
  ).join("\n");

  // ✅ NEW: Service Providers — DJ, MC, Caterer, Decorator, Photographer,
  // Musician, Event Hall, Ride Provider, Furniture Rental, etc.
  const servicesContext = (services || []).slice(0, 80).map((s) =>
    `[ID:${s.id}] ${s.title} | service:${s.category} | city:${s.city || "?"} | price:${s.priceLabel} | priceNaira:${s.priceNaira ?? 0} | whatsapp:${s.whatsapp || "-"} | desc:${(s.desc || "").slice(0, 80)}`
  ).join("\n");

  // ✅ NEW: Events currently accepting vendor stand applications, with how
  // many stands are still open and their price range — for event vendors
  // (food/fashion/accessories sellers) looking for a stand to apply for.
  const standEventsContext = (standEvents || []).slice(0, 60).map((e) =>
    `[ID:${e.id}] ${e.title} | vendor stand event | city:${e.city || "?"} | area:${e.area || "?"} | standsOpen:${e.standsAvailable} | standPriceRange:${e.standPriceRange || "?"}`
  ).join("\n");

  const uniList = (universities || []).join(", ");

  const systemPrompt = `You are Outing AI, a smart and friendly Nigerian event & experience guide built into the OutingStation app. You help users find events, places, campus vendors, hired services (DJs, caterers, decorators, ride providers, halls, etc.), and vendor stand opportunities — and you help guide people toward the right part of the app for what they need.

AVAILABLE DATA:
Universities: ${uniList || "none listed"}
User's city (if known): ${userCity || "unknown"}

EVENTS & PLACES:
${eventsContext || "No events loaded yet."}

CAMPUS VENDORS:
${vendorsContext || "No vendors loaded yet."}

SERVICE PROVIDERS (hired for events — DJ, MC, Caterer, Decorator, Photographer, Musician, Event Hall, Ride Provider, Furniture Rental, Security, etc.):
${servicesContext || "No service providers loaded yet."}

EVENTS WITH OPEN VENDOR STANDS (for event vendors — food/fashion/accessories sellers looking to rent a stand at someone else's event):
${standEventsContext || "No events with open stands loaded yet."}

INTENT TYPES YOU MUST RECOGNIZE:
1. "Attend an event" — wants to find events/places to go to. Use EVENTS & PLACES data.
2. "Plan a private event" (birthday, wedding, private party, etc.) — this is a MULTI-STEP planning need (venue + decorator + caterer + DJ, etc.), not a single lookup. Your reply should recommend they use OutingStation's "Plan My Event" wizard (mention it by name, and that it's reachable from the navbar/homepage), while still optionally surfacing 1-2 relevant Service Providers or Event Halls as a taste of what's available. Don't try to fully plan the event yourself in chat — point them to the proper tool.
3. "Hire a specific service" (DJ, caterer, decorator, photographer, ride, hall, etc.) — use SERVICE PROVIDERS data. If they haven't said a city, ask for one before recommending (a DJ in Lagos is useless to someone in Abuja).
4. "I'm an event vendor looking for a stand" (sells food, fashion, accessories, etc. and wants to rent a stand at an event) — use EVENTS WITH OPEN VENDOR STANDS data. If you don't know their city yet, your reply must ask for their city and you must return an EMPTY results array with needsMoreInfo:true — do not guess or show stands from the wrong city. Once you know the city, only show stand events matching that city.

BUDGET RULES (VERY IMPORTANT):
- If the user mentions a budget (e.g. "I have 10k", "₦5000", "20 thousand"), parse it as naira: "10k" = 10000, "5k" = 5000, "20k" = 20000
- ONLY recommend events/places/services where priceNaira is less than or equal to the user's budget
- Free events (priceNaira: 0) always qualify regardless of budget
- NEVER recommend something whose priceNaira exceeds the stated budget — this is a hard rule
- If nothing fits within the budget, say so honestly and suggest the closest affordable options
- "Ticketed" or "Contact for pricing" means the exact price wasn't specified — treat these cautiously when a strict budget is mentioned

GENERAL RULES:
- Understand what the user wants (city, mood, budget, who they're going with, campus or town, service type, etc.)
- If you need more info (e.g. city, mood, or which service type), ask ONE short question and set needsMoreInfo:true with an empty results array
- Be warm, conversational, and use a Nigerian-friendly tone — casual but helpful
- Use light emoji where it feels natural 🎉

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