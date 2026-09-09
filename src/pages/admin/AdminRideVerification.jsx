// src/pages/admin/AdminRideVerification.jsx
//
// ✅ NEW — Tier 2 of the two-tier ride approval model. AdminBusinesses.jsx
// handles Tier 1 (approving the AGENCY itself — same flow as every other
// business type, no changes needed there beyond the payout-details patch).
// This screen handles Tier 2: each individual VEHICLE a Ride Provider
// agency adds must separately clear a driver's-license/Gov-ID/insurance
// check before it's bookable, since different vehicles under the same
// approved agency can have different drivers — approving the agency says
// nothing about whether a specific driver's license is real.
//
// Matches the Firestore rides/ rule exactly: a new vehicle is created at
// status: 'pending_verification', available: false, and the OWNER can
// never change either field themselves — only isAdmin() can, via the
// two actions below (approve/reject here).
//
// ⚠️ ASSUMPTION — modeled closely on AdminBusinesses.jsx's shape (same
// AdminSidebar import, same toast pattern, same tab/status structure).
// If your actual AdminSidebar.jsx or routing setup differs, the imports
// below may need adjusting — I don't have that file to confirm against.

import { useState, useEffect } from 'react';
import { Menu, Car, CheckCircle, XCircle, Clock, Phone, MapPin, User, ShieldCheck, AlertTriangle } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import toast from 'react-hot-toast';

const TABS = ['pending_verification', 'approved', 'rejected', 'all'];

const TAB_LABELS = {
  pending_verification: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  all: 'All',
};

export default function AdminRideVerification() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rides, setRides] = useState([]);
  // Agency (businesses/) docs, keyed by id, so each vehicle card can show
  // which agency it belongs to without a separate lookup per card.
  const [agencies, setAgencies] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending_verification');
  const [updatingId, setUpdatingId] = useState('');
  const [rejectingId, setRejectingId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadRides();
  }, []);

  const loadRides = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'rides'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRides(list);

      // Batch-fetch the distinct agencies referenced, so the list shows
      // agency name/WhatsApp without N+1 queries per card.
      const agencyIds = [...new Set(list.map(r => r.agencyId).filter(Boolean))];
      const agencyMap = {};
      await Promise.all(agencyIds.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'businesses', id));
          if (snap.exists()) agencyMap[id] = { id: snap.id, ...snap.data() };
        } catch (err) {
          console.error(`Failed to load agency ${id}:`, err);
        }
      }));
      setAgencies(agencyMap);
    } catch (err) {
      console.error('Error loading rides:', err);
      toast.error('Failed to load vehicles');
    }
    setLoading(false);
  };

  // ✅ Approving flips BOTH status and available together — a vehicle
  // that's verified but still hidden (available: false) would be a
  // silent dead end, same trap the businesses collection avoids by
  // gating on status alone. Doing both in one write keeps them in sync.
  const handleApprove = async (id) => {
    setUpdatingId(id);
    try {
      await updateDoc(doc(db, 'rides', id), {
        status: 'approved',
        available: true,
        rejectionReason: null,
      });
      setRides(prev => prev.map(r => r.id === id ? { ...r, status: 'approved', available: true, rejectionReason: null } : r));
      toast.success('Vehicle approved — now live for booking');
    } catch (err) {
      console.error(err);
      toast.error('Failed to approve vehicle');
    }
    setUpdatingId('');
  };

  const handleReject = async (id) => {
    setUpdatingId(id);
    try {
      await updateDoc(doc(db, 'rides', id), {
        status: 'rejected',
        available: false,
        rejectionReason: rejectReason.trim() || 'Did not pass verification review.',
      });
      setRides(prev => prev.map(r => r.id === id
        ? { ...r, status: 'rejected', available: false, rejectionReason: rejectReason.trim() || 'Did not pass verification review.' }
        : r));
      toast.success('Vehicle rejected');
      setRejectingId('');
      setRejectReason('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to reject vehicle');
    }
    setUpdatingId('');
  };

  // ✅ Sends an already-approved vehicle back for re-verification. This
  // is the driver-swap trigger discussed earlier: if an agency changes
  // the driver on a vehicle that's already live, an admin uses this to
  // pull it back out of circulation until the new driver clears the same
  // check the original one did. Firestore rule already prevents the
  // OWNER from doing this themselves — status/available are admin-only
  // fields on rides/ — so this button is the only way it happens.
  const handleSendBackForReview = async (id) => {
    if (!window.confirm('Pull this vehicle back for re-verification? It will stop being bookable until re-approved.')) return;
    setUpdatingId(id);
    try {
      await updateDoc(doc(db, 'rides', id), {
        status: 'pending_verification',
        available: false,
      });
      setRides(prev => prev.map(r => r.id === id ? { ...r, status: 'pending_verification', available: false } : r));
      toast.success('Sent back for re-verification');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update vehicle');
    }
    setUpdatingId('');
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Permanently delete "${title}"? This can't be undone.`)) return;
    setUpdatingId(id);
    try {
      await deleteDoc(doc(db, 'rides', id));
      setRides(prev => prev.filter(r => r.id !== id));
      toast.success('Vehicle listing deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete vehicle');
    }
    setUpdatingId('');
  };

  const filtered = activeTab === 'all' ? rides : rides.filter(r => r.status === activeTab);
  const pendingCount = rides.filter(r => r.status === 'pending_verification').length;

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <Menu size={24} />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Vehicle Verification</h2>
            {pendingCount > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">
                {pendingCount} pending
              </span>
            )}
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">

            <div className="flex flex-wrap items-center gap-2 mb-6">
              {TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                    activeTab === tab ? 'bg-cyan-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-cyan-400'
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Car size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No vehicles to show here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map(ride => {
                  const agency = agencies[ride.agencyId];
                  const images = ride.images || [];
                  return (
                    <div key={ride.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                      <div className="flex items-start gap-4">
                        {images[0] ? (
                          <img src={images[0]} alt={ride.title} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-cyan-50 flex items-center justify-center flex-shrink-0">
                            <Car size={24} className="text-cyan-400" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-bold text-gray-900">{ride.title || 'Untitled vehicle'}</h3>
                              <p className="text-sm text-cyan-600 font-medium">
                                {ride.vehicleType} {ride.year ? `· ${ride.year}` : ''} {ride.color ? `· ${ride.color}` : ''}
                              </p>
                            </div>
                            <RideStatusBadge status={ride.status} />
                          </div>

                          {agency && (
                            <p className="text-xs text-gray-500 mt-1">
                              Agency: <span className="font-medium text-gray-700">{agency.businessName}</span>
                              {agency.whatsappNumber && <span> · {agency.whatsappNumber}</span>}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-500">
                            {ride.city && <span className="flex items-center gap-1"><MapPin size={12} /> {ride.city}</span>}
                            {ride.capacity && <span>{ride.capacity} passengers</span>}
                            {ride.plateNumber && <span>Plate: {ride.plateNumber}</span>}
                            {ride.insuranceStatus && (
                              <span className="flex items-center gap-1">
                                <ShieldCheck size={12} /> Insurance: {ride.insuranceStatus}
                              </span>
                            )}
                          </div>

                          {images.length > 1 && (
                            <div className="flex gap-2 mt-3">
                              {images.slice(1, 5).map((url, i) => (
                                <img key={i} src={url} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                              ))}
                            </div>
                          )}

                          {/* Driver verification — the actual thing this screen exists to check */}
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Driver</p>
                            <div className="flex items-center gap-3 mb-3">
                              <User size={16} className="text-gray-400" />
                              <span className="text-sm text-gray-700">{ride.driverName || 'Not provided'}</span>
                              {ride.driverPhone && (
                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                  <Phone size={11} /> {ride.driverPhone}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              {ride.driverLicenseUrl ? (
                                <a href={ride.driverLicenseUrl} target="_blank" rel="noreferrer" className="block">
                                  <img src={ride.driverLicenseUrl} alt="Driver's license" className="w-full h-24 rounded-lg object-cover border border-gray-200" />
                                  <p className="text-[11px] text-gray-500 mt-1">Driver's License</p>
                                </a>
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs text-red-500">
                                  <AlertTriangle size={12} /> No license uploaded
                                </div>
                              )}
                              {ride.driverGovIdUrl ? (
                                <a href={ride.driverGovIdUrl} target="_blank" rel="noreferrer" className="block">
                                  <img src={ride.driverGovIdUrl} alt="Driver's Gov ID" className="w-full h-24 rounded-lg object-cover border border-gray-200" />
                                  <p className="text-[11px] text-gray-500 mt-1">Government ID</p>
                                </a>
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs text-red-500">
                                  <AlertTriangle size={12} /> No Gov ID uploaded
                                </div>
                              )}
                            </div>
                          </div>

                          {ride.status === 'rejected' && ride.rejectionReason && (
                            <div className="mt-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                              <p className="text-xs text-red-600"><strong>Rejection reason:</strong> {ride.rejectionReason}</p>
                            </div>
                          )}

                          {/* Actions */}
                          {ride.status === 'pending_verification' && (
                            <div className="mt-4">
                              {rejectingId === ride.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Why is this being rejected? (shown to the agency)"
                                    rows={2}
                                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleReject(ride.id)}
                                      disabled={updatingId === ride.id}
                                      className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50"
                                    >
                                      Confirm Reject
                                    </button>
                                    <button
                                      onClick={() => { setRejectingId(''); setRejectReason(''); }}
                                      className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleApprove(ride.id)}
                                    disabled={updatingId === ride.id}
                                    className="flex items-center gap-1.5 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-600 transition disabled:opacity-50"
                                  >
                                    <CheckCircle size={14} /> Approve
                                  </button>
                                  <button
                                    onClick={() => setRejectingId(ride.id)}
                                    disabled={updatingId === ride.id}
                                    className="flex items-center gap-1.5 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50"
                                  >
                                    <XCircle size={14} /> Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {ride.status === 'approved' && (
                            <button
                              onClick={() => handleSendBackForReview(ride.id)}
                              disabled={updatingId === ride.id}
                              className="mt-4 text-xs text-amber-600 hover:text-amber-700 font-medium"
                            >
                              Send back for re-verification
                            </button>
                          )}

                          {ride.status === 'rejected' && (
                            <button
                              onClick={() => handleApprove(ride.id)}
                              disabled={updatingId === ride.id}
                              className="mt-4 text-xs text-emerald-500 hover:text-emerald-600 font-medium"
                            >
                              Approve anyway
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(ride.id, ride.title)}
                            disabled={updatingId === ride.id}
                            className="mt-2 text-xs text-gray-400 hover:text-red-500 font-medium block disabled:opacity-50"
                          >
                            Delete permanently
                          </button>
                        </div>
                      </div>
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

function RideStatusBadge({ status }) {
  const config = {
    pending_verification: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
    approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-600', icon: XCircle },
  }[status] || { label: status, color: 'bg-gray-100 text-gray-600', icon: Clock };
  const Icon = config.icon;
  return (
    <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${config.color}`}>
      <Icon size={11} /> {config.label}
    </span>
  );
}