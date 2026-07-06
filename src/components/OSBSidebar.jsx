import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Plus, X, CheckCircle2, LogOut, ArrowLeft, ChevronDown } from 'lucide-react';

export default function OSBSidebar({
  isOpen, onClose, businesses, selectedId, onSelectBusiness,
  navItems, activeSection, onSelectSection, selectedBusiness, badgeCounts,
}) {
  const navigate = useNavigate();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const hasMultiple = businesses.length > 1;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <div>
              <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">OutingStation</p>
              <h1 className="text-lg font-black text-gray-900">Business Dashboard</h1>
            </div>
            <button onClick={onClose} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>

          {/* Business switcher */}
          <div className="p-4 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Your Business</p>

            {hasMultiple ? (
              <div className="relative">
                <button
                  onClick={() => setSwitcherOpen(!switcherOpen)}
                  className="w-full flex items-center justify-between gap-2 border-2 border-gray-100 rounded-xl p-2.5 hover:border-cyan-300 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {selectedBusiness?.logoUrl ? (
                      <img src={selectedBusiness.logoUrl} alt="" className="w-7 h-7 rounded-lg object-cover border-2 border-cyan-200 flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-cyan-50 border-2 border-cyan-200 flex items-center justify-center flex-shrink-0">
                        <Store size={12} className="text-cyan-400" />
                      </div>
                    )}
                    <span className="text-sm font-bold text-gray-900 truncate">{selectedBusiness?.businessName}</span>
                  </div>
                  <ChevronDown size={16} className={`text-gray-400 flex-shrink-0 transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
                </button>

                {switcherOpen && (
                  <div className="mt-1.5 border-2 border-gray-100 rounded-xl overflow-hidden">
                    {businesses.map(b => (
                      <button
                        key={b.id}
                        onClick={() => { onSelectBusiness(b.id); setSwitcherOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition border-b border-gray-50 last:border-0 ${
                          b.id === selectedId ? 'bg-cyan-50 text-cyan-700 font-bold' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {b.logoUrl ? (
                          <img src={b.logoUrl} alt="" className="w-6 h-6 rounded-md object-cover border border-cyan-200 flex-shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-md bg-cyan-50 border border-cyan-200 flex items-center justify-center flex-shrink-0">
                            <Store size={10} className="text-cyan-400" />
                          </div>
                        )}
                        <span className="truncate flex-1 text-left">{b.businessName}</span>
                        {b.id === selectedId && <CheckCircle2 size={13} className="flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              businesses.map(b => (
                <div key={b.id} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm bg-cyan-50 text-cyan-700 font-bold">
                  {b.logoUrl ? (
                    <img src={b.logoUrl} alt="" className="w-7 h-7 rounded-lg object-cover border-2 border-cyan-200 flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-cyan-50 border-2 border-cyan-200 flex items-center justify-center flex-shrink-0">
                      <Store size={12} className="text-cyan-400" />
                    </div>
                  )}
                  <span className="truncate">{b.businessName}</span>
                </div>
              ))
            )}

            <button
              onClick={() => navigate('/business/register')}
              className="w-full flex items-center gap-2 px-3 py-2.5 mt-1.5 rounded-xl text-sm text-cyan-600 font-semibold hover:bg-cyan-50 transition"
            >
              <Plus size={14} /> Add New Business
            </button>
          </div>

          {/* Nav */}
          {selectedBusiness && selectedBusiness.status === 'approved' && (
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map(item => {
                const Icon = item.icon;
                const active = activeSection === item.key;
                const badgeCount = badgeCounts?.[item.key] || 0;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => { onSelectSection(item.key); onClose(); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                      active ? 'bg-cyan-50 text-cyan-600 font-bold' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {badgeCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    )}
                    {item.comingSoon && (
                      <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full flex-shrink-0">Soon</span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors text-sm"
            >
              <ArrowLeft size={18} />
              <span className="font-medium">Back to OutingStation</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}