import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Calendar, MapPin, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, ListPlus, MessageSquare, Phone, Image as ImageIcon, Trash2 } from 'lucide-react';

const CATEGORY_LABELS = {
  venue: 'Venue', rentals: 'Rentals', decorator: 'Decorator', catering: 'Catering',
  livestock: 'Livestock', dj: 'DJ', mc: 'MC', photography: 'Photography',
  transportation: 'Transportation', otherService: 'Other Service', others: 'Others',
};

const REQUEST_CATEGORIES = ['rentals', 'decorator', 'catering', 'dj', 'mc', 'photography', 'transportation'];
const SUPPLY_TYPES = ['Gift Vendor', 'Food Stuffs Seller', 'Baker', 'Beverages Seller'];

function ContactReveal({ businessId, businessName, business }) {
  if (!business) {
    return <p className="text-xs text-gray-400 mt-1">Loading contact info...</p>;
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 mt-2">
      <Phone size={11} />
      <span className="font-bold">{businessName}:</span>
      <span>{business.whatsappNumber || 'No number on file'}</span>
    </div>
  );
}

function QuoteList({ requestId, deadline, quotes, acceptQuote, acceptingQuoteId, businessCache, loadBusinessDetails, expandedQuoteId, setExpandedQuoteId }) {
  return (
    <div className="mt-2">
      <p className="text-xs text-gray-500 mb-2">
        <MessageSquare size={11} className="inline mr-1" />
        {quotes.length} quote(s) received
      </p>
      {quotes.map(q => {
        const isOpen = expandedQuoteId === q.id;
        const biz = businessCache[q.businessId];
        return (
          <div key={q.id} className="bg-white border border-gray-200 rounded-lg p-2.5 mb-1.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-800">{q.businessName}</p>
                <p className="text-xs text-cyan-600 font-bold">₦{Number(q.quotedPrice).toLocaleString()}</p>
                {q.message && <p className="text-xs text-gray-500 mt-0.5">{q.message}</p>}
              </div>
              <button
                onClick={() => acceptQuote(q, requestId)}
                disabled={acceptingQuoteId === q.id}
                className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-600 transition disabled:opacity-50 flex-shrink-0"
              >
                {acceptingQuoteId === q.id ? 'Accepting...' : 'Accept'}
              </button>
            </div>
            <button
              onClick={() => {
                const next = isOpen ? '' : q.id;
                setExpandedQuoteId(next);
                if (next) loadBusinessDetails(q.businessId);
              }}
              className="flex items-center gap-1 text-[11px] text-cyan-600 font-semibold mt-1.5"
            >
              <ImageIcon size={11} /> {isOpen ? 'Hide their work' : 'View their work / pricing'}
            </button>
            {isOpen && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                {!biz ? (
                  <p className="text-xs text-gray-400">Loading...</p>
                ) : (
                  <>
                    {biz.description && <p className="text-xs text-gray-500 mb-2">{biz.description}</p>}
                    {(biz.pricingTiers?.length > 0 || biz.hourlyPackages?.length > 0) ? (
                      <div className="grid grid-cols-2 gap-2">
                        {(biz.pricingTiers || biz.hourlyPackages || []).slice(0, 4).map((pkg, i) => (
                          <div key={i} className="border border-gray-100 rounded-lg p-2">
                            {pkg.image && <img src={pkg.image} alt="" className="w-full h-16 object-cover rounded-md mb-1" />}
                            <p className="text-[11px] font-bold text-gray-700 truncate">{pkg.name || `${pkg.hours} hrs`}</p>
                            <p className="text-[11px] text-cyan-600 font-bold">₦{Number(pkg.price).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">No portfolio photos listed yet.</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
      {quotes.length === 0 && (
        <p className="text-xs text-gray-400">No quotes yet{deadline ? ` — closes ${deadline}` : ''}.</p>
      )}
    </div>
  );
}

export default function MyEventsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [requestsByPlan, setRequestsByPlan] = useState({});
  const [quotesByRequest, setQuotesByRequest] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [acceptingQuoteId, setAcceptingQuoteId] = useState('');
  const [businessCache, setBusinessCache] = useState({});
  const [expandedQuoteId, setExpandedQuoteId] = useState('');

  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }
    loadPlans();
  }, [currentUser]);

  const loadBusinessDetails = async (businessId) => {
    if (!businessId || businessCache[businessId]) return;
    try {
      const snap = await getDoc(doc(db, 'businesses', businessId));
      if (snap.exists()) {
        setBusinessCache(prev => ({ ...prev, [businessId]: snap.data() }));
      }
    } catch (err) {
      console.error('Error loading business details:', err);
    }
  };

  const loadPlans = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'event_plans'), where('userId', '==', currentUser.uid)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPlans(list);

      const reqSnap = await getDocs(query(collection(db, 'serviceRequests'), where('plannerUserId', '==', currentUser.uid)));
      const allRequests = reqSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const grouped = {};
      allRequests.forEach(r => {
        if (!grouped[r.eventPlanId]) grouped[r.eventPlanId] = [];
        grouped[r.eventPlanId].push(r);
      });
      setRequestsByPlan(grouped);

      allRequests.forEach(r => {
        const resolvedBusinessId = r.requestType === 'direct'
          ? (r.status === 'accepted' ? r.targetBusinessId : null)
          : (r.status === 'closed' ? r.acceptedByBusinessId : null);
        if (resolvedBusinessId) loadBusinessDetails(resolvedBusinessId);
      });

      const openRequestIds = allRequests.filter(r => r.requestType === 'open').map(r => r.id);
      if (openRequestIds.length > 0) {
        const quoteSnap = await getDocs(query(collection(db, 'serviceQuotes'), where('plannerUserId', '==', currentUser.uid)));
        const allQuotes = quoteSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const quoteGroups = {};
        allQuotes.forEach(q => {
          if (!quoteGroups[q.requestId]) quoteGroups[q.requestId] = [];
          quoteGroups[q.requestId].push(q);
        });
        setQuotesByRequest(quoteGroups);
      }
    } catch (err) {
      console.error('Error loading plans:', err);
    }
    setLoading(false);
  };

  const deletePlan = async (planId) => {
    if (!confirm('Delete this event plan? This also removes any requests and quotes tied to it, and cannot be undone.')) return;
    try {
      // ✅ Clean up related serviceRequests + serviceQuotes first, so
      // businesses don't keep seeing requests/quotes tied to a plan that
      // no longer exists.
      const relatedRequests = requestsByPlan[planId] || [];
      for (const req of relatedRequests) {
        const quotes = quotesByRequest[req.id] || [];
        for (const q of quotes) {
          await deleteDoc(doc(db, 'serviceQuotes', q.id));
        }
        await deleteDoc(doc(db, 'serviceRequests', req.id));
      }
      await deleteDoc(doc(db, 'event_plans', planId));
      setPlans(prev => prev.filter(p => p.id !== planId));
    } catch (err) {
      console.error('Error deleting plan:', err);
      alert('Failed to delete plan. Please try again.');
    }
  };

  const acceptQuote = async (quote, requestId) => {
    setAcceptingQuoteId(quote.id);
    try {
      await updateDoc(doc(db, 'serviceQuotes', quote.id), { status: 'accepted' });
      await updateDoc(doc(db, 'serviceRequests', requestId), {
        status: 'closed',
        acceptedByBusinessId: quote.businessId,
        acceptedByBusinessName: quote.businessName,
      });

      const others = (quotesByRequest[requestId] || []).filter(q => q.id !== quote.id);
      for (const other of others) {
        await updateDoc(doc(db, 'serviceQuotes', other.id), { status: 'declined' });
      }

      loadPlans();
      loadBusinessDetails(quote.businessId);
    } catch (err) {
      console.error('Error accepting quote:', err);
      alert('Failed to accept quote. Please try again.');
    }
    setAcceptingQuoteId('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-cyan-600 font-bold uppercase tracking-wider">Plan My Event</p>
            <h1 className="text-2xl font-black text-gray-900">My Events</h1>
          </div>
          <button
            onClick={() => navigate('/plan-event')}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2.5 rounded-2xl font-bold text-sm hover:shadow-lg transition"
          >
            <ListPlus size={16} /> New Plan
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-gray-100 p-8 text-center">
            <h2 className="font-bold text-gray-900 mb-2">No events planned yet</h2>
            <p className="text-sm text-gray-500 mb-6">Start planning your birthday, wedding, or next event.</p>
            <button onClick={() => navigate('/plan-event')}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:shadow-lg transition">
              Start Planning
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map(plan => {
              const isExpanded = expandedId === plan.id;
              const requests = requestsByPlan[plan.id] || [];
              const resolvedCount = requests.filter(r => r.status === 'accepted' || r.status === 'closed').length;

              return (
                <div key={plan.id} className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : plan.id)}
                    className="w-full text-left p-5 flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-gray-900">{plan.eventName}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {plan.eventDate}</span>
                        <span className="flex items-center gap-1"><MapPin size={12} /> {plan.city}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {requests.length > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-600">
                          {resolvedCount}/{requests.length} resolved
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deletePlan(plan.id); }}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        aria-label="Delete plan"
                      >
                        <Trash2 size={16} />
                      </button>
                      {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-100 p-5 space-y-3">
                      {REQUEST_CATEGORIES.map(cat => {
                        const catData = plan[cat];
                        if (!catData) return null;
                        const categoryMap = { rentals: 'Furniture Rental', decorator: 'Decorator', catering: 'Caterer', dj: 'DJ', mc: 'MC', photography: 'Photographer', transportation: 'Ride Provider' };
                        const request = requests.find(r => r.category === categoryMap[cat]);

                        return (
                          <div key={cat} className="bg-gray-50 rounded-xl p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-bold text-gray-800">{CATEGORY_LABELS[cat]}</p>
                              {catData.mode === 'choose' && request && (
                                request.status === 'pending' ? (
                                  <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                                    <Clock size={12} /> Awaiting confirmation
                                  </span>
                                ) : request.status === 'accepted' ? (
                                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                    <CheckCircle2 size={12} /> Confirmed
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                                    <XCircle size={12} /> Declined
                                  </span>
                                )
                              )}
                              {catData.mode === 'request' && request?.status === 'closed' && (
                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                  <CheckCircle2 size={12} /> {request.acceptedByBusinessName}
                                </span>
                              )}
                            </div>

                            {catData.mode === 'choose' && (
                              <p className="text-xs text-gray-500 mt-1">
                                {catData.selectedBusinessName ? `${catData.selectedBusinessName} — ${catData.selectedPackageName}` : 'No selection made'}
                              </p>
                            )}

                            {catData.mode === 'choose' && request?.status === 'accepted' && (
                              <ContactReveal businessId={request.targetBusinessId} businessName={request.targetBusinessName} business={businessCache[request.targetBusinessId]} />
                            )}

                            {catData.mode === 'request' && request?.status === 'open' && (
                              <QuoteList
                                requestId={request.id}
                                deadline={request.deadline}
                                quotes={quotesByRequest[request.id] || []}
                                acceptQuote={acceptQuote}
                                acceptingQuoteId={acceptingQuoteId}
                                businessCache={businessCache}
                                loadBusinessDetails={loadBusinessDetails}
                                expandedQuoteId={expandedQuoteId}
                                setExpandedQuoteId={setExpandedQuoteId}
                              />
                            )}

                            {catData.mode === 'request' && request?.status === 'closed' && (
                              <ContactReveal businessId={request.acceptedByBusinessId} businessName={request.acceptedByBusinessName} business={businessCache[request.acceptedByBusinessId]} />
                            )}
                          </div>
                        );
                      })}
                      {plan.venue && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-sm font-bold text-gray-800">Venue</p>
                          <p className="text-xs text-gray-500">
                            {plan.venue.mode === 'hall' ? (plan.venue.hallName || 'Hall selected') : plan.venue.ownLocation}
                          </p>
                        </div>
                      )}
                      {plan.rentals && plan.rentals.mode !== 'choose' && plan.rentals.mode !== 'request' && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-sm font-bold text-gray-800">Rentals</p>
                          <p className="text-xs text-gray-500">
                            {plan.rentals.chairs || 0} chairs, {plan.rentals.tables || 0} tables, {plan.rentals.tents || 0} tents
                          </p>
                          {plan.rentals.notes && <p className="text-xs text-gray-400 mt-1">{plan.rentals.notes}</p>}
                        </div>
                      )}
                      {plan.livestock && plan.livestock.items?.length > 0 && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-sm font-bold text-gray-800">Livestock</p>
                          {plan.livestock.items.map((item, i) => (
                            <p key={i} className="text-xs text-gray-500">
                              {item.quantity}x {item.tierName} — {item.sellerName} (₦{(item.price * item.quantity).toLocaleString()})
                            </p>
                          ))}
                        </div>
                      )}
                      {requests.filter(r => r.category === 'Other Service').map((req, i, arr) => (
                        <div key={req.id} className="bg-gray-50 rounded-xl p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-gray-800">Other Service {arr.length > 1 ? i + 1 : ''}</p>
                            {req.requestType === 'direct' ? (
                              req.status === 'pending' ? (
                                <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                                  <Clock size={12} /> Awaiting confirmation
                                </span>
                              ) : req.status === 'accepted' ? (
                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                  <CheckCircle2 size={12} /> Confirmed
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                                  <XCircle size={12} /> Declined
                                </span>
                              )
                            ) : req.status === 'closed' && (
                              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                <CheckCircle2 size={12} /> {req.acceptedByBusinessName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{req.details}</p>

                          {req.requestType === 'direct' && req.targetBusinessName && (
                            <p className="text-xs text-gray-500 mt-1">Requested: {req.targetBusinessName} — {req.packageName}</p>
                          )}

                          {req.requestType === 'direct' && req.status === 'accepted' && (
                            <ContactReveal businessId={req.targetBusinessId} businessName={req.targetBusinessName} business={businessCache[req.targetBusinessId]} />
                          )}

                          {req.requestType === 'open' && req.status === 'open' && (
                            <QuoteList
                              requestId={req.id}
                              deadline={req.deadline}
                              quotes={quotesByRequest[req.id] || []}
                              acceptQuote={acceptQuote}
                              acceptingQuoteId={acceptingQuoteId}
                              businessCache={businessCache}
                              loadBusinessDetails={loadBusinessDetails}
                              expandedQuoteId={expandedQuoteId}
                              setExpandedQuoteId={setExpandedQuoteId}
                            />
                          )}

                          {req.requestType === 'open' && req.status === 'closed' && (
                            <ContactReveal businessId={req.acceptedByBusinessId} businessName={req.acceptedByBusinessName} business={businessCache[req.acceptedByBusinessId]} />
                          )}
                        </div>
                      ))}
                      {requests.filter(r => SUPPLY_TYPES.includes(r.category)).map((req) => (
                        <div key={req.id} className="bg-gray-50 rounded-xl p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-gray-800">{req.category}</p>
                            {req.requestType === 'direct' ? (
                              req.status === 'pending' ? (
                                <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                                  <Clock size={12} /> Awaiting confirmation
                                </span>
                              ) : req.status === 'accepted' ? (
                                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                  <CheckCircle2 size={12} /> Confirmed
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                                  <XCircle size={12} /> Declined
                                </span>
                              )
                            ) : req.status === 'closed' && (
                              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                                <CheckCircle2 size={12} /> {req.acceptedByBusinessName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{req.details}</p>
                          {req.referenceImage && (
                            <img src={req.referenceImage} alt="Reference" className="w-16 h-16 rounded-lg object-cover mt-2 border border-gray-200" />
                          )}

                          {req.requestType === 'direct' && req.targetBusinessName && (
                            <p className="text-xs text-gray-500 mt-1">Requested: {req.targetBusinessName} — {req.packageName}</p>
                          )}

                          {req.requestType === 'direct' && req.status === 'accepted' && (
                            <ContactReveal businessId={req.targetBusinessId} businessName={req.targetBusinessName} business={businessCache[req.targetBusinessId]} />
                          )}

                          {req.requestType === 'open' && req.status === 'open' && (
                            <QuoteList
                              requestId={req.id}
                              deadline={req.deadline}
                              quotes={quotesByRequest[req.id] || []}
                              acceptQuote={acceptQuote}
                              acceptingQuoteId={acceptingQuoteId}
                              businessCache={businessCache}
                              loadBusinessDetails={loadBusinessDetails}
                              expandedQuoteId={expandedQuoteId}
                              setExpandedQuoteId={setExpandedQuoteId}
                            />
                          )}

                          {req.requestType === 'open' && req.status === 'closed' && (
                            <ContactReveal businessId={req.acceptedByBusinessId} businessName={req.acceptedByBusinessName} business={businessCache[req.acceptedByBusinessId]} />
                          )}
                        </div>
                      ))}
                      {plan.others && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-sm font-bold text-gray-800">Others</p>
                          <p className="text-xs text-gray-500">
                            {[
                              plan.others.security && 'Security',
                              plan.others.makeupArtist && 'Makeup Artist',
                              plan.others.ushers && 'Ushers',
                              plan.others.cake && 'Cake',
                            ].filter(Boolean).join(', ') || 'None selected'}
                          </p>
                          {plan.others.notes && <p className="text-xs text-gray-400 mt-1">{plan.others.notes}</p>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}