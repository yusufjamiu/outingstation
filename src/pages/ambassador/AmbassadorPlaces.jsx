import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Plus, Edit, Trash2, Eye, EyeOff, MapPin, Search, AlertTriangle } from 'lucide-react';
import { AmbassadorSidebar } from '../../components/AmbassadorSidebar';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

export default function AmbassadorPlaces() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [places, setPlaces] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const assignedIds = userProfile?.assignedCampuses || [];
  const myCampuses = universities.filter(u => assignedIds.includes(u.id));
  const myCampusNames = myCampuses.map(u => u.name).filter(Boolean);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [eventsSnap, uniSnap] = await Promise.all([
        getDocs(collection(db, 'events')),
        getDocs(collection(db, 'universities')),
      ]);
      const allPlaces = eventsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(e => e.subCategory === 'places');
      setPlaces(allPlaces);
      setUniversities(uniSnap.docs.map(d => ({ id: d.id, ...d.data() })));
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
      alert('Error: ' + err.message);
    }
  };

  const handleToggleStatus = async (place) => {
    const newStatus = place.status === 'published' ? 'draft' : 'published';
    try {
      await updateDoc(doc(db, 'events', place.id), { status: newStatus });
      setPlaces(prev => prev.map(p => p.id === place.id ? { ...p, status: newStatus } : p));
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // 🔒 Only campus places for THIS ambassador's campuses
  const myPlaces = places.filter(p => p.university && myCampusNames.includes(p.university));

  const filteredPlaces = myPlaces.filter(place => {
    const matchesSearch =
      place.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      place.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || place.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const publishedCount = myPlaces.filter(p => p.status === 'published').length;
  const draftCount = myPlaces.filter(p => p.status === 'draft').length;
  const noCampus = !loading && myCampuses.length === 0;

  return (
    <div className="flex h-screen bg-gray-50">
      <AmbassadorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={24} />
              </button>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Campus Places</h2>
                <p className="text-sm text-gray-500">
                  {myCampusNames.length > 0 ? myCampusNames.join(', ') : 'No campus assigned'} · {filteredPlaces.length} shown
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={loadAll} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm">
                Refresh
              </button>
              <button
                onClick={() => navigate('/ambassador/places/create')}
                disabled={noCampus}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition text-sm font-medium disabled:opacity-50"
              >
                <Plus size={18} />
                Add Place
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
            >
              <option value="All">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {noCampus ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-3">
              <AlertTriangle className="text-amber-500 flex-shrink-0" size={22} />
              <div>
                <p className="font-semibold text-amber-800">No campus assigned yet</p>
                <p className="text-sm text-amber-700">Ask your admin to assign you a campus. Once you have one, you can add and manage its places here.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-2xl font-bold text-gray-900">{myPlaces.length}</p>
                  <p className="text-sm text-gray-500 mt-1">Total Places</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-2xl font-bold text-emerald-600">{publishedCount}</p>
                  <p className="text-sm text-gray-500 mt-1">Published</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-2xl font-bold text-yellow-600">{draftCount}</p>
                  <p className="text-sm text-gray-500 mt-1">Draft</p>
                </div>
              </div>

              {/* Table */}
              {loading ? (
                <div className="flex justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500"></div>
                </div>
              ) : filteredPlaces.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
                  <MapPin size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg font-medium">No places for your campus yet</p>
                  <p className="text-gray-400 text-sm mt-1">Add your first campus place to get started</p>
                  <button
                    onClick={() => navigate('/ambassador/places/create')}
                    className="inline-flex items-center gap-2 mt-4 bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition text-sm font-medium"
                  >
                    <Plus size={16} />
                    Add Place
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {['Place', 'Category', 'Type', 'Location', 'Hours', 'Status', 'Actions'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              {h}
                            </th>
                          ))}
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
                                  onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1562774053-701939374585?w=100'}
                                />
                                <div>
                                  <p className="font-medium text-gray-900 text-sm line-clamp-1">{place.title}</p>
                                  {place.university && (
                                    <p className="text-xs text-teal-600">🎓 {place.university}</p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                              {place.category || '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                              {place.campusSubCategory || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-gray-600 flex items-center gap-1 whitespace-nowrap">
                                <MapPin size={11} className="text-cyan-500" />
                                {place.location || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                              {place.openingTime && place.closingTime
                                ? `${place.openingTime} - ${place.closingTime}`
                                : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${
                                place.status === 'published'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {place.status === 'published' ? 'Published' : 'Draft'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleToggleStatus(place)}
                                  className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-500"
                                  title={place.status === 'published' ? 'Unpublish' : 'Publish'}
                                >
                                  {place.status === 'published' ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                                <button
                                  onClick={() => navigate(`/ambassador/places/edit/${place.id}`)}
                                  className="p-1.5 hover:bg-blue-50 rounded-lg transition text-blue-600"
                                  title="Edit"
                                >
                                  <Edit size={15} />
                                </button>
                                <button
                                  onClick={() => handleDelete(place.id)}
                                  className="p-1.5 hover:bg-red-50 rounded-lg transition text-red-500"
                                  title="Delete"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                    Showing {filteredPlaces.length} of {myPlaces.length} places
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}