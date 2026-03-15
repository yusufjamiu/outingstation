// src/pages/admin/EventSubmissionsPage.jsx
// Admin page to review event submissions from organizers

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
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
  Building,
  Filter
} from 'lucide-react';

export default function EventSubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, approved, rejected
  const [typeFilter, setTypeFilter] = useState('all'); // all, event, place

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'event_submissions'), orderBy('submittedAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setSubmissions(data);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      alert('Failed to load submissions');
    }
    setLoading(false);
  };

  const handleApprove = async (submissionId) => {
    if (!confirm('Approve this submission? You will need to manually add it to the events collection.')) return;

    try {
      await updateDoc(doc(db, 'event_submissions', submissionId), {
        status: 'approved',
        reviewedAt: new Date()
      });

      alert('Submission approved! Please manually add it to the events collection.');
      fetchSubmissions();
      setSelectedSubmission(null);
    } catch (error) {
      console.error('Error approving:', error);
      alert('Failed to approve submission');
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
      alert('Failed to reject submission');
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
      alert('Failed to delete submission');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Submissions</h1>
        <p className="text-gray-600">Review and manage event/place submissions from organizers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{submissions.length}</div>
          <div className="text-sm text-gray-600">Total Submissions</div>
        </div>
        <div className="bg-yellow-50 rounded-xl p-6 shadow-sm border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-800">
            {submissions.filter(s => s.status === 'pending' || !s.status).length}
          </div>
          <div className="text-sm text-yellow-700">Pending Review</div>
        </div>
        <div className="bg-green-50 rounded-xl p-6 shadow-sm border border-green-200">
          <div className="text-2xl font-bold text-green-800">
            {submissions.filter(s => s.status === 'approved').length}
          </div>
          <div className="text-sm text-green-700">Approved</div>
        </div>
        <div className="bg-red-50 rounded-xl p-6 shadow-sm border border-red-200">
          <div className="text-2xl font-bold text-red-800">
            {submissions.filter(s => s.status === 'rejected').length}
          </div>
          <div className="text-sm text-red-700">Rejected</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center gap-4">
          <Filter size={20} className="text-gray-600" />
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">Type:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">All</option>
                <option value="event">Events</option>
                <option value="place">Places</option>
              </select>
            </div>
          </div>
          <span className="ml-auto text-sm text-gray-600">
            {filteredSubmissions.length} results
          </span>
        </div>
      </div>

      {/* Submissions List */}
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
                          />
                        )}
                        <div>
                          <div className="font-semibold text-gray-900">{submission.eventTitle}</div>
                          <div className="text-sm text-gray-600">{submission.eventCategory}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin size={14} />
                            {submission.city}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{submission.organizerName}</div>
                        <div className="text-gray-600">{submission.organizationName || 'Individual'}</div>
                        <div className="text-gray-500 flex items-center gap-1 mt-1">
                          <Mail size={12} />
                          {submission.organizerEmail}
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
                      {submission.listingType === 'event' && (
                        <div className="text-xs text-gray-500 mt-1">
                          {submission.eventType}
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
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedSubmission.eventTitle}</h2>
                <p className="text-gray-600">{selectedSubmission.eventCategory}</p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Image */}
              {selectedSubmission.imageUrl && (
                <div>
                  <img 
                    src={selectedSubmission.imageUrl} 
                    alt={selectedSubmission.eventTitle}
                    className="w-full max-h-96 object-cover rounded-xl"
                  />
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-700">Status:</span>
                {getStatusBadge(selectedSubmission.status)}
              </div>

              {/* Organizer Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Users size={20} />
                  Organizer Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <div className="font-semibold">{selectedSubmission.organizerName}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Organization:</span>
                    <div className="font-semibold">{selectedSubmission.organizationName || 'Individual'}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <div className="font-semibold">
                      <a href={`mailto:${selectedSubmission.organizerEmail}`} className="text-cyan-600 hover:underline">
                        {selectedSubmission.organizerEmail}
                      </a>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <div className="font-semibold">
                      <a href={`tel:${selectedSubmission.organizerPhone}`} className="text-cyan-600 hover:underline">
                        {selectedSubmission.organizerPhone}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event/Place Details */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-700 whitespace-pre-line">{selectedSubmission.eventDescription}</p>
              </div>

              {/* Date/Time or Operating Hours */}
              {selectedSubmission.listingType === 'event' ? (
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar size={20} />
                    Event Date & Time
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Start:</span>
                      <div className="font-semibold">{selectedSubmission.startDate} at {selectedSubmission.startTime}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">End:</span>
                      <div className="font-semibold">
                        {selectedSubmission.endDate || selectedSubmission.startDate} at {selectedSubmission.endTime || selectedSubmission.startTime}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <div className="font-semibold capitalize">{selectedSubmission.eventType}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-purple-50 rounded-xl p-4">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Clock size={20} />
                    Operating Hours
                  </h3>
                  {selectedSubmission.alwaysOpen ? (
                    <div className="text-green-600 font-semibold">Open 24/7</div>
                  ) : (
                    <div className="text-gray-700 whitespace-pre-line">{selectedSubmission.operatingHours}</div>
                  )}
                </div>
              )}

              {/* Location */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin size={20} />
                  Location
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">City:</span>
                    <div className="font-semibold">{selectedSubmission.city}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Venue:</span>
                    <div className="font-semibold">{selectedSubmission.venueName}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Address:</span>
                    <div className="font-semibold">{selectedSubmission.address}</div>
                  </div>
                  {selectedSubmission.mapsLink && (
                    <div>
                      <a 
                        href={selectedSubmission.mapsLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-cyan-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink size={14} />
                        Open in Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Virtual Event Info */}
              {selectedSubmission.platform && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <h3 className="font-bold text-gray-900 mb-3">Virtual Event Details</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Platform:</span>
                      <div className="font-semibold">{selectedSubmission.platform}</div>
                    </div>
                    {selectedSubmission.webinarLink && (
                      <div>
                        <a 
                          href={selectedSubmission.webinarLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-cyan-600 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink size={14} />
                          Registration Link
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pricing/Ticketing */}
              <div className="bg-green-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign size={20} />
                  Pricing & Ticketing
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">{selectedSubmission.listingType === 'place' ? 'Entry Fee:' : 'Price:'}</span>
                    <div className="font-semibold">
                      {selectedSubmission.isFree ? 'FREE' : `₦${selectedSubmission.ticketPrice?.toLocaleString()}`}
                    </div>
                  </div>
                  {!selectedSubmission.isFree && (
                    <>
                      <div>
                        <span className="text-gray-600">Wants OutingStation {selectedSubmission.listingType === 'place' ? 'Payment' : 'Ticketing'}:</span>
                        <div className="font-semibold">
                          {selectedSubmission.wantOutingstationTicketing ? (
                            <span className="text-green-600">✅ YES - Contact them to set up</span>
                          ) : (
                            <span className="text-blue-600">❌ NO - They have their own</span>
                          )}
                        </div>
                      </div>
                      {selectedSubmission.externalTicketLink && (
                        <div>
                          <span className="text-gray-600">External Link:</span>
                          <div>
                            <a 
                              href={selectedSubmission.externalTicketLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-cyan-600 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink size={14} />
                              {selectedSubmission.externalTicketLink}
                            </a>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              {selectedSubmission.additionalInfo && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Additional Information</h3>
                  <p className="text-gray-700 whitespace-pre-line bg-gray-50 p-4 rounded-xl">
                    {selectedSubmission.additionalInfo}
                  </p>
                </div>
              )}

              {/* Submission Meta */}
              <div className="text-xs text-gray-500 border-t pt-4">
                <div>Submission ID: {selectedSubmission.id}</div>
                <div>Submitted: {formatDate(selectedSubmission.submittedAt)}</div>
                {selectedSubmission.reviewedAt && (
                  <div>Reviewed: {formatDate(selectedSubmission.reviewedAt)}</div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-3 justify-end">
              {selectedSubmission.status !== 'approved' && (
                <button
                  onClick={() => handleApprove(selectedSubmission.id)}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  <Check size={20} />
                  Approve
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