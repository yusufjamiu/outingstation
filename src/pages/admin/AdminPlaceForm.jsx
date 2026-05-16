import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Menu, ArrowLeft, Save } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { doc, getDoc, addDoc, updateDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

// ✅ Campus-specific subcategories only
const campusSubCategories = [
  'Library', 'Auditorium', 'Cafeteria', 'Campus Market',
  'Shortlets', 'Chapel / Mosque', 'Gym', 'Computer Lab'
];

// ✅ Main categories that support places
const categoryOptions = [
  'Art & Culture', 'Food & Dining', 'Sport & Fitness',
  'Nightlife & Parties', 'Family & Kids Fun', 'Cinema & Show'
];

export default function AdminPlaceForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [universities, setUniversities] = useState([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    category: 'Food & Dining',
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
      setUniversities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
          category: data.category || 'Food & Dining',
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
    if (!form.title) {
      alert('Please enter a place name');
      return;
    }
    if (!form.location) {
      alert('Please enter a location');
      return;
    }
    if (!form.imageUrl) {
      alert('Please enter an image URL');
      return;
    }
    if (form.eventType === 'campus' && !form.university) {
      alert('Please select a university for campus places');
      return;
    }

    try {
      setSaving(true);
      const placeData = {
        ...form,
        subCategory: 'places', // ✅ always places
        // ✅ Campus places must have campusSubCategory
        // ✅ Regular places use main category only
        campusSubCategory: form.eventType === 'campus' ? form.campusSubCategory : null,
        university: form.eventType === 'campus' ? form.university : null,
        price: form.isFree ? 0 : Number(form.price) || 0,
        updatedAt: serverTimestamp(),
      };

      if (isEditing) {
        await updateDoc(doc(db, 'events', id), placeData);
      } else {
        placeData.createdAt = serverTimestamp();
        placeData.savedCount = 0;
        await addDoc(collection(db, 'events'), placeData);
      }

      navigate('/admin/places');
    } catch (err) {
      console.error('Error saving place:', err);
      alert('Error saving place: ' + err.message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              <button
                onClick={() => navigate('/admin/places')}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {isEditing ? 'Edit Place' : 'Add New Place'}
                </h2>
                <p className="text-sm text-gray-500">
                  {isEditing ? 'Update place details' : 'Add a new place to OutingStation'}
                </p>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition font-medium disabled:opacity-50 text-sm"
            >
              <Save size={16} />
              {saving ? 'Saving...' : isEditing ? 'Update Place' : 'Save Place'}
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">

              {/* Basic Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-4">Basic Information</h3>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Image URL *</label>
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
                <h3 className="text-base font-bold text-gray-900 mb-4">Place Type</h3>
                <div className="space-y-4">

                  {/* Campus / Regular toggle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
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
                        type="button"
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
                    <p className="text-xs text-gray-500 mt-2">
                      {form.eventType === 'campus'
                        ? 'Campus places appear in Campus Places section (Library, Gym, etc.)'
                        : 'Regular places appear under their main category in the Places tab (Restaurant, Cinema, etc.)'}
                    </p>
                  </div>

                  {/* Main Category — both types */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Main Category *</label>
                    <select
                      value={form.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                    >
                      {categoryOptions.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      This determines which category page the place appears under
                    </p>
                  </div>

                  {/* Campus SubCategory — campus only */}
                  {form.eventType === 'campus' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Campus Place Type *</label>
                      <select
                        value={form.campusSubCategory}
                        onChange={(e) => handleChange('campusSubCategory', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                      >
                        {campusSubCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* University — campus only */}
                  {form.eventType === 'campus' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">University *</label>
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
                <h3 className="text-base font-bold text-gray-900 mb-4">Location</h3>
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
                <h3 className="text-base font-bold text-gray-900 mb-4">Hours & Pricing</h3>
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
                        type="button"
                        onClick={() => handleChange('isFree', true)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition border-2 ${
                          form.isFree
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        Free Entry
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChange('isFree', false)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition border-2 ${
                          !form.isFree
                            ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
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
                <h3 className="text-base font-bold text-gray-900 mb-4">
                  Contact Information <span className="text-sm font-normal text-gray-400">(Optional)</span>
                </h3>
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
                <h3 className="text-base font-bold text-gray-900 mb-4">Publish</h3>
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
                    className="w-full bg-cyan-500 text-white py-2.5 rounded-lg font-semibold hover:bg-cyan-600 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                  >
                    <Save size={16} />
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

              {/* Live Preview */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-3">Live Preview</h3>
                <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                  {form.imageUrl ? (
                    <img
                      src={form.imageUrl}
                      alt="Preview"
                      className="w-full h-32 object-cover"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                      <p className="text-gray-400 text-xs">No image yet</p>
                    </div>
                  )}
                  <div className="p-3">
                    {form.eventType === 'campus' && form.campusSubCategory && (
                      <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium">
                        {form.campusSubCategory}
                      </span>
                    )}
                    {form.eventType === 'regular' && form.category && (
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                        {form.category}
                      </span>
                    )}
                    <p className="font-bold text-gray-900 text-sm mt-2 line-clamp-1">
                      {form.title || 'Place Name'}
                    </p>
                    {form.eventType === 'campus' && form.university && (
                      <p className="text-xs text-gray-500 mt-1">🏛️ {form.university}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      📍 {form.location || 'Location'}
                    </p>
                    {form.openingTime && form.closingTime && (
                      <p className="text-xs text-gray-500 mt-1">
                        🕐 {form.openingTime} - {form.closingTime}
                      </p>
                    )}
                    <p className={`text-xs font-semibold mt-1 ${form.isFree ? 'text-emerald-600' : 'text-cyan-600'}`}>
                      {form.isFree ? 'Free Entry' : `₦${form.price || '0'}`}
                    </p>
                  </div>
                </div>

                {/* Where it will appear */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Will appear in:</p>
                  {form.eventType === 'campus' ? (
                    <p className="text-xs text-gray-500">
                      📍 Campus Places page → filtered by university and type
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">
                      📍 {form.category || 'Category'} → Places tab
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}