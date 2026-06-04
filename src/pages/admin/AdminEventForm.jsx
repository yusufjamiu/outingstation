import { useState, useEffect } from 'react';
import { Menu, Save, X, Upload, Plus, Trash2, Layers } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, getDocs, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { uploadWithProgress, compressImage } from '../../services/cloudinaryService';
import NotifyUsersModal from '../../components/NotifyUsersModal';
import ManageLinkModal from '../../components/ManageLinkModal';

const generateManageKey = () => {
  return Array.from({length: 32}, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
};

const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 80);
};

// ✅ Tier presets for quick selection
const TIER_PRESETS = [
  { name: 'Regular', emoji: '🎫' },
  { name: 'Early Bird', emoji: '🐦' },
  { name: 'VIP', emoji: '⭐' },
  { name: 'VVIP', emoji: '👑' },
  { name: 'Table of 5', emoji: '🪑' },
  { name: 'Student', emoji: '🎓' },
  { name: 'Couple', emoji: '💑' },
];

// ✅ Ticket Tier Builder component
function TicketTierBuilder({ tiers, onChange }) {
  const addTier = () => {
    if (tiers.length >= 5) return;
    onChange([...tiers, {
      id: `tier_${Date.now()}`,
      name: '',
      price: '',
      benefits: '',
      quantity: '',
      saleEndDate: '',
    }]);
  };

  const removeTier = (index) => {
    if (tiers.length <= 1) return;
    onChange(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index, field, value) => {
    onChange(tiers.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  return (
    <div className="space-y-3">
      {tiers.map((tier, index) => (
        <div key={tier.id || index} className="border-2 border-gray-100 rounded-xl p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-xs flex items-center justify-center font-bold">{index + 1}</span>
              <span className="text-sm font-bold text-gray-700">{tier.name || `Tier ${index + 1}`}</span>
              {index === 0 && <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-semibold">Default</span>}
            </div>
            {tiers.length > 1 && (
              <button type="button" onClick={() => removeTier(index)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {TIER_PRESETS.map(p => (
              <button key={p.name} type="button"
                onClick={() => updateTier(index, 'name', p.name)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold border transition ${
                  tier.name === p.name
                    ? 'bg-cyan-500 text-white border-cyan-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-400'
                }`}>
                {p.emoji} {p.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Tier Name *</label>
              <input type="text" value={tier.name}
                onChange={(e) => updateTier(index, 'name', e.target.value)}
                placeholder="e.g. Regular, VIP, Early Bird"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Price (₦) *</label>
              <input type="number" value={tier.price}
                onChange={(e) => updateTier(index, 'price', e.target.value)}
                placeholder="5000" min="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantity <span className="text-gray-400">(optional)</span></label>
              <input type="number" value={tier.quantity}
                onChange={(e) => updateTier(index, 'quantity', e.target.value)}
                placeholder="e.g. 100" min="1"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Benefits <span className="text-gray-400">(optional)</span></label>
              <input type="text" value={tier.benefits}
                onChange={(e) => updateTier(index, 'benefits', e.target.value)}
                placeholder="e.g. General admission + free drink"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Sale Ends <span className="text-gray-400">(optional — for Early Bird deadlines)</span></label>
              <input type="date" value={tier.saleEndDate}
                onChange={(e) => updateTier(index, 'saleEndDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-400 outline-none" />
            </div>
          </div>
        </div>
      ))}

      {tiers.length < 5 && (
        <button type="button" onClick={addTier}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-cyan-300 rounded-xl text-sm font-semibold text-cyan-600 hover:bg-cyan-50 hover:border-cyan-500 transition">
          <Plus size={16} /> Add Tier ({tiers.length}/5)
        </button>
      )}
      {tiers.length >= 5 && (
        <p className="text-center text-xs text-gray-400 py-1">Maximum 5 tiers reached</p>
      )}
    </div>
  );
}

export default function AdminEventForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingEvent, setFetchingEvent] = useState(isEdit);
  const [universities, setUniversities] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [showManageLinkModal, setShowManageLinkModal] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);

  // ✅ Extra images state
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [uploadExtraProgress, setUploadExtraProgress] = useState(0);

  // ✅ Ticketing state
  const [ticketingOption, setTicketingOption] = useState('none');
  const [ticketPrice, setTicketPrice] = useState('');
  const [ticketsAvailable, setTicketsAvailable] = useState(100);
  const [externalTicketLink, setExternalTicketLink] = useState('');

  // ✅ Service fee state
  const [serviceFeeType, setServiceFeeType] = useState('fixed');
  const [serviceFeeAmount, setServiceFeeAmount] = useState(100);
  const [serviceFeePercentage, setServiceFeePercentage] = useState(2);

  // ✅ Ticket tiers state
  const [useTicketTiers, setUseTicketTiers] = useState(false);
  const [ticketTiers, setTicketTiers] = useState([{
    id: `tier_${Date.now()}`,
    name: 'Regular',
    price: '',
    benefits: '',
    quantity: '',
    saleEndDate: '',
  }]);

  const [formData, setFormData] = useState({
    title: '', description: '', category: '',
    subCategory: 'events',
    religionType: '', eventType: 'regular',
    eventDuration: 'single', date: '', time: '',
    startDate: '', endDate: '',
    dailyStartTime: '', dailyEndTime: '',
    recurringPattern: 'weekly', recurringDay: 'Monday', recurringTime: '',
    location: '', address: '', mapLocation: '',
    organizerName: '', organizerPhone: '', organizerEmail: '', organizerWebsite: '',
    university: '', platform: '', platformLink: '',
    price: '', isFree: false, capacity: '',
    imageUrl: '',
    images: [],
    status: 'published', isFeatured: false, isTrending: false
  });

  const calculateServiceFee = () => {
    const price = parseInt(ticketPrice || 0);
    if (serviceFeeType === 'fixed') return parseInt(serviceFeeAmount || 0);
    if (serviceFeeType === 'percentage') return Math.round(price * (parseFloat(serviceFeePercentage || 0) / 100));
    return 0;
  };

  const calculatePaystackFee = () => {
    const price = parseInt(ticketPrice || 0);
    const serviceFee = calculateServiceFee();
    return Math.round(((price + serviceFee) * 0.015) + 100);
  };

  const calculateTotal = () => {
    return parseInt(ticketPrice || 0) + calculateServiceFee() + calculatePaystackFee();
  };

  useEffect(() => {
    loadUniversities();
  }, []);

  const loadUniversities = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'universities'));
      setUniversities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error loading universities:', err);
      setUniversities([
        { id: 1, name: 'University of Lagos (Unilag)' },
        { id: 2, name: 'King Saud University (KSU)' },
        { id: 3, name: 'University of Ibadan (UI)' },
        { id: 4, name: 'Covenant University (CU)' },
        { id: 5, name: 'University of Ilorin (Unilorin)' }
      ]);
    }
  };

  useEffect(() => {
    if (isEdit) {
      const loadEvent = async () => {
        try {
          const docSnap = await getDoc(doc(db, 'events', id));
          if (docSnap.exists()) {
            const data = docSnap.data();
            const formattedData = { ...data };
            if (data.date instanceof Timestamp) formattedData.date = data.date.toDate().toISOString().split('T')[0];
            if (data.startDate instanceof Timestamp) formattedData.startDate = data.startDate.toDate().toISOString().split('T')[0];
            if (data.endDate instanceof Timestamp) formattedData.endDate = data.endDate.toDate().toISOString().split('T')[0];
            if (!formattedData.images) formattedData.images = [];
            setFormData(prev => ({ ...prev, ...formattedData }));
            if (data.ticketingOption) {
              setTicketingOption(data.ticketingOption);
              setTicketPrice(data.ticketPrice || '');
              setTicketsAvailable(data.ticketsAvailable || 100);
              setExternalTicketLink(data.externalTicketLink || '');
              setServiceFeeType(data.serviceFeeType || 'fixed');
              setServiceFeeAmount(data.serviceFeeAmount || 100);
              setServiceFeePercentage(data.serviceFeePercentage || 2);
            }
            // ✅ Load ticket tiers if they exist
            if (data.hasTicketTiers && data.ticketTiers?.length > 0) {
              setUseTicketTiers(true);
              setTicketTiers(data.ticketTiers.map(t => ({
                id: t.id || `tier_${Date.now()}`,
                name: t.name || '',
                price: t.price || '',
                benefits: t.benefits || '',
                quantity: t.quantity || '',
                saleEndDate: t.saleEndDate || '',
              })));
            }
          }
        } catch (err) {
          console.error('Error loading event:', err);
        }
        setFetchingEvent(false);
      };
      loadEvent();
    }
  }, [id, isEdit]);

  const allCategories = [
    'Business & Tech', 'Art & Culture', 'Food & Dining', 'Sport & Fitness',
    'Education', 'Religion & Community', 'Nightlife & Parties', 'Family & Kids Fun',
    'Networking & Social', 'Gaming & Esport', 'Music & Concerts', 'Cinema & Show'
  ];

  const platforms = ['Zoom', 'Google Meet', 'Microsoft Teams', 'Twitter Space', 'YouTube Live', 'Facebook Live', 'Other'];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // ✅ Main image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('Image must be less than 10MB'); return; }
    try {
      setUploading(true);
      setUploadProgress(0);
      const compressedFile = await compressImage(file, 1200, 0.8);
      const imageUrl = await uploadWithProgress(compressedFile, 'events', (progress) => setUploadProgress(progress));
      setFormData(prev => ({ ...prev, imageUrl }));
    } catch (error) {
      alert(error.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // ✅ Additional images upload
  const handleExtraImagesUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const currentImages = formData.images || [];
    const slotsLeft = 9 - currentImages.length;
    const filesToUpload = files.slice(0, slotsLeft);

    if (filesToUpload.length === 0) {
      alert('Maximum 9 additional photos allowed (10 total including main)');
      return;
    }

    try {
      setUploadingExtra(true);
      const uploadedUrls = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 10 * 1024 * 1024) {
          alert(`${file.name} is too large. Max 10MB per image.`);
          continue;
        }
        setUploadExtraProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
        const compressed = await compressImage(file, 1200, 0.8);
        const url = await uploadWithProgress(compressed, 'events', () => {});
        uploadedUrls.push(url);
      }

      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...uploadedUrls]
      }));
    } catch (err) {
      alert('Failed to upload some images: ' + err.message);
    } finally {
      setUploadingExtra(false);
      setUploadExtraProgress(0);
      e.target.value = '';
    }
  };

  // ✅ Remove extra image
  const removeExtraImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const stringToTimestamp = (dateString) => {
    if (!dateString) return null;
    try { return Timestamp.fromDate(new Date(dateString)); }
    catch { return null; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category) { alert('Please select a category'); return; }
    if (!formData.imageUrl) { alert('Please upload a main image'); return; }
    if (ticketingOption === 'outingstation') {
      if (useTicketTiers) {
        if (ticketTiers.length === 0) { alert('Please add at least 1 ticket tier'); return; }
        for (const tier of ticketTiers) {
          if (!tier.name?.trim()) { alert('All tiers need a name'); return; }
          if (!tier.price || isNaN(tier.price)) { alert('All tiers need a valid price'); return; }
        }
      } else {
        if (!ticketPrice) { alert('Please enter a ticket price'); return; }
      }
    }
    if (ticketingOption === 'external' && !externalTicketLink) { alert('Please enter an external ticket link'); return; }

    setLoading(true);
    try {
      // ✅ Build tiers data
      const tiersData = useTicketTiers && ticketingOption === 'outingstation'
        ? ticketTiers.map((t, i) => ({
            id: `tier_${i + 1}`,
            name: t.name.trim(),
            price: parseFloat(t.price) || 0,
            benefits: t.benefits?.trim() || null,
            quantity: t.quantity ? parseInt(t.quantity) : null,
            sold: isEdit
              ? (formData.ticketTiers?.find(et => et.name === t.name)?.sold ?? 0)
              : 0,
            saleEndDate: t.saleEndDate || null,
          }))
        : [];

      const eventData = {
        ...formData,
        subCategory: 'events',
        slug: generateSlug(formData.title),
        price: formData.isFree ? 0 : Number(formData.price) || 0,
        capacity: Number(formData.capacity) || 0,
        date: stringToTimestamp(formData.date),
        startDate: stringToTimestamp(formData.startDate),
        endDate: stringToTimestamp(formData.endDate),
        images: formData.images || [],
        ticketingOption,
        ticketingEnabled: ticketingOption === 'outingstation',
        hasOutingStationTicketing: ticketingOption === 'outingstation',
        // ✅ Single price or lowest tier price
        ticketPrice: ticketingOption === 'outingstation'
          ? (useTicketTiers && tiersData.length > 0
              ? Math.min(...tiersData.map(t => t.price))
              : Number(ticketPrice))
          : 0,
        ticketsAvailable: ticketingOption === 'outingstation'
          ? (useTicketTiers
              ? tiersData.reduce((sum, t) => sum + (t.quantity || 0), 0) || Number(ticketsAvailable)
              : Number(ticketsAvailable))
          : 0,
        ticketsSold: isEdit ? formData.ticketsSold || 0 : 0,
        ...(ticketingOption === 'outingstation' && !isEdit && { manageKey: generateManageKey() }),
        serviceFeeType,
        serviceFeeAmount: serviceFeeType === 'fixed' ? Number(serviceFeeAmount) : 0,
        serviceFeePercentage: serviceFeeType === 'percentage' ? Number(serviceFeePercentage) : 0,
        serviceFee: calculateServiceFee(),
        externalTicketLink: ticketingOption === 'external' ? externalTicketLink : null,
        // ✅ Save ticket tiers
        hasTicketTiers: useTicketTiers && ticketingOption === 'outingstation' && tiersData.length > 0,
        ticketTiers: tiersData,
        updatedAt: serverTimestamp()
      };

      if (isEdit) {
        await updateDoc(doc(db, 'events', id), eventData);
        setCreatedEvent({ id, ...eventData });
      } else {
        eventData.createdBy = auth.currentUser?.uid || 'admin';
        eventData.createdAt = serverTimestamp();
        eventData.savedCount = 0;
        const docRef = await addDoc(collection(db, 'events'), eventData);
        setCreatedEvent({ id: docRef.id, ...eventData });
      }
      setShowNotifyModal(true);
    } catch (err) {
      console.error('Error saving event:', err);
      alert('❌ Error saving: ' + err.message);
    }
    setLoading(false);
  };

  const showReligionType = formData.category === 'Religion & Community';

  if (fetchingEvent) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu size={24} />
              </button>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {isEdit ? 'Edit Event' : 'Create New Event'}
              </h2>
            </div>
            <button onClick={() => navigate('/admin/events')} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={24} />
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">

              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Title *</label>
                    <input
                      type="text" name="title" value={formData.title} onChange={handleChange} required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
                      placeholder="e.g. Tech Innovation Summit 2025"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                    <textarea
                      name="description" value={formData.description} onChange={handleChange} required rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
                      placeholder="Describe your event..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Type *</label>
                    <select
                      name="eventType" value={formData.eventType} onChange={handleChange} required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
                    >
                      <option value="regular">🎉 Regular Event</option>
                      <option value="campus">🎓 Campus Event</option>
                      <option value="webinar">📹 Webinar / Virtual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    <select
                      name="category" value={formData.category} onChange={handleChange} required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
                    >
                      <option value="">Select a category</option>
                      {allCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  {showReligionType && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Religion Type *</label>
                      <select
                        name="religionType" value={formData.religionType} onChange={handleChange} required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
                      >
                        <option value="">Select religion type</option>
                        <option value="Christianity">Christianity</option>
                        <option value="Islam">Islam</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Campus Details */}
              {formData.eventType === 'campus' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Campus Event Details</h3>
                  <select
                    name="university" value={formData.university} onChange={handleChange} required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
                  >
                    <option value="">Select university</option>
                    {universities.map(uni => (
                      <option key={uni.id} value={uni.name}>{uni.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Webinar Details */}
              {formData.eventType === 'webinar' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Webinar Details</h3>
                  <div className="space-y-4">
                    <select
                      name="platform" value={formData.platform} onChange={handleChange} required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
                    >
                      <option value="">Select platform</option>
                      {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <input
                      type="url" name="platformLink" value={formData.platformLink} onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
                      placeholder="Meeting link (optional)"
                    />
                  </div>
                </div>
              )}

              {/* ✅ Ticketing — with tiers support */}
              <div>
                <h3 className="text-lg font-bold mb-4">💳 Ticketing Options</h3>

                <div className="mb-3">
                  <label className="flex items-start gap-3 cursor-pointer p-4 border rounded-lg hover:bg-gray-50">
                    <input type="radio" name="ticketingOption" value="none" checked={ticketingOption === 'none'} onChange={(e) => setTicketingOption(e.target.value)} className="mt-1" />
                    <div>
                      <p className="font-semibold">No Ticketing</p>
                      <p className="text-sm text-gray-600">Free event or handle tickets yourself</p>
                    </div>
                  </label>
                </div>

                <div className="mb-3">
                  <label className="flex items-start gap-3 cursor-pointer p-4 border rounded-lg hover:bg-gray-50">
                    <input type="radio" name="ticketingOption" value="outingstation" checked={ticketingOption === 'outingstation'} onChange={(e) => setTicketingOption(e.target.value)} className="mt-1" />
                    <div className="flex-1">
                      <p className="font-semibold">OutingStation Ticketing ⭐</p>
                      <p className="text-sm text-gray-600 mb-2">Sell tickets directly. Automatic payment, tickets, and check-in.</p>

                      {ticketingOption === 'outingstation' && (
                        <div className="mt-4 space-y-4 border-l-2 border-cyan-500 pl-4">

                          {/* ✅ Toggle: Single price vs tiers */}
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <div className="flex items-center gap-2">
                              <Layers size={16} className="text-cyan-600" />
                              <div>
                                <p className="text-sm font-bold text-gray-800">Multiple Ticket Tiers</p>
                                <p className="text-xs text-gray-500">Regular, VIP, Early Bird, Table of 5...</p>
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" checked={useTicketTiers}
                                onChange={(e) => setUseTicketTiers(e.target.checked)}
                                className="sr-only peer" />
                              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                            </label>
                          </div>

                          {useTicketTiers ? (
                            /* ✅ Tier builder */
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-3">Configure ticket tiers (max 5):</p>
                              <TicketTierBuilder tiers={ticketTiers} onChange={setTicketTiers} />

                              {/* Tier pricing preview */}
                              {ticketTiers.some(t => t.price) && (
                                <div className="mt-4 bg-cyan-50 p-4 rounded-lg text-sm border border-cyan-200">
                                  <p className="font-medium mb-2">🎟️ Tiers Summary:</p>
                                  <div className="space-y-1">
                                    {ticketTiers.filter(t => t.name && t.price).map((t, i) => (
                                      <div key={i} className="flex justify-between">
                                        <span className="text-gray-600">{t.name}</span>
                                        <span className="font-semibold text-cyan-700">₦{Number(t.price).toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Single price */
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium mb-1">Ticket Price (₦) *</label>
                                <input type="number" value={ticketPrice} onChange={(e) => setTicketPrice(e.target.value)} placeholder="e.g., 5000" className="w-full px-3 py-2 border rounded-lg" />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Tickets Available *</label>
                                <input type="number" value={ticketsAvailable} onChange={(e) => setTicketsAvailable(e.target.value)} placeholder="e.g., 100" className="w-full px-3 py-2 border rounded-lg" />
                              </div>
                            </div>
                          )}

                          {/* Service fee — always shown for OutingStation ticketing */}
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <label className="block text-sm font-medium mb-3">Service Fee Structure</label>
                            <div className="space-y-3">
                              <div>
                                <label className="flex items-center gap-2">
                                  <input type="radio" name="serviceFeeType" value="fixed" checked={serviceFeeType === 'fixed'} onChange={(e) => setServiceFeeType(e.target.value)} />
                                  <span className="text-sm font-medium">Fixed Amount (₦)</span>
                                </label>
                                {serviceFeeType === 'fixed' && (
                                  <input type="number" value={serviceFeeAmount} onChange={(e) => setServiceFeeAmount(e.target.value)} placeholder="100" className="w-full px-3 py-2 border rounded-lg text-sm mt-2" />
                                )}
                              </div>
                              <div>
                                <label className="flex items-center gap-2">
                                  <input type="radio" name="serviceFeeType" value="percentage" checked={serviceFeeType === 'percentage'} onChange={(e) => setServiceFeeType(e.target.value)} />
                                  <span className="text-sm font-medium">Percentage (%)</span>
                                </label>
                                {serviceFeeType === 'percentage' && (
                                  <input type="number" value={serviceFeePercentage} onChange={(e) => setServiceFeePercentage(e.target.value)} placeholder="2" step="0.1" className="w-full px-3 py-2 border rounded-lg text-sm mt-2" />
                                )}
                              </div>
                              <div>
                                <label className="flex items-center gap-2">
                                  <input type="radio" name="serviceFeeType" value="none" checked={serviceFeeType === 'none'} onChange={(e) => setServiceFeeType(e.target.value)} />
                                  <span className="text-sm font-medium">No Service Fee</span>
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* Pricing breakdown — single price only */}
                          {!useTicketTiers && ticketPrice > 0 && (
                            <div className="bg-cyan-50 p-4 rounded-lg text-sm">
                              <p className="font-medium mb-2">💰 Pricing Breakdown:</p>
                              <div className="space-y-1 mb-3">
                                <div className="flex justify-between"><span>Ticket Price:</span><span>₦{parseInt(ticketPrice || 0).toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>Service Fee:</span><span>₦{calculateServiceFee().toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>Payment Processing:</span><span>₦{calculatePaystackFee().toLocaleString()}</span></div>
                                <div className="border-t border-cyan-200 pt-2 flex justify-between font-bold">
                                  <span>Total User Pays:</span>
                                  <span className="text-cyan-700">₦{calculateTotal().toLocaleString()}</span>
                                </div>
                              </div>
                              <div className="pt-2 border-t border-cyan-200 space-y-1 text-xs">
                                <div className="flex justify-between"><span>💼 Organizer receives:</span><span className="font-semibold text-green-700">₦{parseInt(ticketPrice || 0).toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>🏢 OutingStation earns:</span><span className="font-semibold text-blue-700">₦{calculateServiceFee().toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>💳 Paystack gets:</span><span className="font-semibold text-gray-700">₦{calculatePaystackFee().toLocaleString()}</span></div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                <div className="mb-3">
                  <label className="flex items-start gap-3 cursor-pointer p-4 border rounded-lg hover:bg-gray-50">
                    <input type="radio" name="ticketingOption" value="external" checked={ticketingOption === 'external'} onChange={(e) => setTicketingOption(e.target.value)} className="mt-1" />
                    <div className="flex-1">
                      <p className="font-semibold">External Ticketing Link</p>
                      <p className="text-sm text-gray-600">Use Eventbrite or your own ticketing platform</p>
                      {ticketingOption === 'external' && (
                        <div className="mt-4 border-l-2 border-gray-400 pl-4">
                          <label className="block text-sm font-medium mb-1">Ticket Link (URL) *</label>
                          <input
                            type="url" value={externalTicketLink} onChange={(e) => setExternalTicketLink(e.target.value)}
                            placeholder="https://eventbrite.com/your-event"
                            className="w-full px-3 py-2 border rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Schedule */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Schedule</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Duration *</label>
                    <select
                      name="eventDuration" value={formData.eventDuration} onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none"
                    >
                      <option value="single">Single Day Event</option>
                      <option value="multi">Multi-Day Event</option>
                      <option value="recurring">Recurring Event</option>
                    </select>
                  </div>

                  {formData.eventDuration === 'single' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                        <input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
                        <input type="time" name="time" value={formData.time} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" />
                      </div>
                    </div>
                  )}

                  {formData.eventDuration === 'multi' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                        <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                        <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Daily Start Time *</label>
                        <input type="time" name="dailyStartTime" value={formData.dailyStartTime} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Daily End Time *</label>
                        <input type="time" name="dailyEndTime" value={formData.dailyEndTime} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" />
                      </div>
                    </div>
                  )}

                  {formData.eventDuration === 'recurring' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Recurring Pattern *</label>
                        <select name="recurringPattern" value={formData.recurringPattern} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none">
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="weekends">Weekends Only</option>
                          <option value="weekdays">Weekdays Only</option>
                        </select>
                      </div>
                      {formData.recurringPattern === 'weekly' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week *</label>
                          <select name="recurringDay" value={formData.recurringDay} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none">
                            {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
                        <input type="time" name="recurringTime" value={formData.recurringTime} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Organizer */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Organizer Information <span className="text-sm font-normal text-gray-500">(Optional)</span>
                </h3>
                <div className="space-y-4">
                  <input type="text" name="organizerName" value={formData.organizerName} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" placeholder="Organizer name" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="tel" name="organizerPhone" value={formData.organizerPhone} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" placeholder="Phone number" />
                    <input type="email" name="organizerEmail" value={formData.organizerEmail} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" placeholder="Email address" />
                  </div>
                </div>
              </div>

              {/* Location */}
              {formData.eventType !== 'webinar' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                  <div className="space-y-4">
                    <input type="text" name="location" value={formData.location} onChange={handleChange} required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" placeholder="City (e.g. Lagos, Nigeria)" />
                    <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" placeholder="Full venue address" />
                    <input type="url" name="mapLocation" value={formData.mapLocation} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" placeholder="Google Maps link (optional)" />
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="isFree" checked={formData.isFree} onChange={handleChange} className="w-4 h-4 text-cyan-500 border-gray-300 rounded" />
                    <span className="text-sm font-medium text-gray-700">This is a free event</span>
                  </label>
                  {!formData.isFree && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Display Price (shown on event card)</label>
                      <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" placeholder="Price in ₦" />
                      <p className="text-xs text-gray-500 mt-1">Actual ticket pricing is set in Ticketing Options above</p>
                    </div>
                  )}
                  <input type="number" name="capacity" value={formData.capacity} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none" placeholder="Capacity (max attendees)" />
                </div>
              </div>

              {/* ✅ Image Upload — Main + Additional */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Event Images *</h3>
                <p className="text-sm text-gray-500 mb-4">Add up to 10 photos. Users can swipe through all photos on the event page.</p>

                {/* Main image */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Main Photo *
                    <span className="text-gray-400 text-xs ml-2">(shown on event cards and as first photo)</span>
                  </p>
                  <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-cyan-400 transition">
                    <div className="space-y-1 text-center w-full">
                      {formData.imageUrl ? (
                        <div>
                          <img src={formData.imageUrl} alt="Preview" className="mx-auto h-48 w-auto rounded-lg object-cover" />
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                            className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            Remove Main Photo
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="flex text-sm text-gray-600 justify-center">
                            <label className="cursor-pointer font-medium text-cyan-600 hover:text-cyan-500">
                              <span>Upload main photo</span>
                              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="sr-only" />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 10MB</p>
                        </>
                      )}
                      {uploading && (
                        <div className="mt-4">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-cyan-500 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                          </div>
                          <p className="text-sm text-gray-600 mt-2">
                            {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Processing...'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional photos */}
                {formData.imageUrl && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Additional Photos
                      <span className="text-gray-400 text-xs ml-2">({(formData.images || []).length}/9 added)</span>
                    </p>

                    {(formData.images || []).length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2 mb-3">
                        {(formData.images || []).map((img, index) => (
                          <div key={index} className="relative group">
                            <img src={img} alt={`Photo ${index + 1}`} className="w-full h-20 object-cover rounded-lg border border-gray-200"
                              onError={(e) => { e.target.src = 'https://via.placeholder.com/80'; }} />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition" />
                            <button type="button" onClick={() => removeExtraImage(index)}
                              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md">
                              <X size={10} />
                            </button>
                            <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded opacity-0 group-hover:opacity-100 transition">
                              #{index + 2}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(formData.images || []).length < 9 && (
                      <label className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition ${
                        uploadingExtra ? 'border-cyan-300 bg-cyan-50 opacity-70' : 'border-gray-300 hover:border-cyan-400 hover:bg-cyan-50'
                      }`}>
                        {uploadingExtra ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500" />
                            <span className="text-sm text-cyan-600 font-medium">Uploading {uploadExtraProgress}%...</span>
                          </>
                        ) : (
                          <>
                            <Plus size={18} className="text-gray-400" />
                            <span className="text-sm text-gray-600 font-medium">
                              Add More Photos ({9 - (formData.images || []).length} slots left)
                            </span>
                          </>
                        )}
                        <input type="file" accept="image/*" multiple disabled={uploadingExtra} onChange={handleExtraImagesUpload} className="sr-only" />
                      </label>
                    )}

                    {(formData.images || []).length >= 9 && (
                      <div className="text-center py-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-500">✅ Maximum 10 photos reached (1 main + 9 additional)</p>
                      </div>
                    )}

                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      Users can swipe through all photos on the event page. Hover photos to remove them.
                    </p>
                  </div>
                )}
              </div>

              {/* Visibility */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Visibility</h3>
                <div className="space-y-4">
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 outline-none">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="pending">Pending Review</option>
                  </select>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleChange} className="w-4 h-4 text-cyan-500 border-gray-300 rounded" />
                      <span className="text-sm font-medium text-gray-700">Featured</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="isTrending" checked={formData.isTrending} onChange={handleChange} className="w-4 h-4 text-cyan-500 border-gray-300 rounded" />
                      <span className="text-sm font-medium text-gray-700">Trending</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                <button type="submit" disabled={loading || uploading || uploadingExtra}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-medium disabled:opacity-50"
                >
                  <Save size={20} />
                  {loading ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
                </button>
                <button type="button" onClick={() => navigate('/admin/events')}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>

      {showNotifyModal && createdEvent && (
        <NotifyUsersModal
          event={createdEvent}
          notificationType={isEdit ? 'update' : 'new'}
          onClose={() => {
            setShowNotifyModal(false);
            if (createdEvent.manageKey) {
              setShowManageLinkModal(true);
            } else {
              navigate('/admin/events');
            }
          }}
        />
      )}

      {showManageLinkModal && createdEvent?.manageKey && (
        <ManageLinkModal
          event={createdEvent}
          onClose={() => {
            setShowManageLinkModal(false);
            navigate('/admin/events');
          }}
        />
      )}
    </div>
  );
}