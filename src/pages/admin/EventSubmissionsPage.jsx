// src/pages/admin/EventSubmissionsPage.jsx
// Admin page to review event submissions from organizers
// ✅ ADDED: Award ₦100 referral credits on event approval

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { AdminSidebar } from '../../components/AdminSidebar';
import { 
  Eye, 
  Check, 
  X, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Users, 
  Mail, 
  Phone,
  ExternalLink,
  Clock,
  Filter,
  GraduationCap,
  Menu,
  RefreshCw,
  AlertTriangle,
  Gift // ✅ NEW ICON
} from 'lucide-react';

export default function EventSubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const snapshot = await getDocs(collection(db, 'event_submissions'));
      
      const data = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => {
          const aTime = a.submittedAt?.seconds || 0;
          const bTime = b.submittedAt?.seconds || 0;
          return bTime - aTime;
        });

      setSubmissions(data);
      setError(null);
      console.log(`✅ Loaded ${data.length} submissions`);
    } catch (err) {
      console.error('Error fetching submissions:', err);
      
      if (err.code === 'permission-denied') {
        setError('Permission denied. Please make sure you are logged in as an admin user.');
      } else if (err.code === 'failed-precondition') {
        setError('Missing Firestore index. This should not happen with client-side sorting. Check console for details.');
      } else {
        setError(`Failed to load submissions: ${err.message}`);
      }
      
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchSubmissions();
      setTimeout(() => setRefreshing(false), 500);
    } catch (err) {
      console.error('Refresh error:', err);
      setRefreshing(false);
    }
  };

  // ✅ NEW: Award ₦100 credit to user with referral code
  const awardEventCredit = async (referralCode) => {
    if (!referralCode) {
      console.log('No referral code provided, skipping credit award');
      return null;
    }

    try {
      console.log(`🎁 Looking for user with referral code: ${referralCode}`);
      
      // Find user by referral code
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('referralCode', '==', referralCode.toUpperCase()));
      const userSnapshot = await getDocs(q);

      if (userSnapshot.empty) {
        console.warn(`⚠️ No user found with referral code: ${referralCode}`);
        return null;
      }

      const userDoc = userSnapshot.docs[0];
      const userId = userDoc.id;
      const userName = userDoc.data().name || 'User';

      console.log(`✅ Found user: ${userName} (${userId})`);

      // Create credit object
      const creditId = `credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();
      const expiryDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

      const newCredit = {
        id: creditId,
        amount: 100,
        originalAmount: 100,
        reason: 'Event listing reward',
        earnedAt: now.toISOString(),
        expiresAt: expiryDate.toISOString(),
        status: 'active',
        usedAmount: 0
      };

      // Get current credits history
      const currentCredits = userDoc.data().creditsHistory || [];
      const updatedCredits = [...currentCredits, newCredit];

      // Update user document
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        creditsHistory: updatedCredits,
        totalCredits: increment(100),
        eventsListed: increment(1),
        updatedAt: now
      });

      console.log(`✅ Awarded ₦100 credit to ${userName}`);
      return userName;
    } catch (err) {
      console.error('❌ Error awarding event credit:', err);
      return null;
    }
  };

  // ✅ UPDATED: Award credit on approval
  const handleApprove = async (submissionId) => {
    const submission = submissions.find(s => s.id === submissionId);
    
    if (!confirm('Approve this submission? You will need to manually add it to the events collection.')) return;

    try {
      // Update submission status
      await updateDoc(doc(db, 'event_submissions', submissionId), {
        status: 'approved',
        reviewedAt: new Date()
      });

      // ✅ NEW: Award credit if referral code exists
      let creditMessage = '';
      if (submission?.referralCode) {
        console.log(`🎁 Attempting to award credit for referral code: ${submission.referralCode}`);
        const awardedTo = await awardEventCredit(submission.referralCode);
        
        if (awardedTo) {
          creditMessage = `\n\n✅ Awarded ₦100 credit to ${awardedTo}!`;
        } else {
          creditMessage = `\n\n⚠️ Could not award credit - referral code "${submission.referralCode}" not found.`;
        }
      }

      alert(`Submission approved! Please manually add it to the events collection.${creditMessage}`);
      fetchSubmissions();
      setSelectedSubmission(null);
    } catch (error) {
      console.error('Error approving:', error);
      alert('Failed to approve submission: ' + error.message);
    }
  };

  const handleReject = async (submissionId) => {
    const reason = prompt('Enter rejection reason (will be sent to organizer):');
    if (!reason) return;

    try {
      await updateDoc(doc(db, 'event_submissions', submissionId), {
        status: 'rejected',
        rejectionReason: reason,
        reviewedAt: new Date()
      });

      alert('Submission rejected. Make sure to email the organizer with the reason.');
      fetchSubmissions();
      setSelectedSubmission(null);
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('Failed to reject submission: ' + error.message);
    }
  };

  const handleDelete = async (submissionId) => {
    if (!confirm('Permanently delete this submission? This cannot be undone.')) return;

    try {
      await deleteDoc(doc(db, 'event_submissions', submissionId));
      alert('Submission deleted');
      fetchSubmissions();
      setSelectedSubmission(null);
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete submission: ' + error.message);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.pending}`}>
        {status?.toUpperCase() || 'PENDING'}
      </span>
    );
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
    if (typeFilter !== 'all' && sub.listingType !== typeFilter) return false;
    return true;
  });

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 overflow-auto">
          <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Menu size={24} />
                </button>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Event Submissions</h1>
              </div>

              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg font-medium transition"
              >
                <RefreshCw size={16} />
                <span className="hidden sm:inline">Retry</span>
              </button>
            </div>
          </header>

          <div className="p-4 sm:p-6 flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Submissions</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-2">Possible Solutions:</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Check your Firestore security rules allow admins to read event_submissions</li>
                  <li>• Create a compound index for event_submissions (submittedAt desc)</li>
                  <li>• Verify you're logged in as an admin user</li>
                  <li>• Check browser console for detailed error messages</li>
                </ul>
              </div>

              <button
                onClick={handleRefresh}
                className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading submissions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Event Submissions</h1>
                <p className="text-sm text-gray-600 hidden sm:block">Review and manage submissions from organizers</p>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw 
                size={16} 
                className={refreshing ? 'animate-spin' : ''} 
              />
              <span className="hidden sm:inline">
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{submissions.length}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total Submissions</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 sm:p-6 shadow-sm border border-yellow-200">
              <div className="text-xl sm:text-2xl font-bold text-yellow-800">
                {submissions.filter(s => s.status === 'pending' || !s.status).length}
              </div>
              <div className="text-xs sm:text-sm text-yellow-700">Pending Review</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 sm:p-6 shadow-sm border border-green-200">
              <div className="text-xl sm:text-2xl font-bold text-green-800">
                {submissions.filter(s => s.status === 'approved').length}
              </div>
              <div className="text-xs sm:text-sm text-green-700">Approved</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 sm:p-6 shadow-sm border border-red-200">
              <div className="text-xl sm:text-2xl font-bold text-red-800">
                {submissions.filter(s => s.status === 'rejected').length}
              </div>
              <div className="text-xs sm:text-sm text-red-700">Rejected</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Filter size={20} className="text-gray-600 hidden sm:block" />
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="flex-1 sm:flex-initial">
                  <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="flex-1 sm:flex-initial">
                  <label className="text-sm font-medium text-gray-700 mr-2">Type:</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="all">All</option>
                    <option value="event">Events</option>
                    <option value="place">Places</option>
                  </select>
                </div>
              </div>
              <span className="text-sm text-gray-600">
                {filteredSubmissions.length} results
              </span>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organizer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date/Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        No submissions found
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((submission) => (
                      <tr key={submission.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            {submission.imageUrl && (
                              <img 
                                src={submission.imageUrl} 
                                alt={submission.eventTitle}
                                className="w-16 h-16 object-cover rounded-lg"
                                onError={(e) => e.target.style.display = 'none'}
                              />
                            )}
                            <div>
                              <div className="font-semibold text-gray-900">{submission.eventTitle}</div>
                              <div className="text-sm text-gray-600">{submission.eventCategory}</div>
                              <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                <MapPin size={14} />
                                {submission.city}
                              </div>
                              {/* ✅ NEW: Referral Code Badge */}
                              {submission.referralCode && (
                                <div className="text-xs text-purple-600 font-semibold mt-1 flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded">
                                  <Gift size={12} />
                                  {submission.referralCode}
                                </div>
                              )}
                              {submission.isUniversityEvent && submission.universityName && (
                                <div className="text-xs text-blue-600 font-semibold mt-1 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded">
                                  🎓 {submission.universityName}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{submission.organizerName}</div>
                            <div className="text-gray-600">{submission.organizationName || 'Individual'}</div>
                            <div className="text-gray-500 flex items-center gap-1 mt-1">
                              <Mail size={12} />
                              <span className="truncate max-w-[200px]">{submission.organizerEmail}</span>
                            </div>
                            <div className="text-gray-500 flex items-center gap-1">
                              <Phone size={12} />
                              {submission.organizerPhone}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            submission.listingType === 'event' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {submission.listingType === 'event' ? '🎉 Event' : '🏛️ Place'}
                          </span>
                          {submission.listingType === 'event' && submission.eventType && (
                            <div className="text-xs text-gray-500 mt-1">
                              {submission.eventType}
                            </div>
                          )}
                          {submission.subCategory === 'campus' && (
                            <div className="text-xs text-blue-600 font-semibold mt-1">
                              Campus Event
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {submission.listingType === 'event' ? (
                            <>
                              <div className="flex items-center gap-1">
                                <Calendar size={14} />
                                {submission.startDate || 'N/A'}
                              </div>
                              <div className="flex items-center gap-1 text-gray-500">
                                <Clock size={14} />
                                {submission.startTime || 'N/A'}
                              </div>
                            </>
                          ) : (
                            <div className="text-xs">
                              {submission.alwaysOpen ? (
                                <span className="text-green-600 font-semibold">24/7 Open</span>
                              ) : (
                                <div className="text-gray-600 whitespace-pre-line">
                                  {submission.operatingHours?.substring(0, 50)}
                                  {submission.operatingHours?.length > 50 && '...'}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(submission.status)}
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDate(submission.submittedAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedSubmission(submission)}
                            className="flex items-center gap-1 text-cyan-600 hover:text-cyan-700 font-medium text-sm"
                          >
                            <Eye size={16} />
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedSubmission.eventTitle}</h2>
                <p className="text-gray-600">{selectedSubmission.eventCategory}</p>
                {/* ✅ NEW: Show referral code in modal header */}
                {selectedSubmission.referralCode && (
                  <div className="mt-2 inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                    <Gift size={16} />
                    Referral Code: {selectedSubmission.referralCode}
                  </div>
                )}
                {selectedSubmission.isUniversityEvent && selectedSubmission.universityName && (
                  <div className="mt-2 inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold ml-2">
                    <GraduationCap size={16} />
                    {selectedSubmission.universityName}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {selectedSubmission.imageUrl && (
                <div className="relative">
                  <img 
                    src={selectedSubmission.imageUrl} 
                    alt={selectedSubmission.eventTitle}
                    className="w-full max-h-96 object-cover rounded-xl"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
              
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{selectedSubmission.eventDescription}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Category</h4>
                    <p className="text-gray-900">{selectedSubmission.eventCategory}</p>
                  </div>

                  {selectedSubmission.listingType === 'event' ? (
                    <>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Event Type</h4>
                        <p className="text-gray-900">{selectedSubmission.eventType || 'Regular'}</p>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Date & Time</h4>
                        <div className="flex items-center gap-2 text-gray-900">
                          <Calendar size={16} />
                          {selectedSubmission.startDate}
                        </div>
                        <div className="flex items-center gap-2 text-gray-900 mt-1">
                          <Clock size={16} />
                          {selectedSubmission.startTime}
                        </div>
                        {selectedSubmission.endDate && (
                          <div className="text-sm text-gray-600 mt-1">
                            Ends: {selectedSubmission.endDate}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Operating Hours</h4>
                      {selectedSubmission.alwaysOpen ? (
                        <p className="text-green-600 font-semibold">Open 24/7</p>
                      ) : (
                        <p className="text-gray-900 whitespace-pre-line">{selectedSubmission.operatingHours}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Location</h4>
                    <div className="flex items-start gap-2 text-gray-900">
                      <MapPin size={16} className="flex-shrink-0 mt-1" />
                      <div>
                        <p>{selectedSubmission.venueName}</p>
                        <p className="text-sm text-gray-600">{selectedSubmission.address}</p>
                        <p className="text-sm text-gray-600">{selectedSubmission.city}</p>
                      </div>
                    </div>
                    {selectedSubmission.mapsLink && (
                      <a 
                        href={selectedSubmission.mapsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-cyan-600 hover:text-cyan-700 text-sm mt-2"
                      >
                        <ExternalLink size={14} />
                        View on Maps
                      </a>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Organizer</h4>
                    <p className="text-gray-900 font-medium">{selectedSubmission.organizerName}</p>
                    {selectedSubmission.organizationName && (
                      <p className="text-gray-600 text-sm">{selectedSubmission.organizationName}</p>
                    )}
                    <div className="flex items-center gap-2 text-gray-600 text-sm mt-2">
                      <Mail size={14} />
                      <a href={`mailto:${selectedSubmission.organizerEmail}`} className="hover:text-cyan-600">
                        {selectedSubmission.organizerEmail}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 text-sm mt-1">
                      <Phone size={14} />
                      <a href={`tel:${selectedSubmission.organizerPhone}`} className="hover:text-cyan-600">
                        {selectedSubmission.organizerPhone}
                      </a>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Pricing</h4>
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} />
                      {selectedSubmission.isFree ? (
                        <span className="text-green-600 font-semibold">FREE</span>
                      ) : (
                        <span className="text-gray-900">₦{selectedSubmission.ticketPrice?.toLocaleString() || 'N/A'}</span>
                      )}
                    </div>
                  </div>

                  {/* ✅ NEW: Show referral code in details */}
                  {selectedSubmission.referralCode && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Referral Code</h4>
                      <div className="flex items-center gap-2 text-purple-600 font-semibold bg-purple-50 px-3 py-2 rounded-lg">
                        <Gift size={16} />
                        {selectedSubmission.referralCode}
                        <span className="text-xs text-purple-600 ml-auto">₦100 on approval</span>
                      </div>
                    </div>
                  )}

                  {selectedSubmission.isUniversityEvent && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">University Event</h4>
                      <div className="flex items-center gap-2 text-blue-600 font-semibold">
                        <GraduationCap size={16} />
                        {selectedSubmission.universityName}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {selectedSubmission.additionalInfo && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Additional Information</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedSubmission.additionalInfo}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Status</h4>
                    {getStatusBadge(selectedSubmission.status)}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Submitted</h4>
                    <p className="text-gray-900 text-sm">{formatDate(selectedSubmission.submittedAt)}</p>
                  </div>
                  {selectedSubmission.reviewedAt && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Reviewed</h4>
                      <p className="text-gray-900 text-sm">{formatDate(selectedSubmission.reviewedAt)}</p>
                    </div>
                  )}
                  {selectedSubmission.rejectionReason && (
                    <div className="col-span-2">
                      <h4 className="text-sm font-semibold text-red-700 mb-1">Rejection Reason</h4>
                      <p className="text-red-600 text-sm">{selectedSubmission.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-3 justify-end flex-wrap">
              {selectedSubmission.status !== 'approved' && (
                <button
                  onClick={() => handleApprove(selectedSubmission.id)}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  <Check size={20} />
                  Approve {selectedSubmission.referralCode && '(+₦100 credit)'}
                </button>
              )}
              {selectedSubmission.status !== 'rejected' && (
                <button
                  onClick={() => handleReject(selectedSubmission.id)}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                >
                  <X size={20} />
                  Reject
                </button>
              )}
              <button
                onClick={() => handleDelete(selectedSubmission.id)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
              >
                <X size={20} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}