import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { AmbassadorSidebar } from '../../components/AmbassadorSidebar';
import {
  Menu, TrendingUp, Clock, CheckCircle, Users, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

// ✅ CHANGED — plan change: this page is now pure referral tracking.
// Ambassadors are paid manually/upfront outside the app — there's no
// amount to compute, no tier, and no payout request flow anymore. This
// just shows how many people they've referred this cycle, and a history
// of past 30-day cycles.
const CYCLE_DAYS = 30;

function getCycleDayInfo(cycleStartAt) {
  if (!cycleStartAt) {
    return { daysElapsed: 0, daysRemaining: CYCLE_DAYS, cycleComplete: false };
  }
  const startMs = cycleStartAt.toDate ? cycleStartAt.toDate().getTime() : new Date(cycleStartAt).getTime();
  const daysElapsed = Math.floor((Date.now() - startMs) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, CYCLE_DAYS - daysElapsed);
  return { daysElapsed, daysRemaining, cycleComplete: daysElapsed >= CYCLE_DAYS };
}

export default function AmbassadorTracking() {
  const { currentUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [earningsSnap, userSnap] = await Promise.all([
        getDoc(doc(db, 'ambassadorEarnings', currentUser.uid)),
        getDoc(doc(db, 'users', currentUser.uid)),
      ]);
      setEarnings(earningsSnap.exists() ? earningsSnap.data() : { cycleHistory: [] });
      if (userSnap.exists()) setUserData(userSnap.data());
    } catch (err) {
      console.error(err);
      toast.error('Failed to load your referral tracking');
    } finally {
      setLoading(false);
    }
  };

  const cycleReferrals = userData?.cycleReferrals || 0;
  const totalReferrals = userData?.totalReferrals || 0;
  // Approval (isAmbassador) and tracking activation are separate — an
  // admin has to explicitly flip this via "Activate Tracking" on the
  // applications page before a cycle starts accruing.
  const trackingActivated = userData?.earningActivated === true;
  const { daysElapsed, daysRemaining, cycleComplete } = getCycleDayInfo(userData?.cycleStartAt);
  const cycleHistory = earnings?.cycleHistory || [];
  const cyclesCompleted = cycleHistory.length;

  return (
    <div className="flex h-screen bg-gray-50">
      <AmbassadorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">

        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Referral Tracking</h2>
              <p className="text-sm text-gray-500">Your referral progress, 30 days at a time</p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
          </div>
        ) : (
          <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'This Cycle', value: cycleReferrals, icon: <TrendingUp size={20} className="text-cyan-500" />, bg: 'bg-cyan-50' },
                { label: 'Total Referrals', value: totalReferrals, icon: <Users size={20} className="text-orange-500" />, bg: 'bg-orange-50' },
                { label: 'Cycles Completed', value: cyclesCompleted, icon: <CheckCircle size={20} className="text-purple-500" />, bg: 'bg-purple-50' },
                { label: 'Days Left', value: trackingActivated ? daysRemaining : '—', icon: <Calendar size={20} className="text-green-500" />, bg: 'bg-green-50' },
              ].map((stat, i) => (
                <div key={i} className={`${stat.bg} rounded-2xl p-4 border border-gray-100`}>
                  <div className="mb-2">{stat.icon}</div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {!trackingActivated ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <Clock className="mx-auto text-gray-300 mb-3" size={40} />
                <h3 className="font-bold text-gray-900 mb-1">Tracking not activated yet</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  You're an approved ambassador, but cycle tracking hasn't been turned on for your account yet. Your referrals are still being counted — once tracking is activated, your 30-day cycle will begin.
                </p>
              </div>
            ) : (
              <>
                {/* Current cycle progress */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={20} className="text-cyan-500" />
                      <h3 className="font-bold text-gray-900">Current Cycle</h3>
                    </div>
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                      <Calendar size={12} />
                      {cycleComplete ? 'Cycle ended' : `Day ${daysElapsed}/${CYCLE_DAYS}`}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    <strong className="text-gray-900">{cycleReferrals}</strong> referral{cycleReferrals === 1 ? '' : 's'} this cycle.
                    {cycleComplete
                      ? ' This cycle has ended — a new one starts automatically.'
                      : ` ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left before this cycle wraps up and a new one begins.`}
                  </p>

                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-cyan-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((daysElapsed / CYCLE_DAYS) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                    <span>Day {Math.min(daysElapsed, CYCLE_DAYS)}</span>
                    <span>Day {CYCLE_DAYS}</span>
                  </div>
                </div>

                {/* Cycle history */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Cycle History</h3>
                  {cycleHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="mx-auto text-gray-300 mb-3" size={40} />
                      <p className="text-gray-500 text-sm">No completed cycles yet</p>
                      <p className="text-gray-400 text-xs mt-1">Your first completed 30-day cycle will show up here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[...cycleHistory].reverse().map((cycle, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Users size={16} className="text-cyan-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {cycle.referrals} referral{cycle.referrals === 1 ? '' : 's'}
                              </p>
                              <p className="text-xs text-gray-400">
                                {cycle.cycleEnd
                                  ? new Date(cycle.cycleEnd.toDate ? cycle.cycleEnd.toDate() : cycle.cycleEnd)
                                      .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : '—'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
        )}
      </main>
    </div>
  );
}