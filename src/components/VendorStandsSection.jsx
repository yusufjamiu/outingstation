import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Store, CheckCircle, Send } from 'lucide-react';

export default function VendorStandsSection({ event, currentUser, navigate }) {
  const stands = (event.vendorStands || []).filter(s => s.filled < s.quantityAvailable);
  const [selectedStand, setSelectedStand] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!event.vendorStandsEnabled || !event.vendorStands || event.vendorStands.length === 0) return null;

  const handleApply = async () => {
    if (!currentUser) {
      toast.error('Please login to apply for a vendor stand');
      setTimeout(() => navigate('/login'), 1000);
      return;
    }
    if (!selectedStand) { toast.error('Please select a stand type'); return; }
    if (!businessName.trim() || !businessType.trim() || !whatsappNumber.trim()) {
      toast.error('Please fill in your business details');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'standApplications'), {
        eventId: event.id,
        eventTitle: event.title,
        standId: selectedStand.id,
        standName: selectedStand.name,
        standPrice: selectedStand.price,
        businessName: businessName.trim(),
        businessType: businessType.trim(),
        whatsappNumber: whatsappNumber.trim(),
        buyerEmail: currentUser.email,
        organizerApprovalStatus: 'pending',
        paymentStatus: 'unpaid',
        amountPaid: null,
        paymentReference: null,
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
      toast.success('Application submitted!');
    } catch (err) {
      console.error('Error submitting stand application:', err);
      toast.error('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-emerald-100 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle size={20} className="text-emerald-500" />
          </div>
          <div>
            <p className="font-bold text-gray-900">Application submitted!</p>
            <p className="text-sm text-gray-500">
              The organizer will review it. Once approved, you'll be able to pay for your stand from your{' '}
              <button onClick={() => navigate('/business')} className="text-cyan-600 underline">Business Dashboard</button>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-cyan-100 mb-6" id="vendor-stands-section">
      <div className="flex items-center gap-2 mb-4">
        <Store className="text-cyan-500" size={24} />
        <h3 className="text-xl font-bold text-gray-900">Vendor Stands Available</h3>
      </div>

      {stands.length === 0 ? (
        <p className="text-sm text-gray-500">All stands are currently filled. Check back later.</p>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {stands.map(stand => {
              const remaining = stand.quantityAvailable - stand.filled;
              const isSelected = selectedStand?.id === stand.id;
              return (
                <button
                  key={stand.id}
                  onClick={() => setSelectedStand(stand)}
                  className={`w-full text-left p-3.5 rounded-xl border-2 transition ${
                    isSelected ? 'border-cyan-500 bg-cyan-50' : 'border-gray-200 hover:border-cyan-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{stand.name} <span className="text-xs text-gray-400 font-normal">({stand.size})</span></p>
                      {stand.included && <p className="text-xs text-gray-500 mt-0.5">{stand.included}</p>}
                      <p className="text-xs text-orange-500 mt-0.5">{remaining} of {stand.quantityAvailable} left</p>
                    </div>
                    <p className="text-sm font-black text-cyan-600">₦{stand.price.toLocaleString()}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedStand && (
            <div className="space-y-3 border-t border-gray-100 pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                <input
                  type="text" value={businessName} onChange={e => setBusinessName(e.target.value)}
                  placeholder="e.g. Mama Tee Kitchen"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What do you sell? *</label>
                <input
                  type="text" value={businessType} onChange={e => setBusinessType(e.target.value)}
                  placeholder="e.g. Food & Drinks, Accessories"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Number *</label>
                <input
                  type="tel" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                <span className="text-sm text-gray-600">Stand Fee</span>
                <span className="font-bold text-cyan-600">₦{selectedStand.price.toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-500">
                No payment now — you'll pay only after the organizer approves your application.
              </p>

              <button
                onClick={handleApply}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-cyan-400 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send size={18} /> {submitting ? 'Submitting...' : `Apply for ${selectedStand.name}`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}