import { useState, useEffect } from 'react';
import { Menu, Plus, Edit, Trash2, Phone, X } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

const GROUPS = ['Emergency', 'Federal Services'];
const EMERGENCY_CATEGORIES = ['Police', 'Fire Services', 'General Emergencies', 'Hospital'];
const FEDERAL_CATEGORIES = ['Immigration', 'Passport Office', 'National ID (NIMC)', 'Tax Office', 'Other'];

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

const emptyForm = { name: '', group: 'Emergency', category: 'Police', city: '', phones: [''], address: '' };

export default function AdminEssentialServices() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadServices(); }, []);

  const loadServices = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'essential_services'));
      setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error loading essential services:', err);
    }
    setLoading(false);
  };

  const openAddForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const openEditForm = (service) => {
    // ✅ Backward compatible — old entries saved before this change have
    // a single 'phone' string, not a 'phones' array.
    const phones = Array.isArray(service.phones) && service.phones.length > 0
      ? service.phones
      : (service.phone ? [service.phone] : ['']);
    setForm({
      name: service.name || '',
      group: service.group || 'Emergency',
      category: service.category || 'Police',
      city: service.city || '',
      phones,
      address: service.address || '',
    });
    setEditingId(service.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    const cleanedPhones = form.phones.map(p => p.trim()).filter(p => p.length > 0);
    if (!form.name.trim() || cleanedPhones.length === 0) {
      alert('Name and at least one phone number are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, phones: cleanedPhones };
      if (editingId) {
        await updateDoc(doc(db, 'essential_services', editingId), payload);
      } else {
        await addDoc(collection(db, 'essential_services'), payload);
      }
      setShowForm(false);
      await loadServices();
    } catch (err) {
      console.error('Error saving essential service:', err);
      alert('Failed to save. Try again.');
    }
    setSaving(false);
  };

  // ✅ NEW — up to 5 numbers per entry, minimum 1. Some emergency lines
  // genuinely have multiple contact numbers (different departments,
  // backup lines), and all of them should be reachable.
  const updatePhone = (index, value) => {
    const next = [...form.phones];
    next[index] = value;
    setForm({ ...form, phones: next });
  };

  const addPhoneSlot = () => {
    if (form.phones.length >= 5) return;
    setForm({ ...form, phones: [...form.phones, ''] });
  };

  const removePhoneSlot = (index) => {
    if (form.phones.length <= 1) return;
    setForm({ ...form, phones: form.phones.filter((_, i) => i !== index) });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await deleteDoc(doc(db, 'essential_services', id));
      setServices(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting essential service:', err);
    }
  };

  const emergency = services.filter(s => s.group === 'Emergency');
  const federal = services.filter(s => s.group === 'Federal Services');
  const categoryOptions = form.group === 'Emergency' ? EMERGENCY_CATEGORIES : FEDERAL_CATEGORIES;

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={24} />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Essential Services</h2>
                <p className="text-sm text-gray-500">{services.length} entries — Emergency and Federal Services numbers</p>
              </div>
            </div>
            <button
              onClick={openAddForm}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm font-medium"
            >
              <Plus size={18} /> Add Entry
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
            </div>
          ) : (
            <>
              <SectionTable title="Emergency" accent="red" items={emergency} onEdit={openEditForm} onDelete={handleDelete} />
              <SectionTable title="Federal Services" accent="gray" items={federal} onEdit={openEditForm} onDelete={handleDelete} />
            </>
          )}
        </div>
      </main>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{editingId ? 'Edit Entry' : 'Add Entry'}</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-full transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
                <select
                  value={form.group}
                  onChange={(e) => setForm({ ...form, group: e.target.value, category: e.target.value === 'Emergency' ? EMERGENCY_CATEGORIES[0] : FEDERAL_CATEGORIES[0] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 outline-none text-sm"
                >
                  {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 outline-none text-sm"
                >
                  {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Lagos State Police Command"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City <span className="text-gray-400 font-normal">(leave blank for national-level entries — always shown regardless of city)</span>
                </label>
                <select
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 outline-none text-sm"
                >
                  <option value="">National (no specific city)</option>
                  {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number(s) * <span className="text-gray-400 font-normal">(1-5 numbers)</span>
                </label>
                <div className="space-y-2">
                  {form.phones.map((phone, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => updatePhone(i, e.target.value)}
                        placeholder="+234 800 000 0000"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 outline-none text-sm"
                      />
                      {form.phones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePhoneSlot(i)}
                          className="px-3 text-gray-400 hover:text-red-500 transition"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {form.phones.length < 5 && (
                  <button
                    type="button"
                    onClick={addPhoneSlot}
                    className="mt-2 text-sm text-red-600 font-medium hover:text-red-700 transition"
                  >
                    + Add another number
                  </button>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address (optional)</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 outline-none text-sm"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition text-sm"
              >
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTable({ title, accent, items, onEdit, onDelete }) {
  return (
    <div className="mb-8">
      <h3 className={`text-sm font-bold uppercase tracking-wide mb-3 ${accent === 'red' ? 'text-red-600' : 'text-gray-500'}`}>{title}</h3>
      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          No entries yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Category', 'Name', 'City', 'Phone', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(service => (
                  <tr key={service.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{service.category || '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{service.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{service.city || 'National'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap flex items-center gap-1.5">
                      <Phone size={12} className="text-gray-400" />
                      {(() => {
                        const phones = Array.isArray(service.phones) && service.phones.length > 0
                          ? service.phones
                          : (service.phone ? [service.phone] : []);
                        if (phones.length === 0) return '—';
                        return phones.length === 1 ? phones[0] : `${phones[0]} +${phones.length - 1} more`;
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => onEdit(service)} className="p-1.5 hover:bg-blue-50 rounded-lg transition text-blue-600" title="Edit">
                          <Edit size={15} />
                        </button>
                        <button onClick={() => onDelete(service.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-500" title="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}