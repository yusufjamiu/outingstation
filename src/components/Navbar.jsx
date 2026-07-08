import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu, X, LogOut, ChevronDown,
  CalendarDays, MapPin, Building2, GraduationCap, Briefcase,
  UtensilsCrossed, Palmtree, Sparkles, Rocket, Car,
  Cake, Heart, Award, Church, Landmark, Mic2, PartyPopper, BookOpen,
  Compass, Store, ListPlus, Handshake, LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import OutingStation from '../assets/OutingStation.png';
import googlePlayBadge from '../assets/google-play.png';
import appStoreBadge from '../assets/app-store.svg';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.outingstation&pcampaignid=web_share';

const DISCOVER_ITEMS = [
  { icon: CalendarDays,   label: 'Events',        to: '/events',         live: true  },
  { icon: MapPin,         label: 'Places',         to: '/places',         live: true  },
  { icon: GraduationCap,  label: 'Campus',         to: '/campus',         live: true  },
  { icon: Building2,      label: 'Event Halls',    to: '/halls',          live: true  },
  { icon: UtensilsCrossed,label: 'Restaurants',    to: '/restaurants',    live: true  },
  { icon: Palmtree,       label: 'Resorts',        to: '/resorts',        live: true  },
  { icon: Car,          label: 'Rent a Ride',    to: '/rent-a-ride',    live: true  },
  { icon: Store,          label: 'Marketplace',    to: '/marketplace',    live: true  },
  { icon: Briefcase,      label: 'Opportunities',  to: '/opportunities',  live: false },
  { icon: Sparkles,       label: 'Experiences',    to: '/experiences',    live: false },
];

const PLAN_ITEMS = [
  { icon: Cake,         label: 'Birthday',        to: '/plan-event?type=birthday',    live: true },
  { icon: Heart,        label: 'Wedding',          to: '/plan-event?type=wedding',     live: true },
  { icon: Award,        label: 'Graduation',       to: '/plan-event?type=graduation',  live: true },
  { icon: Church,       label: 'Religious Event',  to: '/plan-event?type=religious',   live: true },
  { icon: Landmark,     label: 'Corporate Event',  to: '/plan-event?type=corporate',   live: true },
  { icon: Mic2,         label: 'Concert',          to: '/plan-event?type=concert',     live: true },
  { icon: PartyPopper,  label: 'Party',            to: '/plan-event?type=party',       live: true },
  { icon: BookOpen,     label: 'Seminar',          to: '/plan-event?type=seminar',     live: true },
];

const BUSINESS_ITEMS = [
  { icon: LayoutDashboard, label: 'OSB — Business Dashboard', to: '/business',         live: true  },
  { icon: Store,           label: 'List Your Business',        to: '/business/register',live: true  },
  { icon: CalendarDays,    label: 'Manage Events',             to: '/manage-events',   live: true  },
  { icon: GraduationCap,   label: 'Ambassador',                to: '/ambassador',       live: true  },
  { icon: Rocket,          label: 'Campus Vendor',             to: '/campus-vendor',    live: true  },
  { icon: ListPlus,        label: 'Create Event',              to: '/create-event',     live: true  },
  { icon: ListPlus,        label: 'List Places',              to: '/create-place',     live: true  },
  { icon: Handshake,       label: 'Become a Partner',          to: '/partner',          live: false },
];

function useOutsideClick(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

function DesktopDropdown({ label, items, requireLogin, currentUser, navigate, starred }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutsideClick(ref, () => setOpen(false));

  const handleItemClick = (item) => {
    setOpen(false);
    if (!item.live) return;
    if (requireLogin && !currentUser) {
      navigate('/login');
      return;
    }
    navigate(item.to);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 text-sm font-medium transition px-1 py-1 rounded-lg
          ${open ? 'text-cyan-500' : 'text-gray-700 hover:text-cyan-500'}`}
      >
        {label}
        {starred && (
          <sup className="text-[9px] font-black text-cyan-500 -top-1.5 ml-0.5">NEW</sup>
        )}
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
          {items.map((item) => {
            const Icon = item.icon;
            const isComingSoon = item.live === false;
            return (
              <button
                key={item.label}
                onClick={() => handleItemClick(item)}
                disabled={isComingSoon}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition
                  ${isComingSoon
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-cyan-50 hover:text-cyan-600 cursor-pointer'
                  }`}
              >
                <Icon size={15} className={isComingSoon ? 'text-gray-300' : 'text-cyan-500'} />
                <span>{item.label}</span>
                {isComingSoon && (
                  <span className="ml-auto text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
          {requireLogin && (
            <div className="border-t border-gray-100 mt-2 pt-2 px-3 pb-1 space-y-1.5">
              <button
                onClick={() => {
                  setOpen(false);
                  if (!currentUser) { navigate('/login'); return; }
                  navigate('/my-events');
                }}
                className="w-full text-cyan-600 text-xs font-bold py-2 rounded-xl hover:bg-cyan-50 transition"
              >
                📋 My Events
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  if (!currentUser) { navigate('/login'); return; }
                  navigate('/plan-event');
                }}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold py-2.5 rounded-xl hover:from-cyan-600 hover:to-blue-600 transition flex items-center justify-center gap-2"
              >
                <Sparkles size={13} /> Start Planning
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showAppModal, setShowAppModal] = useState(false);
  const [mobileSection, setMobileSection] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [myBusinesses, setMyBusinesses] = useState([]);
  const navigate = useNavigate();
  const { currentUser, userProfile, logout } = useAuth();
  const accountRef = useRef(null);
  useOutsideClick(accountRef, () => setAccountOpen(false));

  useEffect(() => {
    if (!currentUser) { setMyBusinesses([]); return; }
    const loadMyBusinesses = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'businesses'), where('ownerId', '==', currentUser.uid)));
        setMyBusinesses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error loading businesses for navbar:', err);
      }
    };
    loadMyBusinesses();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const displayName = userProfile?.name || currentUser?.displayName || 'User';
  const avatarUrl =
    userProfile?.avatar ||
    userProfile?.photoURL ||
    currentUser?.photoURL ||
    'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=22D3EE&color=fff&size=128';
  const fallbackAvatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=22D3EE&color=fff&size=128';

  const closeMobile = () => { setIsOpen(false); setMobileSection(null); };

  const handleMobileItem = (item, requireLogin) => {
    if (!item.live) return;
    if (requireLogin && !currentUser) { closeMobile(); navigate('/login'); return; }
    closeMobile();
    navigate(item.to);
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center h-16">

          <Link to="/" className="flex items-center absolute left-0">
            <img src={OutingStation} alt="OutingStation" className="h-12 w-auto" />
          </Link>

          <div className="hidden lg:flex flex-1 justify-center items-center space-x-1">
            <DesktopDropdown
              label="Discover"
              items={DISCOVER_ITEMS}
              requireLogin={false}
              currentUser={currentUser}
              navigate={navigate}
            />
            <DesktopDropdown
              label="Plan Event"
              items={PLAN_ITEMS}
              requireLogin={true}
              currentUser={currentUser}
              navigate={navigate}
            />
            <DesktopDropdown
              label="Business"
              items={BUSINESS_ITEMS}
              requireLogin={false}
              currentUser={currentUser}
              navigate={navigate}
            />

          </div>

          <div className="hidden lg:flex items-center gap-2 absolute right-0">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-outing-ai'))}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-cyan-500 transition px-3 py-1.5 rounded-full hover:bg-cyan-50"
            >
              <Compass size={16} className="text-cyan-500" />
              Outing AI
            </button>

            <button
              onClick={() => setShowAppModal(true)}
              className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-full font-medium hover:bg-gray-50 transition text-sm"
            >
              Get App
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2" ref={accountRef}>
                <div className="relative">
                  <button
                    onClick={() => setAccountOpen(!accountOpen)}
                    className="flex items-center gap-1.5 text-gray-700 hover:text-cyan-500 transition"
                  >
                    <img
                      src={avatarUrl} alt={displayName}
                      className="w-8 h-8 rounded-full object-cover border-2 border-cyan-200"
                      onError={(e) => { e.target.onerror = null; e.target.src = fallbackAvatar; }}
                    />
                    <ChevronDown size={14} className={`transition-transform duration-200 ${accountOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {accountOpen && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50">
                      <Link
                        to="/dashboard"
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-cyan-50 transition"
                      >
                        <img
                          src={avatarUrl} alt={displayName}
                          className="w-10 h-10 rounded-full object-cover border-2 border-cyan-200 flex-shrink-0"
                          onError={(e) => { e.target.onerror = null; e.target.src = fallbackAvatar; }}
                        />
                        <span className="font-semibold text-gray-900 truncate">{displayName}</span>
                      </Link>

                      {myBusinesses.length > 0 && (
                        <>
                          <div className="border-t border-gray-100 my-1" />
                          {myBusinesses.map((biz) => (
                            <Link
                              key={biz.id}
                              to={`/business?business=${biz.id}`}
                              onClick={() => setAccountOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-cyan-50 transition"
                            >
                              {biz.logoUrl ? (
                                <img src={biz.logoUrl} alt={biz.businessName} className="w-8 h-8 rounded-lg object-cover border-2 border-cyan-200 flex-shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-cyan-50 border-2 border-cyan-200 flex items-center justify-center flex-shrink-0">
                                  <Store size={15} className="text-cyan-400" />
                                </div>
                              )}
                              <span className="text-sm text-gray-700 truncate">{biz.businessName}</span>
                            </Link>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-red-50"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-cyan-500 transition px-3 py-1.5">
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-5 py-2 rounded-full text-sm font-medium hover:shadow-lg transition-shadow"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          <div className="lg:hidden flex items-center gap-2 absolute right-0">
            <button
              onClick={() => setShowAppModal(true)}
              className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-full font-medium text-xs hover:bg-gray-50 transition"
            >
              Get App
            </button>
            <button
              onClick={() => { setIsOpen(!isOpen); setMobileSection(null); }}
              className="text-gray-700 p-1"
            >
              {isOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="lg:hidden border-t border-gray-100 pb-4">

            <div className="px-1 pt-3 pb-2">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-outing-ai'))}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 text-cyan-600 font-bold text-sm py-3 rounded-xl hover:from-cyan-100 hover:to-blue-100 transition"
              >
                <Compass size={16} />
                Ask Outing AI
              </button>
            </div>

            {currentUser && (
              <div className="border-t border-gray-100 pt-2">
                <Link
                  to="/dashboard"
                  onClick={closeMobile}
                  className="flex items-center gap-3 px-3 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition rounded-xl"
                >
                  <img
                    src={avatarUrl} alt={displayName}
                    className="w-7 h-7 rounded-full object-cover border-2 border-cyan-200"
                    onError={(e) => { e.target.onerror = null; e.target.src = fallbackAvatar; }}
                  />
                  Dashboard
                </Link>

                {myBusinesses.length > 0 && (
                  <div className="px-3 pb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Your Pages</p>
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {myBusinesses.map((biz) => (
                        <Link
                          key={biz.id}
                          to={`/business?business=${biz.id}`}
                          onClick={closeMobile}
                          className="flex flex-col items-center gap-1 flex-shrink-0 w-16"
                        >
                          {biz.logoUrl ? (
                            <img src={biz.logoUrl} alt={biz.businessName} className="w-12 h-12 rounded-xl object-cover border-2 border-cyan-200" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-cyan-50 border-2 border-cyan-200 flex items-center justify-center">
                              <Store size={18} className="text-cyan-400" />
                            </div>
                          )}
                          <span className="text-[10px] text-gray-600 text-center truncate w-full">{biz.businessName}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-gray-100 pt-2">
              <button
                onClick={() => setMobileSection(mobileSection === 'discover' ? null : 'discover')}
                className="w-full flex items-center justify-between px-2 py-3 text-sm font-semibold text-gray-800"
              >
                <span>Discover</span>
                <ChevronDown size={14} className={`transition-transform ${mobileSection === 'discover' ? 'rotate-180 text-cyan-500' : 'text-gray-400'}`} />
              </button>
              {mobileSection === 'discover' && (
                <div className="pl-3 pb-2 space-y-0.5">
                  {DISCOVER_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isComingSoon = !item.live;
                    return (
                      <button
                        key={item.label}
                        onClick={() => handleMobileItem(item, false)}
                        disabled={isComingSoon}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition
                          ${isComingSoon ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-cyan-50 hover:text-cyan-600'}`}
                      >
                        <Icon size={14} className={isComingSoon ? 'text-gray-300' : 'text-cyan-500'} />
                        {item.label}
                        {isComingSoon && (
                          <span className="ml-auto text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Soon</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100">
              <button
                onClick={() => setMobileSection(mobileSection === 'plan' ? null : 'plan')}
                className="w-full flex items-center justify-between px-2 py-3 text-sm font-semibold text-gray-800"
              >
                <span>
                  Plan Event
                </span>
                <ChevronDown size={14} className={`transition-transform ${mobileSection === 'plan' ? 'rotate-180 text-cyan-500' : 'text-gray-400'}`} />
              </button>
              {mobileSection === 'plan' && (
                <div className="pl-3 pb-2 space-y-0.5">
                  {PLAN_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        onClick={() => handleMobileItem(item, true)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left text-gray-700 hover:bg-cyan-50 hover:text-cyan-600 transition"
                      >
                        <Icon size={14} className="text-cyan-500" />
                        {item.label}
                      </button>
                    );
                  })}
                  <div className="px-3 pt-1 pb-1 space-y-1.5">
                    <button
                      onClick={() => {
                        closeMobile();
                        if (!currentUser) { navigate('/login'); return; }
                        navigate('/my-events');
                      }}
                      className="w-full text-cyan-600 text-xs font-bold py-2 rounded-xl hover:bg-cyan-50 transition"
                    >
                      📋 My Events
                    </button>
                    <button
                      onClick={() => {
                        closeMobile();
                        if (!currentUser) { navigate('/login'); return; }
                        navigate('/plan-event');
                      }}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold py-2.5 rounded-xl hover:from-cyan-600 hover:to-blue-600 transition flex items-center justify-center gap-2"
                    >
                      <Sparkles size={13} /> Start Planning
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100">
              <button
                onClick={() => setMobileSection(mobileSection === 'business' ? null : 'business')}
                className="w-full flex items-center justify-between px-2 py-3 text-sm font-semibold text-gray-800"
              >
                <span>
                  Business
                </span>
                <ChevronDown size={14} className={`transition-transform ${mobileSection === 'business' ? 'rotate-180 text-cyan-500' : 'text-gray-400'}`} />
              </button>
              {mobileSection === 'business' && (
                <div className="pl-3 pb-2 space-y-0.5">
                  {BUSINESS_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isComingSoon = !item.live;
                    return (
                      <button
                        key={item.label}
                        onClick={() => handleMobileItem(item, false)}
                        disabled={isComingSoon}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition
                          ${isComingSoon ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-cyan-50 hover:text-cyan-600'}`}
                      >
                        <Icon size={14} className={isComingSoon ? 'text-gray-300' : 'text-cyan-500'} />
                        {item.label}
                        {isComingSoon && (
                          <span className="ml-auto text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Soon</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-2 px-1">
              {currentUser ? (
                <button
                  onClick={() => { handleLogout(); closeMobile(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition"
                >
                  <LogOut size={15} />
                  Logout
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={closeMobile}
                    className="block text-center px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    onClick={closeMobile}
                    className="block text-center bg-gradient-to-r from-cyan-400 to-cyan-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg transition-shadow"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>

          </div>
        )}
      </div>

      {showAppModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
          onClick={() => setShowAppModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAppModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
            >
              <X size={20} />
            </button>
            <div className="text-center mb-6">
              <img src={OutingStation} alt="OutingStation" className="h-12 w-auto mx-auto mb-3" />
              <h3 className="text-xl font-bold text-gray-900">Get the OutingStation App</h3>
              <p className="text-sm text-gray-500 mt-1">One App. Many Experiences.</p>
            </div>
            <div className="space-y-3">
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full bg-gray-900 rounded-xl px-4 py-2 hover:bg-gray-800 transition"
              >
                <img src={googlePlayBadge} alt="Get it on Google Play" className="h-20 w-auto" />
              </a>
              <div className="flex items-center justify-center w-full bg-gray-100 rounded-xl px-4 py-3 cursor-not-allowed relative">
                <img src={appStoreBadge} alt="Download on the App Store" className="h-10 w-auto opacity-40 grayscale" />
                <span className="absolute -top-2 -right-2 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full whitespace-nowrap shadow-sm border border-amber-200">
                  99% Ready
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center mt-5">
              iOS is in final review — we'll be live very soon! 🚀
            </p>
          </div>
        </div>
      )}
    </nav>
  );
}