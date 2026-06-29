// src/components/OutingStationAI.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { Compass, X, Send, RefreshCw, RotateCcw } from 'lucide-react';
import { db, auth } from '../firebase';
import {
  collection, getDocs, doc, getDoc, updateDoc,
  query, where, orderBy, limit
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const API_URL              = '/api/ai-recommend';
const BASE_URL             = 'https://www.outingstation.com';
const FREE_PROMPTS_PER_DAY = 3;
const CREDIT_COST          = 50;

const NUDGE_MESSAGES = [
  "Hey 👋 I'm Outing AI",
  "Not sure where to go today?",
  "Ask me about events near you 🎉",
  "I can find your tickets too 🎟️",
  "Need a hall or venue? Ask me 🏛️",
  "Chill spot? Date night? I got you 😌",
];

const STARTERS = [
  '🎉 Events this weekend',
  '😌 Chill spot for a date',
  '🏛️ Halls & venues near me',
  '🎓 Campus events',
  '💳 Check my credits',
  '🎟️ Show my tickets',
];

function eventUrl(r) {
  if (r.slug) return `${BASE_URL}/e/${r.slug}`;
  return `${BASE_URL}/event/${r.id}`;
}

function hoursUntilReset(resetAt) {
  if (!resetAt) return 24;
  const resetTime = new Date(resetAt).getTime() + 24 * 60 * 60 * 1000;
  const diff = resetTime - Date.now();
  return Math.max(1, Math.ceil(diff / (60 * 60 * 1000)));
}

export default function OutingStationAI() {
  const [open, setOpen]             = useState(false);
  const [messages, setMessages]     = useState([]);
  const [history, setHistory]       = useState([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showStarters, setShowStarters] = useState(true);
  const [guestQueryUsed, setGuestQueryUsed] = useState(false);

  // Nudge state
  const [showNudge, setShowNudge]         = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [nudgeText, setNudgeText]         = useState('');
  const nudgeIndexRef  = useRef(0);
  const nudgeTimerRef  = useRef(null);
  const cycleTimerRef  = useRef(null);
  const typeTimerRef   = useRef(null);

  // User state
  const [user, setUser]               = useState(null);
  const [userName, setUserName]       = useState('');
  const [userCity, setUserCity]       = useState('Lagos');
  const [totalCredits, setTotalCredits] = useState(0);
  const [aiPromptsToday, setAiPromptsToday]     = useState(0);
  const [aiPromptsResetAt, setAiPromptsResetAt] = useState(null);

  // Data
  const [events, setEvents]   = useState([]);
  const [vendors, setVendors] = useState([]);
  const [uniNames, setUniNames] = useState([]);
  const [tickets, setTickets] = useState([]);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // ── Typewriter nudge ────────────────────────────────────────────────────────
  const typewrite = useCallback((text) => {
    clearInterval(typeTimerRef.current);
    let i = 0;
    setNudgeText('');
    typeTimerRef.current = setInterval(() => {
      i++;
      setNudgeText(text.slice(0, i));
      if (i >= text.length) clearInterval(typeTimerRef.current);
    }, 35);
  }, []);

  const startNudge = useCallback(() => {
    if (nudgeDismissed) return;
    setShowNudge(true);
    nudgeIndexRef.current = 0;
    typewrite(NUDGE_MESSAGES[0]);
    cycleTimerRef.current = setInterval(() => {
      nudgeIndexRef.current = (nudgeIndexRef.current + 1) % NUDGE_MESSAGES.length;
      typewrite(NUDGE_MESSAGES[nudgeIndexRef.current]);
    }, 4000);
  }, [nudgeDismissed, typewrite]);

  const dismissNudge = useCallback(() => {
    clearTimeout(nudgeTimerRef.current);
    clearInterval(cycleTimerRef.current);
    clearInterval(typeTimerRef.current);
    setShowNudge(false);
    setNudgeDismissed(true);
  }, []);

  useEffect(() => {
    nudgeTimerRef.current = setTimeout(startNudge, 2500);
    return () => {
      clearTimeout(nudgeTimerRef.current);
      clearInterval(cycleTimerRef.current);
      clearInterval(typeTimerRef.current);
    };
  }, [startNudge]);

  // ── Auth listener ───────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return unsub;
  }, []);

  useEffect(() => {
    if (open && !dataLoaded) loadData();
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Load data ───────────────────────────────────────────────────────────────
  async function loadData() {
    let name = '', city = 'Lagos', credits = 0, promptsToday = 0, resetAt = null;

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const d = userDoc.data();
          name         = d.name || '';
          city         = d.city || 'Lagos';
          credits      = d.totalCredits || 0;
          promptsToday = d.aiPromptsToday || 0;
          resetAt      = d.aiPromptsResetAt || null;
          setUserName(name); setUserCity(city); setTotalCredits(credits);
          setAiPromptsToday(promptsToday); setAiPromptsResetAt(resetAt);
        }
        try {
          const tSnap = await getDocs(query(collection(db, 'tickets'),
            where('userId', '==', currentUser.uid),
            orderBy('purchasedAt', 'desc'), limit(10)));
          setTickets(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (_) {}
      } catch (e) { console.error('AI user load error:', e); }
    }

    try {
      const cityLower = city.toLowerCase().split(',')[0].trim();
      const evSnap    = await getDocs(collection(db, 'events'));
      const now       = Date.now();
      const rawEvents = evSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(e => e.status === 'published')
        .filter(e => {
          const isPlace = e.subCategory === 'places', isCampus = e.eventType === 'campus';
          if (isPlace || isCampus) return true;
          return cityLower && (e.location || '').toLowerCase().includes(cityLower);
        })
        .filter(e => {
          if (e.subCategory === 'places' || !e.date) return true;
          const ms = e.date?.seconds ? e.date.seconds * 1000 : new Date(e.date).getTime();
          return ms >= now;
        })
        .map(e => {
          const amount = e.ticketPrice || e.price || 0;
          const hasTiers = Array.isArray(e.ticketTiers) && e.ticketTiers.length > 0;
          let price = 'free', priceLabel = 'Free';
          if (e.isFree) { price = 'free'; priceLabel = 'Free'; }
          else if (hasTiers) {
            const min = Math.min(...e.ticketTiers.map(t => t.price || 0));
            if (min === 0) { price = 'free'; priceLabel = 'Free'; }
            else if (min <= 10000) { price = 'low'; priceLabel = `from ₦${min.toLocaleString()}`; }
            else if (min <= 50000) { price = 'medium'; priceLabel = `from ₦${min.toLocaleString()}`; }
            else { price = 'premium'; priceLabel = `from ₦${min.toLocaleString()}`; }
          } else if (amount > 0) {
            price = amount <= 10000 ? 'low' : amount <= 50000 ? 'medium' : 'premium';
            priceLabel = `₦${Number(amount).toLocaleString()}`;
          } else if (e.ticketingEnabled || e.hasOutingStationTicketing || (e.externalTicketLink || '').trim()) {
            price = 'low'; priceLabel = 'Ticketed';
          }
          return {
            id: e.id, slug: e.slug || '', title: e.title || 'Untitled',
            desc: (e.description || '').substring(0, 100),
            kind: e.subCategory === 'places' ? 'place' : 'event',
            city: e.location || '', area: (e.location || '').split(',')[0].trim(),
            price, priceLabel, priceNaira: amount,
            category: e.category || '', campus: e.eventType === 'campus' ? 'yes' : 'no',
            university: e.university || '',
            imageUrl: e.imageUrl || (Array.isArray(e.images) && e.images[0]) || '',
            mapLocation: e.mapLocation || '',
          };
        });
      setEvents(rawEvents);
    } catch (e) { console.error('AI events load error:', e); }

    try {
      const vSnap = await getDocs(collection(db, 'vendors'));
      setVendors(vSnap.docs.map(d => {
        const data = d.data();
        return { id: d.id, title: data.shopName || data.name || 'Vendor', desc: data.description || '',
          kind: 'vendor', category: data.category || '', university: data.university || '',
          whatsapp: (data.whatsappNumber || '').replace(/[^0-9]/g, ''),
          area: data.university || '', priceLabel: 'Vendor', imageUrl: data.imageUrl || '' };
      }));
    } catch (_) {}

    try {
      const uSnap = await getDocs(collection(db, 'universities'));
      setUniNames(uSnap.docs.map(d => d.data().name).filter(Boolean));
    } catch (_) {}

    setDataLoaded(true);
    const firstName = name.split(' ')[0];
    const cityStr   = city ? ` in ${city.split(',')[0]}` : '';
    const greeting  = firstName
      ? `Hi ${firstName} 👋 I'm Outing AI. What are you looking for${cityStr} — events, places, halls, campus vibes?`
      : `Hi 👋 I'm Outing AI. Tell me what you're looking for and I'll find the perfect match.`;
    setMessages([{ from: 'ai', text: greeting }]);
  }

  // ── Prompt system ───────────────────────────────────────────────────────────
  function getFreePromptsLeft() {
    if (!user) return 0;
    const resetTime = aiPromptsResetAt ? new Date(aiPromptsResetAt) : null;
    if (!resetTime || (Date.now() - resetTime) >= 24 * 60 * 60 * 1000) return FREE_PROMPTS_PER_DAY;
    return Math.max(0, FREE_PROMPTS_PER_DAY - aiPromptsToday);
  }

  async function checkAndConsumePrompt() {
    if (!user) return { allowed: true };
    const userRef = doc(db, 'users', user.uid);
    const now     = new Date();
    const resetTime = aiPromptsResetAt ? new Date(aiPromptsResetAt) : null;
    const needsReset = !resetTime || (now - resetTime) >= 24 * 60 * 60 * 1000;

    let currentPrompts = aiPromptsToday;
    let currentResetAt = aiPromptsResetAt;

    if (needsReset) {
      currentPrompts = 0; currentResetAt = now.toISOString();
      setAiPromptsToday(0); setAiPromptsResetAt(currentResetAt);
      await updateDoc(userRef, { aiPromptsToday: 0, aiPromptsResetAt: currentResetAt });
    }

    if (currentPrompts < FREE_PROMPTS_PER_DAY) {
      const newCount = currentPrompts + 1;
      setAiPromptsToday(newCount);
      await updateDoc(userRef, { aiPromptsToday: newCount });
      return { allowed: true };
    }

    if (totalCredits >= CREDIT_COST) {
      const newCredits = totalCredits - CREDIT_COST;
      setTotalCredits(newCredits);
      await updateDoc(userRef, { totalCredits: newCredits });
      return { allowed: true };
    }

    return { allowed: false, hoursLeft: hoursUntilReset(currentResetAt) };
  }

  // ── Send ────────────────────────────────────────────────────────────────────
  async function send(preset) {
    const text = (preset || input).trim();
    if (!text || loading) return;
    if (!user && guestQueryUsed) return;

    setInput(''); setShowStarters(false);
    setMessages(prev => [...prev, { from: 'user', text }]);
    setLoading(true);
    if (!user) setGuestQueryUsed(true);

    const lower = text.toLowerCase();

    if (lower.includes('ticket') && (lower.includes('my') || lower.includes('show') || lower.includes('check'))) {
      await handleTicketsCommand(); return;
    }
    if (lower.includes('credit') || lower.includes('balance') || lower.includes('wallet')) {
      await handleCreditsCommand(); return;
    }

    if (user) {
      const { allowed, hoursLeft } = await checkAndConsumePrompt();
      if (!allowed) {
        setMessages(prev => [...prev, {
          from: 'ai', isPromptLimit: true,
          text: `You've used your ${FREE_PROMPTS_PER_DAY} free prompts for today 😊\n\nTo get more prompts:\n• 👥 Refer a friend — earn ₦300 credits\n• 🎉 List an event — earn credits on approval\n• 📍 List a place — earn credits on approval\n\nOr wait ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''} for your free prompts to reset.`,
        }]);
        setLoading(false); return;
      }
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, events: events.slice(0, 120), vendors: vendors.slice(0, 60), universities: uniNames, userCity }),
      });
      if (!res.ok) throw new Error('API error');
      const data    = await res.json();
      const reply   = data.reply || 'Here are some picks for you!';
      const ids     = data.resultIds || [];
      const reasons = data.reasons || {};
      const results = ids.map(id => events.find(e => e.id === id) || vendors.find(v => v.id === id) || null).filter(Boolean);
      setMessages(prev => [...prev, { from: 'ai', text: reply, results, reasons, isGuestPreview: !user }]);
      setHistory(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: reply }]);
    } catch (_) {
      setMessages(prev => [...prev, { from: 'ai', text: 'Couldn\'t connect right now. Please check your internet and try again 📡', isError: true }]);
    }
    setLoading(false);
  }

  async function handleTicketsCommand() {
    await new Promise(r => setTimeout(r, 600));
    if (!user) {
      setMessages(prev => [...prev, { from: 'ai', text: 'You need to be logged in to view your tickets 🎟️', isLoginGate: true }]);
    } else if (tickets.length === 0) {
      setMessages(prev => [...prev, { from: 'ai', text: 'You haven\'t bought any tickets yet. Browse events and get your first ticket! 🎉' }]);
    } else {
      const upcoming = tickets.filter(t => t.status === 'active');
      setMessages(prev => [...prev, {
        from: 'ai',
        text: upcoming.length > 0 ? `You have ${upcoming.length} upcoming ticket(s) 🎟️` : `You have ${tickets.length} ticket(s) in total. No upcoming events right now.`,
        tickets: upcoming.length > 0 ? upcoming.slice(0, 5) : tickets.slice(0, 3),
      }]);
    }
    setLoading(false);
  }

  async function handleCreditsCommand() {
    await new Promise(r => setTimeout(r, 500));
    if (!user) {
      setMessages(prev => [...prev, { from: 'ai', text: 'Login to check your OutingStation credits 💳', isLoginGate: true }]);
    } else {
      const freeLeft = getFreePromptsLeft();
      setMessages(prev => [...prev, {
        from: 'ai',
        text: totalCredits > 0
          ? `You have ₦${totalCredits.toLocaleString()} in OutingStation credits 💳\n\nYou have ${freeLeft} free AI prompt${freeLeft !== 1 ? 's' : ''} left today. Each extra prompt costs ₦${CREDIT_COST}.`
          : `You don't have any credits yet. Refer friends using your referral code to earn ₦300 per signup! 🎁`,
      }]);
    }
    setLoading(false);
  }

  function restart() {
    setMessages([{ from: 'ai', text: 'Fresh start 👋 What are you looking for?' }]);
    setHistory([]); setShowStarters(true);
  }

  function openChat() {
    dismissNudge();
    setOpen(true);
  }

  const freePromptsLeft = getFreePromptsLeft();
  const inputLocked     = !user && guestQueryUsed;
  const hintText = !user
    ? 'Try a question — 1 free search'
    : freePromptsLeft > 0
    ? `Type what you're looking for… (${freePromptsLeft} free left)`
    : `₦${CREDIT_COST} credits per prompt`;

  return (
    <>
      {/* ── FAB + Nudge bubble ──────────────────────────────────────────────── */}
      <div className="fixed bottom-24 right-5 z-[999] flex flex-col items-end gap-2">

        {/* Nudge bubble */}
        {showNudge && !open && (
          <div
            onClick={openChat}
            className="cursor-pointer max-w-[200px] bg-white rounded-2xl rounded-br-sm px-3 py-2.5 shadow-lg border border-cyan-100 flex items-start gap-2 animate-fade-in"
          >
            <p className="text-xs font-medium text-slate-700 leading-snug flex-1">{nudgeText}</p>
            <button
              onClick={e => { e.stopPropagation(); dismissNudge(); }}
              className="text-slate-300 hover:text-slate-500 mt-0.5 flex-shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* FAB button */}
        <button
          onClick={openChat}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-xl flex items-center justify-center relative"
          aria-label="Open Outing AI"
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-cyan-400 animate-ping opacity-20" />
          <Compass size={24} className="text-white relative z-10" />
        </button>
      </div>

      {/* ── Chat overlay ────────────────────────────────────────────────────── */}
      {open && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 bg-black/40 z-[1000] md:hidden"
            onClick={() => setOpen(false)}
          />

          <div className="
            fixed z-[1001]
            inset-x-0 bottom-0 rounded-t-3xl
            md:inset-auto md:bottom-4 md:right-4 md:w-96 md:rounded-2xl
            bg-white shadow-2xl
            flex flex-col overflow-hidden
            h-[88dvh] md:h-[600px]
          ">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-3 flex items-center gap-3 flex-shrink-0 rounded-t-3xl md:rounded-t-2xl">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Compass size={18} className="text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">Outing AI</p>
                <p className="text-cyan-400 text-xs truncate">Your personal guide</p>
              </div>
              <span className="text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full font-semibold">Beta</span>
              {messages.length > 1 && (
                <button onClick={restart} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition" title="Restart">
                  <RotateCcw size={14} className="text-white/70" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition">
                <X size={16} className="text-white/70" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 bg-slate-50 space-y-3">
              {!dataLoaded ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {messages.map((m, i) => (
                    <Message key={i} m={m} user={user} onRestart={restart} />
                  ))}
                  {loading && <TypingIndicator />}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Footer */}
            <div className="bg-white border-t border-slate-100 p-3 flex-shrink-0">
              {showStarters && (
                <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
                  {STARTERS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="flex-shrink-0 text-xs font-semibold text-cyan-600 border border-cyan-300 bg-white rounded-full px-3 py-1.5 hover:bg-cyan-50 transition">
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {inputLocked ? (
                <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 text-center">
                  <p className="text-sm font-bold text-slate-800 mb-2">🔒 Login to ask more questions</p>
                  <div className="flex gap-2">
                    <a href="/login" className="flex-1 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-xs font-bold py-2 rounded-lg text-center">Login</a>
                    <a href="/signup" className="flex-1 border border-cyan-400 text-cyan-600 text-xs font-bold py-2 rounded-lg text-center">Sign Up Free</a>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !loading && send()}
                      placeholder={hintText}
                      disabled={loading}
                      className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-400 disabled:opacity-50"
                    />
                    <button
                      onClick={() => send()}
                      disabled={loading || !input.trim()}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center disabled:opacity-40 transition flex-shrink-0"
                    >
                      <Send size={16} className="text-white" />
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center justify-center">
                    {user ? (
                      <span className={`text-[10px] ${freePromptsLeft > 0 ? 'text-slate-400' : totalCredits >= CREDIT_COST ? 'text-orange-500' : 'text-red-400'}`}>
                        {freePromptsLeft > 0
                          ? `${freePromptsLeft} free prompt${freePromptsLeft !== 1 ? 's' : ''} left today`
                          : totalCredits >= CREDIT_COST
                          ? `₦${CREDIT_COST} credits per prompt · ₦${totalCredits.toLocaleString()} available`
                          : `No credits — resets in ${hoursUntilReset(aiPromptsResetAt)}hrs`}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        Guest preview — <a href="/login" className="text-cyan-500 font-semibold">login</a> for unlimited access
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── Message ───────────────────────────────────────────────────────────────────

function Message({ m, user, onRestart }) {
  if (m.from === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-gradient-to-br from-cyan-400 to-cyan-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm font-semibold">
          {m.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="w-6 h-6 rounded-lg bg-cyan-100 border border-cyan-200 flex items-center justify-center flex-shrink-0">
          <Compass size={12} className="text-cyan-600" />
        </div>
        <div className={`max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
          m.isError ? 'bg-red-50 border border-red-200 text-red-700'
          : m.isPromptLimit ? 'bg-amber-50 border border-amber-200 text-amber-800'
          : 'bg-white border border-slate-200 text-slate-800'
        }`}>
          {m.text}
        </div>
      </div>

      {m.isPromptLimit && (
        <div className="flex gap-2 ml-8">
          <a href="/create" className="flex-1 text-center text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2 hover:bg-amber-100 transition">🎉 List Event</a>
          <a href="/settings" className="flex-1 text-center text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg py-2 hover:bg-amber-100 transition">👥 Refer Friend</a>
        </div>
      )}

      {m.results?.length > 0 && (
        <div className="ml-8 space-y-2">
          {m.isGuestPreview ? (
            <>
              <ResultCard r={m.results[0]} reason={m.reasons?.[m.results[0].id]} />
              {m.results.length > 1 && (
                <div className="relative">
                  <div className="opacity-30 blur-sm pointer-events-none space-y-2">
                    {m.results.slice(1).map((r, i) => <ResultCard key={i} r={r} reason={null} />)}
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded-xl p-4 text-center">
                    <span className="text-2xl mb-1">🔒</span>
                    <p className="text-sm font-bold text-slate-800">Login to unlock all picks</p>
                    <div className="flex gap-2 mt-3 w-full">
                      <a href="/login" className="flex-1 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-xs font-bold py-2 rounded-lg text-center">Login</a>
                      <a href="/signup" className="flex-1 border border-cyan-400 text-cyan-600 text-xs font-bold py-2 rounded-lg text-center">Sign Up</a>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {m.results.map((r, i) => <ResultCard key={i} r={r} reason={m.reasons?.[r.id]} />)}
              <button onClick={onRestart} className="w-full text-xs font-bold text-cyan-600 border border-cyan-300 rounded-xl py-2.5 hover:bg-cyan-50 transition flex items-center justify-center gap-1.5">
                <RefreshCw size={12} /> Start a new search
              </button>
            </>
          )}
        </div>
      )}

      {m.tickets?.length > 0 && (
        <div className="ml-8 space-y-2">
          {m.tickets.map((t, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🎟️</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{t.eventTitle || 'Event'}</p>
                <p className="text-xs text-slate-500">{t.tierName || 'Regular'} · ₦{t.amount?.toLocaleString()}</p>
              </div>
              <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
            </div>
          ))}
        </div>
      )}

      {m.isLoginGate && (
        <div className="ml-8 flex gap-2">
          <a href="/login" className="flex-1 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-xs font-bold py-2 rounded-lg text-center">Login</a>
          <a href="/signup" className="flex-1 border border-cyan-400 text-cyan-600 text-xs font-bold py-2 rounded-lg text-center">Sign Up Free</a>
        </div>
      )}
    </div>
  );
}

function ResultCard({ r, reason }) {
  const isVendor = r.kind === 'vendor';
  const url      = eventUrl(r);
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {r.imageUrl
        ? <img src={r.imageUrl} alt={r.title} className="w-full h-24 object-cover" onError={e => e.target.style.display='none'} />
        : <div className="w-full h-16 bg-cyan-50 flex items-center justify-center text-3xl">{isVendor ? '🛒' : r.kind === 'place' ? '📍' : '🎉'}</div>
      }
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-bold text-slate-800 leading-snug">{r.title}</p>
          <span className="text-[10px] font-semibold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full flex-shrink-0">
            {r.kind === 'vendor' ? 'Vendor' : r.kind === 'place' ? 'Place' : 'Event'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
          {r.area && <span>📍 {r.area}</span>}
          <span>{r.priceLabel}</span>
        </div>
        {reason && (
          <div className="bg-cyan-50 border border-cyan-100 rounded-lg px-2.5 py-1.5 mb-2">
            <p className="text-[11px] text-cyan-700"><span className="font-bold">Why:</span> {reason}</p>
          </div>
        )}
        <div className="flex gap-1.5">
          {isVendor && r.whatsapp
            ? <a href={`https://wa.me/${r.whatsapp}`} target="_blank" rel="noreferrer" className="flex-1 text-[11px] font-bold text-white bg-green-500 rounded-lg py-1.5 text-center">WhatsApp</a>
            : <a href={url} target="_blank" rel="noreferrer" className="flex-1 text-[11px] font-bold text-white bg-cyan-500 rounded-lg py-1.5 text-center">View Details</a>
          }
          {r.mapLocation && <a href={r.mapLocation} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-slate-600 bg-slate-100 rounded-lg py-1.5 px-2.5">Directions</a>}
          <button onClick={() => navigator.share?.({ title: r.title, url })} className="text-[11px] font-bold text-slate-600 bg-slate-100 rounded-lg py-1.5 px-2.5">Share</button>
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-6 h-6 rounded-lg bg-cyan-100 border border-cyan-200 flex items-center justify-center flex-shrink-0">
        <Compass size={12} className="text-cyan-600" />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
        {[0,1,2].map(i => (
          <div key={i} className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
        ))}
      </div>
    </div>
  );
}