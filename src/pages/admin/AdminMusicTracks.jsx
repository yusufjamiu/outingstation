import { useState, useEffect } from 'react';
import { Menu, Plus, Trash2, Music as MusicIcon, Play, Pause } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

// ✅ Same unsigned-upload pattern as your existing image uploads — audio
// files go through Cloudinary's 'video' resource type (Cloudinary treats
// all non-image media, including audio, under video/).
// ⚠️ CONFIRM: replace 'YOUR_CLOUD_NAME' and 'YOUR_UPLOAD_PRESET' with your
// actual Cloudinary values (same ones your image uploads already use).
const CLOUDINARY_CLOUD_NAME = 'YOUR_CLOUD_NAME';
const CLOUDINARY_UPLOAD_PRESET = 'YOUR_UPLOAD_PRESET';

async function uploadAudioToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'outingstation/music');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    throw new Error('Cloudinary upload failed');
  }

  const data = await response.json();
  return { url: data.secure_url, duration: data.duration };
}

const MOODS = ['upbeat', 'chill', 'ambient'];

export default function AdminMusicTracks() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState('upbeat');
  const [file, setFile] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const [audioEl, setAudioEl] = useState(null);

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'musicTracks'));
      const data = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.addedAt?.seconds || 0) - (a.addedAt?.seconds || 0));
      setTracks(data);
    } catch (err) {
      console.error('Error loading music tracks:', err);
    }
    setLoading(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title.trim() || !file) {
      alert('Please add a title and select an audio file.');
      return;
    }

    setUploading(true);
    try {
      const { url, duration } = await uploadAudioToCloudinary(file);

      await addDoc(collection(db, 'musicTracks'), {
        title: title.trim(),
        mood,
        audioUrl: url,
        durationSeconds: Math.round(duration || 0),
        addedAt: serverTimestamp(),
      });

      setTitle('');
      setMood('upbeat');
      setFile(null);
      setShowAddForm(false);
      loadTracks();
    } catch (err) {
      console.error('Error uploading track:', err);
      alert('Upload failed: ' + err.message);
    }
    setUploading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this track? Outings using it will lose their music.')) return;
    try {
      await deleteDoc(doc(db, 'musicTracks', id));
      setTracks(tracks.filter(t => t.id !== id));
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const togglePlay = (track) => {
    if (playingId === track.id) {
      audioEl?.pause();
      setPlayingId(null);
      return;
    }
    audioEl?.pause();
    const newAudio = new Audio(track.audioUrl);
    newAudio.play();
    newAudio.onended = () => setPlayingId(null);
    setAudioEl(newAudio);
    setPlayingId(track.id);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
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
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Music Tracks</h2>
                <p className="text-sm text-gray-500">{tracks.length} tracks in the Outings music library</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition text-sm font-medium"
            >
              <Plus size={18} />
              Add Track
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {showAddForm && (
            <form onSubmit={handleUpload} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Track</h3>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Upbeat Summer"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mood</label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none text-sm"
                  >
                    {MOODS.map(m => (
                      <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Audio File (MP3)</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full text-sm text-gray-600"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition text-sm font-medium disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload Track'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['', 'Title', 'Mood', 'Duration', 'Actions'].map(h => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tracks.map((track) => (
                      <tr key={track.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => togglePlay(track)}
                            className="w-9 h-9 flex items-center justify-center bg-cyan-50 text-cyan-600 rounded-full hover:bg-cyan-100 transition"
                          >
                            {playingId === track.id ? <Pause size={16} /> : <Play size={16} />}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <MusicIcon size={16} className="text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">{track.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-cyan-100 text-cyan-700 capitalize">
                            {track.mood}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDuration(track.durationSeconds)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleDelete(track.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tracks.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No tracks yet — click "Add Track" to upload your first one.
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}