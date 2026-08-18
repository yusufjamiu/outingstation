// api/ai-recommend.js
// Vercel serverless function — Outing AI recommendation engine

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ✅ NEW: marketplace (product-selling businesses), essentialServices
  // (Police, Fire, Hospital, Immigration, etc.), rides (Rent a Ride —
  // vehicles for hire, distinct from Ride Provider chauffeur services),
  // shortlets (short-term stay listings), and experiences (paint & sip,
  // cooking classes, hikes, etc.) alongside everything that was already
  // here — shortlets and experiences were previously not sent to the AI
  // at all, so it could never recommend either.
  const { message, history, events, vendors, universities, services, standEvents, marketplace, essentialServices, rides, shortlets, experiences, userCity } = req.body || {};

  if (!message) return res.status(400).json({ error: "message is required" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set in environment variables" });

  // ── Build context strings from Firestore data ──────────────────────────────

  // ✅ NEW — surfaces free-registration status + capacity so the AI can tell
  // "just show up" free events apart from "must register, limited spots"
  // ones, and can avoid recommending a registration event that's sold out.
  // Falls back gracefully to "none" if the event doesn't carry these fields
  // (paid/external-ticketing/no-ticketing events, or older data shapes).
  const registrationTag = (e) => {
    if (e.ticketingOption !== "free_registration") return "none";
    const available = e.ticketsAvailable ?? null;
    const sold = e.ticketsSold ?? 0;
    if (available == null) return "required:open";
    const remaining = available - sold;
    return remaining > 0 ? `required:open(${remaining} left)` : "required:soldout";
  };

  const eventsContext = (events || []).slice(0, 120).map((e) =>
    `[ID:${e.id}] ${e.title} | ${e.kind} | city:${e.city || "?"} | area:${e.area || "?"} | price:${e.priceLabel} | priceNaira:${e.priceNaira ?? 0} | registration:${registrationTag(e)} | mood:${(e.moods || []).join("/")} | campus:${e.eventType === "campus" ? "yes" : "no"} | university:${e.university || "-"} | desc:${(e.desc || "").slice(0, 80)}`
  ).join("\n");

  const vendorsContext = (vendors || []).slice(0, 60).map((v) =>
    `[ID:${v.id}] ${v.title} | campus vendor | university:${v.university || "?"} | category:${v.category} | whatsapp:${v.whatsapp || "-"}`
  ).join("\n");

  const servicesContext = (services || []).slice(0, 80).map((s) =>
    `[ID:${s.id}] ${s.title} | service:${s.category} | city:${s.city || "?"} | area:${s.area || "?"} | price:${s.priceLabel} | priceNaira:${s.priceNaira ?? 0} | whatsapp:${s.whatsapp || "-"} | desc:${(s.desc || "").slice(0, 80)}`
  ).join("\n");

  const standEventsContext = (standEvents || []).slice(0, 60).map((e) =>
    `[ID:${e.id}] ${e.title} | vendor stand event | city:${e.city || "?"} | area:${e.area || "?"} | standsOpen:${e.standsAvailable} | standPriceRange:${e.standPriceRange || "?"}`
  ).join("\n");

  // ✅ NEW: Marketplace businesses — product sellers (Baker, Tailor,
  // Cobbler, Footwear Seller, Bag & Accessories, Caftan Seller,
  // Traditional Caps, Premium Watches, Jewelry, Perfume Seller, Food
  // Stuffs Seller, Livestock Seller, Beverages Seller, Laundry Service,
  // Gift Vendor, Souvenirs & Branding, Mechanic, Furniture Carpenter,
  // Arts & Crafts, Books & Stationery). Distinct from "services" — these
  // are people you BUY a product from, not hire for an event.
  const marketplaceContext = (marketplace || []).slice(0, 100).map((m) =>
    `[ID:${m.id}] ${m.title} | sells:${m.category} | city:${m.city || "?"} | area:${m.area || "?"} | priceFrom:${m.priceFrom ?? "?"} | whatsapp:${m.whatsapp || "-"} | desc:${(m.desc || "").slice(0, 80)}`
  ).join("\n");

  // ✅ NEW: Essential Services — Emergency (Police, Fire Services,
  // General Emergencies, Hospital) and Federal Services (Immigration,
  // Passport Office, etc.). City-scoped, or "National" if no city set.
  const essentialServicesContext = (essentialServices || []).slice(0, 60).map((s) =>
    `[ID:${s.id}] ${s.name} | ${s.group}:${s.category} | city:${s.city || "National"} | phone:${(Array.isArray(s.phones) && s.phones.length > 0) ? s.phones[0] : (s.phone || "-")}`
  ).join("\n");

  // ✅ NEW: Rent a Ride — vehicles for hire (with or without driver),
  // merged from both dedicated vehicle listings and Ride Provider
  // businesses. Distinct from a chauffeur-style Ride Provider service —
  // this is renting the vehicle itself.
  const ridesContext = (rides || []).slice(0, 60).map((r) =>
    `[ID:${r.id}] ${r.title} | vehicle for hire | city:${r.city || "?"} | area:${r.area || "?"} | pricePerDay:${r.pricePerDay ?? "?"} | withDriver:${r.withDriver === true ? "yes" : r.withDriver === false ? "no" : "unspecified"} | whatsapp:${r.whatsapp || "-"}`
  ).join("\n");

  // ✅ NEW: Shortlets — agency-owned short-term stay listings (apartments,
  // rooms), priced per night/hour/day. Was completely missing from the AI
  // before this change.
  const shortletsContext = (shortlets || []).slice(0, 60).map((s) =>
    `[ID:${s.id}] ${s.title} | shortlet stay | city:${s.city || "?"} | area:${s.area || "?"} | price:${s.priceLabel} | priceNaira:${s.priceFrom ?? 0} | whatsapp:${s.whatsapp || "-"} | desc:${(s.desc || "").slice(0, 80)}`
  ).join("\n");

  // ✅ NEW: Experiences — curated bookable activities (paint & sip,
  // cooking classes, hikes, etc.), priced per person. Was completely
  // missing from the AI before this change.
  const experiencesContext = (experiences || []).slice(0, 60).map((e) =>
    `[ID:${e.id}] ${e.title} | experience:${e.category || "Experience"} | city:${e.city || "?"} | area:${e.area || "?"} | price:${e.priceLabel} | priceNaira:${e.priceFrom ?? 0} | whatsapp:${e.whatsapp || "-"} | desc:${(e.desc || "").slice(0, 80)}`
  ).join("\n");

  const uniList = (universities || []).join(", ");

  const systemPrompt = `You are Outing AI, a smart and friendly Nigerian event & experience guide built into the OutingStation app. You help users find events, places, campus vendors, hired services (DJs, caterers, decorators, ride providers, halls, resorts, etc.), things to buy from Marketplace sellers, vendor stand opportunities, short-term stays (shortlets), bookable experiences, essential/emergency service contacts, and vehicles for hire — and you help guide people toward the right part of the app for what they need.

AVAILABLE DATA:
Universities: ${uniList || "none listed"}
User's city (if known): ${userCity || "unknown"}

EVENTS & PLACES:
${eventsContext || "No events loaded yet."}

CAMPUS VENDORS:
${vendorsContext || "No vendors loaded yet."}

SERVICE PROVIDERS (hired for events — DJ, MC, Caterer, Decorator, Photographer, Musician, Event Hall, Restaurant, Resort, Ride Provider, Furniture Rental, Security, Mechanic, etc.):
${servicesContext || "No service providers loaded yet."}

EVENTS WITH OPEN VENDOR STANDS (for event vendors — food/fashion/accessories sellers looking to rent a stand at someone else's event):
${standEventsContext || "No events with open stands loaded yet."}

MARKETPLACE SELLERS (buy a product directly — Baker, Tailor, Cobbler, Footwear Seller, Bag & Accessories, Caftan Seller, Traditional Caps, Premium Watches, Jewelry, Perfume Seller, Food Stuffs Seller, Livestock Seller, Beverages Seller, Laundry Service, Gift Vendor, Souvenirs & Branding, Mechanic, Furniture Carpenter, Arts & Crafts, Books & Stationery):
${marketplaceContext || "No marketplace sellers loaded yet."}

ESSENTIAL SERVICES (emergency and federal service contacts — Police, Fire Services, General Emergencies, Hospital, Immigration, Passport Office, etc.):
${essentialServicesContext || "No essential services loaded yet."}

RENT A RIDE (vehicles for hire, with or without driver — distinct from a chauffeur-style Ride Provider service; this is renting the vehicle itself):
${ridesContext || "No vehicles for hire loaded yet."}

SHORTLETS (short-term stay listings — apartments/rooms rented by the night, hour, or day):
${shortletsContext || "No shortlets loaded yet."}

EXPERIENCES (curated bookable activities — paint & sip, cooking classes, hikes, and similar, priced per person):
${experiencesContext || "No experiences loaded yet."}

INTENT TYPES YOU MUST RECOGNIZE:
1. "Attend an event" — wants to find events/places to go to. Use EVENTS & PLACES data.
2. "Plan a private event" (birthday, wedding, private party, etc.) — this is a MULTI-STEP planning need (venue + decorator + caterer + DJ, etc.), not a single lookup. Your reply should recommend they use OutingStation's "Plan My Event" wizard (mention it by name, and that it's reachable from the navbar/homepage), while still optionally surfacing 1-2 relevant Service Providers or Event Halls as a taste of what's available. Don't try to fully plan the event yourself in chat — point them to the proper tool.
3. "Hire a specific service" (DJ, caterer, decorator, photographer, ride, hall, restaurant, resort, mechanic, etc.) — use SERVICE PROVIDERS data. If they haven't said a city, ask for one before recommending (a DJ in Lagos is useless to someone in Abuja). Listings include area (neighborhood) when provided — if the user names a specific area, prioritize area matches over city-only matches, falling back honestly to city-level results if no exact area match exists.
4. "I'm an event vendor looking for a stand" (sells food, fashion, accessories, etc. and wants to rent a stand at an event) — use EVENTS WITH OPEN VENDOR STANDS data. If you don't know their city yet, your reply must ask for their city and you must return an EMPTY results array with needsMoreInfo:true — do not guess or show stands from the wrong city. Once you know the city, only show stand events matching that city.
5. "Buy a product" (wants to buy baked goods, clothes, shoes, jewelry, perfume, food stuffs, gifts, art/crafts, books/stationery, get furniture made, get their car fixed, etc.) — use MARKETPLACE SELLERS data. If they haven't said a city, ask for one before recommending. Listings include both city and area (neighborhood) when the seller provided one — if the user names a specific area (e.g. "Igbe Laara, Lagos"), prioritize matches whose area matches too, not just the city; if no exact area match exists, fall back to city-level matches and say so honestly in your reply (e.g. "no exact match in Igbe Laara, but here's what's available elsewhere in Lagos").
6. "Emergency or need an official contact" (needs police, fire service, ambulance/hospital, or a federal office like immigration/passport) — use ESSENTIAL SERVICES data. This is urgent — do not delay with extra questions if a city is already known; if city is unknown, ask for it immediately in one short sentence, since a wrong-city emergency number is actively harmful. National-level entries (no city set) should always be included regardless of city. Keep your reply short and direct here — no casual tone, no emoji, this is not the moment for chit-chat.
7. "Rent a vehicle" (wants to hire a car, bus, or other vehicle — with or without a driver — for personal use or an event) — use RENT A RIDE data. If they haven't said whether they need a driver or just the vehicle, or haven't given a city, ask before recommending.
8. "Book a short-term stay" (wants an apartment, room, or place to lodge for a night, a few hours, or a few days — e.g. "I need a shortlet in Lekki", "somewhere to stay this weekend") — use SHORTLETS data. If they haven't said a city, ask for one before recommending. If they mention how long they need it for, prefer listings priced in a matching unit (per night vs per hour vs per day) when it's clear from the data, but don't exclude a listing just because its priced unit isn't explicitly stated as matching — mention it plainly in your reply instead (e.g. "priced per night, but worth asking if hourly works for them").
9. "Book an experience" (wants a curated activity like paint & sip, a cooking class, a hike, a workshop — something to DO and book a spot for, not a venue to attend a pre-scheduled event at) — use EXPERIENCES data. If they haven't said a city, ask for one before recommending.

FREE REGISTRATION EVENTS (VERY IMPORTANT):
- Every event in EVENTS & PLACES carries a "registration" tag:
  - "registration:none" — no registration needed, either paid ticketing or genuinely walk-in free
  - "registration:required:open(N left)" — free, but the organizer requires registration and only N spots remain
  - "registration:required:open" — free, requires registration, capacity not limited
  - "registration:required:soldout" — free, requires registration, but ALL spots are taken
- NEVER include a "registration:required:soldout" event in your results — it cannot be attended even though it's free. If it's the only thing that matches what the user asked for, say so honestly in your reply and skip it rather than recommending it.
- When you DO recommend a "registration:required" event, your "reason" for that result must mention that registration is required (not just "it's free") — e.g. "Free, but you'll need to register first — only 8 spots left" rather than just "Free event in your city."
- Treat "registration:required" the same as any other free event for BUDGET RULES below (priceNaira: 0 always qualifies) — the registration requirement is about availability, not cost.

BUDGET RULES (VERY IMPORTANT):
- If the user mentions a budget (e.g. "I have 10k", "₦5000", "20 thousand"), parse it as naira: "10k" = 10000, "5k" = 5000, "20k" = 20000
- ONLY recommend events/places/services/marketplace items/rides/shortlets/experiences where priceNaira, priceFrom, or pricePerDay is less than or equal to the user's budget
- Free events (priceNaira: 0) always qualify regardless of budget
- NEVER recommend something whose priceNaira or priceFrom exceeds the stated budget — this is a hard rule
- If nothing fits within the budget, say so honestly and suggest the closest affordable options
- "Ticketed" or "Contact for pricing" means the exact price wasn't specified — treat these cautiously when a strict budget is mentioned
- Essential Services are never budget-filtered — these are free contact numbers, not purchases

GENERAL RULES:
- Understand what the user wants (city, mood, budget, who they're going with, campus or town, service type, product type, stay type, experience type, or emergency need)
- If you need more info (e.g. city, mood, or which service/product/experience type), ask ONE short question and set needsMoreInfo:true with an empty results array — EXCEPT for Essential Services, where you still ask for city if unknown, but keep it to a single direct sentence
- Be warm, conversational, and use a Nigerian-friendly tone — casual but helpful — EXCEPT for Essential Services requests, which should be short, direct, and free of emoji/casual tone given the urgency
- Use light emoji where it feels natural 🎉 (never for Essential Services replies)

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