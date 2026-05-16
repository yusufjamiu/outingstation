import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  CheckCircle, XCircle, AlertCircle,
  Calendar, MapPin, User, Phone, Mail, Hash, Ticket, Clock
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function VerifyTicket() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      // ✅ Ticket doc ID = ticketId (set in webhook)
      const ticketDoc = await getDoc(doc(db, 'tickets', ticketId));
      if (ticketDoc.exists()) {
        setTicket({ id: ticketDoc.id, ...ticketDoc.data() });
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error('Error loading ticket:', err);
      setNotFound(true);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-cyan-500"></div>
          <p className="text-gray-500 font-medium">Verifying ticket...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="bg-white rounded-3xl p-10 shadow-xl">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle size={48} className="text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Ticket Not Found</h1>
            <p className="text-gray-500 mb-6">
              This ticket ID doesn't exist or may be invalid.
            </p>
            <div className="bg-red-50 rounded-xl p-4 border border-red-100 mb-6">
              <p className="text-sm font-mono text-red-600 font-bold break-all">{ticketId}</p>
            </div>
            <Link
              to="/"
              className="inline-block bg-cyan-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-cyan-600 transition"
            >
              Go to OutingStation
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const isValid = ticket.status === 'valid';
  const isUsed = ticket.status === 'used';

  const statusConfig = {
    valid: {
      bg: 'from-emerald-500 to-emerald-600',
      lightBg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      icon: <CheckCircle size={52} className="text-white" />,
      label: '✅ Valid Ticket',
      description: 'This ticket is authentic and valid for entry'
    },
    used: {
      bg: 'from-yellow-500 to-orange-500',
      lightBg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      icon: <AlertCircle size={52} className="text-white" />,
      label: '⚠️ Already Used',
      description: 'This ticket has already been scanned for entry'
    },
    invalid: {
      bg: 'from-red-500 to-red-600',
      lightBg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: <XCircle size={52} className="text-white" />,
      label: '❌ Invalid Ticket',
      description: 'This ticket is not valid'
    }
  };

  const status = isValid ? 'valid' : isUsed ? 'used' : 'invalid';
  const config = statusConfig[status];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50">
      <Navbar />

      <main className="max-w-lg mx-auto px-4 py-10 pb-20">

        {/* Status Banner */}
        <div className={`bg-gradient-to-br ${config.bg} rounded-3xl p-8 mb-6 text-center shadow-xl`}>
          <div className="flex justify-center mb-4">
            {config.icon}
          </div>
          <h1 className="text-2xl font-black text-white mb-2">{config.label}</h1>
          <p className="text-white/85 text-sm">{config.description}</p>
        </div>

        {/* Ticket Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">

          {/* Event image */}
          {ticket.eventImageUrl && (
            <div className="relative h-44">
              <img
                src={ticket.eventImageUrl}
                alt={ticket.eventTitle}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5">
                <h2 className="text-white font-black text-xl line-clamp-2">{ticket.eventTitle}</h2>
              </div>
            </div>
          )}

          {!ticket.eventImageUrl && (
            <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 p-6">
              <h2 className="text-white font-black text-xl">{ticket.eventTitle}</h2>
            </div>
          )}

          <div className="p-6">

            {/* Event details */}
            <div className="space-y-2.5 mb-6 pb-6 border-b border-gray-100">
              {ticket.eventDate && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 bg-cyan-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Calendar size={15} className="text-cyan-500" />
                  </div>
                  <span>{ticket.eventDate}</span>
                </div>
              )}
              {ticket.eventTime && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 bg-cyan-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock size={15} className="text-cyan-500" />
                  </div>
                  <span>{ticket.eventTime}</span>
                </div>
              )}
              {ticket.eventLocation && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 bg-cyan-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin size={15} className="text-cyan-500" />
                  </div>
                  <span>{ticket.eventLocation}</span>
                </div>
              )}
            </div>

            {/* Ticket ID */}
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl p-4 mb-6 flex items-center justify-between border border-cyan-100">
              <div>
                <p className="text-xs font-bold text-cyan-500 uppercase tracking-wider mb-1">Ticket ID</p>
                <p className="text-xl font-black text-cyan-700 font-mono tracking-wide">{ticket.ticketId}</p>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${config.lightBg} ${config.text} ${config.border} border`}>
                {ticket.status?.toUpperCase()}
              </div>
            </div>

            {/* Holder info */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Ticket Holder</h3>
              <div className="space-y-3">
                <HolderRow icon={<User size={14} className="text-gray-400" />} label="Name" value={ticket.buyerName} />
                <HolderRow icon={<Mail size={14} className="text-gray-400" />} label="Email" value={ticket.buyerEmail} />
                <HolderRow icon={<Phone size={14} className="text-gray-400" />} label="Phone" value={ticket.buyerPhone} />
                <HolderRow icon={<Hash size={14} className="text-gray-400" />} label="Quantity" value={`${ticket.quantity} ticket${ticket.quantity > 1 ? 's' : ''}`} />
              </div>
            </div>

            {/* Amount */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Amount Paid</p>
                <p className="text-3xl font-black text-gray-900">₦{ticket.totalPaid?.toLocaleString()}</p>
              </div>
              {ticket.creditsApplied > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-400 mb-1">Credits Used</p>
                  <p className="text-base font-bold text-purple-600">₦{ticket.creditsApplied?.toLocaleString()}</p>
                </div>
              )}
            </div>

            {/* Payment ref */}
            <div className="bg-gray-50 rounded-xl p-3 mb-5">
              <p className="text-xs text-gray-400 mb-1 font-semibold uppercase tracking-wide">Payment Reference</p>
              <p className="text-xs font-mono text-gray-600 break-all">{ticket.paymentReference || ticket.paymentRef}</p>
            </div>

            {/* Branding */}
            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Verified by{' '}
                <span className="text-cyan-500 font-bold">OutingStation</span>
              </p>
              <p className="text-xs text-gray-300 mt-1">outingstation.com</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function HolderRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );
}