import { useState } from 'react';
import toast from 'react-hot-toast';
import { UserPlus, CheckCircle, Users, ExternalLink, X } from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

// ─── Guest block ──────────────────────────────────────────────────────────

function GuestBlock({ index, guest, onChange }) {
  return (
    <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-2">
      <p className="text-xs font-bold text-gray-600">Guest {index}</p>
      <input type="text" value={guest.name}
        onChange={(e) => onChange({ ...guest, name: e.target.value })}
        placeholder="Guest full name *"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 outline-none" />
      <div className="grid grid-cols-2 gap-2">
        <input type="email" value={guest.email}
          onChange={(e) => onChange({ ...guest, email: e.target.value })}
          placeholder="Email (optional)"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 outline-none" />
        <input type="tel" value={guest.phone}
          onChange={(e) => onChange({ ...guest, phone: e.target.value })}
          placeholder="Phone (optional)"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 outline-none" />
      </div>
    </div>
  );
}

// ─── Custom question field ────────────────────────────────────────────────

function CustomQuestionField({ question, value, onChange }) {
  if (question.type === 'select') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {question.label} {question.required && <span className="text-red-500">*</span>}
        </label>
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none">
          <option value="">Select an option</option>
          {question.options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
        </select>
      </div>
    );
  }
  if (question.type === 'yes_no') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {question.label} {question.required && <span className="text-red-500">*</span>}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {['Yes', 'No'].map(opt => (
            <button key={opt} type="button" onClick={() => onChange(opt)}
              className={`py-2 rounded-lg border-2 text-sm font-medium transition ${
                value === opt ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-600'
              }`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {question.label} {question.required && <span className="text-red-500">*</span>}
      </label>
      <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" />
    </div>
  );
}

// ─── Confirmation modal ────────────────────────────────────────────────────

function RegistrationConfirmedModal({ data, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-emerald-500" size={20} />
            <div>
              <p className="text-sm font-bold text-gray-900">You're Registered!</p>
              <p className="text-xs text-gray-400">Check your email for confirmation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div style={{
            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
            borderRadius: 14, padding: '14px 16px'
          }}>
            <p style={{ color: 'white', fontWeight: 800, fontSize: 14, margin: '0 0 6px' }}>{data.eventTitle}</p>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>Registration ID: {data.ticketId}</p>
          </div>
          <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-3 text-sm text-cyan-800">
            🎉 Show this confirmation or your ID at the entrance.
            {data.groupSize > 1 && ` Covers ${data.groupSize} people — please arrive together.`}
          </div>
          <button onClick={() => window.open(`https://www.outingstation.com/verify-ticket/${data.ticketId}`, '_blank')}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg transition">
            <ExternalLink size={15} /> View Registration Online
          </button>
          <button onClick={onClose} className="w-full py-2 text-gray-400 hover:text-gray-600 text-sm font-medium">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function FreeRegistrationSection({ event, currentUser, onRegistrationComplete }) {
  const maxGroupSize = Math.min(event.maxGroupSize || 1, 6);
  const customQuestions = event.customQuestions || [];

  const [name, setName] = useState(currentUser?.displayName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState('');
  const [groupSize, setGroupSize] = useState(1);
  const [guests, setGuests] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmData, setConfirmData] = useState(null);

  const spotsRemaining = event.ticketsAvailable != null
    ? (event.ticketsAvailable - (event.ticketsSold || 0))
    : null;
  const soldOut = spotsRemaining != null && spotsRemaining <= 0;

  const updateGroupSize = (size) => {
    setGroupSize(size);
    const needed = size - 1;
    setGuests(prev => {
      const next = [...prev];
      while (next.length < needed) next.push({ id: generateId(), name: '', email: '', phone: '' });
      return next.slice(0, needed);
    });
  };

  const updateGuest = (index, guest) => {
    setGuests(prev => prev.map((g, i) => (i === index ? guest : g)));
  };

  const updateAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error('Please fill in your name, email, and phone number');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error('Please enter a valid email');
      return;
    }
    for (let i = 0; i < guests.length; i++) {
      if (!guests[i].name.trim()) {
        toast.error(`Please enter Guest ${i + 1}'s name`);
        return;
      }
    }
    for (const q of customQuestions) {
      if (q.required && !answers[q.id]) {
        toast.error(`Please answer: ${q.label}`);
        return;
      }
    }
    if (soldOut) {
      toast.error('This event is fully booked');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/register-free-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          buyerName: name,
          buyerEmail: email,
          buyerPhone: phone,
          groupSize,
          guests,
          customAnswers: answers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      setConfirmData({
        ticketId: data.ticketId,
        eventTitle: event.title,
        groupSize: data.groupSize || groupSize,
      });
      setShowConfirm(true);
      toast.success("🎉 You're registered! Check your email.", { duration: 5000 });
      if (onRegistrationComplete) onRegistrationComplete(data.groupSize || groupSize);
    } catch (err) {
      console.error('Registration error:', err);
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-cyan-100">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="text-cyan-500" size={24} />
          <h3 className="text-xl font-bold text-gray-900">Free Registration</h3>
        </div>

        {spotsRemaining != null && (
          <div className="bg-cyan-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{spotsRemaining}</span> spots remaining
            </p>
            {spotsRemaining < 10 && spotsRemaining > 0 && (
              <p className="text-xs text-orange-600 mt-1">⚠️ Filling up fast!</p>
            )}
            {soldOut && <p className="text-xs text-red-600 mt-1">❌ Fully booked!</p>}
          </div>
        )}

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+234 800 000 0000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" />
          </div>

          {maxGroupSize > 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                <Users size={15} /> How many people (including you)?
              </label>
              <div className="flex gap-2">
                {Array.from({ length: maxGroupSize }, (_, i) => i + 1).map(n => (
                  <button key={n} type="button" onClick={() => updateGroupSize(n)}
                    className={`flex-1 py-2 rounded-lg border-2 text-sm font-bold transition ${
                      groupSize === n ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-gray-200 text-gray-600'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {groupSize > 1 && (
          <div className="space-y-3 mb-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-700">
              ⚠️ <strong>You must arrive together.</strong> This registration covers {groupSize} people under one confirmation. If a guest arrives separately, you'll need to be present to check them in.
            </div>
            {guests.map((guest, i) => (
              <GuestBlock key={guest.id} index={i + 1} guest={guest}
                onChange={(g) => updateGuest(i, g)} />
            ))}
          </div>
        )}

        {customQuestions.length > 0 && (
          <div className="space-y-3 mb-4 pt-2 border-t border-gray-100">
            {customQuestions.map(q => (
              <CustomQuestionField key={q.id} question={q} value={answers[q.id]}
                onChange={(v) => updateAnswer(q.id, v)} />
            ))}
          </div>
        )}

        {!soldOut ? (
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full bg-gradient-to-r from-cyan-400 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50">
            <UserPlus size={20} />
            {submitting ? 'Registering...' : 'Register for Free'}
          </button>
        ) : (
          <button disabled className="w-full bg-gray-300 text-gray-500 py-3 rounded-xl font-semibold cursor-not-allowed">
            Fully Booked
          </button>
        )}

        <p className="text-xs text-gray-500 text-center mt-3">
          🎫 Registration confirmation sent to your email
        </p>
      </div>

      {showConfirm && confirmData && (
        <RegistrationConfirmedModal data={confirmData} onClose={() => setShowConfirm(false)} />
      )}
    </>
  );
}