import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Menu, Save, X, Upload, ShoppingBag, Plus } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { collection, addDoc, doc, getDoc, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { uploadWithProgress, compressImage } from '../../services/cloudinaryService';

const VENDOR_CATEGORIES = [
  { value: 'Food & Drinks', emoji: '🍔' },
  { value: 'Fashion & Clothing', emoji: '👗' },
  { value: 'Electronics & Gadgets', emoji: '📱' },
  { value: 'Beauty & Grooming', emoji: '💄' },
  { value: 'Books & Stationery', emoji: '📚' },
  { value: 'Accessories', emoji: '💍' },
];

export default function AdminVendorForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  // ✅ Main image upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ✅ Extra images upload
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [uploadExtraProgress, setUploadExtraProgress] = useState(0);

  const [universities, setUniversities] = useState([]);

  const [formData, setFormData] = useState({
    shopName: '',
    description: '',
    category: '',
    university: '',
    whatsappNumber: '',
    imageUrl: '',
    images: [], // ✅ NEW
    status: 'active',
  });

  useEffect(() => {
    loadUniversities();
    if (isEdit) loadVendor();
  }, [id]);

  const loadUniversities = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'universities'));
      setUniversities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error loading universities:', err);
      setUniversities([
        { id: 1, name: 'University of Lagos (Unilag)' },
        { id: 2, name: 'King Saud University (KSU)' },
        { id: 3, name: 'University of Ibadan (UI)' },
        { id: 4, name: 'Covenant University (CU)' },
        { id: 5, name: 'University of Ilorin (Unilorin)' },
      ]);
    }
  };

  const loadVendor = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'vendors', id));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          ...data,
          images: data.images || [], // ✅ Load existing images
        });
      }
    } catch (err) {
      console.error('Error loading vendor:', err);
    }
    setFetching(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ✅ Main image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('Image must be less than 10MB'); return; }
    try {
      setUploading(true);
      setUploadProgress(0);
      const compressedFile = await compressImage(file, 800, 0.8);
      const imageUrl = await uploadWithProgress(compressedFile, 'vendors', (p) => setUploadProgress(p));
      setFormData(prev => ({ ...prev, imageUrl }));
    } catch (error) {
      alert(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ✅ Extra images upload
  const handleExtraImagesUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const currentImages = formData.images || [];
    const slotsLeft = 9 - currentImages.length;
    const filesToUpload = files.slice(0, slotsLeft);

    if (filesToUpload.length === 0) {
      alert('Maximum 9 additional photos allowed');
      return;
    }

    try {
      setUploadingExtra(true);
      const uploadedUrls = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 10 * 1024 * 1024) {
          alert(`${file.name} is too large. Max 10MB.`);
          continue;
        }
        setUploadExtraProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
        const compressed = await compressImage(file, 800, 0.8);
        const url = await uploadWithProgress(compressed, 'vendors', () => {});
        uploadedUrls.push(url);
      }

      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...uploadedUrls]
      }));
    } catch (err) {
      alert('Failed to upload some images: ' + err.message);
    } finally {
      setUploadingExtra(false);
      setUploadExtraProgress(0);
      e.target.value = '';
    }
  };

  // ✅ Remove extra image
  const removeExtraImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const formatWhatsApp = (number) => {
    let cleaned = number.replace(/\D/g, '');
    if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
    return cleaned;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.shopName) { alert('Please enter shop name'); return; }
    if (!formData.category) { alert('Please select a category'); return; }
    if (!formData.university) { alert('Please select a university'); return; }
    if (!formData.whatsappNumber) { alert('Please enter WhatsApp number'); return; }
    if (!formData.imageUrl) { alert('Please upload a main shop photo'); return; }

    setLoading(true);
    try {
      const vendorData = {
        ...formData,
        images: formData.images || [], // ✅ Save images array
        whatsappNumber: formatWhatsApp(formData.whatsappNumber),
        updatedAt: serverTimestamp(),
      };

      if (isEdit) {
        await updateDoc(doc(db, 'vendors', id), vendorData);
      } else {
        vendorData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'vendors'), vendorData);
      }

      navigate('/admin/vendors');
    } catch (err) {
      console.error('Error saving vendor:', err);
      alert('❌ Error saving: ' + err.message);
    }
    setLoading(false);
  };

  if (fetching) {
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
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={24} />
              </button>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {isEdit ? 'Edit Vendor' : 'Add New Vendor'}
              </h2>
            </div>
            <button onClick={() => navigate('/admin/vendors')} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={24} />
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">

              {/* ✅ Shop Photos — Main + Additional */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Shop Photos *</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Add up to 10 photos of your shop and products.
                </p>

                {/* Main image */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Main Photo *
                    <span className="text-gray-400 text-xs ml-2">(shown on vendor cards)</span>
                  </p>
                  <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-cyan-400 transition">
                    <div className="space-y-1 text-center w-full">
                      {formData.imageUrl ? (
                        <div>
                          <img
                            src={formData.imageUrl}
                            alt="Shop preview"
                            className="mx-auto h-48 w-48 rounded-xl object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                            className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            Remove Main Photo
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="w-16 h-16 bg-cyan-50 rounded-full flex items-center justify-center mx-auto">
                            <ShoppingBag size={32} className="text-cyan-400" />
                          </div>
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
                        <div className="mt-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-sm text-gray-600 mt-2">
                            {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Processing...'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional photos */}
                {formData.imageUrl && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Additional Photos
                      <span className="text-gray-400 text-xs ml-2">
                        ({(formData.images || []).length}/9 added)
                      </span>
                    </p>

                    {/* Grid of additional images */}
                    {(formData.images || []).length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                        {(formData.images || []).map((img, index) => (
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

                    {/* Upload more */}
                    {(formData.images || []).length < 9 && (
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
                              Add More Photos ({9 - (formData.images || []).length} slots left)
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

                    {(formData.images || []).length >= 9 && (
                      <div className="text-center py-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-500">✅ Maximum 10 photos reached</p>
                      </div>
                    )}

                    <p className="text-xs text-gray-400 mt-2">
                      💡 Hover photos to remove. Students can swipe through all photos on your vendor page.
                    </p>
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Shop Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Shop Name *</label>
                    <input
                      type="text"
                      name="shopName"
                      value={formData.shopName}
                      onChange={handleChange}
                      required
                      placeholder="e.g. Mama Tee Kitchen"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      rows={3}
                      placeholder="What does this vendor sell? Keep it short and clear."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">{formData.description.length}/150 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
                    >
                      <option value="">Select a category</option>
                      {VENDOR_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.emoji} {cat.value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* University */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Campus</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">University *</label>
                  <select
                    name="university"
                    value={formData.university}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
                  >
                    <option value="">Select university</option>
                    {universities.map(uni => (
                      <option key={uni.id} value={uni.name}>{uni.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* WhatsApp */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Number *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">📱</span>
                    <input
                      type="tel"
                      name="whatsappNumber"
                      value={formData.whatsappNumber}
                      onChange={handleChange}
                      required
                      placeholder="+2348001234567"
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Include country code e.g. +234 for Nigeria</p>
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
                >
                  <option value="active">✅ Active</option>
                  <option value="inactive">❌ Inactive</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading || uploading || uploadingExtra}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-medium disabled:opacity-50"
                >
                  <Save size={20} />
                  {loading ? 'Saving...' : isEdit ? 'Update Vendor' : 'Add Vendor'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/admin/vendors')}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}