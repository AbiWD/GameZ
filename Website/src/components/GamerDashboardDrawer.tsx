import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  Plus, 
  AlertOctagon, 
  CheckCircle, 
  Trash2, 
  Hourglass, 
  LogOut, 
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { useAuthAndBooking, parseTimeToDecimal, formatDecimalToTime } from '../context/AuthAndBookingContext';
import { STATIONS } from '../data';

interface GamerDashboardDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  setRoute: (route: string) => void;
}

export const GamerDashboardDrawer: React.FC<GamerDashboardDrawerProps> = ({ 
  isOpen, 
  onClose,
  setRoute
}) => {
  const { currentUser, bookings, logout, cancelBooking, extendBooking, checkSlotConflict } = useAuthAndBooking();
  const [activeTab, setActiveTab] = useState<'reservations' | 'profile'>('reservations');
  
  // Extension sub-states
  const [extendingBookingId, setExtendingBookingId] = useState<string | null>(null);
  const [cancelingBookingId, setCancelingBookingId] = useState<string | null>(null);
  const [extensionHours, setExtensionHours] = useState<number>(1);
  const [extensionError, setExtensionError] = useState<string | null>(null);
  const [extensionSuccess, setExtensionSuccess] = useState<string | null>(null);
  const [isApplyingExtension, setIsApplyingExtension] = useState(false);

  if (!currentUser) return null;

  // Filter bookings linked to current user (by matching email case-insensitively)
  const userBookings = bookings.filter(
    b => b.customerEmail.toLowerCase() === currentUser.email.toLowerCase() && b.status !== 'cancelled'
  );

  // Helper to find the station info from its ID
  const getStationName = (stationId: string) => {
    const s = STATIONS.find(x => x.id === stationId);
    return s ? s.name : 'Gaming Console';
  };

  const getStationRate = (stationId: string) => {
    const s = STATIONS.find(x => x.id === stationId);
    return s ? s.ratePerHour : 100;
  };

  const handleCancel = async (bookingId: string) => {
    await cancelBooking(bookingId);
    setCancelingBookingId(null);
  };

  const startExtensionFlow = (bookingId: string) => {
    setExtendingBookingId(bookingId);
    setCancelingBookingId(null);
    setExtensionHours(1);
    setExtensionError(null);
    setExtensionSuccess(null);
  };

  const handleApplyExtension = async (bookingId: string) => {
    setExtensionError(null);
    setExtensionSuccess(null);
    setIsApplyingExtension(true);

    try {
      const res = await extendBooking(bookingId, extensionHours);
      if (res.success) {
        setExtensionSuccess(`Session extended by +${extensionHours} hour(s)! Simulated receipt confirmation email dispatched.`);
        setTimeout(() => {
          setExtendingBookingId(null);
        }, 1800);
      } else {
        setExtensionError(res.error || 'Failed to apply extension.');
      }
    } catch(err: any) {
      setExtensionError(err?.message || 'Error applying extension');
    } finally {
      setIsApplyingExtension(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-end">
          
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Drawer Sheet Body */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.35, ease: 'easeInOut' }}
            className="relative w-full max-w-lg h-full bg-cyber-gray border-l border-white/5 flex flex-col justify-stretch z-10 p-6 sm:p-8"
          >
            {/* Top Glowing Ribbon indicator */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyber-cyan via-cyber-purple to-cyber-pink" />

            {/* Header section */}
            <div className="flex items-center justify-between pb-5 border-b border-white/5 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyber-purple/10 border border-cyber-purple/20 text-cyber-purple">
                  <User className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-extrabold text-white leading-tight">
                    {currentUser.name}
                  </h3>
                  <span className="block font-mono text-[9px] uppercase tracking-wider text-cyber-cyan">
                    Gamer Pass Active
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-cyber-pink hover:bg-cyber-pink/10 border border-cyber-pink/20 rounded-xl transition cursor-pointer"
                  title="Sign Out Session"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Segmented Navigation tab controls */}
            <div className="flex bg-cyber-dark/40 border border-white/5 rounded-xl p-1 mb-6">
              <button
                onClick={() => setActiveTab('reservations')}
                className={`flex-1 py-2 text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === 'reservations'
                    ? 'bg-cyber-lightgray text-cyber-cyan border border-white/5 font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                My Reservations ({userBookings.length})
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-2 text-xs font-display font-semibold uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === 'profile'
                    ? 'bg-cyber-lightgray text-cyber-purple border border-white/5 font-bold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Gamer Profile Card
              </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {activeTab === 'reservations' && (
                <>
                  {userBookings.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12 px-6 text-gray-500 space-y-3">
                      <Calendar className="h-10 w-10 text-gray-600" />
                      <h4 className="font-display font-bold text-sm text-white">No Active Reservations</h4>
                      <p className="text-xs text-gray-400 max-w-[280px]">
                        You don't have any table or console reservation slips booked. Book a play schedule now.
                      </p>
                      <button
                        onClick={() => {
                          setRoute('/book');
                          onClose();
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-cyber-purple to-cyber-cyan text-white text-xs font-display font-semibold rounded-xl hover:scale-105 transition cursor-pointer"
                      >
                        Reserve Now
                      </button>
                    </div>
                  ) : (
                    userBookings.map((booking) => {
                      const isExtending = extendingBookingId === booking.id;
                      const startHour = parseTimeToDecimal(booking.startTime);
                      const endHourDecimal = startHour + booking.durationHours;
                      const endTimeFormatted = formatDecimalToTime(endHourDecimal);
                      const stationRate = getStationRate(booking.stationId);

                      return (
                        <div 
                          key={booking.id}
                          className="relative p-5 rounded-xl border border-white/5 bg-cyber-lightgray/20 space-y-4"
                        >
                          {/* Station Category indicator */}
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="inline-block text-[9px] font-mono font-bold tracking-widest uppercase text-cyber-cyan px-2 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan/20">
                                {getStationName(booking.stationId)}
                              </span>
                              <h4 className="font-display text-base font-extrabold text-white mt-1">
                                Pass Code: <span className="text-cyber-purple font-mono">{booking.verificationCode}</span>
                              </h4>
                            </div>
                            <span className="font-mono text-base font-extrabold text-cyber-neon">
                              ₹{booking.totalPrice}
                            </span>
                          </div>

                          {/* Specific Booking details row */}
                          <div className="grid grid-cols-2 gap-3 text-xs border-y border-white/5 py-3">
                            <div className="flex items-center gap-1.5 text-gray-400">
                              <Calendar className="h-3.5 w-3.5 text-cyber-purple shrink-0" />
                              <span className="font-mono text-white/90">{booking.bookingDate}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-400">
                              <Clock className="h-3.5 w-3.5 text-cyber-purple shrink-0" />
                              <span className="font-mono text-white/90">
                                {booking.startTime} - {endTimeFormatted}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-400">
                              <Hourglass className="h-3.5 w-3.5 text-cyber-purple shrink-0" />
                              <span>{booking.durationHours} hours total</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-400">
                              <ShieldCheck className="h-3.5 w-3.5 text-cyber-neon shrink-0" />
                              <span className="text-cyber-neon font-semibold uppercase text-[10px]">Lobby Confirmed</span>
                            </div>
                          </div>

                          {/* Action triggers: Extend hours or cancel */}
                          {!isExtending && cancelingBookingId !== booking.id ? (
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => startExtensionFlow(booking.id)}
                                className="flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider text-cyber-cyan bg-cyber-cyan/10 hover:bg-cyber-cyan/20 border border-cyber-cyan/30 rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Extend Hours
                              </button>
                              <button
                                onClick={() => {
                                  setCancelingBookingId(booking.id);
                                  setExtendingBookingId(null);
                                }}
                                className="px-3.5 py-2 text-xs text-gray-500 hover:text-cyber-pink hover:bg-cyber-pink/10 border border-transparent hover:border-cyber-pink/20 rounded-xl transition cursor-pointer"
                                title="Cancel and Release Booking"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ) : isExtending ? (
                            /* EXTENSION FORM OVERLAY INLINE */
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-4 bg-cyber-dark/60 rounded-xl border border-cyber-cyan/30 space-y-4 text-left"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-display font-extrabold text-white flex items-center gap-1">
                                  <Zap className="h-4 w-4 text-cyber-cyan animate-pulse" />
                                  Extend Play Session
                                </span>
                                <button
                                  onClick={() => setExtendingBookingId(null)}
                                  className="text-[10px] font-mono text-gray-400 hover:text-white"
                                >
                                  Cancel
                                </button>
                              </div>

                              {extensionError && (
                                <div className="p-2.5 rounded-lg bg-cyber-pink/10 border border-cyber-pink/20 text-[11px] text-cyber-pink flex items-start gap-1.5 leading-relaxed font-sans">
                                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                  <span>{extensionError}</span>
                                </div>
                              )}

                              {extensionSuccess && (
                                <div className="p-2.5 rounded-lg bg-cyber-neon/10 border border-cyber-neon/20 text-[11px] text-cyber-neon flex items-start gap-1.5 leading-relaxed font-sans">
                                  <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                  <span>{extensionSuccess}</span>
                                </div>
                              )}

                              {!extensionSuccess && (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-400">Additional Hours</span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        disabled={extensionHours <= 1}
                                        onClick={() => setExtensionHours(p => p - 1)}
                                        className="h-7 w-7 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white disabled:opacity-30"
                                      >
                                        -
                                      </button>
                                      <span className="font-mono text-sm font-extrabold text-cyber-cyan w-4 text-center">
                                        {extensionHours}
                                      </span>
                                      <button
                                        type="button"
                                        disabled={extensionHours >= 3}
                                        onClick={() => setExtensionHours(p => p + 1)}
                                        className="h-7 w-7 rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white disabled:opacity-30"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  <div className="border-t border-white/5 pt-3 flex items-center justify-between text-xs text-gray-400">
                                    <span>Extension rate ({extensionHours}h)</span>
                                    <span className="font-mono text-white">₹{stationRate} × {extensionHours} = ₹{stationRate * extensionHours}</span>
                                  </div>

                                  <button
                                    type="button"
                                    disabled={isApplyingExtension}
                                    onClick={() => handleApplyExtension(booking.id)}
                                    className="w-full py-2 bg-gradient-to-r from-cyber-cyan to-cyber-purple text-white text-xs font-mono font-bold uppercase rounded-lg hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-1"
                                  >
                                    {isApplyingExtension ? 'Calculating Matrix...' : 'Secure Play Extension'}
                                  </button>
                                </div>
                              )}
                            </motion.div>
                          ) : cancelingBookingId === booking.id ? (
                            /* CANCELLATION OVERLAY */
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-4 bg-cyber-dark/60 rounded-xl border border-cyber-pink/30 space-y-4 text-left"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-display font-extrabold text-white flex items-center gap-1">
                                  <ShieldAlert className="h-4 w-4 text-cyber-pink" />
                                  Confirm Cancellation
                                </span>
                              </div>
                              <p className="text-xs text-gray-400">
                                Are you sure you want to cancel this reservation slot? This will release the table back into the available pool immediately.
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setCancelingBookingId(null)}
                                  className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-display transition cursor-pointer"
                                >
                                  Keep It
                                </button>
                                <button
                                  onClick={() => handleCancel(booking.id)}
                                  className="flex-1 py-2 rounded-lg bg-cyber-pink/20 hover:bg-cyber-pink/30 text-cyber-pink text-xs font-display border border-cyber-pink/30 transition cursor-pointer"
                                >
                                  Yes, Cancel
                                </button>
                              </div>
                            </motion.div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-5">
                  <div className="p-6 bg-cyber-lightgray/10 rounded-2xl border border-white/5 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-12 w-12 bg-cyber-purple/15 rounded-bl-full pointer-events-none" />
                    <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-tr from-cyber-purple to-cyber-cyan text-white flex items-center justify-center text-2xl font-extrabold shadow-lg shadow-cyber-purple/20 mb-4 select-none">
                      {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </div>
                    <h3 className="font-display text-lg font-bold text-white mb-1">
                      {currentUser.name}
                    </h3>
                    <span className="inline-block text-[10px] font-mono text-cyber-cyan uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/20">
                      Gamer Badge ID #7890
                    </span>
                  </div>

                  <div className="space-y-4 text-left">
                    <h4 className="font-display font-bold text-xs uppercase tracking-wider text-gray-400">
                      Account Specifications
                    </h4>

                    {/* Email field */}
                    <div className="p-3.5 bg-cyber-lightgray/30 rounded-xl border border-white/5 flex items-center gap-3">
                      <Mail className="h-4.5 w-4.5 text-cyber-purple shrink-0" />
                      <div>
                        <span className="block text-[9px] font-mono text-gray-500 uppercase">Primary Email</span>
                        <span className="block text-xs text-white font-mono mt-0.5">{currentUser.email}</span>
                      </div>
                    </div>

                    {/* Phone field */}
                    <div className="p-3.5 bg-cyber-lightgray/30 rounded-xl border border-white/5 flex items-center gap-3">
                      <Phone className="h-4.5 w-4.5 text-cyber-purple shrink-0" />
                      <div>
                        <span className="block text-[9px] font-mono text-gray-500 uppercase">Mobile Contact</span>
                        <span className="block text-xs text-white font-mono mt-0.5">+91 {currentUser.phone}</span>
                      </div>
                    </div>

                    {/* Verified system badge */}
                    <div className="p-4 rounded-xl bg-cyber-neon/5 border border-cyber-neon/20 flex items-start gap-2.5 text-xs text-gray-400">
                      <CheckCircle className="h-4.5 w-4.5 text-cyber-neon shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <strong className="text-white">Active Fair Play Clearance:</strong> This gamer profile is in excellent standing with zero session-hold offenses. Standard Desk check-ins are auto-approved.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
