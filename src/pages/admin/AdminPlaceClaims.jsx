import { useState, useEffect } from 'react';
import { collection, getDocs, getDoc, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Store, Phone, Mail, User, Clock, CheckCircle, XCircle, Menu } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import toast from 'react-hot-toast';

// ✅ NEW — review screen for placeClaims. Unlike Campus Vendor's instant
// claim, this REQUIRES admin approval before ownerId gets attached to the
// events doc — a hall/resort is a higher-stakes claim than a campus stall,
// since approving the wrong person hijacks a real business's existing
// public listing.

export default function AdminPlaceClaims() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'placeClaims'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setClaims(list);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load claims');
    }
    setLoading(false);
  };

  const handleDecision = async (claim, approve) => {
    setUpdatingId(claim.id);
    try {
      await updateDoc(doc(db, 'placeClaims', claim.id), {
        status: approve ? 'approved' : 'rejected',
      });

      // ✅ FIXED — no longer just attaches ownerId and leaves the person to
      // register again from scratch. Pulls the existing listing's own data
      // and auto-creates a real businesses doc, already approved (admin
      // already vetted the claim itself) — same record every other
      // business uses, so verification (Gov ID/CAC upload) just works
      // immediately, no separate registration step.
      if (approve) {
        const eventSnap = await getDoc(doc(db, 'events', claim.eventId));
        const eventData = eventSnap.data() || {};

        await updateDoc(doc(db, 'events', claim.eventId), {
          ownerId: claim.claimantUid,
        });

        await addDoc(collection(db, 'businesses'), {
          ownerId: claim.claimantUid,
          ownerEmail: claim.claimantEmail,
          businessName: eventData.title || claim.placeName,
          businessCategory: 'Service Provider',
          businessType: eventData.category || 'Event Hall',
          description: eventData.description || '',
          city: eventData.location || '',
          whatsappNumber: claim.claimantPhone,
          logoUrl: eventData.imageUrl || '',
          status: 'approved',
          claimedFromEventId: claim.eventId,
          createdAt: serverTimestamp(),
        });
      }

      setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, status: approve ? 'approved' : 'rejected' } : c));
      toast.success(approve ? '✅ Claim approved — business record created' : 'Claim rejected');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update claim');
    }
    setUpdatingId('');
  };

  const filteredClaims = filter === 'all' ? claims : claims.filter(c => (c.status || 'pending') === filter);

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <Menu size={24} />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Place Claims</h2>
          </div>
        </header>

        <div className="p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Place Claims</h1>
        <p className="text-sm text-gray-500 mb-6">Review ownership claims for halls, resorts, and restaurants listed without an owner.</p>

        <div className="flex gap-2 mb-6">
          {['pending', 'approved', 'rejected', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition ${
                filter === f ? 'bg-cyan-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-cyan-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading claims...</div>
        ) : filteredClaims.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No {filter !== 'all' ? filter : ''} claims.</div>
        ) : (
          <div className="space-y-4">
            {filteredClaims.map(claim => {
              const status = claim.status || 'pending';
              return (
                <div key={claim.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Store size={18} className="text-cyan-500" />
                      <h3 className="font-bold text-gray-900">{claim.placeName}</h3>
                    </div>
                    <StatusPill status={status} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                    <span className="flex items-center gap-2"><User size={14} /> {claim.claimantName || 'No name provided'}</span>
                    <span className="flex items-center gap-2"><Mail size={14} /> {claim.claimantEmail}</span>
                    <span className="flex items-center gap-2"><Phone size={14} /> {claim.claimantPhone}</span>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3 mb-4">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Proof provided</p>
                    <p className="text-sm text-gray-700">{claim.proofDescription}</p>
                  </div>

                  {status === 'pending' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDecision(claim, true)}
                        disabled={updatingId === claim.id}
                        className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50"
                      >
                        Approve — Attach Owner
                      </button>
                      <button
                        onClick={() => handleDecision(claim, false)}
                        disabled={updatingId === claim.id}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
      </main>
    </div>
  );
}

function StatusPill({ status }) {
  const config = {
    pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
    approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-600', icon: XCircle },
  }[status] || { label: status, color: 'bg-gray-100 text-gray-600', icon: Clock };
  const Icon = config.icon;
  return (
    <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${config.color}`}>
      <Icon size={11} /> {config.label}
    </span>
  );
}