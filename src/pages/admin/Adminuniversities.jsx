import { useState, useEffect } from 'react';
import { Menu, Plus, Edit, Trash2, GraduationCap, X, Save, Upload } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function AdminUniversities() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [uploadingUniImage, setUploadingUniImage] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    slug: '',
    imageUrl: ''
  });

  useEffect(() => {
    loadUniversities();
  }, []);

  const loadUniversities = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'universities'));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUniversities(data);
    } catch (err) {
      console.error('Error loading universities:', err);
    }
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleOpenModal = (university = null) => {
    if (university) {
      setEditingUniversity(university);
      setFormData({
        name: university.name,
        location: university.location,
        slug: university.slug,
        imageUrl: university.imageUrl || ''
      });
    } else {
      setEditingUniversity(null);
      setFormData({ name: '', location: '', slug: '', imageUrl: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUniversity(null);
    setFormData({ name: '', location: '', slug: '', imageUrl: '' });
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setFormData({ ...formData, name, slug: generateSlug(name) });
  };

  // ✅ CLOUDINARY UPLOAD FUNCTION
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'outingstation/universities');

    try {
      console.log('📤 Uploading to Cloudinary...');
      
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Cloudinary upload successful!');
      return data.secure_url;
    } catch (error) {
      console.error('❌ Cloudinary upload error:', error);
      throw error;
    }
  };

  // ✅ CLOUDINARY IMAGE UPLOAD HANDLER
  const handleUniversityImageUpload = async (e, universityId) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image must be less than 10MB');
        return;
      }

      setUploadingUniImage(universityId);

      // Upload to Cloudinary
      console.log('📤 Uploading university image to Cloudinary...');
      const imageUrl = await uploadToCloudinary(file);
      console.log('✅ Upload complete:', imageUrl);

      // Update university in Firestore
      const uniRef = doc(db, 'universities', universityId);
      await updateDoc(uniRef, {
        imageUrl: imageUrl
      });

      // Reload universities list
      await loadUniversities();

      setUploadingUniImage(null);
      alert('University image updated successfully!');

    } catch (error) {
      console.error('❌ Upload error:', error);
      alert(error.message || 'Failed to upload university image');
      setUploadingUniImage(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingUniversity) {
        await updateDoc(doc(db, 'universities', editingUniversity.id), formData);
      } else {
        await addDoc(collection(db, 'universities'), {
          ...formData,
          eventCount: 0,
          createdAt: new Date()
        });
      }

      await loadUniversities();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving university:', error);
      alert('Something went wrong.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this university?')) {
      await deleteDoc(doc(db, 'universities', id));
      loadUniversities();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Manage Universities</h2>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
          >
            <Plus size={20} />
            Add University
          </button>
        </header>

        <div className="p-6">
          {/* University Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {universities.map((uni) => (
              <div key={uni.id} className="bg-white rounded-xl shadow border overflow-hidden">
                {/* University Image */}
                <div className="relative h-48 bg-gray-200">
                  {uni.imageUrl ? (
                    <img
                      src={uni.imageUrl}
                      alt={uni.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <GraduationCap size={48} className="text-gray-400" />
                    </div>
                  )}

                  {/* Upload Button Overlay */}
                  <label className="absolute bottom-2 right-2 cursor-pointer">
                    <div className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-medium text-sm flex items-center gap-2 shadow-lg">
                      {uploadingUniImage === uni.id ? (
                        <>
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          <span>Upload Image</span>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUniversityImageUpload(e, uni.id)}
                      disabled={uploadingUniImage === uni.id}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* University Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{uni.name}</h3>
                      <p className="text-sm text-gray-600 mb-1">{uni.location}</p>
                      <p className="text-xs text-gray-400 font-mono">{uni.slug}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <button 
                      onClick={() => handleOpenModal(uni)} 
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                    >
                      <Edit size={16} />
                      <span className="text-sm font-medium">Edit</span>
                    </button>
                    <button 
                      onClick={() => handleDelete(uni.id)} 
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
                    >
                      <Trash2 size={16} />
                      <span className="text-sm font-medium">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {universities.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <GraduationCap size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No universities yet.</p>
              <p className="text-sm mt-2">Click "Add University" to get started.</p>
            </div>
          )}
        </div>
      </main>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">
                {editingUniversity ? 'Edit University' : 'Add University'}
              </h3>
              <button onClick={handleCloseModal} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  University Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., University of Lagos"
                  value={formData.name}
                  onChange={handleNameChange}
                  required
                  className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Lagos, Nigeria"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  required
                  className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug * <span className="text-xs text-gray-500">(Auto-generated)</span>
                </label>
                <input
                  type="text"
                  placeholder="university-of-lagos"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  required
                  className="w-full border border-gray-300 px-4 py-2 rounded-lg font-mono text-sm focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image URL <span className="text-xs text-gray-500">(Optional - can upload after creating)</span>
                </label>
                <input
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  value={formData.imageUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, imageUrl: e.target.value })
                  }
                  className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You can upload an image using the "Upload Image" button after creating the university.
                </p>
              </div>

              {formData.imageUrl && (
                <div className="border rounded-lg p-2">
                  <img 
                    src={formData.imageUrl} 
                    alt="Preview" 
                    className="w-full h-32 object-cover rounded"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-cyan-500 text-white py-2.5 rounded-lg hover:bg-cyan-600 transition font-medium"
                >
                  <Save size={18} />
                  {editingUniversity ? 'Update' : 'Create'}
                </button>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}