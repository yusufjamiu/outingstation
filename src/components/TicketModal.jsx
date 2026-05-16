import { useEffect, useRef, useState } from 'react';
import { X, Download, CheckCircle } from 'lucide-react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function TicketModal({ ticketData, onClose }) {
  const ticketRef = useRef(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    generateQRCode();
  }, [ticketData]);

  const generateQRCode = async () => {
    try {
      const qrData = JSON.stringify({
        ticketId: ticketData.ticketId,
        eventId: ticketData.eventId,
        buyer: ticketData.buyerName,
        qty: ticketData.quantity,
        ref: ticketData.paymentRef
      });
      const url = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1,
        color: { dark: '#0e7490', light: '#ffffff' }
      });
      setQrCodeUrl(url);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  const handleDownloadPDF = async () => {
    if (!ticketRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`OutingStation-Ticket-${ticketData.ticketId}.pdf`);
    } catch (err) {
      console.error('PDF error:', err);
    }
    setDownloading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-emerald-500" size={24} />
            <h2 className="text-lg font-bold text-gray-900">Payment Successful!</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        {/* Ticket — this is what gets rendered to PDF */}
        <div className="p-5">
          <div
            ref={ticketRef}
            className="bg-white rounded-2xl overflow-hidden"
            style={{ fontFamily: 'sans-serif' }}
          >
            {/* Ticket Top — Cyan header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',
                padding: '28px 24px 20px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Decorative circles */}
              <div style={{
                position: 'absolute', top: -20, right: -20,
                width: 100, height: 100, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)'
              }} />
              <div style={{
                position: 'absolute', bottom: -10, left: 60,
                width: 60, height: 60, borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)'
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: 8, padding: '4px 12px',
                    fontSize: 11, fontWeight: 700,
                    color: 'white', letterSpacing: 1.5,
                    textTransform: 'uppercase'
                  }}>
                    OutingStation
                  </div>
                  <div style={{
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: 8, padding: '4px 10px',
                    fontSize: 10, color: 'rgba(255,255,255,0.9)'
                  }}>
                    🎟️ E-Ticket
                  </div>
                </div>

                <h1 style={{
                  color: 'white', fontSize: 20, fontWeight: 800,
                  margin: '0 0 6px', lineHeight: 1.3
                }}>
                  {ticketData.eventTitle}
                </h1>

                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {ticketData.eventDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 13 }}>📅</span>
                      <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>{ticketData.eventDate}</span>
                    </div>
                  )}
                  {ticketData.eventLocation && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 13 }}>📍</span>
                      <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>{ticketData.eventLocation}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ticket tear line */}
            <div style={{ position: 'relative', height: 20, background: '#f9fafb' }}>
              <div style={{
                position: 'absolute', top: 0, left: -12, right: -12,
                height: 1, borderTop: '2px dashed #d1d5db'
              }} />
              <div style={{
                position: 'absolute', left: -8, top: -10,
                width: 20, height: 20, borderRadius: '50%',
                background: 'white', border: '1px solid #e5e7eb'
              }} />
              <div style={{
                position: 'absolute', right: -8, top: -10,
                width: 20, height: 20, borderRadius: '50%',
                background: 'white', border: '1px solid #e5e7eb'
              }} />
            </div>

            {/* Ticket Body */}
            <div style={{ background: '#f9fafb', padding: '16px 24px 24px' }}>

              {/* Ticket ID badge */}
              <div style={{
                background: 'white', borderRadius: 12, padding: '10px 16px',
                marginBottom: 16, border: '1.5px solid #e0f2fe',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <p style={{ fontSize: 10, color: '#6b7280', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ticket ID</p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#0e7490', margin: 0 }}>{ticketData.ticketId}</p>
                </div>
                <div style={{
                  background: '#ecfdf5', borderRadius: 8, padding: '4px 10px',
                  fontSize: 11, fontWeight: 700, color: '#059669'
                }}>
                  ✓ VALID
                </div>
              </div>

              {/* Buyer info + QR code */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>

                {/* Buyer details */}
                <div style={{ flex: 1 }}>
                  <InfoRow label="Name" value={ticketData.buyerName} />
                  <InfoRow label="Email" value={ticketData.buyerEmail} />
                  <InfoRow label="Phone" value={ticketData.buyerPhone} />
                  <InfoRow label="Quantity" value={`${ticketData.quantity} ticket${ticketData.quantity > 1 ? 's' : ''}`} />
                  <InfoRow label="Amount Paid" value={`₦${ticketData.totalPaid?.toLocaleString()}`} highlight />
                  {ticketData.creditsApplied > 0 && (
                    <InfoRow label="Credits Used" value={`₦${ticketData.creditsApplied?.toLocaleString()}`} />
                  )}
                </div>

                {/* QR Code */}
                <div style={{ flexShrink: 0, textAlign: 'center' }}>
                  {qrCodeUrl && (
                    <div style={{
                      background: 'white', padding: 8, borderRadius: 12,
                      border: '1.5px solid #e0f2fe', display: 'inline-block'
                    }}>
                      <img src={qrCodeUrl} alt="QR Code" style={{ width: 100, height: 100, display: 'block' }} />
                    </div>
                  )}
                  <p style={{ fontSize: 9, color: '#9ca3af', marginTop: 4, textAlign: 'center' }}>Scan to verify</p>
                </div>
              </div>

              {/* Payment ref */}
              <div style={{
                background: 'white', borderRadius: 10, padding: '10px 14px',
                border: '1px solid #e5e7eb', marginBottom: 16
              }}>
                <p style={{ fontSize: 9, color: '#9ca3af', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Payment Reference</p>
                <p style={{ fontSize: 11, color: '#374151', margin: 0, fontFamily: 'monospace', fontWeight: 600 }}>{ticketData.paymentRef}</p>
              </div>

              {/* Footer note */}
              <div style={{
                background: 'linear-gradient(135deg, #ecfeff, #e0f2fe)',
                borderRadius: 10, padding: '10px 14px',
                border: '1px solid #a5f3fc'
              }}>
                <p style={{ fontSize: 10, color: '#0e7490', margin: 0, lineHeight: 1.6 }}>
                  🎉 Show this ticket (QR code) at the entrance for quick check-in.
                  Keep your ticket safe — it's your entry pass!
                </p>
              </div>

              {/* OutingStation branding */}
              <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>
                  Powered by <span style={{ color: '#0891b2', fontWeight: 700 }}>OutingStation</span> • outingstation.com
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={handleDownloadPDF}
            disabled={downloading || !qrCodeUrl}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
          >
            <Download size={18} />
            {downloading ? 'Generating PDF...' : 'Download PDF Ticket'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper component
function InfoRow({ label, value, highlight }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ fontSize: 9, color: '#9ca3af', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{label}</p>
      <p style={{ fontSize: 12, color: highlight ? '#0e7490' : '#111827', margin: 0, fontWeight: highlight ? 700 : 500 }}>{value}</p>
    </div>
  );
}