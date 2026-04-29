import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Mail, Users, Send, CheckCircle, X } from 'lucide-react';

export default function AdminEarlyAccess() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, total: 0, done: false });

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'earlyAccess'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toLocaleDateString('en-US', {
          day: 'numeric', month: 'short', year: 'numeric'
        }) || 'Unknown'
      }));
      setSubscribers(data);
    } catch (err) {
      console.error('Error fetching subscribers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendLaunchEmail = async () => {
    setSending(true);
    setShowConfirmModal(false);
    setProgress({ sent: 0, total: subscribers.length, done: false });

    let sent = 0;

    for (const subscriber of subscribers) {
      try {
        await fetch('/api/send-launch-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: subscriber.email })
        });

        // Mark as notified in Firestore
        await updateDoc(doc(db, 'earlyAccess', subscriber.id), {
          notified: true,
          notifiedAt: new Date()
        });

        sent++;
        setProgress({ sent, total: subscribers.length, done: false });
      } catch (err) {
        console.error('Failed for:', subscriber.email, err);
        sent++;
        setProgress({ sent, total: subscribers.length, done: false });
      }
    }

    setProgress({ sent, total: subscribers.length, done: true });
    setSending(false);
    fetchSubscribers(); // refresh to show notified status
  };

  const notifiedCount = subscribers.filter(s => s.notified).length;
  const pendingCount = subscribers.length - notifiedCount;

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Early Access Subscribers</h1>
          <p className="text-gray-500 mt-1">People who signed up to be notified at launch</p>
        </div>
        <button
          onClick={() => setShowConfirmModal(true)}
          disabled={sending || subscribers.length === 0}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-5 py-3 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={18} />
          Send Launch Announcement
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
            <Users className="text-cyan-500" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{subscribers.length}</p>
            <p className="text-sm text-gray-500">Total Subscribers</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <CheckCircle className="text-green-500" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{notifiedCount}</p>
            <p className="text-sm text-gray-500">Notified</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
            <Mail className="text-yellow-500" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            <p className="text-sm text-gray-500">Pending</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {sending && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="font-medium text-gray-700">Sending launch emails...</p>
            <p className="text-sm text-gray-500">{progress.sent} / {progress.total}</p>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-cyan-400 to-cyan-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${(progress.sent / progress.total) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Done Banner */}
      {progress.done && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <CheckCircle className="text-green-500" size={20} />
          <p className="text-green-700 font-medium">
            Launch announcement sent to {progress.sent} subscribers successfully!
          </p>
        </div>
      )}

      {/* Subscribers Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Subscriber List</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : subscribers.length === 0 ? (
          <div className="text-center py-16">
            <Mail className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="text-gray-500">No subscribers yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Signed Up</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscribers.map((subscriber, index) => (
                  <tr key={subscriber.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4 text-sm text-gray-500">{index + 1}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Mail size={14} className="text-cyan-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{subscriber.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">{subscriber.createdAt}</td>
                    <td className="px-5 py-4">
                      {subscriber.notified ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          <CheckCircle size={12} />
                          Notified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Send Launch Announcement?</h2>
              <button onClick={() => setShowConfirmModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              This will send a launch announcement email to all <strong>{subscribers.length} subscribers</strong>. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleSendLaunchEmail}
                className="flex-1 bg-gradient-to-r from-cyan-400 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition"
              >
                Yes, Send Now
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}