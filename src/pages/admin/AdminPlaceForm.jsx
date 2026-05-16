import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import { doc, getDoc, addDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

const placeSubCategories = [
  'Library', 'Auditorium', 'Cafeteria', 'Campus Market',
  'Shortlets', 'Chapel / Mosque', 'Gym', 'Computer Lab',
  'Restaurant', 'Cinema', 'Park', 'Mall', 'Museum', 'Other'
];

const categoryOptions = [
  'Art & Culture', 'Food & Dining', 'Sport & Fitness',
  'Nightlife & Parties', 'Family & Kids Fun', 'Cinema & Show'
];

export default function AdminPlaceForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [universities, setUniversities] = useState([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    category: 'Art & Culture',
    campusSubCategory: 'Library',
    eventType: 'campus', // campus or regular
    subCategory: 'places', // ✅ always 'places'
    status: 'published',
    location: '',
    address: '',
    mapLocation: '',
    university: '',
    openingTime: '',
    closingTime: '',
    isFree: true,
    price: '',
    organizerName: '',
    organizerEmail: '',
    organizerPhone: '',
    organizerWebsite: '',
  });

  useEffect(() => {
    loadUniversities();
    if (isEditing) loadPlace();
  }, [id]);

  const loadUniversities = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'universities'));
      const uniList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUniversities(uniList);
    } catch (err) {
      console.error('Error loading universities:', err);
    }
  };

  const loadPlace = async () => {
    try {
      setLoading(true);
      const placeDoc = await getDoc(doc(db, 'events', id));
      if (placeDoc.exists()) {
        const data = placeDoc.data();
        setForm({
          title: data.title || '',
          description: data.description || '',
          imageUrl: data.imageUrl || '',
          category: data.category || 'Art & Culture',
          campusSubCategory: data.campusSubCategory || 'Library',
          eventType: data.eventType || 'campus',
          subCategory: 'places',
          status: data.status || 'published',
          location: data.location || '',
          address: data.address || '',
          mapLocation: data.mapLocation || '',
          university: data.university || '',
          openingTime: data.openingTime || '',
          closingTime: data.closingTime || '',
          isFree: data.isFree ?? true,
          price: data.price || '',
          organizerName: data.organizerName || '',
          organizerEmail: data.organizerEmail || '',
          organizerPhone: data.organizerPhone || '',
          organizerWebsite: data.organizerWebsite || '',
        });
      }
    } catch (err) {
      console.error('Error loading place:', err);
    }
    setLoading(false);
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.location) {
      alert('Please fill in title and location');
      return;
    }

    try {
      setSaving(true);
      const placeData = {
        ...form,
        subCategory: 'places', // ✅ always places
        updatedAt: new Date(),
      };

      if (isEditing) {
        await updateDoc(doc(db, 'events', id), placeData);
      } else {
        placeData.createdAt = new Date();
        await addDoc(collection(db, 'events'), placeData);
      }

      navigate('/admin/places');
    } catch (err) {
      console.error('Error saving place:', err);
      alert('Error saving place. Please try again.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/admin/places')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Place' : 'Add New Place'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isEditing ? 'Update place details' : 'Add a new place to OutingStation'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">

          {/* Basic Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Place Name *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g. University of Lagos Library"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Describe this place..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => handleChange('imageUrl', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                />
                {form.imageUrl && (
                  <img
                    src={form.imageUrl}
                    alt="Preview"
                    className="mt-2 w-full h-40 object-cover rounded-lg"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Place Type */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Place Type</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleChange('eventType', 'campus')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition border-2 ${
                      form.eventType === 'campus'
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    🎓 Campus Place
                  </button>
                  <button
                    onClick={() => handleChange('eventType', 'regular')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition border-2 ${
                      form.eventType === 'regular'
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    📍 Regular Place
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Place Category *</label>
                  <select
                    value={form.campusSubCategory}
                    onChange={(e) => handleChange('campusSubCategory', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                  >
                    {placeSubCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Main Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                  >
                    {categoryOptions.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* University — only for campus */}
              {form.eventType === 'campus' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">University</label>
                  <select
                    value={form.university}
                    onChange={(e) => handleChange('university', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                  >
                    <option value="">Select University</option>
                    {universities.map(uni => (
                      <option key={uni.id} value={uni.name}>{uni.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Location</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City / Area *</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="e.g. Lagos, Yaba"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="e.g. University Road, Akoka, Yaba, Lagos"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps Link</label>
                <input
                  type="url"
                  value={form.mapLocation}
                  onChange={(e) => handleChange('mapLocation', e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Hours & Pricing */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Hours & Pricing</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Time</label>
                  <input
                    type="time"
                    value={form.openingTime}
                    onChange={(e) => handleChange('openingTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Closing Time</label>
                  <input
                    type="time"
                    value={form.closingTime}
                    onChange={(e) => handleChange('closingTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Entry Fee</label>
                <div className="flex gap-3 mb-3">
                  <button
                    onClick={() => handleChange('isFree', true)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition border-2 ${
                      form.isFree
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    Free Entry
                  </button>
                  <button
                    onClick={() => handleChange('isFree', false)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition border-2 ${
                      !form.isFree
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    Paid Entry
                  </button>
                </div>
                {!form.isFree && (
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    placeholder="Entry price in ₦"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={form.organizerName}
                  onChange={(e) => handleChange('organizerName', e.target.value)}
                  placeholder="Place manager or contact name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.organizerEmail}
                    onChange={(e) => handleChange('organizerEmail', e.target.value)}
                    placeholder="contact@place.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.organizerPhone}
                    onChange={(e) => handleChange('organizerPhone', e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  type="url"
                  value={form.organizerWebsite}
                  onChange={(e) => handleChange('organizerWebsite', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Publish */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-bold text-gray-900 mb-4">Publish</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full bg-cyan-500 text-white py-2.5 rounded-lg font-semibold hover:bg-cyan-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? 'Saving...' : isEditing ? 'Update Place' : 'Save Place'}
              </button>
              <button
                onClick={() => navigate('/admin/places')}
                className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Preview */}
          {form.imageUrl && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-3">Preview</h2>
              <div className="rounded-xl overflow-hidden border border-gray-100">
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  className="w-full h-36 object-cover"
                  onError={(e) => e.target.style.display = 'none'}
                />
                <div className="p-3">
                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">
                    {form.campusSubCategory}
                  </span>
                  <p className="font-bold text-gray-900 text-sm mt-2 line-clamp-1">
                    {form.title || 'Place Name'}
                  </p>
                  {form.university && (
                    <p className="text-xs text-gray-500 mt-1">🏛️ {form.university}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <span>📍</span> {form.location || 'Location'}
                  </p>
                  {form.openingTime && form.closingTime && (
                    <p className="text-xs text-gray-500 mt-1">🕐 {form.openingTime} - {form.closingTime}</p>
                  )}
                  <p className={`text-xs font-semibold mt-1 ${form.isFree ? 'text-emerald-600' : 'text-cyan-600'}`}>
                    {form.isFree ? 'Free Entry' : `₦${form.price}`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}