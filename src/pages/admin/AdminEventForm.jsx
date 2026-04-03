import { useState, useEffect } from 'react';
import { Menu, Save, X, Upload } from 'lucide-react';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, addDoc, doc, getDoc, getDocs, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { uploadWithProgress, compressImage } from '../../services/firebaseStorageService';
import NotifyUsersModal from '../../components/NotifyUsersModal';

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
  const [formType, setFormType] = useState('event');
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [createdEvent, setCreatedEvent] = useState(null);
  
  // ✅ TICKETING STATE
  const [ticketingOption, setTicketingOption] = useState('none');
  const [ticketPrice, setTicketPrice] = useState('');
  const [ticketsAvailable, setTicketsAvailable] = useState(100);
  const [externalTicketLink, setExternalTicketLink] = useState('');
  
  // ✅ SERVICE FEE STATE
  const [serviceFeeType, setServiceFeeType] = useState('fixed');
  const [serviceFeeAmount, setServiceFeeAmount] = useState(100);
  const [serviceFeePercentage, setServiceFeePercentage] = useState(2);
  
  const [formData, setFormData] = useState({
    title: '', description: '', category: '',
    subCategory: 'events', religionType: '', eventType: 'regular', 
    eventDuration: 'single', date: '', time: '', startDate: '', endDate: '', 
    dailyStartTime: '', dailyEndTime: '', recurringPattern: 'weekly', 
    recurringDay: 'Monday', recurringTime: '', placeAvailability: 'Always Open', 
    openingTime: '', closingTime: '', location: '', address: '', mapLocation: '',
    organizerName: '', organizerPhone: '', organizerEmail: '',
    university: '', platform: '', platformLink: '', price: '',
    isFree: false, capacity: '', imageUrl: '', ticketLink: '',
    status: 'published', isFeatured: false, isTrending: false
  });

  // ✅ CALCULATION HELPERS
  const calculateServiceFee = () => {
    const price = parseInt(ticketPrice || 0);
    
    if (serviceFeeType === 'fixed') {
      return parseInt(serviceFeeAmount || 0);
    } else if (serviceFeeType === 'percentage') {
      return Math.round(price * (parseFloat(serviceFeePercentage || 0) / 100));
    } else {
      return 0;
    }
  };

  const calculatePaystackFee = () => {
    const price = parseInt(ticketPrice || 0);
    const serviceFee = calculateServiceFee();
    const subtotal = price + serviceFee;
    
    // Paystack: 1.5% + ₦100
    return Math.round((subtotal * 0.015) + 100);
  };

  const calculateTotal = () => {
    const price = parseInt(ticketPrice || 0);
    const serviceFee = calculateServiceFee();
    const paystackFee = calculatePaystackFee();
    
    return price + serviceFee + paystackFee;
  };

  const calculateOrganizerReceives = () => {
    const price = parseInt(ticketPrice || 0);
    return price; // Organizer gets full ticket price
  };

  useEffect(() => {
    loadUniversities();
  }, []);

  const loadUniversities = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'universities'));
      const uniList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUniversities(uniList);
    } catch (err) {
      console.error('Error loading universities:', err);
      setUniversities([
        { id: 1, name: 'University of Lagos (Unilag)' },
        { id: 2, name: 'King Saud University (KSU)' },
        { id: 3, name: 'University of Ibadan (UI)' },
        { id: 4, name: 'University of Ghana (Legon)' },
        { id: 5, name: 'Covenant University (CU)' },
        { id: 6, name: 'University of Ilorin (Unilorin)' }
      ]);
    }
  };

  useEffect(() => {
    if (isEdit) {
      const loadEvent = async () => {
        try {
          const docRef = doc(db, 'events', id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            const formattedData = { ...data };
            if (data.date instanceof Timestamp) {
              formattedData.date = data.date.toDate().toISOString().split('T')[0];
            }
            if (data.startDate instanceof Timestamp) {
              formattedData.startDate = data.startDate.toDate().toISOString().split('T')[0];
            }
            if (data.endDate instanceof Timestamp) {
              formattedData.endDate = data.endDate.toDate().toISOString().split('T')[0];
            }
            
            setFormData(prev => ({ ...prev, ...formattedData }));
            
            // ✅ Load ticketing data
            if (data.ticketingOption) {
              setTicketingOption(data.ticketingOption);
              setTicketPrice(data.ticketPrice || '');
              setTicketsAvailable(data.ticketsAvailable || 100);
              setExternalTicketLink(data.externalTicketLink || '');
              setServiceFeeType(data.serviceFeeType || 'fixed');
              setServiceFeeAmount(data.serviceFeeAmount || 100);
              setServiceFeePercentage(data.serviceFeePercentage || 2);
            }
            
            if (data.subCategory === 'places') {
              setFormType('place');
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

  const placeSupportedCategories = ['Family & Kids Fun', 'Food & Dining', 'Sport & Fitness', 'Art & Culture', 'Nightlife & Parties'];
  const platforms = ['Zoom', 'Google Meet', 'Microsoft Teams', 'Twitter Space', 'YouTube Live', 'Facebook Live', 'Other'];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFormTypeChange = (type) => {
    setFormType(type);
    setFormData(prev => ({
      ...prev,
      subCategory: type === 'place' ? 'places' : 'events',
      eventType: type === 'place' ? 'regular' : prev.eventType
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert('Image must be less than 10MB');
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      console.log('📦 Compressing image...');
      const compressedFile = await compressImage(file, 1200, 0.8);
      console.log(`Size reduced: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);

      console.log('☁️ Uploading to Firebase Storage...');
      const imageUrl = await uploadWithProgress(
        compressedFile,
        'events',
        (progress) => {
          setUploadProgress(progress);
          console.log(`📤 Upload progress: ${progress}%`);
        }
      );

      console.log('✅ Upload complete:', imageUrl);
      
      setFormData(prev => ({
        ...prev,
        imageUrl: imageUrl
      }));

      setUploading(false);
      setUploadProgress(0);
    } catch (error) {
      console.error('❌ Upload error:', error);
      alert(error.message || 'Failed to upload image. Please try again.');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const stringToTimestamp = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return Timestamp.fromDate(date);
    } catch (err) {
      console.error('Error converting date:', dateString, err);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.category) {
      alert('Please select a category');
      return;
    }

    if (!formData.imageUrl) {
      alert('Please upload an image');
      return;
    }

    // ✅ Validate ticketing
    if (ticketingOption === 'outingstation' && !ticketPrice) {
      alert('Please enter a ticket price');
      return;
    }

    if (ticketingOption === 'external' && !externalTicketLink) {
      alert('Please enter an external ticket link');
      return;
    }

    setLoading(true);

    try {
      const eventData = {
        ...formData,
        price: formData.isFree ? 0 : Number(formData.price) || 0,
        capacity: Number(formData.capacity) || 0,
        date: stringToTimestamp(formData.date),
        startDate: stringToTimestamp(formData.startDate),
        endDate: stringToTimestamp(formData.endDate),
        
        // ✅ TICKETING DATA
        ticketingOption: ticketingOption,
        ticketingEnabled: ticketingOption === 'outingstation',
        ticketPrice: ticketingOption === 'outingstation' ? Number(ticketPrice) : 0,
        ticketsAvailable: ticketingOption === 'outingstation' ? Number(ticketsAvailable) : 0,
        ticketsSold: 0,
        
        // ✅ SERVICE FEE DATA
        serviceFeeType: serviceFeeType,
        serviceFeeAmount: serviceFeeType === 'fixed' ? Number(serviceFeeAmount) : 0,
        serviceFeePercentage: serviceFeeType === 'percentage' ? Number(serviceFeePercentage) : 0,
        serviceFee: calculateServiceFee(),
        
        externalTicketLink: ticketingOption === 'external' ? externalTicketLink : null,
        
        updatedAt: serverTimestamp()
      };

      if (isEdit) {
        await updateDoc(doc(db, 'events', id), eventData);
        
        setCreatedEvent({
          id: id,
          ...eventData
        });
        setShowNotifyModal(true);
      } else {
        eventData.createdBy = auth.currentUser?.uid || 'admin';
        eventData.createdAt = serverTimestamp();
        eventData.savedCount = 0;
        
        const docRef = await addDoc(collection(db, 'events'), eventData);
        
        setCreatedEvent({
          id: docRef.id,
          ...eventData
        });
        setShowNotifyModal(true);
      }
    } catch (err) {
      console.error('Error saving event:', err);
      alert('❌ Error saving: ' + err.message);
    }

    setLoading(false);
  };

  const showReligionType = formData.category === 'Religion & Community';
  const isPlace = formType === 'place';

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
                {isEdit ? `Edit ${isPlace ? 'Place' : 'Event'}` : `Create New ${isPlace ? 'Place' : 'Event'}`}
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
              
              {/* Event/Place Toggle */}
              {!isEdit && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-3">What are you creating?</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleFormTypeChange('event')}
                      className={`flex-1 px-6 py-3 rounded-lg font-medium transition ${
                        formType === 'event'
                          ? 'bg-cyan-500 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      📅 Event
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormTypeChange('place')}
                      className={`flex-1 px-6 py-3 rounded-lg font-medium transition ${
                        formType === 'place'
                          ? 'bg-cyan-500 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      📍 Place
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {formType === 'event' 
                      ? 'Events have specific dates and times (concerts, workshops, etc.)'
                      : 'Places are permanent locations (restaurants, gyms, galleries, etc.)'
                    }
                  </p>
                </div>
              )}

              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isPlace ? 'Place Name' : 'Event Title'} *
                    </label>
                    <input type="text" name="title" value={formData.title} onChange={handleChange} required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder={isPlace ? 'e.g. The Creative Hub' : 'e.g. Tech Innovation Summit 2025'} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} required rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder={isPlace ? 'Describe the place, amenities, atmosphere...' : 'Describe your event...'} />
                  </div>

                  {!isPlace && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Event Type *</label>
                      <select name="eventType" value={formData.eventType} onChange={handleChange} required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                        <option value="regular">Regular Event</option>
                        <option value="campus">Campus Event</option>
                        <option value="webinar">Webinar/Virtual</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    <select name="category" value={formData.category} onChange={handleChange} required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                      <option value="">Select a category</option>
                      {allCategories.map(category => (
                        <option 
                          key={category} 
                          value={category}
                          disabled={isPlace && !placeSupportedCategories.includes(category)}
                        >
                          {category} {isPlace && !placeSupportedCategories.includes(category) ? '(Events only)' : ''}
                        </option>
                      ))}
                    </select>
                    {isPlace && (
                      <p className="text-xs text-gray-500 mt-1">
                        Places only available for: {placeSupportedCategories.join(', ')}
                      </p>
                    )}
                  </div>

                  {showReligionType && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Religion Type *</label>
                      <select name="religionType" value={formData.religionType} onChange={handleChange} required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                        <option value="">Select religion type</option>
                        <option value="Christianity">Christianity</option>
                        <option value="Islam">Islam</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ TICKETING SECTION - EVENTS ONLY */}
              {!isPlace && (
                <div>
                  <h3 className="text-lg font-bold mb-4">💳 Ticketing Options</h3>
                  
                  {/* Option 1: No Ticketing */}
                  <div className="mb-4">
                    <label className="flex items-start gap-3 cursor-pointer p-4 border rounded-lg hover:bg-gray-50">
                      <input
                        type="radio"
                        name="ticketingOption"
                        value="none"
                        checked={ticketingOption === 'none'}
                        onChange={(e) => setTicketingOption(e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-semibold">No Ticketing</p>
                        <p className="text-sm text-gray-600">Free event or handle tickets yourself</p>
                      </div>
                    </label>
                  </div>
                  
                  {/* Option 2: OutingStation Ticketing */}
                  <div className="mb-4">
                    <label className="flex items-start gap-3 cursor-pointer p-4 border rounded-lg hover:bg-gray-50">
                      <input
                        type="radio"
                        name="ticketingOption"
                        value="outingstation"
                        checked={ticketingOption === 'outingstation'}
                        onChange={(e) => setTicketingOption(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-semibold">OutingStation Ticketing ⭐</p>
                        <p className="text-sm text-gray-600 mb-2">
                          Sell tickets directly through OutingStation. Automatic payment, tickets, and check-in.
                        </p>
                        
                        {ticketingOption === 'outingstation' && (
                          <div className="mt-4 space-y-4 border-l-2 border-cyan-500 pl-4">
                            
                            {/* Ticket Price */}
                            <div>
                              <label className="block text-sm font-medium mb-1">Ticket Price (₦) *</label>
                              <input
                                type="number"
                                value={ticketPrice}
                                onChange={(e) => setTicketPrice(e.target.value)}
                                placeholder="e.g., 5000"
                                className="w-full px-3 py-2 border rounded-lg"
                                required={ticketingOption === 'outingstation'}
                              />
                            </div>
                            
                            {/* Tickets Available */}
                            <div>
                              <label className="block text-sm font-medium mb-1">Tickets Available *</label>
                              <input
                                type="number"
                                value={ticketsAvailable}
                                onChange={(e) => setTicketsAvailable(e.target.value)}
                                placeholder="e.g., 100"
                                className="w-full px-3 py-2 border rounded-lg"
                                required={ticketingOption === 'outingstation'}
                              />
                            </div>
                            
                            {/* ✅ SERVICE FEE OPTIONS */}
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <label className="block text-sm font-medium mb-3">Service Fee Structure</label>
                              
                              <div className="space-y-3">
                                {/* Fixed Fee */}
                                <div>
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name="serviceFeeType"
                                      value="fixed"
                                      checked={serviceFeeType === 'fixed'}
                                      onChange={(e) => setServiceFeeType(e.target.value)}
                                    />
                                    <span className="text-sm font-medium">Fixed Amount (₦)</span>
                                  </label>
                                  
                                  {serviceFeeType === 'fixed' && (
                                    <input
                                      type="number"
                                      value={serviceFeeAmount}
                                      onChange={(e) => setServiceFeeAmount(e.target.value)}
                                      placeholder="100"
                                      className="w-full px-3 py-2 border rounded-lg text-sm mt-2"
                                    />
                                  )}
                                </div>
                                
                                {/* Percentage Fee */}
                                <div>
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name="serviceFeeType"
                                      value="percentage"
                                      checked={serviceFeeType === 'percentage'}
                                      onChange={(e) => setServiceFeeType(e.target.value)}
                                    />
                                    <span className="text-sm font-medium">Percentage (%)</span>
                                  </label>
                                  
                                  {serviceFeeType === 'percentage' && (
                                    <input
                                      type="number"
                                      value={serviceFeePercentage}
                                      onChange={(e) => setServiceFeePercentage(e.target.value)}
                                      placeholder="2"
                                      step="0.1"
                                      className="w-full px-3 py-2 border rounded-lg text-sm mt-2"
                                    />
                                  )}
                                </div>
                                
                                {/* No Fee */}
                                <div>
                                  <label className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name="serviceFeeType"
                                      value="none"
                                      checked={serviceFeeType === 'none'}
                                      onChange={(e) => setServiceFeeType(e.target.value)}
                                    />
                                    <span className="text-sm font-medium">No Service Fee</span>
                                  </label>
                                </div>
                              </div>
                            </div>
                            
                            {/* ✅ PRICING BREAKDOWN - TRANSPARENT */}
                            {ticketPrice > 0 && (
                              <div className="bg-cyan-50 p-4 rounded-lg text-sm">
                                <p className="font-medium mb-2">💰 Full Pricing Breakdown (Transparent):</p>
                                
                                <div className="space-y-1 mb-3">
                                  <div className="flex justify-between">
                                    <span>Ticket Price:</span>
                                    <span>₦{parseInt(ticketPrice || 0).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Service Fee (OutingStation):</span>
                                    <span>₦{calculateServiceFee().toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Payment Processing (Paystack):</span>
                                    <span>₦{calculatePaystackFee().toLocaleString()}</span>
                                  </div>
                                  <div className="border-t border-cyan-200 pt-2 mt-2 flex justify-between font-bold text-base">
                                    <span>Total User Pays:</span>
                                    <span className="text-cyan-700">₦{calculateTotal().toLocaleString()}</span>
                                  </div>
                                </div>
                                
                                <div className="pt-3 border-t border-cyan-200 space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span>💼 Organizer receives:</span>
                                    <span className="font-semibold text-green-700">₦{calculateOrganizerReceives().toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span>🏢 OutingStation earns:</span>
                                    <span className="font-semibold text-blue-700">₦{calculateServiceFee().toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span>💳 Paystack gets:</span>
                                    <span className="font-semibold text-gray-700">₦{calculatePaystackFee().toLocaleString()}</span>
                                  </div>
                                </div>
                                
                                <p className="text-xs text-gray-600 mt-3 italic">
                                  ✨ All fees shown transparently to users at checkout
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                  
                  {/* Option 3: External Ticketing */}
                  <div className="mb-4">
                    <label className="flex items-start gap-3 cursor-pointer p-4 border rounded-lg hover:bg-gray-50">
                      <input
                        type="radio"
                        name="ticketingOption"
                        value="external"
                        checked={ticketingOption === 'external'}
                        onChange={(e) => setTicketingOption(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-semibold">External Ticketing Link</p>
                        <p className="text-sm text-gray-600 mb-2">
                          Use Eventbrite, your own website, or another ticketing platform
                        </p>
                        
                        {ticketingOption === 'external' && (
                          <div className="mt-4 border-l-2 border-gray-500 pl-4">
                            <label className="block text-sm font-medium mb-1">Ticket Link (URL) *</label>
                            <input
                              type="url"
                              value={externalTicketLink}
                              onChange={(e) => setExternalTicketLink(e.target.value)}
                              placeholder="https://eventbrite.com/your-event or https://yourwebsite.com/tickets"
                              className="w-full px-3 py-2 border rounded-lg"
                              required={ticketingOption === 'external'}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Users will be redirected to this link to buy tickets
                            </p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Schedule - EVENTS ONLY */}
              {!isPlace ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Schedule</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Event Duration *</label>
                      <select name="eventDuration" value={formData.eventDuration} onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                        <option value="single">Single Day Event</option>
                        <option value="multi">Multi-Day Event</option>
                        <option value="recurring">Recurring Event</option>
                      </select>
                    </div>

                    {formData.eventDuration === 'single' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                          <input type="date" name="date" value={formData.date} onChange={handleChange} required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
                          <input type="time" name="time" value={formData.time} onChange={handleChange} required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                        </div>
                      </div>
                    )}

                    {formData.eventDuration === 'multi' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                          <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                          <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Daily Start Time *</label>
                          <input type="time" name="dailyStartTime" value={formData.dailyStartTime} onChange={handleChange} required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Daily End Time *</label>
                          <input type="time" name="dailyEndTime" value={formData.dailyEndTime} onChange={handleChange} required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                        </div>
                      </div>
                    )}

                    {formData.eventDuration === 'recurring' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Recurring Pattern *</label>
                          <select name="recurringPattern" value={formData.recurringPattern} onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="weekends">Weekends Only</option>
                            <option value="weekdays">Weekdays Only</option>
                          </select>
                        </div>

                        {formData.recurringPattern === 'weekly' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Day of Week *</label>
                            <select name="recurringDay" value={formData.recurringDay} onChange={handleChange}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                              {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
                          <input type="time" name="recurringTime" value={formData.recurringTime} onChange={handleChange} required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // PLACES ONLY - Opening Hours
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Opening Hours</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Availability *</label>
                      <select name="placeAvailability" value={formData.placeAvailability} onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                        <option value="Always Open">Always Open (Daily)</option>
                        <option value="Weekends Only">Weekends Only</option>
                        <option value="Mon-Fri">Mon-Fri</option>
                        <option value="Mon-Sat">Mon-Sat</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Opening Time *</label>
                        <input type="time" name="openingTime" value={formData.openingTime} onChange={handleChange} required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Closing Time *</label>
                        <input type="time" name="closingTime" value={formData.closingTime} onChange={handleChange} required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Campus / Webinar specific - EVENTS ONLY */}
              {formData.eventType === 'campus' && !isPlace && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Campus Event Details</h3>
                  <select name="university" value={formData.university} onChange={handleChange} required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                    <option value="">Select university</option>
                    {universities.map(uni => (
                      <option key={uni.id} value={uni.name}>{uni.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.eventType === 'webinar' && !isPlace && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Webinar Details</h3>
                  <div className="space-y-4">
                    <select name="platform" value={formData.platform} onChange={handleChange} required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                      <option value="">Select platform</option>
                      {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>

                    <input type="url" name="platformLink" value={formData.platformLink} onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder="Meeting link (optional)" />
                  </div>
                </div>
              )}

              {/* Organizer */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {isPlace ? 'Contact Information' : 'Organizer Information'} <span className="text-sm font-normal text-gray-500">(Optional)</span>
                </h3>
                <div className="space-y-4">
                  <input type="text" name="organizerName" value={formData.organizerName} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                    placeholder={isPlace ? 'Contact person name' : 'Organizer name'} />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <input type="tel" name="organizerPhone" value={formData.organizerPhone} onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder="Phone number" />
                    
                    <input type="email" name="organizerEmail" value={formData.organizerEmail} onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder="Email address" />
                  </div>
                </div>
              </div>

              {/* Location */}
              {formData.eventType !== 'webinar' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                  <div className="space-y-4">
                    <input type="text" name="location" value={formData.location} onChange={handleChange} required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder="City, Country (e.g. Lagos, Nigeria)" />

                    <input type="text" name="address" value={formData.address} onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder={isPlace ? 'Full address (e.g. 123 Victoria Island, Lagos)' : 'Full venue address'} />

                    <input type="url" name="mapLocation" value={formData.mapLocation} onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                      placeholder="Google Maps link (optional)" />
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {isPlace ? 'Pricing & Info' : 'Pricing'}
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="isFree" checked={formData.isFree} onChange={handleChange}
                      className="w-4 h-4 text-cyan-500 border-gray-300 rounded focus:ring-cyan-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {isPlace ? 'Free entry/no cover charge' : 'This is a free event'}
                    </span>
                  </label>

                  {!formData.isFree && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Price (for event card) *
                      </label>
                      <input type="number" name="price" value={formData.price} onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                        placeholder={isPlace ? 'Average price / Entry fee in ₦' : 'Price in ₦'} />
                      <p className="text-xs text-gray-500 mt-1">
                        {isPlace ? 'Average cost shown on event listings' : 'General price shown on event card (actual ticket pricing set in Ticketing Options above)'}
                      </p>
                    </div>
                  )}

                  <input type="number" name="capacity" value={formData.capacity} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                    placeholder={isPlace ? 'Max capacity (optional)' : 'Capacity (max attendees)'} />
                </div>
              </div>

              {/* Media - Firebase Storage Upload */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {isPlace ? 'Place Image' : 'Event Image'} *
                </h3>
                
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-cyan-400 transition">
                  <div className="space-y-1 text-center">
                    {formData.imageUrl ? (
                      <div className="relative">
                        <img 
                          src={formData.imageUrl} 
                          alt="Preview" 
                          className="mx-auto h-48 w-auto rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                          className="mt-2 text-sm text-red-600 hover:text-red-700"
                        >
                          Remove Image
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label className="relative cursor-pointer bg-white rounded-md font-medium text-cyan-600 hover:text-cyan-500">
                            <span>Upload an image</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              disabled={uploading}
                              className="sr-only"
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 10MB</p>
                      </>
                    )}
                    
                    {uploading && (
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          {uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Processing...'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Visibility */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Visibility</h3>
                <div className="space-y-4">
                  <select name="status" value={formData.status} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="pending">Pending Review</option>
                  </select>

                  <div className="flex gap-6">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleChange}
                        className="w-4 h-4 text-cyan-500 border-gray-300 rounded focus:ring-cyan-400" />
                      <span className="text-sm font-medium text-gray-700">Featured</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="isTrending" checked={formData.isTrending} onChange={handleChange}
                        className="w-4 h-4 text-cyan-500 border-gray-300 rounded focus:ring-cyan-400" />
                      <span className="text-sm font-medium text-gray-700">Trending</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                <button type="submit" disabled={loading || uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-medium disabled:opacity-50">
                  <Save size={20} />
                  <span>{loading ? 'Saving...' : (isEdit ? `Update ${isPlace ? 'Place' : 'Event'}` : `Create ${isPlace ? 'Place' : 'Event'}`)}</span>
                </button>

                <button type="button" onClick={() => navigate('/admin/events')}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium">
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* Notification Modal */}
      {showNotifyModal && createdEvent && (
        <NotifyUsersModal 
          event={createdEvent}
          notificationType={isEdit ? 'update' : 'new'}
          onClose={() => {
            setShowNotifyModal(false);
            navigate('/admin/events');
          }}
        />
      )}
    </div>
  );
}