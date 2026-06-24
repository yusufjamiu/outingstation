// src/components/OutingStationAI.jsx
// Outing AI — powered by Claude Haiku via /api/ai-recommend

import React, { useState, useRef, useEffect } from "react";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import {
  Sparkles, Bookmark, Share2, MapPin, Ticket,
  Compass, Check, X, MessageCircle, Send, RotateCcw, Lock,
} from "lucide-react";

const OS_PRIMARY   = "#5ADAEE";
const OS_SECONDARY = "#47A2B6";
const OS_DARK_TEXT = "#0d2d36";

const CITIES = ["Lagos", "Abuja", "Ibadan", "Port Harcourt", "Benin", "Kano"];

const cityOf = (text) => {
  const t = (text || "").toLowerCase();
  return CITIES.find((c) => t.includes(c.toLowerCase())) || "";
};

const matchesCity = (eventCity, userCity) => {
  if (!userCity) return true;
  if (!eventCity) return false;
  const ec = eventCity.toLowerCase();
  const uc = userCity.toLowerCase().split(",")[0].trim();
  return ec.includes(uc) || uc.includes(ec);
};

const CATEGORY_MOODS = {
  "Nightlife & Parties": ["party"], "Music & Concerts": ["party", "chill"],
  "Gaming & Esport": ["party", "explore"], "Art & Culture": ["explore", "chill"],
  "Cinema & Show": ["chill"], "Food & Dining": ["chill", "explore"],
  "Family & Kids Fun": ["chill", "explore"], "Sport & Fitness": ["explore"],
  "Networking & Social": ["explore", "learn"], "Business & Tech": ["learn"],
  "Education": ["learn"], "Religion & Community": ["learn", "chill"],
  "Malls": ["explore", "chill"], "Spas": ["chill"], "Halls": ["explore"], "Other": ["explore"],
};
const VIBE_KEYWORDS = {
  outdoor: ["outdoor", "open-air", "park", "garden", "beach", "nature", "rooftop"],
  "food spot": ["food", "restaurant", "dining", "eat", "cuisine", "menu"],
  café: ["café", "cafe", "coffee", "brunch"],
  cinema: ["cinema", "movie", "film", "screening"],
  "live music": ["live music", "concert", "band", "dj", "performance"],
  clubbing: ["club", "rave", "nightclub"], lounge: ["lounge", "bar", "cocktail"],
  tech: ["tech", "startup", "developer", "software", "ai"],
  business: ["business", "ceo", "entrepreneur", "summit", "conference", "founder"],
  career: ["career", "job", "bootcamp", "skill"],
  religious: ["church", "mosque", "worship", "faith", "prayer", "gospel"],
  hall: ["hall", "venue", "auditorium", "conference centre", "event centre", "banquet"],
};

function normEvent(doc) {
  const d = doc.data ? doc.data() : doc;
  const desc = (d.description || "").toLowerCase();
  let price = "free";
  const amount = Number(d.ticketPrice || d.price || 0);
  if (d.isFree || amount === 0) price = "free";
  else if (amount <= 10000) price = "low";
  else if (amount <= 50000) price = "medium";
  else price = "premium";
  const moods = CATEGORY_MOODS[d.category] || ["explore"];
  let vibes = [];
  if (Array.isArray(d.tags) && d.tags.length) vibes = d.tags.map((t) => String(t).toLowerCase());
  else for (const [v, w] of Object.entries(VIBE_KEYWORDS)) if (w.some((x) => desc.includes(x))) vibes.push(v);
  const isPlace = d.subCategory === "places";
  const locText = `${d.location || ""} ${d.address || ""}`;
  return {
    kind: isPlace ? "place" : "event",
    id: doc.id || d.id, title: d.title || "Untitled", desc: d.description || "",
    emoji: isPlace ? "📍" : "🎉", isPlace, moods, vibes, price,
    priceLabel: price === "free" ? "Free" : `₦${amount.toLocaleString()}`,
    area: (d.location || d.address || "").split(",")[0].trim() || "Lagos",
    city: cityOf(locText),
    imageUrl: d.imageUrl || (d.images && d.images[0]) || null,
    mapLocation: d.mapLocation || null, slug: d.slug || null,
    status: d.status || "published",
    eventType: d.eventType || "regular", university: d.university || "",
    campusSubCategory: d.campusSubCategory || "",
    dateMs: d.date && d.date.seconds ? d.date.seconds * 1000 : null,
  };
}

function normVendor(doc) {
  const d = doc.data ? doc.data() : doc;
  return {
    kind: "vendor", id: doc.id || d.id,
    title: d.shopName || d.name || "Vendor", desc: d.description || "", emoji: "🛒",
    category: d.category || "", university: d.university || "",
    imageUrl: d.imageUrl || (d.images && d.images[0]) || null,
    whatsapp: (d.whatsappNumber || d.organizerPhone || "").replace(/[^0-9]/g, ""),
    area: d.university || "", priceLabel: "Vendor",
  };
}

if (typeof document !== "undefined" && !document.getElementById("os-ai-keyframes")) {
  const style = document.createElement("style");
  style.id = "os-ai-keyframes";
  style.textContent = `
    @keyframes os-pulse{0%{transform:scale(1);opacity:.7}70%,100%{transform:scale(1.12);opacity:0}}
    @keyframes os-blink{0%,100%{opacity:1}50%{opacity:.3}}
    @keyframes os-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
    @keyframes os-fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .os-dot{width:6px;height:6px;border-radius:50%;background:${OS_PRIMARY};animation:os-bounce 1.2s ease-in-out infinite;display:inline-block}
    .os-dot:nth-child(2){animation-delay:.15s}
    .os-dot:nth-child(3){animation-delay:.3s}
    .os-msg-in{animation:os-fadein 0.25s ease}
    .os-send-btn:hover{opacity:.85}
    .os-send-btn:disabled{opacity:.35;cursor:not-allowed}
    .os-input:focus{border-color:${OS_PRIMARY} !important;outline:none}
    .os-chip-btn:hover{background:${OS_PRIMARY}18 !important;border-color:${OS_PRIMARY} !important}
  `;
  document.head.appendChild(style);
}

const S = {
  fabWrap:    { position:"fixed",bottom:20,right:20,zIndex:9999,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:10 },
  fab:        { display:"flex",alignItems:"center",gap:8,background:`linear-gradient(135deg,${OS_PRIMARY} 0%,${OS_SECONDARY} 100%)`,color:OS_DARK_TEXT,fontWeight:600,fontSize:14,padding:"13px 20px",borderRadius:50,border:"none",cursor:"pointer",boxShadow:`0 4px 24px ${OS_PRIMARY}55`,position:"relative" },
  fabRing:    { position:"absolute",inset:-5,borderRadius:60,border:`2px solid ${OS_PRIMARY}55`,animation:"os-pulse 2.2s ease-out infinite",pointerEvents:"none" },
  nudge:      { background:"#fff",border:"1px solid #e5f0f5",borderRadius:"16px 16px 16px 4px",padding:"10px 14px",maxWidth:200,position:"relative",fontSize:13,color:"#1a2a30",lineHeight:1.45,boxShadow:"0 2px 12px rgba(0,0,0,0.08)" },
  nudgeX:     { position:"absolute",top:-9,right:-9,width:20,height:20,borderRadius:"50%",background:"#f0f4f5",border:"1px solid #d0dde0",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" },
  overlay:    { position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"flex-end",justifyContent:"center",background:"rgba(0,0,0,0.35)" },
  overlayMd:  { position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"flex-end",padding:20,background:"transparent" },
  window:     { width:"100%",maxWidth:460,background:"#fff",borderRadius:"28px 28px 0 0",boxShadow:"0 -8px 40px rgba(0,0,0,0.15)",display:"flex",flexDirection:"column",overflow:"hidden",height:"min(740px,90vh)" },
  windowMd:   { borderRadius:28,boxShadow:"0 8px 50px rgba(0,0,0,0.18)" },
  header:     { padding:"16px 18px",background:"linear-gradient(135deg,#182e38 0%,#0d1e26 100%)",display:"flex",alignItems:"center",gap:12,flexShrink:0,position:"relative",overflow:"hidden" },
  headerGlow: { position:"absolute",top:-40,right:-40,width:140,height:140,background:`radial-gradient(circle,${OS_PRIMARY}22 0%,transparent 70%)`,borderRadius:"50%",pointerEvents:"none" },
  headerIcon: { width:40,height:40,borderRadius:14,background:`${OS_PRIMARY}20`,border:`1px solid ${OS_PRIMARY}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative",zIndex:1 },
  headerInfo: { flex:1,position:"relative",zIndex:1 },
  headerH1:   { color:"#fff",fontWeight:700,fontSize:15,lineHeight:1.2 },
  headerSub:  { color:`${OS_PRIMARY}BB`,fontSize:11,marginTop:2 },
  betaBadge:  { background:`${OS_PRIMARY}18`,border:`1px solid ${OS_PRIMARY}44`,color:OS_PRIMARY,fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:20,display:"flex",alignItems:"center",gap:4,position:"relative",zIndex:1 },
  liveDot:    { width:6,height:6,borderRadius:"50%",background:OS_PRIMARY,animation:"os-blink 1.5s ease-in-out infinite" },
  restartBtn: { display:"flex",alignItems:"center",gap:5,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.9)",fontSize:11,fontWeight:600,padding:"7px 12px",borderRadius:20,cursor:"pointer",position:"relative",zIndex:1 },
  closeBtn:   { background:"rgba(255,255,255,0.1)",border:"none",color:"rgba(255,255,255,0.85)",padding:8,borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",zIndex:1 },
  body:       { flex:1,overflowY:"auto",padding:"16px 14px",display:"flex",flexDirection:"column",gap:10,background:"#f4f9fb" },
  msgAI:      { display:"flex",justifyContent:"flex-start",alignItems:"flex-end",gap:8 },
  msgUser:    { display:"flex",justifyContent:"flex-end" },
  aiAvatar:   { width:28,height:28,borderRadius:10,background:`linear-gradient(135deg,${OS_PRIMARY}20,${OS_SECONDARY}20)`,border:`1px solid ${OS_PRIMARY}44`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 },
  aiBubble:   { maxWidth:"76%",padding:"10px 14px",background:"#fff",color:"#1a2a30",border:"0.5px solid #d8edf2",borderRadius:"16px 16px 16px 4px",fontSize:13,lineHeight:1.55,boxShadow:"0 1px 4px rgba(0,0,0,0.05)" },
  userBubble: { maxWidth:"76%",padding:"10px 14px",background:`linear-gradient(135deg,${OS_PRIMARY},${OS_SECONDARY})`,color:OS_DARK_TEXT,borderRadius:"16px 16px 4px 16px",fontSize:13,lineHeight:1.55,fontWeight:600 },
  typingWrap: { padding:"8px 12px",background:"#fff",border:"0.5px solid #d8edf2",borderRadius:"16px 16px 16px 4px",display:"flex",gap:4,alignItems:"center" },
  footer:     { flexShrink:0,borderTop:"0.5px solid #e2eff3",background:"#fff",padding:"12px 14px" },
  inputRow:   { display:"flex",alignItems:"flex-end",gap:8 },
  textarea:   { flex:1,resize:"none",border:"1.5px solid #d8edf2",borderRadius:16,padding:"10px 14px",fontSize:13,lineHeight:1.5,color:"#1a2a30",background:"#f9fdfe",fontFamily:"inherit",maxHeight:120,overflowY:"auto" },
  sendBtn:    { width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${OS_PRIMARY},${OS_SECONDARY})`,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:OS_DARK_TEXT },
  footerHint: { fontSize:10.5,color:"#90aab5",textAlign:"center",marginTop:8,display:"flex",alignItems:"center",justifyContent:"center",gap:4 },
  chipsRow:   { display:"flex",flexWrap:"wrap",gap:6,marginBottom:10 },
  chip:       { padding:"6px 12px",borderRadius:50,background:"#fff",border:`1.5px solid ${OS_PRIMARY}55`,color:OS_SECONDARY,fontSize:11.5,fontWeight:600,cursor:"pointer",userSelect:"none" },
  card:       { background:"#fff",border:"0.5px solid #d8edf2",borderRadius:16,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.05)" },
  cardThumb:  { width:76,flexShrink:0,background:`linear-gradient(160deg,${OS_PRIMARY}22,${OS_SECONDARY}22)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30 },
  cardBody:   { padding:"12px 14px",flex:1,minWidth:0 },
  cardTitle:  { fontWeight:700,color:"#0f2430",fontSize:13.5,lineHeight:1.3,marginBottom:4 },
  cardMeta:   { display:"flex",flexWrap:"wrap",gap:8,fontSize:11,color:"#6a8e9b" },
  whyTag:     { marginTop:8,background:`${OS_PRIMARY}14`,border:`0.5px solid ${OS_PRIMARY}44`,borderRadius:8,padding:"6px 10px",fontSize:11,color:OS_SECONDARY },
  cardActs:   { display:"flex",flexWrap:"wrap",gap:6,marginTop:10 },
  btnPrimary: { display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:8,background:`linear-gradient(135deg,${OS_PRIMARY},${OS_SECONDARY})`,color:OS_DARK_TEXT,fontSize:11.5,fontWeight:700,border:"none",cursor:"pointer" },
  btnGhost:   { display:"flex",alignItems:"center",gap:4,padding:"6px 10px",borderRadius:8,background:"#f0f6f8",border:"0.5px solid #d8edf2",color:"#4a7a8a",fontSize:11.5,cursor:"pointer" },
  restartDash:{ width:"100%",marginTop:4,padding:"12px",borderRadius:16,border:`2px dashed ${OS_PRIMARY}88`,background:"transparent",color:OS_SECONDARY,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6 },
  toast:      { position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#0d2d36",color:"#fff",fontSize:13,fontWeight:500,padding:"10px 18px",borderRadius:50,boxShadow:"0 4px 20px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",gap:6,zIndex:10000 },
  errorBubble:{ maxWidth:"76%",padding:"10px 14px",background:"#fff0f0",border:"0.5px solid #ffd0d0",borderRadius:"16px 16px 16px 4px",fontSize:13,color:"#a33",lineHeight:1.5 },
};

const STARTERS = [
  "🎉 Something fun this weekend",
  "😌 Chill spot for a date",
  "🎓 Events on my campus",
  "🍔 Campus food vendors",
  "🎵 Live music tonight",
  "🏛️ Halls & venues near me",
];

async function shareItem(title, url, flash) {
  const shareData = { title, text: `Check out "${title}" on OutingStation`, url: url || window.location.origin };
  try {
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareData.url);
      flash("Link copied to clipboard!");
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      try { await navigator.clipboard.writeText(shareData.url); flash("Link copied to clipboard!"); }
      catch { flash("Could not share — try copying the link manually."); }
    }
  }
}

function PaywallOverlay() {
  return (
    <div style={{
      position:"absolute", inset:0, zIndex:10,
      background:"linear-gradient(to bottom, transparent 0%, rgba(244,249,251,0.7) 20%, rgba(244,249,251,0.97) 50%)",
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"flex-end", padding:"16px 16px 20px", borderRadius:16,
    }}>
      <div style={{
        background:"#fff", borderRadius:20, padding:"20px 20px 16px",
        boxShadow:"0 8px 32px rgba(0,0,0,0.12)", width:"100%", maxWidth:340,
        border:`1px solid ${OS_PRIMARY}44`, textAlign:"center",
      }}>
        <div style={{
          width:44, height:44, borderRadius:"50%",
          background:`linear-gradient(135deg,${OS_PRIMARY}22,${OS_SECONDARY}22)`,
          border:`1.5px solid ${OS_PRIMARY}66`,
          display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 10px",
        }}>
          <Lock size={20} color={OS_SECONDARY} />
        </div>
        <p style={{ fontWeight:700, fontSize:15, color:"#0d2d36", marginBottom:6 }}>
          Login to unlock all recommendations
        </p>
        <p style={{ fontSize:12, color:"#6a8e9b", marginBottom:16, lineHeight:1.5 }}>
          Create a free account to get personalised picks, save events, and buy tickets.
        </p>
        <div style={{ display:"flex", gap:8 }}>
          <a href="/login" style={{ flex:1, padding:"10px 0", borderRadius:12, background:`linear-gradient(135deg,${OS_PRIMARY},${OS_SECONDARY})`, color:OS_DARK_TEXT, fontWeight:700, fontSize:13, textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"center" }}>Login</a>
          <a href="/signup" style={{ flex:1, padding:"10px 0", borderRadius:12, background:"#f0f6f8", border:`1px solid ${OS_PRIMARY}55`, color:OS_SECONDARY, fontWeight:700, fontSize:13, textDecoration:"none", display:"flex", alignItems:"center", justifyContent:"center" }}>Sign Up Free</a>
        </div>
      </div>
    </div>
  );
}

export default function OutingStationAI() {
  const auth = (() => { try { return useAuth(); } catch { return {}; } })();
  const userProfile = auth?.userProfile;
  const currentUser = auth?.currentUser;

  const [guestQueryUsed, setGuestQueryUsed] = useState(false);
  const [open,         setOpen]         = useState(false);
  const [showNudge,    setShowNudge]    = useState(false);
  const [loaded,       setLoaded]       = useState(false);
  const [events,       setEvents]       = useState([]);
  const [vendors,      setVendors]      = useState([]);
  const [universities, setUniversities] = useState([]);
  const [messages,     setMessages]     = useState([]);
  const [inputText,    setInputText]    = useState("");
  const [loading,      setLoading]      = useState(false);
  const [history,      setHistory]      = useState([]);
  const [saved,        setSaved]        = useState(new Set());
  const [toast,        setToast]        = useState("");
  const [isMd,         setIsMd]         = useState(false);
  const [showStarters, setShowStarters] = useState(true);

  const scrollRef   = useRef(null);
  const textareaRef = useRef(null);

  const isLoggedIn  = !!currentUser;
  const inputLocked = !isLoggedIn && guestQueryUsed;
  const userCity    = userProfile?.city || "";

  useEffect(() => {
    const check = () => setIsMd(window.innerWidth >= 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowNudge(true), 3500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open || loaded) return;
    (async () => {
      try {
        const [evSnap, vSnap, uSnap] = await Promise.all([
          getDocs(collection(db, "events")),
          getDocs(collection(db, "vendors")).catch(() => ({ docs: [] })),
          getDocs(collection(db, "universities")).catch(() => ({ docs: [] })),
        ]);

        const allEvents = evSnap.docs
          .map(normEvent)
          .filter((x) => x.title && x.status === "published");

        // ✅ City filter:
        // - Campus events bypass (they're university-specific, not city-bound)
        // - Places bypass (halls, venues, restaurants are permanent — show across all cities)
        // - Regular events filtered by user's city
        const cityFilteredEvents = allEvents.filter((e) =>
          e.eventType === "campus" ||
          e.isPlace ||
          matchesCity(e.city, userCity)
        );

        setEvents(cityFilteredEvents);
        setVendors((vSnap.docs || []).map(normVendor));
        setUniversities((uSnap.docs || []).map((d) => d.data().name || d.data().title || d.id).filter(Boolean));

        if (currentUser) {
          const savedSnap = await getDocs(
            collection(db, "users", currentUser.uid, "savedEvents")
          ).catch(() => ({ docs: [] }));
          setSaved(new Set(savedSnap.docs.map((d) => d.id)));
        }
      } catch (e) {
        console.error("Outing AI load failed", e);
        setMessages((m) => [...m, { from:"ai", text:"I'm having trouble loading events right now. Please try again in a moment 🙏", isError:true }]);
      } finally {
        setLoaded(true);
      }
    })();
  }, [open, loaded]); // eslint-disable-line

  useEffect(() => {
    if (open && messages.length === 0) {
      const name = userProfile?.name?.split(" ")[0] || userProfile?.displayName?.split(" ")[0];
      const city = userCity ? ` in ${userCity.split(",")[0]}` : "";
      const greeting = name
        ? `Hi ${name} 👋 I'm Outing AI. Tell me what you're looking for${city} — events, places, halls, campus vibes — and I'll find the best picks for you.`
        : `Hi 👋 I'm Outing AI. Tell me what you're looking for — events, a chill spot, a hall, campus vendors — and I'll find the perfect match.`;
      setMessages([{ from:"ai", text:greeting }]);
    }
  }, [open]); // eslint-disable-line

  useEffect(() => {
    scrollRef.current?.scrollTo({ top:scrollRef.current.scrollHeight, behavior:"smooth" });
  }, [messages, loading]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; }
  };

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2000); };

  const toggleSave = async (id) => {
    if (!isLoggedIn) { flash("Login to save events"); return; }
    const isSaved = saved.has(id);
    setSaved((prev) => {
      const next = new Set(prev);
      isSaved ? next.delete(id) : next.add(id);
      return next;
    });
    try {
      const ref = doc(db, "users", currentUser.uid, "savedEvents", id);
      if (isSaved) {
        await deleteDoc(ref);
      } else {
        const event = events.find((e) => e.id === id);
        await setDoc(ref, {
          eventId: id, savedAt: new Date(),
          title: event?.title || "", imageUrl: event?.imageUrl || "", city: event?.city || "",
        });
        flash("Event saved! ✨");
      }
    } catch (err) {
      console.error("Save failed:", err);
      setSaved((prev) => {
        const next = new Set(prev);
        isSaved ? next.add(id) : next.delete(id);
        return next;
      });
      flash("Failed to save event");
    }
  };

  const send = async (text) => {
    const msg = (text || inputText).trim();
    if (!msg || loading || inputLocked) return;
    setInputText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setShowStarters(false);
    setMessages((m) => [...m, { from:"user", text:msg }]);
    setLoading(true);
    const newHistory = [...history, { role:"user", content:msg }];
    if (!isLoggedIn) setGuestQueryUsed(true);

    try {
      const res = await fetch("/api/ai-recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg, history,
          events: events.filter((e) => e.status === "published"),
          vendors, universities, userCity,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI request failed");
      const resolvedResults = (data.resultIds || [])
        .map((id) => events.find((e) => e.id === id) || vendors.find((v) => v.id === id) || null)
        .filter(Boolean);

      setMessages((m) => [...m, {
        from:"ai", text:data.reply,
        results:resolvedResults, reasons:data.reasons || {},
        isGuestPreview:!isLoggedIn,
      }]);
      setHistory([...newHistory, { role:"assistant", content:data.reply }]);
    } catch (err) {
      console.error("Outing AI error:", err);
      setMessages((m) => [...m, { from:"ai", text:"Hmm, something went wrong on my end. Try again in a moment 😕", isError:true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const restart = () => {
    setMessages([]); setHistory([]); setShowStarters(true);
    setTimeout(() => setMessages([{ from:"ai", text:"Fresh start 👋 What are you looking for?" }]), 60);
  };

  const goToEvent   = (r) => { window.location.href = r.slug ? `/e/${r.slug}` : `/event/${r.id}`; };
  const getShareUrl = (r) => {
    const base = window.location.origin;
    if (r.slug) return `${base}/e/${r.slug}`;
    return `${base}/event/${r.id}`;
  };

  const ResultCard = ({ r, reason }) => {
    const isSaved = saved.has(r.id);
    return (
      <div style={S.card} className="os-msg-in">
        <div style={{ display:"flex" }}>
          <div style={S.cardThumb}>
            {r.imageUrl
              ? <img src={r.imageUrl} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} onError={(e) => { e.target.style.display="none"; }} />
              : <span>{r.emoji}</span>}
          </div>
          <div style={S.cardBody}>
            <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8 }}>
              <h3 style={S.cardTitle}>{r.title}</h3>
              <button onClick={() => toggleSave(r.id)} title={isSaved ? "Remove from saved" : "Save event"}
                style={{ background:"none",border:"none",cursor:"pointer",color:isSaved?OS_PRIMARY:"#c0d4da",flexShrink:0 }}>
                <Bookmark size={17} fill={isSaved?"currentColor":"none"} />
              </button>
            </div>
            <div style={S.cardMeta}>
              {r.area       && <span style={{ display:"flex",alignItems:"center",gap:3 }}><MapPin size={11}/>{r.area}</span>}
              {r.priceLabel && <span style={{ display:"flex",alignItems:"center",gap:3 }}><Ticket size={11}/>{r.priceLabel}</span>}
              <span style={{ color:"#a0bcc5",textTransform:"capitalize" }}>{r.kind}</span>
            </div>
            {r.desc && <p style={{ fontSize:12,color:"#4a7a8a",marginTop:6,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{r.desc}</p>}
            {reason && <div style={S.whyTag}><strong>Why: </strong>{reason}</div>}
            <div style={S.cardActs}>
              {r.kind === "vendor" ? (
                r.whatsapp && <a href={`https://wa.me/${r.whatsapp}`} target="_blank" rel="noopener noreferrer" style={{ ...S.btnPrimary,background:"#22c55e",textDecoration:"none" }}><MessageCircle size={12}/> WhatsApp</a>
              ) : (
                <>
                  <button onClick={() => goToEvent(r)} style={S.btnPrimary}>View details</button>
                  {r.mapLocation && <a href={r.mapLocation} target="_blank" rel="noopener noreferrer" style={{ ...S.btnGhost,textDecoration:"none" }}><MapPin size={12}/> Directions</a>}
                </>
              )}
              <button onClick={() => shareItem(r.title, getShareUrl(r), flash)} style={S.btnGhost}>
                <Share2 size={12}/> Share
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const ResultsBlock = ({ results, reasons, isGuestPreview }) => {
    if (!results || results.length === 0) return null;
    if (!isGuestPreview) {
      return (
        <div style={{ display:"flex",flexDirection:"column",gap:8,marginTop:8,marginLeft:36 }}>
          {results.map((r) => <ResultCard key={r.id} r={r} reason={reasons?.[r.id]}/>)}
          <button onClick={restart} style={S.restartDash}><RotateCcw size={14}/> Start a new search</button>
        </div>
      );
    }
    const first = results[0];
    const rest  = results.slice(1);
    return (
      <div style={{ display:"flex",flexDirection:"column",gap:8,marginTop:8,marginLeft:36 }}>
        <ResultCard key={first.id} r={first} reason={reasons?.[first.id]} />
        {rest.length > 0 && (
          <div style={{ position:"relative", borderRadius:16, overflow:"hidden" }}>
            <div style={{ filter:"blur(3px)", pointerEvents:"none", display:"flex", flexDirection:"column", gap:8 }}>
              {rest.map((r) => <ResultCard key={r.id} r={r} reason={reasons?.[r.id]}/>)}
            </div>
            <PaywallOverlay />
          </div>
        )}
        {rest.length === 0 && (
          <div style={{ background:"#fff", borderRadius:16, padding:"16px", border:`1px solid ${OS_PRIMARY}44`, textAlign:"center" }}>
            <Lock size={18} color={OS_SECONDARY} style={{ marginBottom:8 }} />
            <p style={{ fontWeight:700,fontSize:14,color:"#0d2d36",marginBottom:4 }}>Want more recommendations?</p>
            <p style={{ fontSize:12,color:"#6a8e9b",marginBottom:12 }}>Login for personalised picks, saved events and more.</p>
            <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
              <a href="/login" style={{ padding:"8px 20px",borderRadius:10,background:`linear-gradient(135deg,${OS_PRIMARY},${OS_SECONDARY})`,color:OS_DARK_TEXT,fontWeight:700,fontSize:12,textDecoration:"none" }}>Login</a>
              <a href="/signup" style={{ padding:"8px 20px",borderRadius:10,background:"#f0f6f8",border:`1px solid ${OS_PRIMARY}55`,color:OS_SECONDARY,fontWeight:700,fontSize:12,textDecoration:"none" }}>Sign Up Free</a>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {!open && (
        <div style={S.fabWrap}>
          {showNudge && (
            <div style={S.nudge}>
              <button onClick={() => setShowNudge(false)} style={S.nudgeX}><X size={10}/></button>
              ✨ Not sure where to go? Ask Outing AI
            </div>
          )}
          <button onClick={() => { setOpen(true); setShowNudge(false); }} style={S.fab}>
            <div style={S.fabRing}/>
            <Sparkles size={18}/> Ask Outing AI
          </button>
        </div>
      )}

      {open && (
        <div style={isMd ? S.overlayMd : S.overlay} onClick={(e) => { if (e.target === e.currentTarget && isMd) setOpen(false); }}>
          <div style={{ ...S.window, ...(isMd ? S.windowMd : {}) }}>
            <div style={S.header}>
              <div style={S.headerGlow}/>
              <div style={S.headerIcon}><Sparkles size={19} color={OS_PRIMARY}/></div>
              <div style={S.headerInfo}>
                <div style={S.headerH1}>Outing AI</div>
                <div style={S.headerSub}>
                  {userCity ? `Showing events & places in ${userCity.split(",")[0]} · OutingStation` : "Your personal guide to what's happening around you"}
                </div>
              </div>
              <div style={S.betaBadge}><div style={S.liveDot}/> Beta</div>
              {messages.length > 1 && (
                <button onClick={restart} style={S.restartBtn}><RotateCcw size={12}/> Restart</button>
              )}
              <button onClick={() => setOpen(false)} style={S.closeBtn}><X size={17}/></button>
            </div>

            <div ref={scrollRef} style={S.body}>
              {messages.map((m, i) => (
                <div key={i} className="os-msg-in">
                  {m.from === "ai" && (
                    <>
                      <div style={S.msgAI}>
                        <div style={S.aiAvatar}><Sparkles size={13} color={OS_PRIMARY}/></div>
                        <div style={m.isError ? S.errorBubble : S.aiBubble}>{m.text}</div>
                      </div>
                      <ResultsBlock results={m.results} reasons={m.reasons} isGuestPreview={m.isGuestPreview} />
                    </>
                  )}
                  {m.from === "user" && (
                    <div style={S.msgUser}><div style={S.userBubble}>{m.text}</div></div>
                  )}
                </div>
              ))}
              {loading && (
                <div style={S.msgAI} className="os-msg-in">
                  <div style={S.aiAvatar}><Sparkles size={13} color={OS_PRIMARY}/></div>
                  <div style={S.typingWrap}><span className="os-dot"/><span className="os-dot"/><span className="os-dot"/></div>
                </div>
              )}
            </div>

            <div style={S.footer}>
              {showStarters && (
                <div style={S.chipsRow}>
                  {STARTERS.map((s) => (
                    <button key={s} className="os-chip-btn" style={S.chip} onClick={() => send(s)}>{s}</button>
                  ))}
                </div>
              )}
              {inputLocked ? (
                <div style={{ background:`${OS_PRIMARY}10`, border:`1.5px solid ${OS_PRIMARY}44`, borderRadius:16, padding:"12px 16px", textAlign:"center" }}>
                  <p style={{ fontSize:13,color:"#0d2d36",fontWeight:600,marginBottom:8 }}>🔒 Login to ask more questions</p>
                  <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
                    <a href="/login" style={{ padding:"8px 20px",borderRadius:10,background:`linear-gradient(135deg,${OS_PRIMARY},${OS_SECONDARY})`,color:OS_DARK_TEXT,fontWeight:700,fontSize:12,textDecoration:"none" }}>Login</a>
                    <a href="/signup" style={{ padding:"8px 20px",borderRadius:10,background:"#f0f6f8",border:`1px solid ${OS_PRIMARY}55`,color:OS_SECONDARY,fontWeight:700,fontSize:12,textDecoration:"none" }}>Sign Up Free</a>
                  </div>
                </div>
              ) : (
                <>
                  <div style={S.inputRow}>
                    <textarea ref={textareaRef} className="os-input" rows={1} value={inputText}
                      onChange={handleInputChange} onKeyDown={handleKeyDown}
                      placeholder={isLoggedIn ? "Type what you're looking for…" : "Try a question — 1 free search for guests"}
                      style={S.textarea} disabled={loading} />
                    <button className="os-send-btn" style={S.sendBtn} onClick={() => send()} disabled={!inputText.trim() || loading}>
                      <Send size={16}/>
                    </button>
                  </div>
                  {!isLoggedIn && (
                    <p style={{ fontSize:10.5,color:"#90aab5",textAlign:"center",marginTop:6 }}>
                      Guest preview — <a href="/login" style={{ color:OS_SECONDARY,fontWeight:600 }}>login</a> for unlimited access
                    </p>
                  )}
                </>
              )}
              {isLoggedIn && (
                <div style={S.footerHint}>
                  <Compass size={11} color={OS_PRIMARY}/> Powered by Outing AI · OutingStation
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <div style={S.toast}><Check size={14} color={OS_PRIMARY}/> {toast}</div>}
    </>
  );
}