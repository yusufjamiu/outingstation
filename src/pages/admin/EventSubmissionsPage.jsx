// src/pages/admin/EventSubmissionsPage.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, query, where, increment, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { AdminSidebar } from '../../components/AdminSidebar';
import ManageLinkModal from '../../components/ManageLinkModal';
import {
  Eye, Check, X, Calendar, MapPin, DollarSign,
  Mail, Phone, ExternalLink, Clock, Filter,
  GraduationCap, Menu, RefreshCw, AlertTriangle,
  Gift, ChevronLeft, ChevronRight, Image, Ticket, Settings, Layers, Bell, UserPlus
} from 'lucide-react';

const generateSlug = (title) => {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 80);
};

// ✅ Generate unique manage key for organizer access
const generateManageKey = () =>
  Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

export default function EventSubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  // ✅ Manage link modal — shown after ticketing approval
  const [showManageModal, setShowManageModal] = useState(false);
  const [approvedEventForManage, setApprovedEventForManage] = useState(null);

  // ✅ Ticketing setup modal state
  const [showTicketingModal, setShowTicketingModal] = useState(false);
  const [ticketingSubmission, setTicketingSubmission] = useState(null);
  const [ticketSetup, setTicketSetup] = useState({
    price: '',
    available: 100,
    serviceFeeType: 'fixed',
    serviceFeeAmount: 100,
    useTiers: false,
    tiers: [],
  });

  // ✅ NEW — push notification toggle + audience targeting on approval
  const [sendPush, setSendPush] = useState(true);
  const [pushAudience, setPushAudience] = useState('all');
  const [pushCity, setPushCity] = useState('');
  const [pushRole, setPushRole] = useState('');
  const [pushUniversity, setPushUniversity] = useState('');
  const [cities, setCities] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [universityFollowerCounts, setUniversityFollowerCounts] = useState({});
  const [userCount, setUserCount] = useState(0);

  useEffect(() => { fetchSubmissions(); loadAudienceOptions(); }, []);

  const loadAudienceOptions = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      setUserCount(usersSnapshot.size);

      const citySet = new Set();
      const uniFollowCounts = {};
      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.city) citySet.add(data.city);
        (data.followedUniversities || []).forEach(uni => {
          uniFollowCounts[uni] = (uniFollowCounts[uni] || 0) + 1;
        });
      });
      setCities(Array.from(citySet).sort());
      setUniversityFollowerCounts(uniFollowCounts);

      const uniSnapshot = await getDocs(collection(db, 'universities'));
      const uniNames = uniSnapshot.docs.map(d => d.data().name).filter(Boolean).sort();
      setUniversities(uniNames);
    } catch (err) {
      console.error('Error loading audience options:', err);
    }
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await getDocs(collection(db, 'event_submissions'));
      const data = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
      setSubmissions(data);
    } catch (err) {
      setError(err.code === 'permission-denied'
        ? 'Permission denied. Make sure you are logged in as admin.'
        : `Failed to load submissions: ${err.message}`);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSubmissions();
    setTimeout(() => setRefreshing(false), 500);
  };

  const awardReferralCredit = async (referralCode) => {
    if (!referralCode) return null;
    try {
      const q = query(collection(db, 'users'), where('referralCode', '==', referralCode.toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const userDoc = snap.docs[0];
      const userName = userDoc.data().name || 'User';
      const newCredit = {
        id: `credit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: 100, originalAmount: 100,
        reason: 'Listing reward',
        earnedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active', usedAmount: 0
      };
      await updateDoc(doc(db, 'users', userDoc.id), {
        creditsHistory: [...(userDoc.data().creditsHistory || []), newCredit],
        totalCredits: increment(100),
        eventsListed: increment(1),
        updatedAt: new Date()
      });
      return userName;
    } catch (err) {
      console.error('Error awarding credit:', err);
      return null;
    }
  };

  const getPushTargetUserIds = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));

      if (pushAudience === 'all') {
        return usersSnapshot.docs.map(d => d.id);
      }
      if (pushAudience === 'city' && pushCity) {
        const targetCity = pushCity.toLowerCase();
        return usersSnapshot.docs
          .filter(d => (d.data().city || '').toLowerCase().includes(targetCity))
          .map(d => d.id);
      }
      if (pushAudience === 'role' && pushRole) {
        return usersSnapshot.docs.filter(d => d.data().role === pushRole).map(d => d.id);
      }
      if (pushAudience === 'university' && pushUniversity) {
        return usersSnapshot.docs
          .filter(d => (d.data().followedUniversities || []).includes(pushUniversity))
          .map(d => d.id);
      }
      return [];
    } catch (err) {
      console.error('Error resolving push target users:', err);
      return [];
    }
  };

  // ✅ FIXED — private events were never checked before broadcasting.
  // notifyUsers() only respected the `sendPush` toggle, which defaults
  // to ON and has nothing to do with an event's visibility — approving
  // someone's private wedding with the toggle left at its default would
  // have pushed "New on OutingStation 🎉 <event title>" out to the
  // entire selected audience, completely defeating the point of making
  // it private. This is now a hard gate: isPrivate is checked FIRST and
  // unconditionally, before sendPush is even looked at, so there's no
  // toggle state that can accidentally broadcast a private event.
  const notifyUsers = async (eventTitle, eventId, isPrivate = false) => {
    if (isPrivate) {
      console.log('🔒 Skipping push notification — event is private');
      return;
    }
    if (!sendPush) return;
    try {
      const userIds = await getPushTargetUserIds();
      if (!userIds.length) {
        console.warn('No target users found for push notification — skipping');
        return;
      }
      const promises = userIds.map(userId =>
        addDoc(collection(db, 'notifications'), {
          userId,
          title: 'New on OutingStation 🎉',
          message: eventTitle,
          type: 'new_event',
          eventId: eventId || null,
          read: false,
          createdAt: serverTimestamp(),
        })
      );
      await Promise.all(promises);
    } catch (err) {
      console.error('Failed to send push notification:', err);
    }
  };

  const isFreeRegistrationSubmission = (sub) => sub.ticketingOption === 'free_registration';
  // ✅ NEW — private event helper, mirrors the free-registration helper
  const isPrivateSubmission = (sub) => sub.visibility === 'private';

  // ✅ NEW — calls the invite-guest endpoint for a just-approved invite-only
  // private event's original invite list. Called from every approval path
  // that can create an event (handleApprove's two branches,
  // handleApproveWithTicketing, handleApproveWithoutTicketing) — a private
  // event can be free, free-registration, or paid, so invites need to fire
  // regardless of which approval branch actually ran. Returns a short
  // human-readable summary string for the approval success alert, or ''
  // if there was nothing to invite.
  const issueInvitesIfNeeded = async (submission, eventId) => {
    if (submission.visibility !== 'private') return '';
    if (submission.privacyMode !== 'invite_only') return '';
    if (!Array.isArray(submission.inviteEmails) || submission.inviteEmails.length === 0) return '';

    try {
      const res = await fetch('/api/invite-guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, emails: submission.inviteEmails }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Invite issuance failed:', data);
        return '\n⚠️ Could not send invites automatically — add them manually from Manage Event.';
      }
      return `\n💌 ${data.issuedCount} invite ticket(s) sent${data.skippedCount ? ` (${data.skippedCount} skipped)` : ''}`;
    } catch (err) {
      console.error('Invite issuance error:', err);
      return '\n⚠️ Could not send invites automatically — add them manually from Manage Event.';
    }
  };

  const buildEventDoc = (submission, ticketingOverride = null) => {
    const isPlace = submission.listingType === 'place';

    const eventDoc = {
      title: submission.eventTitle || '',
      description: submission.eventDescription || '',
      category: submission.eventCategory || '',
      eventType: submission.isUniversityEvent ? 'campus'
        : (submission.eventType === 'webinar' ? 'webinar' : 'regular'),
      subCategory: submission.subCategory || (isPlace ? 'places' : 'events'),
      campusEventCategory: submission.isUniversityEvent && !isPlace
        ? (submission.campusEventCategory || '') : '',
      campusSubCategory: submission.isUniversityEvent && isPlace
        ? (submission.campusSubCategory || '') : '',
      imageUrl: submission.imageUrl || '',
      images: submission.images || [],
      location: submission.city || '',
      address: `${submission.venueName || ''}, ${submission.address || ''}`.replace(/^,\s*/, ''),
      mapLocation: submission.mapsLink || null,
      city: submission.city || '',
      venueName: submission.venueName || '',
      isFree: submission.isFree === true || submission.isFree === 'yes',
      price: submission.ticketPrice ? parseFloat(submission.ticketPrice) : 0,
      organizerName: submission.organizerName || '',
      organizerEmail: submission.organizerEmail || '',
      organizerPhone: submission.organizerPhone || '',
      organizationName: submission.organizationName || null,
      university: submission.universityName || null,
      isUniversityEvent: submission.isUniversityEvent || false,
      platform: submission.platform || null,
      platformLink: submission.webinarLink || null,
      operatingHours: submission.operatingHours || null,
      alwaysOpen: submission.alwaysOpen || false,
      additionalInfo: submission.additionalInfo || null,
      status: 'published',
      isFeatured: false,
      isTrending: false,
      savedCount: 0,
      slug: generateSlug(submission.eventTitle || ''),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // ✅ FIXED — was reading submission.ownerId, but SubmitEventPage.jsx
      // writes this field as submission.userId (ownerId is only ever set
      // on vendor_submissions, never on event/place submissions). That
      // mismatch meant createdBy silently fell back to the placeholder
      // string 'admin_approved' for every single event/place approval,
      // regardless of who submitted it or whether they were logged in —
      // so "My Roles" could never find any newly-approved event by uid,
      // no matter how correct the submission-side fix was. Falls back to
      // the placeholder only for submissions made before userId existed
      // at all, or by a genuinely logged-out submitter.
      createdBy: submission.userId || 'admin_approved',
      submissionId: submission.id,
      // ✅ NEW — visibility & private access. Every non-event listing type
      // and every event that never went through the private picker on
      // SubmitEventPage.jsx has submission.visibility === 'public' (its
      // default), so this is a no-op for the existing public flow —
      // browse/search/AI just need to filter events where visibility !==
      // 'public' (that piece lives in the discovery files, not here).
      visibility: submission.visibility || 'public',
      privacyMode: submission.privacyMode || null,
      accessCode: submission.accessCode || null,
      // Kept for admin reference (who was originally invited) — the
      // tickets collection is the actual source of truth for who has
      // access, not this array; it's never re-read to grant access.
      inviteEmails: submission.inviteEmails || [],
      ticketingEnabled: false,
      ticketingOption: 'none',
      hasOutingStationTicketing: false,
      ticketPrice: 0,
      ticketsAvailable: 0,
      ticketsSold: 0,
      externalTicketLink: submission.externalTicketLink || null,
      ticketTiers: submission.ticketTiers || [],
      hasTicketTiers: submission.hasTicketTiers || false,
      maxGroupSize: null,
      customQuestions: [],
    };

    // ✅ FIXED — this block used to sit AFTER the free-registration
    // early-return below, meaning it never ran at all for any
    // free-registration event: the function returned before reaching
    // it, so the published event doc got no date, startDate, endDate,
    // time, or eventDuration whatsoever. This bug predates private
    // events entirely (it affected any PUBLIC organizer who explicitly
    // checked "Free Registration" too) — it just went from rare to
    // extremely common once private events made isFreeRegistration true
    // for almost every private free event (unlisted + code-gated), which
    // is why it suddenly showed up everywhere at once. Moved to run
    // unconditionally, before any ticketing-path branching or early
    // return, so every approval path gets date/time set correctly.
    if (!isPlace) {
      if (submission.startDate) {
        try { eventDoc.date = Timestamp.fromDate(new Date(submission.startDate)); } catch {}
        try { eventDoc.startDate = Timestamp.fromDate(new Date(submission.startDate)); } catch {}
      }
      if (submission.endDate) {
        try { eventDoc.endDate = Timestamp.fromDate(new Date(submission.endDate)); } catch {}
      }
      eventDoc.time = submission.startTime || '';
      eventDoc.eventDuration = submission.endDate && submission.endDate !== submission.startDate ? 'multi' : 'single';
    }

    if (isFreeRegistrationSubmission(submission)) {
      eventDoc.ticketingEnabled = true;
      eventDoc.ticketingOption = 'free_registration';
      eventDoc.hasOutingStationTicketing = true;
      eventDoc.ticketPrice = 0;
      eventDoc.ticketsAvailable = submission.ticketsAvailable || 100;
      eventDoc.maxGroupSize = submission.maxGroupSize || 1;
      eventDoc.customQuestions = submission.customQuestions || [];
      eventDoc.manageKey = generateManageKey();
      return eventDoc;
    }

    if (ticketingOverride) {
      eventDoc.ticketingEnabled = true;
      eventDoc.ticketingOption = 'outingstation';
      eventDoc.hasOutingStationTicketing = true;
      eventDoc.serviceFeeType = ticketingOverride.serviceFeeType || 'fixed';
      eventDoc.serviceFeeAmount = parseFloat(ticketingOverride.serviceFeeAmount) || 100;

      eventDoc.manageKey = generateManageKey();

      if (ticketingOverride.useTiers && ticketingOverride.tiers?.length > 0) {
        eventDoc.hasTicketTiers = true;
        eventDoc.ticketTiers = ticketingOverride.tiers.map((t, i) => ({
          id: `tier_${i + 1}`,
          name: t.name,
          price: parseFloat(t.price) || 0,
          benefits: t.benefits || null,
          quantity: t.quantity ? parseInt(t.quantity) : null,
          sold: 0,
          saleEndDate: t.saleEndDate || null,
        }));
        eventDoc.ticketPrice = Math.min(...eventDoc.ticketTiers.map(t => t.price));
        eventDoc.ticketsAvailable = eventDoc.ticketTiers.reduce((sum, t) => sum + (t.quantity || 0), 0) || parseInt(ticketingOverride.available) || 100;
      } else {
        eventDoc.hasTicketTiers = false;
        eventDoc.ticketTiers = [];
        eventDoc.ticketPrice = parseFloat(ticketingOverride.price) || 0;
        eventDoc.ticketsAvailable = parseInt(ticketingOverride.available) || 100;
      }

      eventDoc.serviceFee = ticketingOverride.serviceFeeType === 'fixed'
        ? parseFloat(ticketingOverride.serviceFeeAmount) || 100
        : Math.round(eventDoc.ticketPrice * (parseFloat(ticketingOverride.serviceFeeAmount) / 100));
    }

    return eventDoc;
  };

  const handleApprove = async (submissionId) => {
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) return;

    const isPlace = submission.listingType === 'place';
    const wantsOSTicketing = submission.wantOutingstationTicketing === 'yes' || submission.wantOutingstationTicketing === true;
    const label = isPlace ? 'place' : 'event';

    if (isFreeRegistrationSubmission(submission)) {
      if (!confirm(`Approve and publish this free ${label} (with registration tracking) to the live app?`)) return;

      setApproving(true);
      try {
        const eventDoc = buildEventDoc(submission);
        const docRef = await addDoc(collection(db, 'events'), eventDoc);

        await updateDoc(doc(db, 'event_submissions', submissionId), {
          status: 'approved',
          approvedEventId: docRef.id,
          reviewedAt: new Date(),
        });

        await notifyUsers(eventDoc.title, docRef.id, eventDoc.visibility === 'private');

        let creditMsg = '';
        if (submission.referralCode) {
          const awardedTo = await awardReferralCredit(submission.referralCode);
          creditMsg = awardedTo
            ? `\n✅ Awarded ₦100 credit to ${awardedTo}`
            : `\n⚠️ Referral code "${submission.referralCode}" not found`;
        }

        const inviteMsg = await issueInvitesIfNeeded(submission, docRef.id);
        alert(`✅ ${label.charAt(0).toUpperCase() + label.slice(1)} is now LIVE with free registration!\n\nEvent ID: ${docRef.id}${creditMsg}${inviteMsg}`);
        fetchSubmissions();
        setSelectedSubmission(null);

        setApprovedEventForManage({ id: docRef.id, ...eventDoc });
        setShowManageModal(true);
      } catch (err) {
        console.error('Error approving free registration event:', err);
        alert('❌ Failed to approve: ' + err.message);
      } finally {
        setApproving(false);
      }
      return;
    }

    if (wantsOSTicketing) {
      const hasTiers = submission.hasTicketTiers && submission.ticketTiers?.length > 0;
      setTicketingSubmission(submission);
      setTicketSetup({
        price: submission.ticketPrice || '',
        available: 100,
        serviceFeeType: 'fixed',
        serviceFeeAmount: 100,
        useTiers: hasTiers,
        tiers: hasTiers ? submission.ticketTiers.map(t => ({
          name: t.name || '',
          price: t.price || '',
          benefits: t.benefits || '',
          quantity: t.quantity || '',
          saleEndDate: t.saleEndDate || '',
        })) : [],
      });
      setShowTicketingModal(true);
      return;
    }

    if (!confirm(`Approve and publish this ${label} immediately to the live app?`)) return;

    setApproving(true);
    try {
      const eventDoc = buildEventDoc(submission);
      const docRef = await addDoc(collection(db, 'events'), eventDoc);

      await updateDoc(doc(db, 'event_submissions', submissionId), {
        status: 'approved',
        approvedEventId: docRef.id,
        reviewedAt: new Date(),
      });

      await notifyUsers(eventDoc.title, docRef.id, eventDoc.visibility === 'private');

      let creditMsg = '';
      if (submission.referralCode) {
        const awardedTo = await awardReferralCredit(submission.referralCode);
        creditMsg = awardedTo
          ? `\n✅ Awarded ₦100 credit to ${awardedTo}`
          : `\n⚠️ Referral code "${submission.referralCode}" not found`;
      }

      const inviteMsg = await issueInvitesIfNeeded(submission, docRef.id);
      alert(`✅ ${label.charAt(0).toUpperCase() + label.slice(1)} is now LIVE!\n\nEvent ID: ${docRef.id}${creditMsg}${inviteMsg}`);
      fetchSubmissions();
      setSelectedSubmission(null);
    } catch (err) {
      console.error('Error approving:', err);
      alert('❌ Failed to approve: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleApproveWithTicketing = async () => {
    if (!ticketingSubmission) return;

    if (ticketSetup.useTiers) {
      if (!ticketSetup.tiers?.length) { alert('Add at least 1 ticket tier'); return; }
      for (const t of ticketSetup.tiers) {
        if (!t.name?.trim()) { alert('All tiers need a name'); return; }
        if (!t.price || parseFloat(t.price) < 0) { alert('All tiers need a valid price'); return; }
      }
    } else {
      if (!ticketSetup.price || parseFloat(ticketSetup.price) <= 0) {
        alert('Please enter a valid ticket price');
        return;
      }
    }

    setApproving(true);
    try {
      const eventDoc = buildEventDoc(ticketingSubmission, ticketSetup);
      const docRef = await addDoc(collection(db, 'events'), eventDoc);

      await updateDoc(doc(db, 'event_submissions', ticketingSubmission.id), {
        status: 'approved',
        approvedEventId: docRef.id,
        reviewedAt: new Date(),
      });

      await notifyUsers(eventDoc.title, docRef.id, eventDoc.visibility === 'private');

      if (ticketingSubmission.referralCode) {
        await awardReferralCredit(ticketingSubmission.referralCode);
      }

      const inviteMsg = await issueInvitesIfNeeded(ticketingSubmission, docRef.id);

      setShowTicketingModal(false);
      setTicketingSubmission(null);
      fetchSubmissions();
      setSelectedSubmission(null);
      if (inviteMsg) alert(`✅ Published!${inviteMsg}`);

      setApprovedEventForManage({ id: docRef.id, ...eventDoc });
      setShowManageModal(true);

    } catch (err) {
      console.error('Error approving with ticketing:', err);
      alert('❌ Failed to approve: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleApproveWithoutTicketing = async () => {
    if (!ticketingSubmission) return;
    if (!confirm('Publish without ticketing for now? You can enable ticketing later by editing the event.')) return;

    setApproving(true);
    try {
      const eventDoc = buildEventDoc(ticketingSubmission, null);
      const docRef = await addDoc(collection(db, 'events'), eventDoc);

      await updateDoc(doc(db, 'event_submissions', ticketingSubmission.id), {
        status: 'approved',
        approvedEventId: docRef.id,
        reviewedAt: new Date(),
        ticketingNote: 'Approved without ticketing — organizer requested OS ticketing',
      });

      await notifyUsers(eventDoc.title, docRef.id, eventDoc.visibility === 'private');

      const inviteMsg = await issueInvitesIfNeeded(ticketingSubmission, docRef.id);
      alert(`✅ Event published (no ticketing yet)\n\nRemember to:\n• Contact ${ticketingSubmission.organizerEmail}\n• Set up ticketing in the Events editor\n\nEvent ID: ${docRef.id}${inviteMsg}`);

      setShowTicketingModal(false);
      setTicketingSubmission(null);
      fetchSubmissions();
      setSelectedSubmission(null);
    } catch (err) {
      alert('❌ Failed: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (submissionId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      await updateDoc(doc(db, 'event_submissions', submissionId), {
        status: 'rejected', rejectionReason: reason, reviewedAt: new Date()
      });
      fetchSubmissions();
      setSelectedSubmission(null);
    } catch (err) {
      alert('Failed to reject: ' + err.message);
    }
  };

  const handleDelete = async (submissionId) => {
    if (!confirm('Permanently delete this submission?')) return;
    try {
      await deleteDoc(doc(db, 'event_submissions', submissionId));
      fetchSubmissions();
      setSelectedSubmission(null);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return 'Invalid date'; }
  };

  const getStatusBadge = (status) => {
    const styles = { pending: 'bg-yellow-100 text-yellow-800', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800' };
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.pending}`}>{status?.toUpperCase() || 'PENDING'}</span>;
  };

  const getAllImages = (submission) => {
    const all = [];
    if (submission.imageUrl) all.push(submission.imageUrl);
    if (submission.images?.length) submission.images.forEach(img => { if (img && !all.includes(img)) all.push(img); });
    return all;
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (statusFilter !== 'all' && (sub.status || 'pending') !== statusFilter) return false;
    if (typeFilter !== 'all' && sub.listingType !== typeFilter) return false;
    return true;
  });

  const wantsTicketing = (sub) => sub.wantOutingstationTicketing === 'yes' || sub.wantOutingstationTicketing === true;

  const addModalTier = () => {
    if (ticketSetup.tiers.length >= 5) return;
    setTicketSetup(prev => ({
      ...prev,
      tiers: [...prev.tiers, { name: '', price: '', benefits: '', quantity: '', saleEndDate: '' }]
    }));
  };

  const removeModalTier = (index) => {
    setTicketSetup(prev => ({ ...prev, tiers: prev.tiers.filter((_, i) => i !== index) }));
  };

  const updateModalTier = (index, field, value) => {
    setTicketSetup(prev => ({
      ...prev,
      tiers: prev.tiers.map((t, i) => i === index ? { ...t, [field]: value } : t)
    }));
  };

  const renderPushSettings = () => (
    <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-cyan-600" />
          <span className="text-sm font-bold text-gray-800">Send push notification to users</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={sendPush}
            onChange={(e) => setSendPush(e.target.checked)}
            className="sr-only peer" />
          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
        </label>
      </div>

      {sendPush && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <label className="block text-xs font-semibold text-gray-600 mb-2">Audience</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            {[
              { value: 'all', label: `All (${userCount})` },
              { value: 'university', label: 'University' },
              { value: 'city', label: 'City' },
              { value: 'role', label: 'Role' },
            ].map(opt => (
              <button key={opt.value} type="button"
                onClick={() => setPushAudience(opt.value)}
                className={`py-2 text-xs rounded-lg border-2 font-medium transition ${
                  pushAudience === opt.value
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>

          {pushAudience === 'university' && (
            <select value={pushUniversity} onChange={(e) => setPushUniversity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Choose a university...</option>
              {universities.map(uni => (
                <option key={uni} value={uni}>{uni} ({universityFollowerCounts[uni] || 0} followers)</option>
              ))}
            </select>
          )}

          {pushAudience === 'city' && (
            <select value={pushCity} onChange={(e) => setPushCity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Choose a city...</option>
              {cities.map(city => <option key={city} value={city}>{city}</option>)}
            </select>
          )}

          {pushAudience === 'role' && (
            <select value={pushRole} onChange={(e) => setPushRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">Choose a role...</option>
              <option value="user">Users</option>
              <option value="organizer">Organizers</option>
              <option value="admin">Admins</option>
            </select>
          )}
        </div>
      )}
    </div>
  );

  if (error) return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 overflow-auto">
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button onClick={handleRefresh} className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-medium">Try Again</button>
          </div>
        </div>
      </main>
    </div>
  );

  if (loading) return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading submissions...</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"><Menu size={24} /></button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Event Submissions</h1>
                <p className="text-sm text-gray-600 hidden sm:block">Review and approve/reject submissions from organizers</p>
              </div>
            </div>
            <button onClick={handleRefresh} disabled={refreshing || loading}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-cyan-600 hover:bg-cyan-50 rounded-lg font-medium transition disabled:opacity-50">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6">

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total', value: submissions.length, style: 'bg-white border-gray-200 text-gray-900' },
              { label: 'Pending', value: submissions.filter(s => !s.status || s.status === 'pending').length, style: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
              { label: 'Approved', value: submissions.filter(s => s.status === 'approved').length, style: 'bg-green-50 border-green-200 text-green-800' },
              { label: 'Needs Ticketing Setup', value: submissions.filter(s => (!s.status || s.status === 'pending') && wantsTicketing(s)).length, style: 'bg-blue-50 border-blue-200 text-blue-800' },
            ].map((stat, i) => (
              <div key={i} className={`rounded-xl p-4 sm:p-6 shadow-sm border ${stat.style}`}>
                <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
                <div className="text-xs sm:text-sm opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <Filter size={20} className="text-gray-600 hidden sm:block" />
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div>
                <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mr-2">Type:</label>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="all">All</option>
                  <option value="event">Events</option>
                  <option value="place">Places</option>
                </select>
              </div>
            </div>
            <span className="text-sm text-gray-600">{filteredSubmissions.length} results</span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Submission', 'Organizer', 'Type', 'Ticketing', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubmissions.length === 0 ? (
                    <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500">No submissions found</td></tr>
                  ) : filteredSubmissions.map((sub) => {
                    const allImages = getAllImages(sub);
                    const hasTiers = sub.hasTicketTiers && sub.ticketTiers?.length > 0;
                    const isFreeReg = isFreeRegistrationSubmission(sub);
                    const isPrivate = isPrivateSubmission(sub); // ✅ NEW
                    return (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-start gap-3">
                            {allImages[0] && (
                              <div className="relative flex-shrink-0">
                                <img src={allImages[0]} alt={sub.eventTitle}
                                  className="w-16 h-16 object-cover rounded-lg"
                                  onError={(e) => e.target.style.display = 'none'} />
                                {allImages.length > 1 && (
                                  <div className="absolute -bottom-1 -right-1 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                    <Image size={9} />{allImages.length}
                                  </div>
                                )}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                                {sub.eventTitle}
                                {/* ✅ NEW — private submission badge */}
                                {isPrivate && (
                                  <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-bold">
                                    🔒 {sub.privacyMode === 'invite_only' ? 'Invite-only' : sub.privacyMode === 'code_gated' ? 'Code-gated' : 'Unlisted'}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">{isPrivate ? 'Private Event' : sub.eventCategory}</div>
                              <div className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin size={14} />{sub.city}</div>
                              {sub.referralCode && (
                                <div className="text-xs text-purple-600 font-semibold mt-1 flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded">
                                  <Gift size={12} />{sub.referralCode}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{sub.organizerName}</div>
                            <div className="text-gray-600 text-xs">{sub.organizationName || 'Individual'}</div>
                            <div className="text-gray-500 flex items-center gap-1 mt-1 text-xs"><Mail size={11} /><span className="truncate max-w-[180px]">{sub.organizerEmail}</span></div>
                            <div className="text-gray-500 flex items-center gap-1 text-xs"><Phone size={11} />{sub.organizerPhone}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${sub.listingType === 'event' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            {sub.listingType === 'event' ? '🎉 Event' : '🏛️ Place'}
                          </span>
                          {sub.isUniversityEvent && <div className="text-xs text-blue-600 font-semibold mt-1">🎓 Campus</div>}
                        </td>
                        <td className="px-6 py-4">
                          {isFreeReg ? (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded-full font-semibold">
                                <UserPlus size={11} />Free Registration
                              </span>
                              <span className="text-xs text-gray-500">{sub.ticketsAvailable || 0} spots · max {sub.maxGroupSize || 1}/reg</span>
                            </div>
                          ) : wantsTicketing(sub) ? (
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-semibold">
                                <Ticket size={11} />Wants OS Ticketing
                              </span>
                              {hasTiers ? (
                                <span className="inline-flex items-center gap-1 text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded-full font-semibold">
                                  <Layers size={11} />{sub.ticketTiers.length} Tiers
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">₦{parseFloat(sub.ticketPrice || 0).toLocaleString()}</span>
                              )}
                            </div>
                          ) : sub.externalTicketLink ? (
                            <span className="text-xs text-gray-500">External link</span>
                          ) : sub.isFree === true || sub.isFree === 'yes' ? (
                            <span className="text-xs text-green-600 font-medium">Free</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(sub.status)}
                          <div className="text-xs text-gray-500 mt-1">{formatDate(sub.submittedAt)}</div>
                          {sub.approvedEventId && <div className="text-xs text-green-600 mt-1 font-medium">✓ Live</div>}
                        </td>
                        <td className="px-6 py-4">
                          <button onClick={() => { setSelectedSubmission(sub); setImageIndex(0); }}
                            className="flex items-center gap-1 text-cyan-600 hover:text-cyan-700 font-medium text-sm">
                            <Eye size={16} />View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {selectedSubmission && (() => {
        const allImages = getAllImages(selectedSubmission);
        const needsTicketing = wantsTicketing(selectedSubmission);
        const isFreeReg = isFreeRegistrationSubmission(selectedSubmission);
        const isPrivate = isPrivateSubmission(selectedSubmission); // ✅ NEW
        const hasTiers = selectedSubmission.hasTicketTiers && selectedSubmission.ticketTiers?.length > 0;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between z-10">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedSubmission.eventTitle}</h2>
                    {getStatusBadge(selectedSubmission.status)}
                    {isPrivate && (
                      <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold">
                        🔒 Private · {selectedSubmission.privacyMode === 'invite_only' ? 'Invite-only' : selectedSubmission.privacyMode === 'code_gated' ? 'Code-gated' : 'Unlisted'}
                      </span>
                    )}
                    {isFreeReg && (
                      <span className="inline-flex items-center gap-1 bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-sm font-semibold">
                        <UserPlus size={14} />Free Registration
                      </span>
                    )}
                    {needsTicketing && !isFreeReg && (
                      <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">
                        <Ticket size={14} />Needs Ticketing Setup
                      </span>
                    )}
                    {hasTiers && (
                      <span className="inline-flex items-center gap-1 bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-sm font-semibold">
                        <Layers size={14} />{selectedSubmission.ticketTiers.length} Ticket Tiers
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600">{selectedSubmission.eventCategory}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {selectedSubmission.referralCode && (
                      <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                        <Gift size={14} />Referral: {selectedSubmission.referralCode}
                      </span>
                    )}
                    {selectedSubmission.approvedEventId && (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                        ✓ Live — ID: {selectedSubmission.approvedEventId}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedSubmission(null)} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"><X size={24} /></button>
              </div>

              <div className="p-6 space-y-6">

                {/* ✅ NEW — Private event access panel */}
                {isPrivate && (
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">🔒</span>
                      <div className="flex-1">
                        <p className="font-bold text-purple-800 text-sm">
                          {selectedSubmission.privacyMode === 'invite_only' ? 'Invite-only event' : selectedSubmission.privacyMode === 'code_gated' ? 'Code-gated event' : 'Unlisted event'}
                        </p>
                        <p className="text-purple-700 text-sm mt-1">
                          Hidden from search, browse, and AI recommendations.
                          {selectedSubmission.privacyMode === 'invite_only' && ' Invited guests receive their ticket automatically on approval.'}
                          {selectedSubmission.privacyMode === 'unlisted' && ' Anyone with the direct link can view and register.'}
                        </p>
                        {selectedSubmission.privacyMode === 'code_gated' && selectedSubmission.accessCode && (
                          <p className="text-sm mt-2">
                            <span className="text-purple-600">Access code:</span>{' '}
                            <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-purple-200">{selectedSubmission.accessCode}</span>
                          </p>
                        )}
                        {selectedSubmission.privacyMode === 'invite_only' && selectedSubmission.inviteEmails?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-purple-600 text-xs font-semibold mb-1">{selectedSubmission.inviteEmails.length} guest(s) will be invited:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedSubmission.inviteEmails.map((email, i) => (
                                <span key={i} className="text-xs bg-white text-purple-700 px-2 py-0.5 rounded border border-purple-100">{email}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {isFreeReg && selectedSubmission.status !== 'approved' && (
                  <div className="bg-cyan-50 border-2 border-cyan-200 rounded-xl p-4 flex items-start gap-3">
                    <UserPlus size={22} className="text-cyan-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-cyan-800 text-sm">Free event with registration tracking</p>
                      <p className="text-cyan-700 text-sm mt-1">
                        {selectedSubmission.ticketsAvailable || 0} spots · max {selectedSubmission.maxGroupSize || 1} people per registration
                      </p>
                      {selectedSubmission.customQuestions?.length > 0 && (
                        <p className="text-cyan-600 text-xs mt-1">
                          {selectedSubmission.customQuestions.length} custom question{selectedSubmission.customQuestions.length !== 1 ? 's' : ''} configured
                        </p>
                      )}
                      <p className="text-cyan-600 text-xs mt-1">No payment involved — organizer already configured everything, nothing to set up here.</p>
                    </div>
                  </div>
                )}

                {needsTicketing && !isFreeReg && selectedSubmission.status !== 'approved' && (
                  <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 flex items-start gap-3">
                    <Ticket size={22} className="text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-orange-800 text-sm">This organizer wants OutingStation Ticketing</p>
                      <p className="text-orange-700 text-sm mt-1">
                        Contact them first: <strong>{selectedSubmission.organizerEmail}</strong> · {selectedSubmission.organizerPhone}
                      </p>
                      <p className="text-orange-600 text-xs mt-1">
                        {hasTiers
                          ? `Submitted ${selectedSubmission.ticketTiers.length} ticket tiers — review below`
                          : `Requested price: ₦${parseFloat(selectedSubmission.ticketPrice || 0).toLocaleString()}`
                        }
                      </p>
                    </div>
                  </div>
                )}

                {isFreeReg && selectedSubmission.customQuestions?.length > 0 && (
                  <div className="border-2 border-cyan-100 rounded-xl p-4">
                    <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                      <UserPlus size={16} className="text-cyan-600" />
                      Custom Questions ({selectedSubmission.customQuestions.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedSubmission.customQuestions.map((q, i) => (
                        <div key={i} className="py-2.5 px-3 bg-gray-50 rounded-xl border border-gray-100">
                          <p className="text-sm font-bold text-gray-800">{q.label} {q.required && <span className="text-red-500">*</span>}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {q.type === 'select' ? `Options: ${q.options.join(', ')}` : q.type === 'yes_no' ? 'Yes / No' : 'Short text'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {hasTiers && (
                  <div className="border-2 border-cyan-100 rounded-xl p-4">
                    <h3 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                      <Layers size={16} className="text-cyan-600" />
                      Ticket Tiers ({selectedSubmission.ticketTiers.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedSubmission.ticketTiers.map((tier, i) => (
                        <div key={i} className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-cyan-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                              <p className="text-sm font-bold text-gray-800">{tier.name}</p>
                              {i === 0 && <span className="text-xs bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded font-semibold">Default</span>}
                            </div>
                            {tier.benefits && <p className="text-xs text-gray-500 mt-1 ml-7">{tier.benefits}</p>}
                            {tier.saleEndDate && <p className="text-xs text-orange-500 mt-0.5 ml-7">Ends: {tier.saleEndDate}</p>}
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <p className="text-sm font-black text-cyan-600">₦{Number(tier.price).toLocaleString()}</p>
                            {tier.quantity && <p className="text-xs text-gray-400">{tier.quantity} available</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {allImages.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-700">Photos ({allImages.length})</h3>
                      <span className="text-xs text-gray-400">{imageIndex + 1} / {allImages.length}</span>
                    </div>
                    <div className="relative rounded-xl overflow-hidden bg-gray-100">
                      <img src={allImages[imageIndex]} alt={`Photo ${imageIndex + 1}`}
                        className="w-full max-h-72 object-cover"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/800x400'; }} />
                      {imageIndex === 0 && (
                        <div className="absolute top-3 left-3 bg-cyan-500 text-white text-xs px-2 py-1 rounded-lg font-semibold">Main Photo</div>
                      )}
                      {allImages.length > 1 && (
                        <>
                          <button onClick={() => setImageIndex(i => (i - 1 + allImages.length) % allImages.length)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full">
                            <ChevronLeft size={18} />
                          </button>
                          <button onClick={() => setImageIndex(i => (i + 1) % allImages.length)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full">
                            <ChevronRight size={18} />
                          </button>
                        </>
                      )}
                    </div>
                    {allImages.length > 1 && (
                      <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                        {allImages.map((img, i) => (
                          <button key={i} onClick={() => setImageIndex(i)}
                            className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition ${i === imageIndex ? 'border-cyan-400 scale-105' : 'border-gray-200 opacity-60 hover:opacity-100'}`}>
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
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
                          <h4 className="text-sm font-semibold text-gray-700 mb-1">Date & Time</h4>
                          <div className="flex items-center gap-2 text-gray-900"><Calendar size={16} />{selectedSubmission.startDate}</div>
                          <div className="flex items-center gap-2 text-gray-900 mt-1"><Clock size={16} />{selectedSubmission.startTime}</div>
                          {selectedSubmission.endDate && <div className="text-sm text-gray-600 mt-1">Ends: {selectedSubmission.endDate}</div>}
                        </div>
                        {(selectedSubmission.platform || selectedSubmission.webinarLink) && (
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-1">Virtual Details</h4>
                            {selectedSubmission.platform && <p className="text-gray-900">{selectedSubmission.platform}</p>}
                            {selectedSubmission.webinarLink && (
                              <a href={selectedSubmission.webinarLink} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-cyan-600 text-sm hover:underline">
                                <ExternalLink size={14} />Registration Link
                              </a>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Operating Hours</h4>
                        {selectedSubmission.alwaysOpen
                          ? <p className="text-green-600 font-semibold">Open 24/7</p>
                          : <p className="text-gray-900 whitespace-pre-line">{selectedSubmission.operatingHours}</p>}
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
                        <a href={selectedSubmission.mapsLink} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-cyan-600 text-sm mt-2 hover:underline">
                          <ExternalLink size={14} />View on Maps
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Organizer</h4>
                      <p className="text-gray-900 font-medium">{selectedSubmission.organizerName}</p>
                      {selectedSubmission.organizationName && <p className="text-gray-600 text-sm">{selectedSubmission.organizationName}</p>}
                      <div className="flex items-center gap-2 text-gray-600 text-sm mt-2">
                        <Mail size={14} />
                        <a href={`mailto:${selectedSubmission.organizerEmail}`} className="hover:text-cyan-600">{selectedSubmission.organizerEmail}</a>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 text-sm mt-1">
                        <Phone size={14} />
                        <a href={`tel:${selectedSubmission.organizerPhone}`} className="hover:text-cyan-600">{selectedSubmission.organizerPhone}</a>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">Pricing</h4>
                      {isFreeReg ? (
                        <div className="flex items-center gap-2">
                          <UserPlus size={16} />
                          <span className="text-cyan-600 font-semibold">FREE — Registration Required</span>
                        </div>
                      ) : hasTiers ? (
                        <div className="space-y-1">
                          {selectedSubmission.ticketTiers.map((t, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-gray-600">{t.name}</span>
                              <span className="font-semibold text-cyan-600">₦{Number(t.price).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <DollarSign size={16} />
                          {selectedSubmission.isFree === true || selectedSubmission.isFree === 'yes'
                            ? <span className="text-green-600 font-semibold">FREE</span>
                            : <span className="text-gray-900">₦{parseFloat(selectedSubmission.ticketPrice || 0).toLocaleString()}</span>}
                        </div>
                      )}
                      {needsTicketing && !isFreeReg && (
                        <p className="text-xs text-orange-600 mt-1 font-medium">🎫 Requested OutingStation ticketing</p>
                      )}
                      {selectedSubmission.externalTicketLink && (
                        <a href={selectedSubmission.externalTicketLink} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-cyan-600 text-xs mt-1 hover:underline">
                          <ExternalLink size={12} />External ticket link
                        </a>
                      )}
                    </div>
                    {selectedSubmission.referralCode && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Referral Code</h4>
                        <div className="flex items-center gap-2 text-purple-600 font-semibold bg-purple-50 px-3 py-2 rounded-lg">
                          <Gift size={16} />{selectedSubmission.referralCode}
                          <span className="text-xs ml-auto">₦100 on approval</span>
                        </div>
                      </div>
                    )}
                    {selectedSubmission.additionalInfo && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Additional Info</h4>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">{selectedSubmission.additionalInfo}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-1">Submitted</h4>
                      <p className="text-gray-900">{formatDate(selectedSubmission.submittedAt)}</p>
                    </div>
                    {selectedSubmission.approvedEventId && (
                      <div className="col-span-2">
                        <h4 className="font-semibold text-green-700 mb-1">✅ Published Event ID</h4>
                        <p className="text-green-700 font-mono text-xs bg-green-50 px-2 py-1 rounded">{selectedSubmission.approvedEventId}</p>
                      </div>
                    )}
                    {selectedSubmission.rejectionReason && (
                      <div className="col-span-2">
                        <h4 className="font-semibold text-red-700 mb-1">Rejection Reason</h4>
                        <p className="text-red-600 text-sm">{selectedSubmission.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6">
                {selectedSubmission.status !== 'approved' && renderPushSettings()}

                <div className="flex gap-3 justify-end flex-wrap">
                  {selectedSubmission.status !== 'approved' && (
                    isFreeReg ? (
                      <button onClick={() => handleApprove(selectedSubmission.id)} disabled={approving}
                        className="flex items-center gap-2 px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-semibold disabled:opacity-50 transition">
                        {approving
                          ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Publishing...</>
                          : <><UserPlus size={18} />Approve & Publish{selectedSubmission.referralCode ? ' (+₦100)' : ''}</>
                        }
                      </button>
                    ) : needsTicketing ? (
                      <button onClick={() => handleApprove(selectedSubmission.id)} disabled={approving}
                        className="flex items-center gap-2 px-5 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold disabled:opacity-50 transition">
                        {approving
                          ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Publishing...</>
                          : <><Settings size={18} />Set Up Ticketing & Publish</>
                        }
                      </button>
                    ) : (
                      <button onClick={() => handleApprove(selectedSubmission.id)} disabled={approving}
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 transition">
                        {approving
                          ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Publishing...</>
                          : <><Check size={20} />Approve & Publish{selectedSubmission.referralCode ? ' (+₦100)' : ''}</>
                        }
                      </button>
                    )
                  )}
                  {selectedSubmission.status !== 'rejected' && (
                    <button onClick={() => handleReject(selectedSubmission.id)}
                      className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">
                      <X size={20} />Reject
                    </button>
                  )}
                  <button onClick={() => handleDelete(selectedSubmission.id)}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold">
                    <X size={20} />Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {showTicketingModal && ticketingSubmission && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white">
              <div className="flex items-center gap-3 mb-1">
                <Ticket size={24} />
                <h2 className="text-xl font-bold">Set Up Ticketing</h2>
              </div>
              <p className="text-orange-100 text-sm">{ticketingSubmission.eventTitle}</p>
            </div>

            <div className="p-6 space-y-5">

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
                <p className="font-semibold text-blue-800 mb-1">✅ Confirm you've spoken to the organizer</p>
                <p className="text-blue-700">
                  <strong>{ticketingSubmission.organizerName}</strong> · {ticketingSubmission.organizerEmail}
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm flex items-start gap-3">
                <span className="text-xl">🔗</span>
                <div>
                  <p className="font-semibold text-green-800">Organizer will get a Manage Link</p>
                  <p className="text-green-700 text-xs mt-1">
                    After publishing, you'll see a shareable manage link to send to the organizer so they can check in attendees and view ticket sales — without needing admin access.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-cyan-600" />
                  <div>
                    <p className="text-sm font-bold text-gray-800">Use Multiple Ticket Tiers</p>
                    <p className="text-xs text-gray-500">Regular, VIP, Early Bird, Table of 5...</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={ticketSetup.useTiers}
                    onChange={(e) => {
                      const useTiers = e.target.checked;
                      setTicketSetup(prev => ({
                        ...prev,
                        useTiers,
                        tiers: useTiers && prev.tiers.length === 0
                          ? [{ name: 'Regular', price: prev.price || '', benefits: '', quantity: '', saleEndDate: '' }]
                          : prev.tiers,
                      }));
                    }}
                    className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
              </div>

              {ticketSetup.useTiers ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-700">Ticket Tiers</h3>
                  {ticketSetup.tiers.map((tier, index) => (
                    <div key={index} className="border-2 border-gray-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-600">Tier {index + 1}</span>
                        {ticketSetup.tiers.length > 1 && (
                          <button onClick={() => removeModalTier(index)} className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <input type="text" value={tier.name}
                            onChange={(e) => updateModalTier(index, 'name', e.target.value)}
                            placeholder="Tier name (e.g. Regular, VIP)"
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:outline-none" />
                        </div>
                        <input type="number" value={tier.price}
                          onChange={(e) => updateModalTier(index, 'price', e.target.value)}
                          placeholder="Price (₦)"
                          className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:outline-none" />
                        <input type="number" value={tier.quantity}
                          onChange={(e) => updateModalTier(index, 'quantity', e.target.value)}
                          placeholder="Qty (optional)"
                          className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:outline-none" />
                        <div className="col-span-2">
                          <input type="text" value={tier.benefits}
                            onChange={(e) => updateModalTier(index, 'benefits', e.target.value)}
                            placeholder="Benefits (optional)"
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:outline-none" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-gray-500 mb-1 block">Sale ends (optional)</label>
                          <input type="date" value={tier.saleEndDate}
                            onChange={(e) => updateModalTier(index, 'saleEndDate', e.target.value)}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-orange-400 focus:outline-none" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {ticketSetup.tiers.length < 5 && (
                    <button onClick={addModalTier}
                      className="w-full py-2.5 border-2 border-dashed border-orange-300 rounded-xl text-sm font-semibold text-orange-600 hover:bg-orange-50 transition">
                      + Add Tier ({ticketSetup.tiers.length}/5)
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Ticket Price (₦) <span className="text-red-500">*</span>
                    </label>
                    <input type="number" value={ticketSetup.price}
                      onChange={(e) => setTicketSetup(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none text-lg font-semibold"
                      placeholder="e.g. 5000" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Tickets Available</label>
                    <input type="number" value={ticketSetup.available}
                      onChange={(e) => setTicketSetup(prev => ({ ...prev, available: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none"
                      placeholder="100" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">OutingStation Service Fee</label>
                <div className="flex gap-3 mb-3">
                  {[
                    { value: 'fixed', label: 'Fixed (₦)' },
                    { value: 'percentage', label: 'Percentage (%)' },
                    { value: 'none', label: 'None' },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setTicketSetup(prev => ({ ...prev, serviceFeeType: opt.value }))}
                      className={`flex-1 py-2 text-sm rounded-lg border-2 font-medium transition ${
                        ticketSetup.serviceFeeType === opt.value
                          ? 'border-orange-400 bg-orange-50 text-orange-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {ticketSetup.serviceFeeType !== 'none' && (
                  <input type="number" value={ticketSetup.serviceFeeAmount}
                    onChange={(e) => setTicketSetup(prev => ({ ...prev, serviceFeeAmount: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none"
                    placeholder={ticketSetup.serviceFeeType === 'percentage' ? '2' : '100'} />
                )}
              </div>

              {!ticketSetup.useTiers && ticketSetup.price > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 text-sm border border-gray-200">
                  <p className="font-semibold text-gray-800 mb-3">💰 Pricing Breakdown</p>
                  {(() => {
                    const price = parseFloat(ticketSetup.price) || 0;
                    const fee = ticketSetup.serviceFeeType === 'fixed' ? parseFloat(ticketSetup.serviceFeeAmount) || 0
                      : ticketSetup.serviceFeeType === 'percentage' ? Math.round(price * (parseFloat(ticketSetup.serviceFeeAmount) || 0) / 100)
                      : 0;
                    const paystack = Math.round(((price + fee) * 0.015) + 100);
                    const total = price + fee + paystack;
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between"><span className="text-gray-600">Ticket Price</span><span className="font-medium">₦{price.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Service Fee</span><span className="font-medium">₦{fee.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Paystack</span><span className="font-medium">₦{paystack.toLocaleString()}</span></div>
                        <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-base">
                          <span>Buyer pays</span><span className="text-orange-600">₦{total.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {renderPushSettings()}
            </div>

            <div className="border-t border-gray-200 p-5 flex flex-col sm:flex-row gap-3">
              <button onClick={handleApproveWithTicketing} disabled={approving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition disabled:opacity-50">
                {approving
                  ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Publishing...</>
                  : <><Ticket size={18} />Publish & Get Manage Link</>
                }
              </button>
              <button onClick={handleApproveWithoutTicketing} disabled={approving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition disabled:opacity-50">
                <Check size={18} />Publish Without (set up later)
              </button>
              <button onClick={() => { setShowTicketingModal(false); setTicketingSubmission(null); }}
                className="px-4 py-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition font-medium text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showManageModal && approvedEventForManage?.manageKey && (
        <ManageLinkModal
          event={approvedEventForManage}
          onClose={() => {
            setShowManageModal(false);
            setApprovedEventForManage(null);
          }}
        />
      )}
    </div>
  );
}