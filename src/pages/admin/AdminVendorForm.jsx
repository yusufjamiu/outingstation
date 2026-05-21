import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Menu, Save, X, Upload, ShoppingBag } from 'lucide-react';
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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [universities, setUniversities] = useState([]);

  const [formData, setFormData] = useState({
    shopName: '',
    description: '',
    category: '',
    university: '',
    whatsappNumber: '',
    imageUrl: '',
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
        setFormData({ ...docSnap.data() });
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('Image must be less than 10MB'); return; }
    try {
      setUploading(true);
      setUploadProgress(0);
      const compressedFile = await compressImage(file, 800, 0.8);
      const imageUrl = await uploadWithProgress(compressedFile, 'vendors', (progress) => setUploadProgress(progress));
      setFormData(prev => ({ ...prev, imageUrl }));
    } catch (error) {
      alert(error.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatWhatsApp = (number) => {
    // Remove all non-digits
    let cleaned = number.replace(/\D/g, '');
    // Add + prefix
    if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
    return cleaned;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.shopName) { alert('Please enter shop name'); return; }
    if (!formData.category) { alert('Please select a category'); return; }
    if (!formData.university) { alert('Please select a university'); return; }
    if (!formData.whatsappNumber) { alert('Please enter WhatsApp number'); return; }
    if (!formData.imageUrl) { alert('Please upload a shop image'); return; }

    setLoading(true);
    try {
      const vendorData = {
        ...formData,
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

              {/* Shop Image */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Shop Photo *</h3>
                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-cyan-400 transition">
                  <div className="space-y-1 text-center">
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
                          className="mt-2 text-sm text-red-600 hover:text-red-700"
                        >
                          Remove Photo
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-cyan-50 rounded-full flex items-center justify-center mx-auto">
                          <ShoppingBag size={32} className="text-cyan-400" />
                        </div>
                        <div className="flex text-sm text-gray-600 justify-center">
                          <label className="cursor-pointer font-medium text-cyan-600 hover:text-cyan-500">
                            <span>Upload shop photo</span>
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
                  disabled={loading || uploading}
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