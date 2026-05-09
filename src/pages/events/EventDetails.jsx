import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import SEO from '../../components/SEO';
import { 
  Calendar, Clock, MapPin, DollarSign, Users, Share2, Heart, 
  ExternalLink, Mail, Phone, Globe, Bookmark, ArrowLeft, CheckCircle, Navigation, Ticket, CreditCard
} from 'lucide-react';
import { doc, getDoc, collection, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { formatEventDateFull, formatEventTime } from '../../utils/dateTimeHelpers';
import { PaystackButton } from 'react-paystack';
import { 
  formatCredits, 
  calculateAvailableCredits, 
  calculateMaxCreditUsage 
} from '../../utils/referralUtils'; // ✅ NEW IMPORT

const openInMaps = (event) => {
  if (event.mapLocation) {
    window.open(event.mapLocation, '_blank');
    return;
  }
  
  const location = event.address || event.location;
  if (!location) {
    toast.error('No location information available');
    return;
  }
  
  const query = encodeURIComponent(location);
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
};

// ✅ Calculate fees
const calculateServiceFee = (event) => {
  if (event.serviceFeeType === 'fixed') {
    return event.serviceFeeAmount || 100;
  } else if (event.serviceFeeType === 'percentage') {
    return Math.round((event.ticketPrice || 0) * ((event.serviceFeePercentage || 2) / 100));
  } else {
    return 0;
  }
};

const calculatePaystackFee = (event) => {
  const ticketPrice = event.ticketPrice || 0;
  const serviceFee = calculateServiceFee(event);
  const subtotal = ticketPrice + serviceFee;
  return Math.round((subtotal * 0.015) + 100);
};

const calculateTotal = (event) => {
  const ticketPrice = event.ticketPrice || 0;
  const serviceFee = calculateServiceFee(event);
  const paystackFee = calculatePaystackFee(event);
  return ticketPrice + serviceFee + paystackFee;
};

// ✅ Ticket Purchase Component WITH CREDITS
const TicketPurchaseSection = ({ event, currentUser, navigate }) => {
  const [buyerName, setBuyerName] = useState(currentUser?.displayName || '');
  const [buyerEmail, setBuyerEmail] = useState(currentUser?.email || '');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [showPaystackButton, setShowPaystackButton] = useState(false);
  
  // ✅ NEW: Credit states
  const [userCredits, setUserCredits] = useState([]);
  const [availableCredits, setAvailableCredits] = useState(0);
  const [useCredits, setUseCredits] = useState(false);
  const [creditsToApply, setCreditsToApply] = useState(0);

  // ✅ NEW: Load user credits
  useEffect(() => {
    const loadUserCredits = async () => {
      if (!currentUser) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          const creditsHistory = data.creditsHistory || [];
          setUserCredits(creditsHistory);
          
          const available = calculateAvailableCredits(creditsHistory);
          setAvailableCredits(available);
        }
      } catch (err) {
        console.error('Error loading credits:', err);
      }
    };

    loadUserCredits();
  }, [currentUser]);

  const ticketPrice = event.ticketPrice || 0;
  const serviceFee = calculateServiceFee(event);
  const paystackFee = calculatePaystackFee(event);
  const baseTotal = calculateTotal(event);
  
  // ✅ NEW: Calculate credits to apply
  const totalBeforeCredits = baseTotal * quantity;
  const maxCreditsAllowed = calculateMaxCreditUsage(totalBeforeCredits, availableCredits);
  const actualCreditsApplied = useCredits ? Math.min(creditsToApply || maxCreditsAllowed, maxCreditsAllowed) : 0;
  const finalTotal = totalBeforeCredits - actualCreditsApplied;

  const ticketsRemaining = (event.ticketsAvailable || 0) - (event.ticketsSold || 0);

  // ✅ NEW: Update credits when useCredits toggles
  useEffect(() => {
    if (useCredits) {
      setCreditsToApply(maxCreditsAllowed);
    } else {
      setCreditsToApply(0);
    }
  }, [useCredits, maxCreditsAllowed]);

  const paystackConfig = {
    reference: `OS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    email: buyerEmail,
    amount: finalTotal * 100, // ✅ UPDATED: Use final total after credits
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
    text: `Pay ${formatCredits(finalTotal)}`,
    
    // ✅ UPDATED: Include credit info in metadata
    metadata: {
      event_id: event.id,
      event_title: event.title,
      buyer_name: buyerName,
      buyer_phone: buyerPhone,
      ticket_price: ticketPrice,
      service_fee: serviceFee,
      quantity: quantity,
      subtotal: totalBeforeCredits,
      credits_applied: actualCreditsApplied,
      total_amount: finalTotal
    },
    
    onSuccess: (reference) => {
      console.log('Payment successful!', reference);
      toast.success('🎉 Payment successful! Check your email for tickets.', { duration: 5000 });
    },
    
    onClose: () => {
      toast.error('Payment cancelled');
    }
  };

  const handleSuccess = (reference) => {
    console.log('Payment successful!', reference);
    toast.success('🎉 Payment successful! Check your email for tickets.', { duration: 5000 });
  };

  const handleClose = () => {
    toast.error('Payment cancelled');
  };

  const handleProceedToPayment = () => {
    if (!currentUser) {
      toast.error('Please login to purchase tickets');
      navigate('/login');
      return;
    }

    if (!buyerName || !buyerEmail || !buyerPhone) {
      toast.error('Please enter your name, email, and phone number');
      return;
    }

    if (quantity < 1) {
      toast.error('Please select at least 1 ticket');
      return;
    }

    if (quantity > ticketsRemaining) {
      toast.error(`Only ${ticketsRemaining} tickets remaining`);
      return;
    }

    setShowPaystackButton(true);
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-cyan-100">
      <div className="flex items-center gap-2 mb-4">
        <Ticket className="text-cyan-500" size={24} />
        <h3 className="text-xl font-bold text-gray-900">Purchase Tickets</h3>
      </div>

      {/* Tickets Remaining */}
      <div className="bg-cyan-50 rounded-lg p-3 mb-4">
        <p className="text-sm text-gray-700">
          <span className="font-semibold">{ticketsRemaining}</span> tickets remaining
        </p>
        {ticketsRemaining < 10 && ticketsRemaining > 0 && (
          <p className="text-xs text-orange-600 mt-1">⚠️ Selling fast!</p>
        )}
        {ticketsRemaining === 0 && (
          <p className="text-xs text-red-600 mt-1">❌ Sold out!</p>
        )}
      </div>

      {/* Buyer Information */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
          <input
            type="text"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder="John Doe"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            placeholder="john@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
          <input
            type="tel"
            value={buyerPhone}
            onChange={(e) => setBuyerPhone(e.target.value)}
            placeholder="+234 800 000 0000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            min="1"
            max={ticketsRemaining}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
          />
        </div>
      </div>

      {/* ✅ NEW: CREDIT TOGGLE */}
      {availableCredits > 0 && (
        <div className="bg-purple-50 rounded-lg p-4 mb-4 border-2 border-purple-200">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="text-purple-600" size={20} />
              <span className="font-semibold text-gray-900">Use Credits</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useCredits}
                onChange={(e) => setUseCredits(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
          <div className="text-sm">
            <p className="text-gray-700 mb-1">
              Available: <span className="font-bold text-purple-600">{formatCredits(availableCredits)}</span>
            </p>
            {useCredits && (
              <p className="text-green-600 font-medium">
                ✓ Applying {formatCredits(actualCreditsApplied)} (Max 50%)
              </p>
            )}
          </div>
        </div>
      )}

      {/* ✅ UPDATED: Price Breakdown with Credits */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <p className="text-sm font-semibold text-gray-900 mb-2">Price Breakdown:</p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Ticket Price ({quantity}x):</span>
            <span className="font-medium">{formatCredits(ticketPrice * quantity)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Service Fee:</span>
            <span className="font-medium">{formatCredits(serviceFee * quantity)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Payment Processing:</span>
            <span className="font-medium">{formatCredits(paystackFee * quantity)}</span>
          </div>
          
          {/* ✅ NEW: Show subtotal if credits applied */}
          {actualCreditsApplied > 0 && (
            <>
              <div className="border-t pt-2 mt-2 flex justify-between">
                <span className="text-gray-700">Subtotal:</span>
                <span className="font-medium">{formatCredits(totalBeforeCredits)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Credits Applied:</span>
                <span className="font-bold">-{formatCredits(actualCreditsApplied)}</span>
              </div>
            </>
          )}
          
          <div className={`${actualCreditsApplied > 0 ? 'border-t pt-2 mt-2' : 'border-t pt-2 mt-2'} flex justify-between`}>
            <span className="font-bold text-gray-900">Total:</span>
            <span className="font-bold text-cyan-600 text-lg">{formatCredits(finalTotal)}</span>
          </div>
        </div>
      </div>

      {/* Payment Button */}
      {ticketsRemaining > 0 ? (
        showPaystackButton ? (
          <PaystackButton
            {...paystackConfig}
            text={`Pay ${formatCredits(finalTotal)}`}
            onSuccess={handleSuccess}
            onClose={handleClose}
            className="w-full bg-gradient-to-r from-cyan-400 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition"
          />
        ) : (
          <button
            onClick={handleProceedToPayment}
            className="w-full bg-gradient-to-r from-cyan-400 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            <Ticket size={20} />
            Proceed to Payment
          </button>
        )
      ) : (
        <button
          disabled
          className="w-full bg-gray-300 text-gray-500 py-3 rounded-xl font-semibold cursor-not-allowed"
        >
          Sold Out
        </button>
      )}

      <p className="text-xs text-gray-500 text-center mt-3">
        🔒 Secure payment powered by Paystack
      </p>
    </div>
  );
};

const handleRegister = (event, currentUser, navigate) => {
  toast.dismiss();
  
  if (!currentUser) {
    toast.error('Please login to register for this event');
    navigate('/login');
    return;
  }
  
  if (event.subCategory === 'places') {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <div>
          <p className="font-semibold">📍 Visit Place</p>
          <p className="text-sm text-gray-600 mt-1">
            This is a permanent place. Visit the location to purchase tickets or pay entry fees if applicable.
          </p>
        </div>
        <div className="flex gap-2">
          {event.mapLocation && (
            <button
              onClick={() => {
                openInMaps(event);
                toast.dismiss(t.id);
              }}
              className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600"
            >
              View Map
            </button>
          )}
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
          >
            Got it
          </button>
        </div>
      </div>
    ), { 
      duration: Infinity, 
      icon: '🏪',
      id: 'place-info'
    });
    return;
  }
  
  if (event.ticketingOption === 'outingstation' && event.ticketingEnabled) {
    const ticketSection = document.getElementById('ticket-purchase-section');
    if (ticketSection) {
      ticketSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.success('👇 Fill in your details below to purchase tickets');
    }
    return;
  }

  if (event.ticketingOption === 'external' && event.externalTicketLink) {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <div>
          <p className="font-semibold">🎟️ External Ticketing</p>
          <p className="text-sm text-gray-600 mt-1">{event.title}</p>
          <p className="text-sm font-semibold text-cyan-600 mt-1">
            Price: ₦{event.price?.toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              window.open(event.externalTicketLink, '_blank');
              toast.dismiss(t.id);
            }}
            className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600"
          >
            Buy Tickets
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { 
      duration: Infinity,
      id: 'external-ticket-info'
    });
    return;
  }
  
  if (event.isFree || event.ticketingOption === 'none') {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <div>
          <p className="font-semibold">🎉 Free Event - You're All Set!</p>
          <p className="text-sm text-gray-600 mt-1">
            This event is completely free! Just show up at the venue on the event day. See you there!
          </p>
          <div className="mt-3 bg-cyan-50 rounded-lg p-3 text-sm">
            <p className="font-medium text-gray-800 mb-1">📅 Event Details:</p>
            <p className="text-gray-700">
              <strong>Date:</strong> {formatEventDateFull(event)}
            </p>
            <p className="text-gray-700">
              <strong>Location:</strong> {event.location || event.address || 'TBD'}
            </p>
          </div>
          {(event.organizerEmail || event.organizerPhone) && (
            <div className="mt-2 text-sm text-gray-700">
              <p className="font-medium mb-1">Questions? Contact the organizer:</p>
              {event.organizerEmail && <p>📧 {event.organizerEmail}</p>}
              {event.organizerPhone && <p>📞 {event.organizerPhone}</p>}
            </div>
          )}
        </div>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600"
        >
          Got it, thanks!
        </button>
      </div>
    ), { 
      duration: Infinity, 
      icon: '🎉',
      id: 'free-event-info'
    });
    return;
  }
};

const getImage = (event) => {
  return event?.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80';
};

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [event, setEvent] = useState(null);
  const [similarEvents, setSimilarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    loadEventDetails();
    checkIfSaved();
  }, [id, currentUser]);

  useEffect(() => {
    return () => {
      toast.dismiss();
    };
  }, []);

  const loadEventDetails = async () => {
    try {
      setLoading(true);
      
      const eventDoc = await getDoc(doc(db, 'events', id));
      
      if (!eventDoc.exists()) {
        navigate('/events');
        return;
      }

      const eventData = { id: eventDoc.id, ...eventDoc.data() };
      setEvent(eventData);

      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const allEvents = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const similar = allEvents
        .filter(e => 
          e.id !== id && 
          e.category === eventData.category && 
          e.status === 'published'
        )
        .slice(0, 3);

      setSimilarEvents(similar);
    } catch (err) {
      console.error('Error loading event:', err);
    }
    setLoading(false);
  };

  const checkIfSaved = async () => {
    if (!currentUser) {
      setSaved(false);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const savedEvents = userDoc.data().savedEvents || [];
        setSaved(savedEvents.includes(id));
      }
    } catch (err) {
      console.error('Error checking saved status:', err);
    }
  };

  const handleSaveToggle = async () => {
    if (!currentUser) {
      toast.error('Please login to save events', { icon: '🔒' });
      setTimeout(() => navigate('/login'), 1000);
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      
      if (saved) {
        await updateDoc(userRef, {
          savedEvents: arrayRemove(id)
        });
        setSaved(false);
        toast.success('Event removed from saved', { icon: '💔' });
      } else {
        await updateDoc(userRef, {
          savedEvents: arrayUnion(id)
        });
        setSaved(true);
        toast.success('Event saved!', { icon: '❤️' });
      }
    } catch (err) {
      console.error('Error toggling save:', err);
      toast.error('Failed to save. Try again.', { icon: '❌' });
    }
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const text = `Check out this event: ${event.title}`;
    
    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      copy: url
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      toast.success('Link copied!', { icon: '📋' });
    } else {
      window.open(shareUrls[platform], '_blank');
    }
    
    setShowShareMenu(false);
  };

  if (loading) {
    return (
      <>
        <SEO />
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          </div>
          <Footer />
        </div>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <SEO title="Event Not Found - OutingStation" />
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="max-w-4xl mx-auto px-4 py-20 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Event Not Found</h1>
            <Link to="/events" className="text-cyan-500 hover:underline">
              Back to Events
            </Link>
          </div>
          <Footer />
        </div>
      </>
    );
  }

  const isPlace = event.subCategory === 'places';
  const eventDate = formatEventDateFull(event);
  const eventTime = formatEventTime(event);
  const hasOutingStationTicketing = event.ticketingOption === 'outingstation' && event.ticketingEnabled;

  return (
    <>
      <SEO 
        title={`${event.title} - OutingStation`}
        description={event.description?.substring(0, 155) || `Join ${event.title} - an amazing ${isPlace ? 'place' : 'event'} in ${event.location || 'Nigeria'}`}
        image={event.imageUrl}
        url={`https://outingstation.com/event/${event.id}`}
        type="article"
        keywords={`${event.category}, ${event.location}, ${isPlace ? 'places' : 'events'} Nigeria, ${event.eventType} events, ${event.isFree ? 'free events' : 'paid events'}`}
      />
      
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="relative rounded-2xl overflow-hidden mb-6 shadow-lg">
                <img 
                  src={getImage(event)} 
                  alt={event.title}
                  className="w-full h-64 sm:h-96 object-cover"
                />
                
                <div className="absolute top-4 left-4">
                  <span className="bg-white/90 backdrop-blur-sm text-cyan-500 px-4 py-2 rounded-full text-sm font-semibold">
                    #{event.category}
                  </span>
                </div>

                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  {event.eventType && (
                    <span className="bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      {event.eventType === 'campus' && '🎓 Campus'}
                      {event.eventType === 'webinar' && '📹 Virtual'}
                      {event.eventType === 'regular' && '🎉 Event'}
                    </span>
                  )}
                  
                  {isPlace && (
                    <span className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                      📍 PLACE
                    </span>
                  )}
                </div>

                {event.isFree && (
                  <div className="absolute bottom-4 right-4">
                    <span className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold">
                      Free {isPlace ? 'Entry' : 'Event'}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-start justify-between mb-6">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 flex-1">
                  {event.title}
                </h1>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={handleSaveToggle}
                    className={`p-3 rounded-full transition ${
                      saved 
                        ? 'bg-red-50 text-red-500' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {saved ? (
                      <Heart size={24} className="fill-current" />
                    ) : (
                      <Heart size={24} />
                    )}
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition"
                    >
                      <Share2 size={24} />
                    </button>

                    {showShareMenu && (
                      <>
                        <div 
                          className="fixed inset-0 z-40"
                          onClick={() => setShowShareMenu(false)}
                        ></div>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                          <button
                            onClick={() => handleShare('facebook')}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                          >
                            Share on Facebook
                          </button>
                          <button
                            onClick={() => handleShare('twitter')}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                          >
                            Share on Twitter
                          </button>
                          <button
                            onClick={() => handleShare('whatsapp')}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                          >
                            Share on WhatsApp
                          </button>
                          <button
                            onClick={() => handleShare('linkedin')}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                          >
                            Share on LinkedIn
                          </button>
                          <hr className="my-2" />
                          <button
                            onClick={() => handleShare('copy')}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                          >
                            Copy Link
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  About This {isPlace ? 'Place' : 'Event'}
                </h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {event.description || 'No description available.'}
                </p>
              </div>

              {/* ✅ Ticket Purchase Section WITH CREDITS */}
              {hasOutingStationTicketing && (
                <div id="ticket-purchase-section" className="mb-6">
                  <TicketPurchaseSection 
                    event={event} 
                    currentUser={currentUser} 
                    navigate={navigate} 
                  />
                </div>
              )}

              {(event.university || event.platform || event.religion) && (
                <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Information</h2>
                  <div className="space-y-3">
                    {event.university && (
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-700">University:</span>
                        <span className="text-gray-600">{event.university}</span>
                      </div>
                    )}
                    {event.platform && (
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-700">Platform:</span>
                        <span className="text-gray-600">{event.platform}</span>
                      </div>
                    )}
                    {event.platformLink && (
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-700">Join Link:</span>
                        <a 
                          href={event.platformLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-500 hover:underline flex items-center gap-1"
                        >
                          Join Meeting <ExternalLink size={16} />
                        </a>
                      </div>
                    )}
                    {event.religionType && (
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-700">Religion:</span>
                        <span className="text-gray-600">{event.religionType}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(event.organizerName || event.organizerEmail || event.organizerPhone) && (
                <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    {isPlace ? 'Contact Information' : 'Organizer'}
                  </h2>
                  <div className="space-y-3">
                    {event.organizerName && (
                      <div className="flex items-center gap-3">
                        <Users size={20} className="text-gray-400" />
                        <span className="text-gray-700">{event.organizerName}</span>
                      </div>
                    )}
                    {event.organizerEmail && (
                      <div className="flex items-center gap-3">
                        <Mail size={20} className="text-gray-400" />
                        <a 
                          href={`mailto:${event.organizerEmail}`}
                          className="text-cyan-500 hover:underline"
                        >
                          {event.organizerEmail}
                        </a>
                      </div>
                    )}
                    {event.organizerPhone && (
                      <div className="flex items-center gap-3">
                        <Phone size={20} className="text-gray-400" />
                        <a 
                          href={`tel:${event.organizerPhone}`}
                          className="text-cyan-500 hover:underline"
                        >
                          {event.organizerPhone}
                        </a>
                      </div>
                    )}
                    {event.organizerWebsite && (
                      <div className="flex items-center gap-3">
                        <Globe size={20} className="text-gray-400" />
                        <a 
                          href={event.organizerWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-500 hover:underline"
                        >
                          Visit Website
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 shadow-lg sticky top-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  {isPlace ? 'Place Details' : 'Event Details'}
                </h2>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Calendar size={20} className="text-cyan-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {isPlace ? 'Availability' : 'Date'}
                      </p>
                      <p className="text-gray-600 text-sm">{eventDate}</p>
                    </div>
                  </div>

                  {eventTime && eventTime !== 'TBD' && (
                    <div className="flex items-start gap-3">
                      <Clock size={20} className="text-cyan-500 mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {isPlace ? 'Hours' : 'Time'}
                        </p>
                        <p className="text-gray-600 text-sm">{eventTime}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <MapPin size={20} className="text-cyan-500 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">Location</p>
                      {event.address ? (
                        <>
                          <p className="text-gray-600 text-sm mb-1">{event.address}</p>
                          {event.location && (
                            <p className="text-gray-500 text-xs mb-2">📍 {event.location}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-600 text-sm mb-2">{event.location || 'Online'}</p>
                      )}
                      {(event.mapLocation || event.address) && 
                       event.location?.toLowerCase() !== 'online' && (
                        <button
                          onClick={() => openInMaps(event)}
                          className="text-cyan-500 text-xs font-medium hover:underline flex items-center gap-1"
                        >
                          <Navigation size={14} />
                          Open in Maps
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <DollarSign size={20} className="text-cyan-500 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {isPlace ? 'Entry Fee' : 'Price'}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {hasOutingStationTicketing ? (
                          <span className="font-semibold">₦{event.ticketPrice?.toLocaleString()}</span>
                        ) : event.isFree ? (
                          <span className="text-emerald-600 font-semibold">Free</span>
                        ) : (
                          <span className="font-semibold">₦{event.price?.toLocaleString() || 'Contact Organizer'}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={() => handleRegister(event, currentUser, navigate)}
                    className="w-full bg-gradient-to-r from-cyan-400 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={20} />
                    {hasOutingStationTicketing ? 'Buy Tickets' : isPlace ? 'Get Info' : (event.isFree ? 'Register' : 'Buy Tickets')}
                  </button>

                  <button 
                    onClick={handleSaveToggle}
                    className={`w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                      saved
                        ? 'bg-red-50 text-red-500 border-2 border-red-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Bookmark size={20} className={saved ? 'fill-current' : ''} />
                    {saved ? 'Saved' : `Save ${isPlace ? 'Place' : 'Event'}`}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {similarEvents.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Similar Events</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {similarEvents.map((similar) => (
                  <Link
                    key={similar.id}
                    to={`/event/${similar.id}`}
                    className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group"
                  >
                    <div className="relative h-48">
                      <img 
                        src={similar.imageUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80'} 
                        alt={similar.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      {similar.isFree && (
                        <span className="absolute top-3 right-3 bg-emerald-500 text-white text-xs px-3 py-1 rounded-lg font-semibold">
                          Free
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-2 group-hover:text-cyan-500 transition line-clamp-2">
                        {similar.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={14} />
                        <span>{formatEventDateFull(similar)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
}