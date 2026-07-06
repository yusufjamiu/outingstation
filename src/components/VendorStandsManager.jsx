import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Store, Plus, Trash2, Check, X, Users, Pencil } from 'lucide-react';

const SIZES = ['Small', 'Medium', 'Large'];

export default function VendorStandsManager({ event, onEventUpdate }) {
  const [stands, setStands] = useState(event.vendorStands || []);
  const [applications, setApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newStand, setNewStand] = useState({
    name: '', size: 'Small', price: '', included: '', quantityAvailable: '', deadline: '',
  });

  // ✅ Edit mode — separate from add form, one stand at a time
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadApplications();
  }, [event.id]);

  const loadApplications = async () => {
    setLoadingApps(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'standApplications'), where('eventId', '==', event.id))
      );
      setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error loading stand applications:', err);
    }
    setLoadingApps(false);
  };

  const enableVendorStands = async () => {
    try {
      await updateDoc(doc(db, 'events', event.id), { vendorStandsEnabled: true });
      onEventUpdate({ ...event, vendorStandsEnabled: true });
      toast.success('Vendor stands enabled for this event');
    } catch (err) {
      console.error(err);
      toast.error('Failed to enable vendor stands');
    }
  };

  const addStand = async () => {
    if (!newStand.name.trim() || !newStand.price || !newStand.quantityAvailable) {
      toast.error('Name, price, and quantity available are required');
      return;
    }
    setSaving(true);
    const stand = {
      id: `stand_${Date.now()}`,
      name: newStand.name.trim(),
      size: newStand.size,
      price: Number(newStand.price),
      included: newStand.included.trim(),
      quantityAvailable: Number(newStand.quantityAvailable),
      filled: 0,
      deadline: newStand.deadline || null,
    };
    const updatedStands = [...stands, stand];
    try {
      await updateDoc(doc(db, 'events', event.id), { vendorStands: updatedStands, vendorStandsEnabled: true });
      setStands(updatedStands);
      onEventUpdate({ ...event, vendorStands: updatedStands, vendorStandsEnabled: true });
      setNewStand({ name: '', size: 'Small', price: '', included: '', quantityAvailable: '', deadline: '' });
      setShowAddForm(false);
      toast.success('Stand type added');
    } catch (err) {
      console.error(err);
      toast.error('Failed to add stand');
    }
    setSaving(false);
  };

  const removeStand = async (standId) => {
    const stand = stands.find(s => s.id === standId);
    if (stand?.filled > 0) {
      toast.error('Cannot remove a stand type that already has vendors filled in it');
      return;
    }
    const updatedStands = stands.filter(s => s.id !== standId);
    try {
      await updateDoc(doc(db, 'events', event.id), { vendorStands: updatedStands });
      setStands(updatedStands);
      onEventUpdate({ ...event, vendorStands: updatedStands });
      toast.success('Stand type removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove stand');
    }
  };

  const startEdit = (stand) => {
    setEditingId(stand.id);
    setEditForm({
      name: stand.name, size: stand.size, price: String(stand.price),
      included: stand.included || '', quantityAvailable: String(stand.quantityAvailable),
      deadline: stand.deadline || '',
    });
  };

  const cancelEdit = () => {
    setEditingId('');
    setEditForm(null);
  };

  const saveEdit = async (standId) => {
    const stand = stands.find(s => s.id === standId);
    if (!editForm.name.trim() || !editForm.price || !editForm.quantityAvailable) {
      toast.error('Name, price, and quantity available are required');
      return;
    }
    const newQuantity = Number(editForm.quantityAvailable);
    if (newQuantity < (stand?.filled || 0)) {
      toast.error(`Can't set quantity below ${stand.filled} — that many vendors already filled this stand`);
      return;
    }
    setSavingEdit(true);
    const updatedStands = stands.map(s => s.id === standId ? {
      ...s,
      name: editForm.name.trim(),
      size: editForm.size,
      price: Number(editForm.price),
      included: editForm.included.trim(),
      quantityAvailable: newQuantity,
      deadline: editForm.deadline || null,
    } : s);
    try {
      await updateDoc(doc(db, 'events', event.id), { vendorStands: updatedStands });
      setStands(updatedStands);
      onEventUpdate({ ...event, vendorStands: updatedStands });
      setEditingId('');
      setEditForm(null);
      toast.success('Stand updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update stand');
    }
    setSavingEdit(false);
  };

  const handleApproval = async (appId, decision) => {
    try {
      await updateDoc(doc(db, 'standApplications', appId), { organizerApprovalStatus: decision });
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, organizerApprovalStatus: decision } : a));
      // ✅ No payment has happened at this point — approval/rejection here
      // is free of refund concerns. Payment only happens after approval,
      // from the vendor's own dashboard.
      toast.success(decision === 'approved' ? '✅ Approved — vendor can now pay for their stand' : 'Application rejected');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update application');
    }
  };

  const pendingApps = applications.filter(a => a.organizerApprovalStatus === 'pending');
  const decidedApps = applications.filter(a => a.organizerApprovalStatus !== 'pending');

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Store className="text-cyan-500" size={22} />
          <h2 className="text-lg font-bold text-gray-900">Vendor Stands</h2>
        </div>
        {!event.vendorStandsEnabled && stands.length === 0 && (
          <button
            onClick={enableVendorStands}
            className="text-sm bg-cyan-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-cyan-600 transition"
          >
            Enable for this event
          </button>
        )}
      </div>

      {/* Stand types */}
      <div className="space-y-3 mb-4">
        {stands.map(stand => (
          editingId === stand.id ? (
            <div key={stand.id} className="border-2 border-cyan-200 rounded-xl p-4 bg-cyan-50/30 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text" placeholder="Stand name" value={editForm.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm col-span-2"
                />
                <select
                  value={editForm.size} onChange={e => setEditForm(p => ({ ...p, size: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {SIZES.map(s => <option key={s}>{s}</option>)}
                </select>
                <input
                  type="number" placeholder="Price (₦)" value={editForm.price}
                  onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="text" placeholder="What's included" value={editForm.included}
                  onChange={e => setEditForm(p => ({ ...p, included: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm col-span-2"
                />
                <input
                  type="number" placeholder="Quantity available" value={editForm.quantityAvailable}
                  onChange={e => setEditForm(p => ({ ...p, quantityAvailable: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="date" value={editForm.deadline}
                  onChange={e => setEditForm(p => ({ ...p, deadline: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              {stand.filled > 0 && (
                <p className="text-xs text-amber-600">⚠️ {stand.filled} vendor(s) already filled this stand — quantity can't go below that.</p>
              )}
              <div className="flex gap-2">
                <button onClick={() => saveEdit(stand.id)} disabled={savingEdit}
                  className="flex-1 bg-cyan-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-cyan-600 transition disabled:opacity-50">
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={cancelEdit}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div key={stand.id} className="border-2 border-gray-100 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">{stand.name} <span className="text-xs text-gray-400 font-normal">({stand.size})</span></p>
                <p className="text-sm text-gray-500">₦{stand.price.toLocaleString()} · {stand.included || 'No inclusions listed'}</p>
                <p className="text-xs text-gray-400 mt-1">{stand.filled}/{stand.quantityAvailable} filled</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startEdit(stand)}
                  className="p-2 text-cyan-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => removeStand(stand.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )
        ))}
      </div>

      {/* Add stand form */}
      {showAddForm ? (
        <div className="border-2 border-cyan-100 rounded-xl p-4 space-y-3 mb-4 bg-cyan-50/30">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text" placeholder="Stand name (e.g. Stand A)"
              value={newStand.name} onChange={e => setNewStand(p => ({ ...p, name: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm col-span-2"
            />
            <select
              value={newStand.size} onChange={e => setNewStand(p => ({ ...p, size: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {SIZES.map(s => <option key={s}>{s}</option>)}
            </select>
            <input
              type="number" placeholder="Price (₦)"
              value={newStand.price} onChange={e => setNewStand(p => ({ ...p, price: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="text" placeholder="What's included (table, chairs, electricity)"
              value={newStand.included} onChange={e => setNewStand(p => ({ ...p, included: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm col-span-2"
            />
            <input
              type="number" placeholder="Number of stands available"
              value={newStand.quantityAvailable} onChange={e => setNewStand(p => ({ ...p, quantityAvailable: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="date" placeholder="Application deadline (optional)"
              value={newStand.deadline} onChange={e => setNewStand(p => ({ ...p, deadline: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={addStand} disabled={saving}
              className="flex-1 bg-cyan-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-cyan-600 transition disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Stand Type'}
            </button>
            <button onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-cyan-300 rounded-xl text-sm font-semibold text-cyan-600 hover:bg-cyan-50 transition mb-4"
        >
          <Plus size={16} /> Add Stand Type
        </button>
      )}

      {/* Applications */}
      <div className="border-t border-gray-100 pt-4 mt-2">
        <div className="flex items-center gap-2 mb-3">
          <Users size={18} className="text-gray-500" />
          <h3 className="font-bold text-gray-800">Applications</h3>
          {pendingApps.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
              {pendingApps.length} pending
            </span>
          )}
        </div>

        {loadingApps ? (
          <p className="text-sm text-gray-400">Loading applications...</p>
        ) : applications.length === 0 ? (
          <p className="text-sm text-gray-400">No vendor applications yet.</p>
        ) : (
          <div className="space-y-2">
            {pendingApps.map(app => (
              <div key={app.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-gray-900">{app.businessName}</p>
                  <p className="text-xs text-gray-500">{app.businessType} · {app.standName} · ₦{app.standPrice?.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{app.whatsappNumber}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleApproval(app.id, 'approved')}
                    className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition">
                    <Check size={14} />
                  </button>
                  <button onClick={() => handleApproval(app.id, 'rejected')}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
            {decidedApps.map(app => {
              const projectedPayout = Math.round((app.standPrice || 0) * 0.9);
              return (
                <div key={app.id} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{app.businessName}</p>
                      <p className="text-xs text-gray-400">{app.standName} · ₦{app.standPrice?.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        app.organizerApprovalStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {app.organizerApprovalStatus === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                      {app.organizerApprovalStatus === 'approved' && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          app.paymentStatus === 'paid' ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {app.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                        </span>
                      )}
                    </div>
                  </div>
                  {app.organizerApprovalStatus === 'approved' && (
                    <p className="text-xs text-gray-500 mt-1.5">
                      {app.paymentStatus === 'paid'
                        ? `You're owed ₦${Number(app.organizerPayout || 0).toLocaleString()} (₦${Number(app.platformFee || 0).toLocaleString()} platform fee deducted)`
                        : `Estimated payout once paid: ~₦${projectedPayout.toLocaleString()} (10% platform fee)`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}