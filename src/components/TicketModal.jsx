import { useEffect, useRef, useState } from 'react';
import { X, Download, CheckCircle, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function TicketModal({ ticketData, onClose }) {
  const ticketRef = useRef(null);
  const qrCanvasRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [qrReady, setQrReady] = useState(false);

  const verifyUrl = `https://www.outingstation.com/verify-ticket/${ticketData.ticketId}`;

  useEffect(() => {
    generateQRCode();
  }, [ticketData]);

  const generateQRCode = async () => {
    try {
      if (qrCanvasRef.current) {
        await QRCode.toCanvas(qrCanvasRef.current, verifyUrl, {
          width: 130,
          margin: 1,
          color: { dark: '#0e7490', light: '#ffffff' }
        });
      }
      setQrReady(true);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  const handleDownloadPDF = async () => {
    if (!ticketRef.current || !qrReady) return;
    setDownloading(true);
    try {
      if (qrCanvasRef.current) {
        await QRCode.toCanvas(qrCanvasRef.current, verifyUrl, {
          width: 130,
          margin: 1,
          color: { dark: '#0e7490', light: '#ffffff' }
        });
      }

      await new Promise(resolve => setTimeout(resolve, 400));

      const canvas = await html2canvas(ticketRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        onclone: async (clonedDoc) => {
          const clonedCanvas = clonedDoc.getElementById('qr-ticket-canvas');
          if (clonedCanvas) {
            await QRCode.toCanvas(clonedCanvas, verifyUrl, {
              width: 130,
              margin: 1,
              color: { dark: '#0e7490', light: '#ffffff' }
            });
          }
        }
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
      alert('Error generating PDF. Please try again.');
    }
    setDownloading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto">

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-emerald-500" size={24} />
            <h2 className="text-lg font-bold text-gray-900">Payment Successful!</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {/* ✅ Ticket div — captured for PDF */}
          <div
            ref={ticketRef}
            className="bg-white rounded-2xl overflow-hidden"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >

            {/* Cyan gradient header */}
            <div style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 50%, #0e7490 100%)',
              padding: '28px 24px 22px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative circles */}
              <div style={{
                position: 'absolute', top: -24, right: -24,
                width: 110, height: 110, borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)'
              }} />
              <div style={{
                position: 'absolute', bottom: -12, left: 50,
                width: 70, height: 70, borderRadius: '50%',
                background: 'rgba(255,255,255,0.07)'
              }} />
              <div style={{
                position: 'absolute', top: 20, right: 60,
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)'
              }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Brand badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.2)', borderRadius: 8,
                    padding: '3px 10px', fontSize: 10, fontWeight: 800,
                    color: 'white', letterSpacing: 2, textTransform: 'uppercase'
                  }}>
                    OutingStation
                  </div>
                  <div style={{
                    background: 'rgba(255,255,255,0.15)', borderRadius: 8,
                    padding: '3px 8px', fontSize: 10, color: 'rgba(255,255,255,0.85)'
                  }}>
                    🎟️ E-Ticket
                  </div>
                </div>

                {/* Event title */}
                <h2 style={{
                  color: 'white', fontSize: 18, fontWeight: 900,
                  margin: '0 0 10px', lineHeight: 1.3
                }}>
                  {ticketData.eventTitle}
                </h2>

                {/* Date + Location */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                  {ticketData.eventDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 12 }}>📅</span>
                      <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11 }}>
                        {ticketData.eventDate}
                      </span>
                    </div>
                  )}
                  {ticketData.eventLocation && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ fontSize: 12 }}>📍</span>
                      <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11 }}>
                        {ticketData.eventLocation}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tear line */}
            <div style={{ position: 'relative', height: 22, background: '#f9fafb' }}>
              <div style={{
                position: 'absolute', top: 10, left: 0, right: 0,
                borderTop: '2px dashed #d1d5db'
              }} />
              <div style={{
                position: 'absolute', left: -10, top: 1,
                width: 22, height: 22, borderRadius: '50%',
                background: 'white', border: '1px solid #e5e7eb', zIndex: 1
              }} />
              <div style={{
                position: 'absolute', right: -10, top: 1,
                width: 22, height: 22, borderRadius: '50%',
                background: 'white', border: '1px solid #e5e7eb', zIndex: 1
              }} />
            </div>

            {/* Ticket body */}
            <div style={{ background: '#f9fafb', padding: '16px 24px 24px' }}>

              {/* Ticket ID row */}
              <div style={{
                background: 'white', borderRadius: 12, padding: '10px 16px',
                marginBottom: 16, border: '1.5px solid #e0f2fe',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
              }}>
                <div>
                  <p style={{
                    fontSize: 9, color: '#64748b', margin: '0 0 3px',
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8
                  }}>
                    Ticket ID
                  </p>
                  <p style={{
                    fontSize: 16, fontWeight: 900, color: '#0e7490',
                    margin: 0, fontFamily: 'monospace', letterSpacing: 1
                  }}>
                    {ticketData.ticketId}
                  </p>
                </div>
                <div style={{
                  background: '#ecfdf5', borderRadius: 8,
                  padding: '5px 12px', fontSize: 11, fontWeight: 800, color: '#059669'
                }}>
                  ✓ VALID
                </div>
              </div>

              {/* Buyer info + QR side by side */}
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>

                {/* Buyer details */}
                <div style={{ flex: 1 }}>
                  <InfoRow label="Name" value={ticketData.buyerName} />
                  <InfoRow label="Email" value={ticketData.buyerEmail} />
                  <InfoRow label="Phone" value={ticketData.buyerPhone} />
                  <InfoRow
                    label="Quantity"
                    value={`${ticketData.quantity} ticket${ticketData.quantity > 1 ? 's' : ''}`}
                  />
                  <InfoRow
                    label="Amount Paid"
                    value={`₦${ticketData.totalPaid?.toLocaleString()}`}
                    highlight
                  />
                  {ticketData.creditsApplied > 0 && (
                    <InfoRow
                      label="Credits Used"
                      value={`-₦${ticketData.creditsApplied?.toLocaleString()}`}
                    />
                  )}
                </div>

                {/* ✅ QR Code Canvas — renders correctly in PDF */}
                <div style={{ flexShrink: 0, textAlign: 'center' }}>
                  <div style={{
                    background: 'white', padding: 8, borderRadius: 12,
                    border: '1.5px solid #bae6fd', display: 'inline-block'
                  }}>
                    <canvas
                      id="qr-ticket-canvas"
                      ref={qrCanvasRef}
                      style={{ width: 100, height: 100, display: 'block' }}
                    />
                  </div>
                  <p style={{ fontSize: 9, color: '#94a3b8', marginTop: 5, textAlign: 'center' }}>
                    Scan to verify
                  </p>
                </div>
              </div>

              {/* Payment ref */}
              <div style={{
                background: 'white', borderRadius: 10, padding: '10px 14px',
                border: '1px solid #e5e7eb', marginBottom: 14
              }}>
                <p style={{
                  fontSize: 9, color: '#9ca3af', margin: '0 0 3px',
                  textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700
                }}>
                  Payment Reference
                </p>
                <p style={{
                  fontSize: 11, color: '#374151', margin: 0,
                  fontFamily: 'monospace', fontWeight: 600
                }}>
                  {ticketData.paymentRef}
                </p>
              </div>

              {/* Entry instructions */}
              <div style={{
                background: 'linear-gradient(135deg, #ecfeff, #e0f2fe)',
                borderRadius: 10, padding: '10px 14px',
                border: '1px solid #a5f3fc', marginBottom: 14
              }}>
                <p style={{ fontSize: 10, color: '#0e7490', margin: 0, lineHeight: 1.6 }}>
                  🎉 Show this ticket (QR code or Ticket ID) at the entrance for quick check-in.
                  Keep it safe — it's your entry pass!
                </p>
              </div>

              {/* Branding footer */}
              <div style={{
                textAlign: 'center', paddingTop: 12,
                borderTop: '1px solid #e5e7eb'
              }}>
                <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>
                  Powered by{' '}
                  <span style={{ color: '#0891b2', fontWeight: 800 }}>OutingStation</span>
                  {' '}• outingstation.com
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Action buttons — all buttons, no anchor tags */}
        <div className="px-5 pb-5 space-y-3">
          <button
            onClick={handleDownloadPDF}
            disabled={downloading || !qrReady}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition disabled:opacity-50"
          >
            <Download size={18} />
            {downloading ? 'Generating PDF...' : 'Download PDF Ticket'}
          </button>

          <button
            onClick={() => window.open(verifyUrl, '_blank')}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition"
          >
            <ExternalLink size={16} />
            View Ticket Online
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 text-gray-400 hover:text-gray-600 text-sm font-medium transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div style={{ marginBottom: 9 }}>
      <p style={{
        fontSize: 9, color: '#9ca3af', margin: '0 0 2px',
        textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 12, margin: 0,
        color: highlight ? '#0e7490' : '#111827',
        fontWeight: highlight ? 800 : 500
      }}>
        {value}
      </p>
    </div>
  );
}