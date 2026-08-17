import { useState, useEffect } from 'react';
import { Menu, Plus, Edit, Trash2, Eye, Calendar } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

export default function AdminExperiences() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadExperiences(); }, []);

  const loadExperiences = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'experiences'));
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setExperiences(data);
    } catch (err) {
      console.error('Error loading experiences:', err);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this experience? This does not cancel existing bookings.')) {
      try {
        await deleteDoc(doc(db, 'experiences', id));
        setExperiences(experiences.filter(e => e.id !== id));
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }
  };

  const upcomingSessions = (exp) => {
    const today = new Date().toISOString().slice(0, 10);
    return (exp.sessions || []).filter(s => s.date >= today).length;
  };
  const totalBooked = (exp) => (exp.sessions || []).reduce((sum, s) => sum + (s.bookedSpots || 0), 0);

  const filteredExperiences = experiences.filter(exp => {
    const matchesSearch = (exp.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || exp.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

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
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Experiences</h2>
                <p className="text-sm text-gray-500">{filteredExperiences.length} of {experiences.length} shown</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={loadExperiences} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm">Refresh</button>
              <button onClick={() => navigate('/admin/experience-submissions')} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition text-sm font-medium">
                <Plus size={18} /> Review Submissions
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <input type="text" placeholder="Search experiences..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm" />
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm">
              <option value="all">All Categories</option>
              {['Outdoor', 'Indoor', 'Food', 'Arts', 'Wellness', 'Adventure'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {loading ? (
            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div></div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Experience', 'Category', 'Price', 'Sessions', 'Booked', 'Booking', 'Actions'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredExperiences.map((exp) => (
                      <tr key={exp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={exp.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=100'}
                              alt={exp.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                              onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=100'} />
                            <div>
                              <div className="text-sm font-medium text-gray-900 line-clamp-1">{exp.title}</div>
                              <div className="text-xs text-gray-500">{exp.city}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{exp.category || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">₦{Number(exp.pricePerPerson || 0).toLocaleString()}/person</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-semibold">
                            <Calendar size={10} /> {upcomingSessions(exp)} upcoming
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{totalBooked(exp)} people</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${exp.bookingMethod === 'outingstation' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {exp.bookingMethod === 'outingstation' ? '🎫 OS Booking' : '📞 Contact'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-1">
                            <button onClick={() => navigate(`/experience/${exp.id}`)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="View"><Eye size={16} /></button>
                            <button onClick={() => navigate(`/admin/experiences/edit/${exp.id}`)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" title="Edit"><Edit size={16} /></button>
                            <button onClick={() => handleDelete(exp.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredExperiences.length === 0 && (
                <div className="text-center py-12 text-gray-500">No experiences found matching your filters.</div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}