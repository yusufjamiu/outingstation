import { useState, useEffect } from 'react';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { AmbassadorSidebar } from '../../components/AmbassadorSidebar';
import {
  Menu, DollarSign, TrendingUp, Clock, CheckCircle,
  AlertCircle, Users, Wallet
} from 'lucide-react';
import toast from 'react-hot-toast';

const MIN_PAYOUT = 5000;
const COMMISSION_THRESHOLD = 100;

function formatNaira(amount) {
  return `₦${Number(amount || 0).toLocaleString()}`;
}

export default function AmbassadorEarnings() {
  const { currentUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [earnings, setEarnings] = useState(null);
  const [userData, setUserData] = useState(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    loadEarnings();
  }, [currentUser]);

  const loadEarnings = async () => {
    try {
      setLoading(true);
      const [earningsSnap, userSnap] = await Promise.all([
        getDoc(doc(db, 'ambassadorEarnings', currentUser.uid)),
        getDoc(doc(db, 'users', currentUser.uid)),
      ]);
      setEarnings(
        earningsSnap.exists()
          ? earningsSnap.data()
          : { totalEarned: 0, availableBalance: 0, totalPaidOut: 0, transactions: [] }
      );
      if (userSnap.exists()) setUserData(userSnap.data());
    } catch (err) {
      console.error(err);
      toast.error('Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!earnings || earnings.availableBalance < MIN_PAYOUT) {
      toast.error(`Minimum payout is ${formatNaira(MIN_PAYOUT)}`);
      return;
    }
    try {
      setRequesting(true);
      await addDoc(collection(db, 'ambassadorPayoutRequests'), {
        ambassadorId: currentUser.uid,
        ambassadorName: userData?.name || '',
        ambassadorEmail: currentUser.email,
        bankName: userData?.bankName || '',
        accountNumber: userData?.accountNumber || '',
        accountName: userData?.accountName || '',
        amount: earnings.availableBalance,
        status: 'pending',
        requestedAt: serverTimestamp(),
      });
      toast.success('Payout request submitted! We process payouts on the 1st of every month.');
      setShowPayoutModal(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit payout request');
    } finally {
      setRequesting(false);
    }
  };

  const totalReferrals = userData?.totalReferrals || 0;
  const isCommissionUnlocked = totalReferrals >= COMMISSION_THRESHOLD;
  const progressPercent = Math.min((totalReferrals / COMMISSION_THRESHOLD) * 100, 100);
  const transactions = earnings?.transactions || [];

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
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Earnings</h2>
              <p className="text-sm text-gray-500">Track your referrals, commissions and payouts</p>
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
                { label: 'Total Earned', value: formatNaira(earnings?.totalEarned), icon: <TrendingUp size={20} className="text-cyan-500" />, bg: 'bg-cyan-50' },
                { label: 'Available Balance', value: formatNaira(earnings?.availableBalance), icon: <Wallet size={20} className="text-green-500" />, bg: 'bg-green-50' },
                { label: 'Total Paid Out', value: formatNaira(earnings?.totalPaidOut), icon: <CheckCircle size={20} className="text-purple-500" />, bg: 'bg-purple-50' },
                { label: 'Total Referrals', value: totalReferrals, icon: <Users size={20} className="text-orange-500" />, bg: 'bg-orange-50' },
              ].map((stat, i) => (
                <div key={i} className={`${stat.bg} rounded-2xl p-4 border border-gray-100`}>
                  <div className="mb-2">{stat.icon}</div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Commission unlock progress */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <DollarSign size={20} className={isCommissionUnlocked ? 'text-green-500' : 'text-gray-400'} />
                  <h3 className="font-bold text-gray-900">City/Campus Commission</h3>
                </div>
                {isCommissionUnlocked
                  ? <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">🔓 Unlocked</span>
                  : <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold">🔒 Locked</span>
                }
              </div>

              {!isCommissionUnlocked ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Refer <strong>{COMMISSION_THRESHOLD - totalReferrals} more people</strong> to unlock your share of 50% service fee from all events in your city/campus.
                  </p>
                  <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-cyan-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{totalReferrals} referrals</span>
                    <span>{COMMISSION_THRESHOLD} needed</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  You're earning 50% of the service fee from all events in your city/campus, split equally among qualified ambassadors. Commission is credited automatically after each ticket purchase.
                </p>
              )}
            </div>

            {/* Payout section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
              <h3 className="font-bold text-gray-900 mb-2">Request Payout</h3>
              <p className="text-sm text-gray-500 mb-4">
                Minimum payout is {formatNaira(MIN_PAYOUT)}. Payouts are processed on the <strong>1st of every month</strong> to your bank account.
              </p>

              {(earnings?.availableBalance || 0) >= MIN_PAYOUT ? (
                <button
                  onClick={() => setShowPayoutModal(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-cyan-400 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition"
                >
                  Request {formatNaira(earnings?.availableBalance)} Payout
                </button>
              ) : (
                <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
                  <AlertCircle size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-500">
                    You need at least {formatNaira(MIN_PAYOUT)} to request a payout. Your current balance is {formatNaira(earnings?.availableBalance)}.
                  </p>
                </div>
              )}
            </div>

            {/* Transaction history */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Commission History</h3>
              {transactions.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="mx-auto text-gray-300 mb-3" size={40} />
                  <p className="text-gray-500 text-sm">No commission earned yet</p>
                  <p className="text-gray-400 text-xs mt-1">
                    {isCommissionUnlocked
                      ? 'Commission will appear here after ticket purchases in your area'
                      : `Reach ${COMMISSION_THRESHOLD} referrals to start earning commission`
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...transactions].reverse().map((tx, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{tx.eventTitle || 'Event Commission'}</p>
                        <p className="text-xs text-gray-400">
                          {tx.date ? new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-green-600">+{formatNaira(tx.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Payout Confirmation Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Payout Request</h3>
            <p className="text-sm text-gray-500 mb-4">
              You're requesting a payout of <strong>{formatNaira(earnings?.availableBalance)}</strong>. This will be sent to your registered bank account on the 1st of next month.
            </p>
            <div className="bg-gray-50 rounded-xl p-3 mb-5 text-sm space-y-1">
              <p className="text-gray-600">Bank: <strong>{userData?.bankName || '—'}</strong></p>
              <p className="text-gray-600">Account: <strong>{userData?.accountNumber || '—'}</strong></p>
              <p className="text-gray-600">Name: <strong>{userData?.accountName || '—'}</strong></p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleRequestPayout} disabled={requesting}
                className="flex-1 py-3 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 transition disabled:opacity-50">
                {requesting ? 'Submitting...' : 'Confirm Request'}
              </button>
              <button onClick={() => setShowPayoutModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}