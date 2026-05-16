import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, MapPin, Eye, EyeOff } from 'lucide-react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function AdminPlaces() {
  const navigate = useNavigate();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterType, setFilterType] = useState('All');

  const placeSubCategories = [
    'All', 'Library', 'Auditorium', 'Cafeteria', 'Campus Market',
    'Shortlets', 'Chapel / Mosque', 'Gym', 'Computer Lab',
    'Restaurant', 'Cinema', 'Park', 'Mall', 'Museum', 'Other'
  ];

  const placeTypes = ['All', 'campus', 'regular'];

  useEffect(() => {
    loadPlaces();
  }, []);

  const loadPlaces = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'events'));
      const allPlaces = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(e => e.subCategory === 'places');
      setPlaces(allPlaces);
    } catch (err) {
      console.error('Error loading places:', err);
    }
    setLoading(false);
  };

  const handleDelete = async (placeId) => {
    if (!window.confirm('Are you sure you want to delete this place?')) return;
    try {
      await deleteDoc(doc(db, 'events', placeId));
      setPlaces(prev => prev.filter(p => p.id !== placeId));
    } catch (err) {
      console.error('Error deleting place:', err);
    }
  };

  const handleToggleStatus = async (place) => {
    const newStatus = place.status === 'published' ? 'draft' : 'published';
    try {
      await updateDoc(doc(db, 'events', place.id), { status: newStatus });
      setPlaces(prev => prev.map(p =>
        p.id === place.id ? { ...p, status: newStatus } : p
      ));
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const filteredPlaces = places.filter(place => {
    const matchesSearch =
      place.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.university?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === 'All' || place.campusSubCategory === filterCategory;
    const matchesType =
      filterType === 'All' || place.eventType === filterType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const publishedCount = places.filter(p => p.status === 'published').length;
  const draftCount = places.filter(p => p.status === 'draft').length;
  const campusCount = places.filter(p => p.eventType === 'campus').length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Places</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all places on OutingStation</p>
        </div>
        <Link
          to="/admin/places/create"
          className="flex items-center gap-2 bg-cyan-500 text-white px-4 py-2.5 rounded-lg hover:bg-cyan-600 transition font-medium"
        >
          <Plus size={18} />
          Add Place
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-2xl font-bold text-gray-900">{places.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Places</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-2xl font-bold text-emerald-600">{publishedCount}</p>
          <p className="text-sm text-gray-500 mt-1">Published</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-2xl font-bold text-yellow-600">{draftCount}</p>
          <p className="text-sm text-gray-500 mt-1">Drafts</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-2xl font-bold text-purple-600">{campusCount}</p>
          <p className="text-sm text-gray-500 mt-1">Campus Places</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search places..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 outline-none"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 outline-none"
          >
            {placeSubCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 outline-none"
          >
            {placeTypes.map(type => (
              <option key={type} value={type}>{type === 'All' ? 'All Types' : type === 'campus' ? 'Campus' : 'Regular'}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Places Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
        </div>
      ) : filteredPlaces.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <MapPin size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">No places found</p>
          <p className="text-gray-400 text-sm mt-1">Add your first place to get started</p>
          <Link
            to="/admin/places/create"
            className="inline-flex items-center gap-2 mt-4 bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition text-sm font-medium"
          >
            <Plus size={16} />
            Add Place
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Place</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPlaces.map(place => (
                  <tr key={place.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={place.imageUrl || 'https://images.unsplash.com/photo-1562774053-701939374585?w=100'}
                          alt={place.title}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                        <div>
                          <p className="font-medium text-gray-900 text-sm line-clamp-1">{place.title}</p>
                          {place.university && (
                            <p className="text-xs text-gray-500">🏛️ {place.university}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        place.eventType === 'campus'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {place.eventType === 'campus' ? '🎓 Campus' : '📍 Regular'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600">{place.campusSubCategory || place.category || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        <MapPin size={12} className="text-cyan-500" />
                        {place.location || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        place.status === 'published'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {place.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(place)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500"
                          title={place.status === 'published' ? 'Unpublish' : 'Publish'}
                        >
                          {place.status === 'published' ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => navigate(`/admin/places/edit/${place.id}`)}
                          className="p-1.5 hover:bg-blue-50 rounded-lg transition text-blue-600"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(place.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            Showing {filteredPlaces.length} of {places.length} places
          </div>
        </div>
      )}
    </div>
  );
}