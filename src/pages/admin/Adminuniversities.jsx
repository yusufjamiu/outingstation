import { useState, useEffect } from 'react';
import { Menu, Plus, Edit, Trash2, GraduationCap, X, Save } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';

export default function AdminUniversities() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState(null);
  const [formData, setFormData] = useState({ name: '', location: '', slug: '' });
  const [universities, setUniversities] = useState([]);

  // Load universities from localStorage on mount
  useEffect(() => {
    loadUniversities();
  }, []);

  // Save to localStorage whenever universities change
  useEffect(() => {
    if (universities.length > 0) {
      localStorage.setItem('universities', JSON.stringify(universities));
      console.log('💾 Saved to localStorage:', universities.length, 'universities');
    }
  }, [universities]);

  const loadUniversities = () => {
    try {
      const stored = localStorage.getItem('universities');
      if (stored) {
        const data = JSON.parse(stored);
        setUniversities(data);
        console.log('✅ Loaded from localStorage:', data.length, 'universities');
      } else {
        // Initialize with defaults
        const defaults = [
          { id: 1, name: 'University of Lagos (Unilag)', location: 'Lagos, Nigeria', slug: 'university-of-lagos-unilag', eventCount: 12 },
          { id: 2, name: 'King Saud University (KSU)', location: 'Riyadh, Saudi Arabia', slug: 'king-saud-university-ksu', eventCount: 8 },
          { id: 3, name: 'University of Ibadan (UI)', location: 'Ibadan, Nigeria', slug: 'university-of-ibadan-ui', eventCount: 5 },
          { id: 4, name: 'University of Ghana (Legon)', location: 'Accra, Ghana', slug: 'university-of-ghana-legon', eventCount: 3 },
          { id: 5, name: 'Covenant University (CU)', location: 'Ota, Nigeria', slug: 'covenant-university-cu', eventCount: 7 },
          { id: 6, name: 'University of Ilorin (Unilorin)', location: 'Ilorin, Nigeria', slug: 'university-of-ilorin-unilorin', eventCount: 4 },
        ];
        setUniversities(defaults);
        localStorage.setItem('universities', JSON.stringify(defaults));
        console.log('ℹ️ Initialized with defaults');
      }
    } catch (error) {
      console.error('❌ Error loading universities:', error);
    }
  };

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
  };

  const handleOpenModal = (university = null) => {
    if (university) {
      setEditingUniversity(university);
      setFormData({ name: university.name, location: university.location, slug: university.slug });
    } else {
      setEditingUniversity(null);
      setFormData({ name: '', location: '', slug: '' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUniversity(null);
    setFormData({ name: '', location: '', slug: '' });
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setFormData({ ...formData, name: name, slug: generateSlug(name) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingUniversity) {
      setUniversities(universities.map(uni => 
        uni.id === editingUniversity.id ? { ...uni, ...formData } : uni
      ));
      console.log('✏️ Updated:', formData.name);
    } else {
      const newUni = { id: Date.now(), ...formData, eventCount: 0 };
      setUniversities([...universities, newUni]);
      console.log('➕ Added:', formData.name);
    }
    
    handleCloseModal();
  };

  const handleDelete = (id) => {
    const uni = universities.find(u => u.id === id);
    if (window.confirm(`Delete ${uni?.name}? This affects all related events.`)) {
      setUniversities(universities.filter(u => u.id !== id));
      console.log('🗑️ Deleted:', uni?.name);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={24} />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Manage Universities</h2>
                <p className="text-sm text-gray-500 mt-1">Total: {universities.length} universities</p>
              </div>
            </div>
            <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition">
              <Plus size={20} />
              <span>Add University</span>
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Universities</p>
                  <p className="text-2xl font-bold text-gray-900">{universities.length}</p>
                </div>
                <GraduationCap size={40} className="text-cyan-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Campus Events</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {universities.reduce((sum, uni) => sum + uni.eventCount, 0)}
                  </p>
                </div>
                <GraduationCap size={40} className="text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Events/University</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {universities.length > 0 ? Math.round(universities.reduce((sum, uni) => sum + uni.eventCount, 0) / universities.length) : 0}
                  </p>
                </div>
                <GraduationCap size={40} className="text-purple-500" />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              💡 <strong>Note:</strong> Universities added here automatically appear in <strong>Create Event</strong> form when you select "Campus Event".
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">University</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Events</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {universities.map((university) => (
                    <tr key={university.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <GraduationCap size={20} className="text-cyan-600" />
                          </div>
                          <div className="text-sm font-medium text-gray-900">{university.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{university.location}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{university.slug}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{university.eventCount} events</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleOpenModal(university)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => handleDelete(university.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {editingUniversity ? 'Edit University' : 'Add New University'}
              </h3>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">University Name *</label>
                <input type="text" value={formData.name} onChange={handleNameChange} required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                  placeholder="e.g. University of Lagos (Unilag)" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                  placeholder="e.g. Lagos, Nigeria" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Slug (Auto-generated)</label>
                <input type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                  placeholder="university-of-lagos-unilag" />
                <p className="mt-1 text-xs text-gray-500">Used in URLs. Auto-generated from name, can be edited.</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-medium">
                  <Save size={20} />
                  <span>{editingUniversity ? 'Update' : 'Create'}</span>
                </button>
                <button type="button" onClick={handleCloseModal} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium">
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