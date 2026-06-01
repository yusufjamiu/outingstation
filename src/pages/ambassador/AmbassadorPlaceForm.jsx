import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Menu, ArrowLeft, Save, Upload, Plus, X } from 'lucide-react';
import { AmbassadorSidebar } from '../../components/AmbassadorSidebar';
import { doc, getDoc, addDoc, updateDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { uploadWithProgress, compressImage } from '../../services/cloudinaryService';

// ✅ Campus-specific subcategories only
const campusSubCategories = [
  'Library', 'Auditorium', 'Cafeteria', 'Campus Market',
  'Shortlets', 'Chapel / Mosque', 'Gym', 'Computer Lab'
];

// ✅ Main categories that support places
const categoryOptions = [
  'Art & Culture', 'Food & Dining', 'Sport & Fitness',
  'Nightlife & Parties', 'Family & Kids Fun', 'Cinema & Show',
  'Malls', 'Spas',
];

export default function AmbassadorPlaceForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { userProfile } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [universities, setUniversities] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [uploadExtraProgress, setUploadExtraProgress] = useState(0);

  const [form, setForm] = useState({
    title: '',
    description: '',
    imageUrl: '',
    images: [],
    category: 'Food & Dining',
    campusSubCategory: 'Library',
    eventType: 'campus',   // 🔒 always a campus place
    subCategory: 'places',
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

  // 🔒 the ambassador's assigned campuses (ids → university objects)
  const assignedIds = userProfile?.assignedCampuses || [];
  const myCampuses = universities.filter(u => assignedIds.includes(u.id));
  const myCampusNames = myCampuses.map(u => u.name).filter(Boolean);

  useEffect(() => {
    loadUniversities();
    if (isEditing) loadPlace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadUniversities = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'universities'));
      setUniversities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error loading universities:', err);
      setUniversities([]);
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
          images: data.images || [],
          category: data.category || 'Food & Dining',
          campusSubCategory: data.campusSubCategory || 'Library',
          eventType: 'campus',
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

  // Auto-select campus when ambassador has exactly one (new places only)
  useEffect(() => {
    if (!isEditing && myCampuses.length === 1 && !form.university) {
      setForm(prev => ({ ...prev, university: myCampuses[0].name }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universities]);

  // 🔒 Access guard: can only edit places for your own campus
  useEffect(() => {
    if (isEditing && !loading && universities.length > 0 && form.university) {
      if (!myCampusNames.includes(form.university)) {
        alert("You don't have access to this place — it belongs to a different campus.");
        navigate('/ambassador/places');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, universities]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('Image must be less than 10MB'); return; }
    try {
      setUploading(true);
      setUploadProgress(0);
      const compressed = await compressImage(file, 1200, 0.8);
      const imageUrl = await uploadWithProgress(compressed, 'places', (p) => setUploadProgress(p));
      setForm(prev => ({ ...prev, imageUrl }));
    } catch (err) {
      alert(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleExtraImagesUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const currentImages = form.images || [];
    const slotsLeft = 9 - currentImages.length;
    const filesToUpload = files.slice(0, slotsLeft);
    if (filesToUpload.length === 0) { alert('Maximum 9 additional photos allowed'); return; }
    try {
      setUploadingExtra(true);
      const uploadedUrls = [];
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 10 * 1024 * 1024) { alert(`${file.name} is too large. Max 10MB.`); continue; }
        setUploadExtraProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
        const compressed = await compressImage(file, 1200, 0.8);
        const url = await uploadWithProgress(compressed, 'places', () => {});
        uploadedUrls.push(url);
      }
      setForm(prev => ({ ...prev, images: [...(prev.images || []), ...uploadedUrls] }));
    } catch (err) {
      alert('Failed to upload some images: ' + err.message);
    } finally {
      setUploadingExtra(false);
      setUploadExtraProgress(0);
      e.target.value = '';
    }
  };

  const removeExtraImage = (index) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async () => {
    if (!form.title) { alert('Please enter a place name'); return; }
    if (!form.location) { alert('Please enter a location'); return; }
    if (!form.imageUrl) { alert('Please upload a main image'); return; }
    if (!form.university) { alert('Please select your campus'); return; }
    if (!myCampusNames.includes(form.university)) { alert('You can only add places for your assigned campus.'); return; }

    try {
      setSaving(true);
      const placeData = {
        ...form,
        eventType: 'campus',       // 🔒 always a campus place
        subCategory: 'places',
        images: form.images || [],
        price: form.isFree ? 0 : Number(form.price) || 0,
        updatedAt: serverTimestamp(),
      };

      if (isEditing) {
        await updateDoc(doc(db, 'events', id), placeData);
      } else {
        placeData.createdAt = serverTimestamp();
        placeData.savedCount = 0;
        placeData.createdBy = auth.currentUser?.uid || null;
        placeData.createdByAmbassador = true;
        await addDoc(collection(db, 'events'), placeData);
      }

      navigate('/ambassador/places');
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
      <AmbassadorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={24} />
              </button>
              <button onClick={() => navigate('/ambassador/places')} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {isEditing ? 'Edit Place' : 'Add New Place'}
                </h2>
                <p className="text-sm text-gray-500">
                  {isEditing ? 'Update place details' : 'Add a campus place'}
                </p>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={saving || uploading || uploadingExtra || myCampuses.length === 0}
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
                </div>
              </div>

              {/* Images Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-1">Place Photos *</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Add up to 10 photos. Users can swipe through all photos.
                </p>

                {/* Main image */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Main Photo *
                    <span className="text-gray-400 text-xs ml-2">(shown on place cards)</span>
                  </p>
                  <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-cyan-400 transition">
                    <div className="space-y-1 text-center w-full">
                      {form.imageUrl ? (
                        <div>
                          <img
                            src={form.imageUrl}
                            alt="Preview"
                            className="mx-auto h-48 w-auto rounded-lg object-cover"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                          <button
                            type="button"
                            onClick={() => handleChange('imageUrl', '')}
                            className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            Remove Main Photo
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="mx-auto h-10 w-10 text-gray-400" />
                          <div className="flex text-sm text-gray-600 justify-center">
                            <label className="cursor-pointer font-medium text-cyan-600 hover:text-cyan-500">
                              <span>Upload main photo</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={uploading}
                                className="sr-only"
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 10MB</p>
                        </>
                      )}
                      {uploading && (
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-cyan-500 h-2 rounded-full transition-all"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Processing...'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional photos */}
                {form.imageUrl && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Additional Photos
                      <span className="text-gray-400 text-xs ml-2">
                        ({(form.images || []).length}/9 added)
                      </span>
                    </p>

                    {(form.images || []).length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 mb-3">
                        {(form.images || []).map((img, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={img}
                              alt={`Photo ${index + 2}`}
                              className="w-full h-20 object-cover rounded-lg border border-gray-200"
                              onError={(e) => { e.target.src = 'https://via.placeholder.com/80'; }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition" />
                            <button
                              type="button"
                              onClick={() => removeExtraImage(index)}
                              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md"
                            >
                              <X size={10} />
                            </button>
                            <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100 transition">
                              #{index + 2}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(form.images || []).length < 9 && (
                      <label className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition ${
                        uploadingExtra
                          ? 'border-cyan-300 bg-cyan-50 opacity-70'
                          : 'border-gray-300 hover:border-cyan-400 hover:bg-cyan-50'
                      }`}>
                        {uploadingExtra ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500" />
                            <span className="text-sm text-cyan-600 font-medium">
                              Uploading {uploadExtraProgress}%...
                            </span>
                          </>
                        ) : (
                          <>
                            <Plus size={18} className="text-gray-400" />
                            <span className="text-sm text-gray-600 font-medium">
                              Add More Photos ({9 - (form.images || []).length} slots left)
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={uploadingExtra}
                          onChange={handleExtraImagesUpload}
                          className="sr-only"
                        />
                      </label>
                    )}

                    {(form.images || []).length >= 9 && (
                      <div className="text-center py-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-500">✅ Maximum 10 photos reached</p>
                      </div>
                    )}

                    <p className="text-xs text-gray-400 mt-2">
                      💡 Hover photos to remove them. Users can swipe through all photos on the place page.
                    </p>
                  </div>
                )}
              </div>

              {/* Campus & Category (campus locked) */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-base font-bold text-gray-900 mb-4">Campus & Category</h3>
                <div className="space-y-4">

                  {/* Campus (locked) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Campus *</label>
                    {myCampuses.length === 0 ? (
                      <p className="text-sm text-amber-600">
                        You have no campus assigned. Ask your admin to assign one before adding places.
                      </p>
                    ) : myCampuses.length === 1 ? (
                      <div className="px-3 py-2 border border-teal-200 rounded-lg bg-teal-50 text-teal-800 font-medium text-sm">
                        🎓 {myCampuses[0].name}
                        <span className="text-xs text-teal-500 ml-2">(your campus)</span>
                      </div>
                    ) : (
                      <select
                        value={form.university}
                        onChange={(e) => handleChange('university', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                      >
                        <option value="">Select your campus</option>
                        {myCampuses.map(uni => (
                          <option key={uni.id} value={uni.name}>{uni.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Main Category */}
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
                      Determines which category page the place appears under
                    </p>
                  </div>

                  {/* Campus place type */}
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
                    disabled={saving || uploading || uploadingExtra || myCampuses.length === 0}
                    className="w-full bg-cyan-500 text-white py-2.5 rounded-lg font-semibold hover:bg-cyan-600 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                  >
                    <Save size={16} />
                    {saving ? 'Saving...' : isEditing ? 'Update Place' : 'Save Place'}
                  </button>
                  <button
                    onClick={() => navigate('/ambassador/places')}
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
                    <div className="relative">
                      <img
                        src={form.imageUrl}
                        alt="Preview"
                        className="w-full h-32 object-cover"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                      {(form.images || []).length > 0 && (
                        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                          </svg>
                          {(form.images || []).length + 1} photos
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                      <p className="text-gray-400 text-xs">No image yet</p>
                    </div>
                  )}
                  <div className="p-3">
                    {form.campusSubCategory && (
                      <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium">
                        {form.campusSubCategory}
                      </span>
                    )}
                    <p className="font-bold text-gray-900 text-sm mt-2 line-clamp-1">
                      {form.title || 'Place Name'}
                    </p>
                    {form.university && (
                      <p className="text-xs text-gray-500 mt-1">🎓 {form.university}</p>
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

                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Will appear in:</p>
                  <p className="text-xs text-gray-500">
                    📍 Campus Places → filtered by your university and type
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}