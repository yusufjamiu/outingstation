import { useState, useEffect } from 'react';
import { Menu, Plus, Edit, Trash2, Grid, RefreshCw } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../firebase';

export default function AdminCategories() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: 'bg-blue-500' });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const allCategories = [
    'Business & Tech',
    'Art & Culture', 
    'Food & Dining',
    'Sport & Fitness',
    'Education',
    'Religion & Community',
    'Nightlife & Parties',
    'Family & Kids Fun',
    'Networking & Social',
    'Gaming & Esport',
    'Music & Concerts',
    'Cinema & Show'
  ];

  const colorOptions = [
    { name: 'Blue', value: 'bg-blue-500' },
    { name: 'Purple', value: 'bg-purple-500' },
    { name: 'Orange', value: 'bg-orange-500' },
    { name: 'Green', value: 'bg-green-500' },
    { name: 'Pink', value: 'bg-pink-500' },
    { name: 'Indigo', value: 'bg-indigo-500' },
    { name: 'Red', value: 'bg-red-500' },
    { name: 'Yellow', value: 'bg-yellow-500' },
    { name: 'Teal', value: 'bg-teal-500' },
    { name: 'Cyan', value: 'bg-cyan-500' },
    { name: 'Emerald', value: 'bg-emerald-500' },
    { name: 'Violet', value: 'bg-violet-500' },
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      
      const snapshot = await getDocs(collection(db, 'categories'));
      const categoriesData = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      // Load events to count per category
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const events = eventsSnapshot.docs.map(d => d.data());

      // Count events per category
      const categoriesWithCount = categoriesData.map(cat => ({
  ...cat,
  eventCount: events.filter(e => 
    e.category === cat.name  // ← Changed to singular
  ).length
}));

      setCategories(categoriesWithCount);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
    setLoading(false);
  };

  const handleOpenModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description,
        color: category.color
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '', color: 'bg-blue-500' });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', color: 'bg-blue-500' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingCategory) {
        await updateDoc(doc(db, 'categories', editingCategory.id), {
          name: formData.name,
          description: formData.description,
          color: formData.color,
          updatedAt: new Date()
        });
      } else {
        // ✅ Check if category already exists
        const existing = categories.find(c => c.name === formData.name);
        if (existing) {
          alert('⚠️ This category already exists!');
          return;
        }

        await addDoc(collection(db, 'categories'), {
          name: formData.name,
          description: formData.description,
          color: formData.color,
          createdAt: new Date()
        });
      }
      
      await loadCategories();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving category:', err);
      alert('Error saving category: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await deleteDoc(doc(db, 'categories', id));
        await loadCategories();
      } catch (err) {
        console.error('Error deleting category:', err);
        alert('Error deleting category: ' + err.message);
      }
    }
  };

  // ✅ FIXED: Initialize categories - checks for duplicates first!
  const initializeCategories = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'categories'));
      const existingCategories = snapshot.docs.map(d => d.data().name);

      const defaultCategories = [
        { name: 'Business & Tech', description: 'Tech startups, conferences, and business events', color: 'bg-blue-500' },
        { name: 'Art & Culture', description: 'Art exhibitions, cultural festivals, and museums', color: 'bg-purple-500' },
        { name: 'Food & Dining', description: 'Food festivals, cooking classes, and dining experiences', color: 'bg-orange-500' },
        { name: 'Sport & Fitness', description: 'Sports events, marathons, and fitness activities', color: 'bg-green-500' },
        { name: 'Education', description: 'Workshops, seminars, and educational programs', color: 'bg-indigo-500' },
        { name: 'Religion & Community', description: 'Religious events and community gatherings', color: 'bg-violet-500' },
        { name: 'Nightlife & Parties', description: 'Clubs, parties, and nightlife events', color: 'bg-pink-500' },
        { name: 'Family & Kids Fun', description: 'Family activities and children\'s events', color: 'bg-yellow-500' },
        { name: 'Networking & Social', description: 'Networking events and social meetups', color: 'bg-teal-500' },
        { name: 'Gaming & Esport', description: 'Gaming tournaments and esports events', color: 'bg-cyan-500' },
        { name: 'Music & Concerts', description: 'Live music, concerts, and music festivals', color: 'bg-emerald-500' },
        { name: 'Cinema & Show', description: 'Movie screenings, theater, and performances', color: 'bg-red-500' }
      ];

      let added = 0;
      let skipped = 0;

      for (const cat of defaultCategories) {
        // ✅ Skip if category already exists
        if (existingCategories.includes(cat.name)) {
          skipped++;
          continue;
        }

        await addDoc(collection(db, 'categories'), {
          ...cat,
          createdAt: new Date()
        });
        added++;
      }

      alert(`✅ Added ${added} categories, skipped ${skipped} duplicates`);
      await loadCategories();
    } catch (err) {
      console.error('Error initializing categories:', err);
      alert('Error: ' + err.message);
    }
  };

  // ✅ NEW: Delete ALL duplicates
  const removeDuplicates = async () => {
    if (!window.confirm('This will remove duplicate categories, keeping only one of each. Continue?')) return;

    try {
      const snapshot = await getDocs(collection(db, 'categories'));
      const allCats = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      // Group by name
      const grouped = {};
      allCats.forEach(cat => {
        if (!grouped[cat.name]) {
          grouped[cat.name] = [];
        }
        grouped[cat.name].push(cat);
      });

      let deleted = 0;
      
      // For each group, keep first, delete rest
      for (const name in grouped) {
        const duplicates = grouped[name];
        if (duplicates.length > 1) {
          // Keep the first one, delete the rest
          for (let i = 1; i < duplicates.length; i++) {
            await deleteDoc(doc(db, 'categories', duplicates[i].id));
            deleted++;
          }
        }
      }

      alert(`✅ Removed ${deleted} duplicate categories!`);
      await loadCategories();
    } catch (err) {
      console.error('Error removing duplicates:', err);
      alert('Error: ' + err.message);
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
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Manage Categories</h2>
                <p className="text-sm text-gray-500">{categories.length} categories</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              {categories.length > 12 && (
                <button onClick={removeDuplicates}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm">
                  <RefreshCw size={18} />
                  <span>Remove Duplicates</span>
                </button>
              )}
              {categories.length === 0 && (
                <button onClick={initializeCategories}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition text-sm">
                  <Grid size={18} />
                  <span>Initialize Categories</span>
                </button>
              )}
              <button onClick={() => handleOpenModal()}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition">
                <Plus size={20} />
                <span>Add Category</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Categories</p>
                      <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
                    </div>
                    <Grid size={40} className="text-cyan-500" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Events</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {categories.reduce((sum, cat) => sum + (cat.eventCount || 0), 0)}
                      </p>
                    </div>
                    <Grid size={40} className="text-green-500" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Avg Events/Category</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {categories.length > 0 
                          ? Math.round(categories.reduce((sum, cat) => sum + (cat.eventCount || 0), 0) / categories.length)
                          : 0}
                      </p>
                    </div>
                    <Grid size={40} className="text-purple-500" />
                  </div>
                </div>
              </div>

              {/* Categories Grid */}
              {categories.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {categories.map((category) => (
                    <div key={category.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition">
                      <div className={`${category.color} h-24 flex items-center justify-center`}>
                        <Grid size={40} className="text-white" />
                      </div>
                      <div className="p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{category.name}</h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{category.description}</p>
                        
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm text-gray-500">{category.eventCount || 0} events</span>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={() => handleOpenModal(category)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">
                            <Edit size={16} />
                            <span>Edit</span>
                          </button>
                          <button onClick={() => handleDelete(category.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition">
                            <Trash2 size={16} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <Grid size={64} className="text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Categories Yet</h3>
                  <p className="text-gray-500 mb-6">Click the button to create all 12 default categories</p>
                  <button onClick={initializeCategories}
                    className="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-medium">
                    Initialize All 12 Categories
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
                </label>
                {editingCategory ? (
                  <input type="text" value={formData.name} disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500" />
                ) : (
                  <select value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                    <option value="">Select a category</option>
                    {allCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                  placeholder="Brief description of the category" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color *</label>
                <div className="grid grid-cols-6 gap-2">
                  {colorOptions.map((color) => (
                    <button key={color.value} type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`h-12 ${color.value} rounded-lg ${
                        formData.color === color.value 
                          ? 'ring-4 ring-cyan-400 ring-offset-2' 
                          : 'hover:ring-2 ring-gray-300'
                      }`}
                      title={color.name} />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit"
                  className="flex-1 px-6 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-medium">
                  {editingCategory ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={handleCloseModal}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium">
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