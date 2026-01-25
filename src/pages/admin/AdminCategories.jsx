import { useState } from 'react';
import { Menu, Plus, Edit, Trash2, Grid } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';

export default function AdminCategories() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: 'bg-blue-500' });
  
  // Mock categories data - replace with Firebase data
  const [categories, setCategories] = useState([
    {
      id: 1,
      name: 'Business & Tech',
      description: 'Tech startups, conferences, and business events',
      color: 'bg-blue-500',
      eventCount: 45
    },
    {
      id: 2,
      name: 'Art & Culture',
      description: 'Art exhibitions, cultural festivals, and museums',
      color: 'bg-purple-500',
      eventCount: 32
    },
    {
      id: 3,
      name: 'Food & Dining',
      description: 'Food festivals, cooking classes, and dining experiences',
      color: 'bg-orange-500',
      eventCount: 28
    },
    {
      id: 4,
      name: 'Sport & Fitness',
      description: 'Sports events, marathons, and fitness activities',
      color: 'bg-green-500',
      eventCount: 38
    },
    {
      id: 5,
      name: 'Music & Concerts',
      description: 'Live music, concerts, and music festivals',
      color: 'bg-pink-500',
      eventCount: 52
    },
    {
      id: 6,
      name: 'Education',
      description: 'Workshops, seminars, and educational programs',
      color: 'bg-indigo-500',
      eventCount: 41
    },
  ]);

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
  ];

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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingCategory) {
      // Update existing category
      setCategories(categories.map(cat => 
        cat.id === editingCategory.id 
          ? { ...cat, ...formData }
          : cat
      ));
      // TODO: Update in Firebase
    } else {
      // Create new category
      const newCategory = {
        id: Date.now(),
        ...formData,
        eventCount: 0
      };
      setCategories([...categories, newCategory]);
      // TODO: Save to Firebase
    }
    
    handleCloseModal();
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this category? This will affect all events in this category.')) {
      setCategories(categories.filter(c => c.id !== id));
      // TODO: Delete from Firebase
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Manage Categories</h2>
            </div>
            
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition"
            >
              <Plus size={20} />
              <span>Add Category</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6 lg:p-8">
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
                    {categories.reduce((sum, cat) => sum + cat.eventCount, 0)}
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
                    {Math.round(categories.reduce((sum, cat) => sum + cat.eventCount, 0) / categories.length)}
                  </p>
                </div>
                <Grid size={40} className="text-purple-500" />
              </div>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <div key={category.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition">
                <div className={`${category.color} h-24 flex items-center justify-center`}>
                  <Grid size={40} className="text-white" />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{category.name}</h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{category.description}</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500">{category.eventCount} events</span>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenModal(category)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"
                    >
                      <Edit size={16} />
                      <span>Edit</span>
                    </button>
                    <button 
                      onClick={() => handleDelete(category.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                    >
                      <Trash2 size={16} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                  placeholder="e.g. Business & Tech"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                  placeholder="Brief description of the category"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color *
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`h-12 ${color.value} rounded-lg ${
                        formData.color === color.value 
                          ? 'ring-4 ring-cyan-400 ring-offset-2' 
                          : 'hover:ring-2 ring-gray-300'
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-medium"
                >
                  {editingCategory ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
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