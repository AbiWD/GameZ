import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '../components/Calendar';
import { 
  Gamepad2, 
  CircleDot, 
  Grid, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  ArrowRight,
  Sparkles,
  RefreshCw,
  Info,
  Lock,
  Zap,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { Station, Booking } from '../types';
import { useAuthAndBooking } from '../context/AuthAndBookingContext';
import { AuthModal } from '../components/AuthModal';

const ICON_COMPONENTS: Record<string, React.ComponentType<any>> = {
  Gamepad2,
  CircleDot,
  Grid
};

interface BookProps {
  setRoute: (route: string) => void;
}

export default function Book({ setRoute }: BookProps) {
  const { currentUser, createBooking, checkSlotConflict, checkBanStatus, dynamicPricing, stationTypes } = useAuthAndBooking();
  
  // Wizard steps: 1 = Choose Station, 2 = Date & Time, 3 = Info / Auth, 4 = Held Countdown, 5 = Confirmed Receipt
  const [step, setStep] = useState<number>(1);
  
  // Form States
  const [selectedStation, setSelectedStation] = useState<any | null>(null);
  const [bookingDate, setBookingDate] = useState<string>('');
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<string>('');
  const [durationHours, setDurationHours] = useState<number>(1);
  
  // Customer details (pre-filled from active session)
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  // Inline auth helper state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Hold Timer States
  const [holdTimer, setHoldTimer] = useState<number>(300); // 5 minutes in seconds
  const [holdExpired, setHoldExpired] = useState<boolean>(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state with logged-in user details automatically
  useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.name);
      setCustomerEmail(currentUser.email);
      setCustomerPhone(currentUser.phone);
    } else {
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
    }
  }, [currentUser]);

  // Get current date for input bounds (today to +30 days)
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getMaxDateString = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    const year = maxDate.getFullYear();
    const month = String(maxDate.getMonth() + 1).padStart(2, '0');
    const day = String(maxDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Safe time slots for Mangaluru cafe (11:00 AM to 11:00 PM)
  const timeSlots = [
    '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
    '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM'
  ];

  // Initialize form defaults on load
  useEffect(() => {
    setBookingDate(getTodayString());
  }, []);

  // Timer Countdown logic for Step 4
  useEffect(() => {
    if (step === 4 && holdTimer > 0 && !holdExpired) {
      timerRef.current = setInterval(() => {
        setHoldTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setHoldExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, holdTimer, holdExpired]);

  // Format seconds to mm:ss
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Handle Action Click triggers
  const handleStationSelect = (station: any) => {
    setSelectedStation(station);
    setStep(2);
  };

  // Check slot conflict details live
  const slotConflict = selectedStation && startTime 
    ? checkSlotConflict(selectedStation.id, bookingDate, startTime, durationHours)
    : { conflict: false };

  const handleTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime) {
      alert('Please select an active start time slot.');
      return;
    }

    // Block collision submit immediately!
    if (slotConflict.conflict) {
      alert(`Conflict Blocked: ${slotConflict.details}`);
      return;
    }

    setStep(3);
  };

  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoError(null);
    
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      setInfoError('Please fill out all contact information fields.');
      return;
    }

    // Phone number validation (10 digits Indian standard format check)
    const phoneClean = customerPhone.replace(/\D/g, '');
    if (phoneClean.length < 10) {
      setInfoError('Please enter a valid 10-digit mobile number.');
      return;
    }

    // Check if user is banned before allowing them to hold the table
    const isBanned = await checkBanStatus(customerEmail);
    if (isBanned) {
      setInfoError('Your account has been restricted from making new bookings. Please contact support.');
      return;
    }

    // Trigger Hold Lock
    setHoldTimer(300);
    setHoldExpired(false);
    setStep(4);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const handleConfirmReservation = async () => {
    if (holdExpired || !selectedStation || isSubmitting) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setIsSubmitting(true);
    setBookingError(null);

    try {
      const bookingData = {
        customerName,
        customerEmail,
        customerPhone,
        stationId: selectedStation.id,
        bookingDate,
        startTime,
        durationHours,
        totalPrice: (dynamicPricing.hourlyRates[selectedStation.name] || selectedStation.ratePerHour) * durationHours
      };

      const res = await createBooking(bookingData);
      if (res.success && res.booking) {
        setConfirmedBooking(res.booking);
        setStep(5);
      } else {
        setBookingError(res.error || 'Failed to complete booking.');
        // Remove setStep(2) so they stay on the screen and can see the error!
      }
    } catch (err: any) {
      setBookingError(`Unexpected Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrReset = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setStep(1);
    setSelectedStation(null);
    setStartTime('');
    setDurationHours(1);
    setHoldTimer(300);
    setHoldExpired(false);
    setConfirmedBooking(null);
  };

  return (
    <>
      <div className="bg-cyber-dark min-h-[calc(100vh-80px)] py-12 px-4 flex items-center justify-center relative">
        {/* Background radial overlays */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.04),transparent_50%),radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.04),transparent_50%)] pointer-events-none" />

        <div className="w-full max-w-4xl bg-cyber-gray border border-white/5 rounded-2xl p-6 sm:p-10 shadow-2xl relative z-10">
          
          {/* PROGRESS STEP INDICATOR (Hide in Confirmed Receipt) */}
          {step < 5 && (
            <div className="mb-10">
              <div className="flex items-center justify-between text-xs font-mono text-gray-500 mb-4">
                <span className="uppercase tracking-wider">RESERVATION DESK WIZARD</span>
                <span className="text-cyber-purple font-bold font-mono">STEP {step} OF 4</span>
              </div>
              
              {/* Step bars */}
              <div className="grid grid-cols-4 gap-2">
                <div className={`h-1.5 rounded-full transition-colors duration-300 ${step >= 1 ? 'bg-cyber-purple' : 'bg-cyber-lightgray'}`} />
                <div className={`h-1.5 rounded-full transition-colors duration-300 ${step >= 2 ? 'bg-cyber-purple' : 'bg-cyber-lightgray'}`} />
                <div className={`h-1.5 rounded-full transition-colors duration-300 ${step >= 3 ? 'bg-cyber-purple' : 'bg-cyber-lightgray'}`} />
                <div className={`h-1.5 rounded-full transition-colors duration-300 ${step >= 4 ? 'bg-cyber-cyan animate-pulse' : 'bg-cyber-lightgray'}`} />
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            
            {/* STEP 1: CHOOSE STATION TYPE */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <button
                    id="back-home-link"
                    onClick={() => setRoute('/')}
                    className="flex items-center justify-center p-2 rounded-xl bg-cyber-lightgray border border-white/5 text-gray-400 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-cyber-purple cursor-pointer"
                    aria-label="Back to Marketing Site"
                  >
                    <ArrowLeft className="h-4.5 w-4.5" />
                  </button>
                  <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">Select a Gaming Station</h1>
                    <p className="text-xs sm:text-sm text-gray-400">Secure real-time slots at our premium gaming lounge on MG Road, Mangaluru.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  {stationTypes.map((station) => {
                    const IconComp = ICON_COMPONENTS[station.iconName] || Gamepad2;
                    
                    return (
                      <button
                        key={station.id}
                        id={`select-station-card-${station.id}`}
                        onClick={() => handleStationSelect(station)}
                        className="group text-left p-6 rounded-xl bg-cyber-lightgray border border-white/5 hover:border-cyber-purple/55 hover:shadow-lg hover:shadow-cyber-purple/5 transition-all duration-300 flex flex-col justify-between items-stretch min-h-[220px] focus:outline-none focus:ring-2 focus:ring-cyber-purple cursor-pointer"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyber-dark text-cyber-cyan border border-cyber-purple/10 group-hover:scale-105 transition-transform">
                              <IconComp className="h-5 w-5" />
                            </div>
                            <span className="font-mono text-lg font-extrabold text-cyber-neon">
                              ₹{dynamicPricing.hourlyRates[station.name] || station.ratePerHour}<span className="text-[10px] text-gray-500 font-sans font-normal">/hr</span>
                            </span>
                          </div>
                          <div>
                            <h3 className="font-display font-bold text-white text-lg group-hover:text-cyber-cyan transition-colors">
                              {station.name}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{station.description}</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-gray-400">
                          <span>{station.availableNow} Units Open</span>
                          <span className="text-cyber-purple font-bold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                            Select <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Informative text on billing policy */}
                <div className="p-4 rounded-xl bg-cyber-dark/40 border border-white/5 flex items-start gap-3 text-xs text-gray-400 leading-normal">
                  <Info className="h-4.5 w-4.5 text-cyber-cyan shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Secure and Cancel Instantly:</strong> Present your check-in pass at the counter upon arrival to settle payments. Cancel or extend your hours directly from your Online Gamer Dashboard!
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: DATE, TIME & HOURS */}
            {step === 2 && selectedStation && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <button
                    id="step-2-back-btn"
                    onClick={() => setStep(1)}
                    className="flex items-center justify-center p-2 rounded-xl bg-cyber-lightgray border border-white/5 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyber-purple cursor-pointer"
                    aria-label="Back to Step 1"
                  >
                    <ArrowLeft className="h-4.5 w-4.5" />
                  </button>
                  <div>
                    <span className="font-mono text-xs text-cyber-purple uppercase font-bold tracking-widest block">
                      {selectedStation.name} Rate: ₹{dynamicPricing.hourlyRates[selectedStation.name] || selectedStation.ratePerHour}/hr
                    </span>
                    <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">Choose Play Schedule</h1>
                  </div>
                </div>

                <form onSubmit={handleTimeSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Left Column: Date and Duration */}
                    <div className="space-y-5">
                      
                      {/* Date Selector */}
                      <div className="relative">
                        <label className="block text-xs font-mono uppercase text-gray-400 mb-2 font-semibold">
                          Select Date (Today to 30 Days out)
                        </label>
                        <div className="relative">
                          <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-cyber-purple" />
                          <input
                            type="text"
                            readOnly
                            value={bookingDate}
                            onClick={() => setShowCalendar(!showCalendar)}
                            className="w-full pl-10 pr-4 py-3 bg-cyber-lightgray border border-white/5 rounded-xl text-sm text-white focus:border-cyber-purple focus:outline-none focus:ring-1 focus:ring-cyber-purple font-mono cursor-pointer"
                          />
                        </div>
                        
                        {/* Custom Calendar Popover */}
                        {showCalendar && (
                          <>
                            <div 
                              className="fixed inset-0 z-40"
                              onClick={() => setShowCalendar(false)}
                            />
                            <div className="absolute top-[52px] left-0 z-50 p-3 bg-cyber-dark border border-cyber-purple/30 shadow-[0_0_20px_rgba(139,92,246,0.15)] rounded-xl">
                              <Calendar
                                selected={bookingDate ? new Date(bookingDate) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    const year = date.getFullYear();
                                    const month = String(date.getMonth() + 1).padStart(2, '0');
                                    const day = String(date.getDate()).padStart(2, '0');
                                    setBookingDate(`${year}-${month}-${day}`);
                                    setShowCalendar(false);
                                  }
                                }}
                                disabled={(date) => {
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const max = new Date(today);
                                  max.setDate(max.getDate() + 30);
                                  return date < today || date > max;
                                }}
                                className="border-cyber-purple/30"
                              />
                            </div>
                          </>
                        )}
                      </div>

                      {/* Duration Slider */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label htmlFor="duration-input" className="block text-xs font-mono uppercase text-gray-400 font-semibold">
                            Play Duration
                          </label>
                          <span className="font-mono text-xs text-cyber-cyan font-bold">{durationHours} Hours</span>
                        </div>
                        <div className="space-y-2">
                          <input
                            id="duration-input"
                            type="range"
                            min="1"
                            max="4"
                            step="1"
                            value={durationHours}
                            onChange={(e) => setDurationHours(Number(e.target.value))}
                            className="w-full h-1.5 bg-cyber-dark rounded-lg appearance-none cursor-pointer accent-cyber-purple"
                          />
                          <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
                            <span>1 Hour</span>
                            <span>2 Hours</span>
                            <span>3 Hours</span>
                            <span>4 Hours (Max)</span>
                          </div>
                        </div>
                      </div>

                      {/* Summary Quote */}
                      <div className="p-5 rounded-xl bg-cyber-dark border border-white/5 space-y-3">
                        <span className="block text-[10px] font-mono uppercase text-gray-500 font-semibold">Rate Calculation</span>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Station Rate ({durationHours}h)</span>
                          <span className="text-white font-mono">₹{dynamicPricing.hourlyRates[selectedStation.name] || selectedStation.ratePerHour} × {durationHours}</span>
                        </div>
                        <div className="border-t border-white/5 pt-3 flex items-center justify-between font-bold">
                          <span className="text-white font-display">Estimated Total</span>
                          <span className="text-cyber-neon font-mono text-lg">₹{(dynamicPricing.hourlyRates[selectedStation.name] || selectedStation.ratePerHour) * durationHours}</span>
                        </div>
                      </div>

                    </div>

                    {/* Right Column: Time Slots Grid */}
                    <div className="space-y-3">
                      <label className="block text-xs font-mono uppercase text-gray-400 font-semibold">
                        Select Available Start Time Slot
                      </label>
                      
                      <div className="grid grid-cols-3 gap-2 max-h-[290px] overflow-y-auto pr-1">
                        {timeSlots.map((slot) => {
                          const isSelected = startTime === slot;
                          return (
                            <button
                              key={slot}
                              id={`time-slot-${slot.replace(/[\s:]/g, '-')}`}
                              type="button"
                              onClick={() => setStartTime(slot)}
                              className={`py-3 px-2 rounded-xl text-xs font-mono text-center border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-cyber-purple border-cyber-purple text-white font-bold shadow-md shadow-cyber-purple/10'
                                  : 'bg-cyber-lightgray border-white/5 text-gray-300 hover:border-cyber-purple/40 hover:text-white'
                              }`}
                            >
                              <Clock className="inline-block h-3.5 w-3.5 mr-1 -mt-0.5" />
                              {slot}
                            </button>
                          );
                        })}
                      </div>

                      {/* Live Collision Conflict Alert block */}
                      {slotConflict.conflict && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3.5 rounded-xl bg-cyber-pink/10 border border-cyber-pink/30 flex items-start gap-2 text-xs text-cyber-pink leading-normal text-left"
                        >
                          <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-cyber-pink animate-pulse" />
                          <div>
                            <strong className="block font-display font-bold uppercase tracking-wide text-[10px]">Double Booking Lock Protected</strong>
                            <p className="mt-0.5">{slotConflict.details}</p>
                          </div>
                        </motion.div>
                      )}

                      <span className="block text-[10px] text-gray-500 font-mono mt-3 text-right">
                        * Cafe closes daily by Midnight (Friday/Sat: 2 AM)
                      </span>
                    </div>

                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                    <button
                      id="step-2-reset-btn"
                      type="button"
                      onClick={handleCancelOrReset}
                      className="px-6 py-3 text-xs font-display font-semibold text-gray-400 hover:text-white transition-colors focus:outline-none"
                    >
                      Change Station
                    </button>
                    <button
                      id="step-2-submit-btn"
                      type="submit"
                      disabled={slotConflict.conflict || !startTime}
                      className={`flex items-center gap-1.5 px-8 py-3 font-display font-bold text-sm tracking-wide rounded-xl shadow-md transition cursor-pointer ${
                        slotConflict.conflict || !startTime
                          ? 'bg-gray-800 text-gray-600 border border-white/5 cursor-not-allowed'
                          : 'bg-gradient-to-r from-cyber-purple to-cyber-cyan text-white hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-cyber-cyan'
                      }`}
                    >
                      Continue to Info
                      <ArrowRight className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 3: CUSTOMER INFORMATION / SIGN IN REQUIREMENT */}
            {step === 3 && selectedStation && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                
                {/* 1. NOT LOGGED IN - SHOW GORGEOUS AUTH REQUIRED SCREEN */}
                {!currentUser ? (
                  <div className="text-center py-8 max-w-md mx-auto space-y-6">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cyber-purple/10 text-cyber-purple border border-cyber-purple/30 mb-2">
                      <Lock className="h-8 w-8 animate-pulse" />
                    </div>

                    <div className="space-y-2">
                      <span className="font-mono text-xs text-cyber-purple uppercase font-bold tracking-widest block">
                        AUTHENTICATION PROTOCOL REQUIRED
                      </span>
                      <h2 className="font-display text-2xl font-extrabold text-white">
                        Sign In to Secure Reservation
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                        To protect play stations from spam locks, you must have an active gamer profile. Register in 30 seconds or log in to lock this slot.
                      </p>
                    </div>

                    {/* Simple summary box */}
                    <div className="p-4 rounded-xl bg-cyber-lightgray/30 border border-white/5 text-left text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Reserved Station:</span>
                        <span className="text-white font-semibold">{selectedStation.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Scheduled:</span>
                        <span className="text-white font-mono font-semibold">{bookingDate} @ {startTime}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-center pt-2">
                      <button
                        onClick={() => setStep(2)}
                        className="px-5 py-3 text-xs font-display font-semibold text-gray-400 hover:text-white transition"
                      >
                        Adjust Schedule
                      </button>
                      <button
                        onClick={() => setIsAuthModalOpen(true)}
                        className="flex items-center gap-1.5 px-6 py-3 bg-gradient-to-r from-cyber-purple to-cyber-cyan text-white font-display font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyber-purple/15 hover:scale-[1.02] cursor-pointer"
                      >
                        <UserCheck className="h-4 w-4" />
                        Gamer Sign In / Register
                      </button>
                    </div>
                  </div>
                ) : (
                  
                  /* 2. LOGGED IN - CONFIRM DETAILS AND PROCEED */
                  <>
                    <div className="flex items-center gap-3">
                      <button
                        id="step-3-back-btn"
                        onClick={() => setStep(2)}
                        className="flex items-center justify-center p-2 rounded-xl bg-cyber-lightgray border border-white/5 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyber-purple cursor-pointer"
                        aria-label="Back to Step 2"
                      >
                        <ArrowLeft className="h-4.5 w-4.5" />
                      </button>
                      <div>
                        <span className="font-mono text-xs text-cyber-purple uppercase font-bold tracking-widest block">
                          Verified Gamer: {currentUser.name}
                        </span>
                        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">Contact Verification</h1>
                      </div>
                    </div>

                    <form onSubmit={handleInfoSubmit} className="space-y-6">
                      
                      {infoError && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-left">
                          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                          <div className="text-sm font-medium text-red-500">
                            {infoError}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Left 2 Columns: Input Fields */}
                        <div className="md:col-span-2 space-y-5">
                          
                          {/* Alert Notice auto-filled */}
                          <div className="p-4 rounded-xl bg-cyber-neon/5 border border-cyber-neon/20 flex items-start gap-2.5 text-xs text-gray-400 text-left">
                            <CheckCircle2 className="h-4.5 w-4.5 text-cyber-neon shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-white block font-display">System Autocompleted Details</strong>
                              Your contact specifications are auto-filled from your active secure session. These details will receive the check-in receipt.
                            </div>
                          </div>

                          {/* Full Name */}
                          <div>
                            <label htmlFor="customer-name-input" className="block text-xs font-mono uppercase text-gray-400 mb-2 font-semibold">
                              Your Full Name
                            </label>
                            <div className="relative">
                              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-cyber-purple" />
                              <input
                                id="customer-name-input"
                                type="text"
                                required
                                disabled
                                placeholder="e.g. Abhilash Bangera"
                                value={customerName}
                                className="w-full pl-10 pr-4 py-3 bg-cyber-lightgray border border-white/5 rounded-xl text-sm text-gray-400 cursor-not-allowed"
                              />
                            </div>
                          </div>

                          {/* Email Address */}
                          <div>
                            <label htmlFor="customer-email-input" className="block text-xs font-mono uppercase text-gray-400 mb-2 font-semibold">
                              Email Address (For Confirmation Details)
                            </label>
                            <div className="relative">
                              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-cyber-purple" />
                              <input
                                id="customer-email-input"
                                type="email"
                                required
                                disabled
                                placeholder="e.g. name@domain.com"
                                value={customerEmail}
                                className="w-full pl-10 pr-4 py-3 bg-cyber-lightgray border border-white/5 rounded-xl text-sm text-gray-400 cursor-not-allowed font-sans"
                              />
                            </div>
                          </div>

                          {/* Mobile Number */}
                          <div>
                            <label htmlFor="customer-phone-input" className="block text-xs font-mono uppercase text-gray-400 mb-2 font-semibold">
                              Mobile Phone Number (For SMS Lock updates)
                            </label>
                            <div className="relative">
                              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-cyber-purple" />
                              <input
                                id="customer-phone-input"
                                type="tel"
                                required
                                placeholder="10-digit phone (e.g. 9876543210)"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-cyber-lightgray border border-white/5 rounded-xl text-sm text-white placeholder-gray-500 focus:border-cyber-purple focus:outline-none focus:ring-1 focus:ring-cyber-purple font-mono"
                              />
                            </div>
                            <span className="block text-[10px] text-gray-500 font-mono mt-1 text-left">
                              * Enter 10-digit mobile number if empty. Standard +91 Indian network validation applies.
                            </span>
                          </div>

                        </div>

                        {/* Right Column: Static Receipt Summary Card */}
                        <div className="p-6 bg-cyber-dark/60 border border-white/5 rounded-xl space-y-4 text-left">
                          <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider border-b border-white/5 pb-2 flex items-center gap-1">
                            <Zap className="h-4 w-4 text-cyber-cyan" />
                            Booking Summary
                          </h3>
                          
                          <div className="space-y-3 text-xs">
                            <div className="flex flex-col">
                              <span className="text-gray-500 uppercase font-mono tracking-wide text-[9px]">Gaming Arena</span>
                              <span className="text-white font-medium mt-0.5">{selectedStation.name}</span>
                            </div>
                            
                            <div className="flex flex-col">
                              <span className="text-gray-500 uppercase font-mono tracking-wide text-[9px]">Date & Commute</span>
                              <span className="text-white font-mono font-medium mt-0.5">{bookingDate}</span>
                            </div>

                            <div className="flex flex-col">
                              <span className="text-gray-500 uppercase font-mono tracking-wide text-[9px]">Start Slot</span>
                              <span className="text-white font-mono font-medium mt-0.5">{startTime}</span>
                            </div>

                            <div className="flex flex-col">
                              <span className="text-gray-500 uppercase font-mono tracking-wide text-[9px]">Session Duration</span>
                              <span className="text-white font-mono font-medium mt-0.5">{durationHours} Hour{durationHours > 1 ? 's' : ''}</span>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                            <span className="text-gray-400">Session Rate</span>
                            <span className="text-white font-mono">₹{dynamicPricing.hourlyRates[selectedStation.name] || selectedStation.ratePerHour}/hr</span>
                          </div>

                          <div className="flex items-center justify-between text-sm font-bold text-cyber-neon border-t border-white/5 pt-2">
                            <span>Total Owed</span>
                            <span className="font-mono text-lg">₹{(dynamicPricing.hourlyRates[selectedStation.name] || selectedStation.ratePerHour) * durationHours}</span>
                          </div>
                        </div>

                      </div>

                      <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-4">
                        <button
                          id="step-3-reset-btn"
                          type="button"
                          onClick={handleCancelOrReset}
                          className="px-6 py-3 text-xs font-display font-semibold text-gray-400 hover:text-white transition-colors focus:outline-none"
                        >
                          Cancel / Reset
                        </button>
                        <button
                          id="step-3-submit-btn"
                          type="submit"
                          className="flex items-center gap-1.5 px-8 py-3 bg-gradient-to-r from-cyber-purple to-cyber-cyan text-white font-display font-bold text-sm tracking-wide rounded-xl shadow-md transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-cyber-cyan cursor-pointer"
                        >
                          Secure Hold Lock
                          <ArrowRight className="h-4.5 w-4.5" />
                        </button>
                      </div>

                    </form>
                  </>
                )}
              </motion.div>
            )}

            {/* STEP 4: 5-MINUTE COUNTDOWN HOLD LOCK */}
            {step === 4 && selectedStation && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-6 max-w-lg mx-auto space-y-6"
              >
                {!holdExpired ? (
                  <>
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cyber-purple/10 text-cyber-purple border border-cyber-purple mb-2 animate-pulse">
                      <Clock className="h-8 w-8" />
                    </div>
                    
                    <div className="space-y-2">
                      <span className="font-mono text-xs text-cyber-purple uppercase font-bold tracking-widest block">
                        TEMPORARY RESERVATION LOCK ACTIVATED
                      </span>
                      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                        Your Hold Expires In:
                      </h1>
                    </div>

                    {/* Gigantic Count Clock */}
                    <div className="font-mono text-5xl sm:text-6xl font-extrabold text-cyber-cyan bg-cyber-lightgray border border-white/5 py-6 px-8 rounded-2xl tracking-wider inline-block">
                      {formatTimer(holdTimer)}
                    </div>

                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-sm mx-auto">
                      We have temporarily locked your selected table/console. Complete the reservation check-in before the timer hits zero to secure your verification pass.
                    </p>

                    {/* Summary Box */}
                    <div className="p-5 rounded-xl bg-cyber-dark/40 border border-white/5 text-left text-xs space-y-2 max-w-sm mx-auto">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Reserved Station:</span>
                        <span className="text-white font-semibold">{selectedStation.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Time Slot:</span>
                        <span className="text-white font-mono font-semibold">{bookingDate} &bull; {startTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Fee Amount:</span>
                        <span className="text-cyber-neon font-mono font-semibold">₹{selectedStation.ratePerHour * durationHours}</span>
                      </div>
                    </div>

                    {bookingError && (
                      <div className="p-4 bg-cyber-pink/10 border border-cyber-pink text-cyber-pink text-sm rounded-xl max-w-sm mx-auto text-center font-semibold">
                        {bookingError}
                      </div>
                    )}

                    <div className="pt-6 border-t border-white/5 flex items-center justify-between gap-4">
                      <button
                        id="step-4-cancel-btn"
                        onClick={handleCancelOrReset}
                        disabled={isSubmitting}
                        className="px-5 py-3 text-xs font-display font-semibold text-gray-400 hover:text-white transition focus:outline-none disabled:opacity-50"
                      >
                        Release Hold
                      </button>
                      <button
                        id="step-4-confirm-btn"
                        onClick={handleConfirmReservation}
                        disabled={isSubmitting}
                        className={`flex items-center gap-1.5 px-8 py-3.5 bg-gradient-to-r from-cyber-purple to-cyber-cyan text-white font-display font-bold text-sm tracking-wide rounded-xl shadow-lg shadow-cyber-purple/10 transition focus:outline-none focus:ring-2 focus:ring-cyber-cyan cursor-pointer ${isSubmitting ? 'opacity-75 cursor-not-allowed scale-[0.98]' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                      >
                        <CheckCircle2 className={`h-4.5 w-4.5 ${isSubmitting ? 'animate-pulse' : ''}`} />
                        {isSubmitting ? 'Confirming...' : 'Confirm Reservation'}
                      </button>
                    </div>
                  </>
                ) : (
                  // Expired State
                  <div className="space-y-6">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cyber-pink/10 text-cyber-pink border border-cyber-pink mb-2">
                      <ShieldAlert className="h-8 w-8" />
                    </div>

                    <div className="space-y-2">
                      <span className="font-mono text-xs text-cyber-pink uppercase font-bold tracking-widest block">
                        HOLD PERIOD EXPIRED
                      </span>
                      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
                        Reservation Released
                      </h1>
                    </div>

                    <p className="text-sm text-gray-400 leading-relaxed max-w-sm mx-auto">
                      The 5-minute lock on your selected station expired. Please reset the wizard to check current real-time table availability and secure a new lock.
                    </p>

                    <div className="pt-6">
                      <button
                        id="step-4-expired-retry-btn"
                        onClick={handleCancelOrReset}
                        className="flex items-center gap-2 px-8 py-3.5 bg-cyber-purple text-white font-display font-bold text-sm tracking-wide rounded-xl shadow-md hover:bg-cyber-purple/80 transition-all mx-auto cursor-pointer"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Try New Reservation Lock
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 5: FINAL CONFIRMED RECEIPT */}
            {step === 5 && confirmedBooking && selectedStation && (
              <motion.div
                key="step-5"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8 max-w-xl mx-auto"
              >
                
                {/* High Success Banner */}
                <div className="text-center space-y-3">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-cyber-neon/15 text-cyber-neon border border-cyber-neon/30 mb-2">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <span className="font-mono text-xs text-cyber-neon uppercase font-bold tracking-widest block">
                    RESERVATION CONFIRMED SUCCESSFULLY
                  </span>
                  <h1 className="font-display text-3xl font-extrabold text-white">
                    Get Ready to Play!
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                    Your seat is fully secured under our hold system. Present the unique check-in pass code to our desk coordinator on arrival to start your play.
                  </p>
                </div>

                {/* Physical Ticket Pass */}
                <div className="relative bg-cyber-lightgray border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                  
                  {/* Visual Top Decorative Line */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyber-purple to-cyber-cyan" />
                  
                  {/* Main Ticket Info */}
                  <div className="p-6 sm:p-8 space-y-6 text-left">
                    
                    {/* Code and Price row */}
                    <div className="flex items-start justify-between border-b border-white/5 pb-5">
                      <div>
                        <span className="block text-[9px] uppercase font-mono tracking-widest text-gray-500">CHECK-IN PASS CODE</span>
                        <span className="block font-mono text-3xl font-extrabold text-cyber-cyan tracking-wider mt-1">
                          {confirmedBooking.verificationCode}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[9px] uppercase font-mono tracking-widest text-gray-500">DUE AT CAFE DESK</span>
                        <span className="block font-mono text-2xl font-extrabold text-cyber-neon mt-1">
                          ₹{confirmedBooking.totalPrice}
                        </span>
                      </div>
                    </div>

                    {/* Core Details Grid */}
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs sm:text-sm">
                      <div>
                        <span className="block text-[9px] font-mono uppercase text-gray-500 tracking-wider">RESERVED STATION</span>
                        <span className="block font-semibold text-white mt-1">{selectedStation.name}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-mono uppercase text-gray-500 tracking-wider">CUSTOMER NAME</span>
                        <span className="block font-semibold text-white mt-1">{confirmedBooking.customerName}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-mono uppercase text-gray-500 tracking-wider">SCHEDULED DATE</span>
                        <span className="block font-mono font-medium text-white mt-1">{confirmedBooking.bookingDate}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-mono uppercase text-gray-500 tracking-wider">START SLOT</span>
                        <span className="block font-mono font-medium text-white mt-1">{confirmedBooking.startTime} ({confirmedBooking.durationHours}h Session)</span>
                      </div>
                    </div>

                    {/* Direct Directions */}
                    <div className="p-4 rounded-xl bg-cyber-dark/40 border border-white/5 space-y-1">
                      <span className="block font-mono text-[9px] text-cyber-purple font-bold uppercase tracking-wider">VENUE DIRECTIONS</span>
                      <p className="text-xs text-gray-300 leading-normal">
                        3rd Floor, Cyber Heights Mall, MG Road, Mangaluru. Opposite Empire Plaza. Call <span className="text-cyber-cyan font-mono font-semibold">+91 824 555 7890</span> if you get lost!
                      </p>
                    </div>

                  </div>

                  {/* Left/Right ticket style punches */}
                  <div className="absolute left-0 bottom-24 -translate-x-1/2 h-6 w-6 rounded-full bg-cyber-dark border-r border-white/5" />
                  <div className="absolute right-0 bottom-24 translate-x-1/2 h-6 w-6 rounded-full bg-cyber-dark border-l border-white/5" />

                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    id="receipt-print-action"
                    onClick={() => alert(`Print pass code structured data sent for desk authentication: ${confirmedBooking.verificationCode}`)}
                    className="w-full sm:flex-1 py-3 bg-cyber-lightgray hover:bg-white/5 border border-white/10 text-xs font-display font-bold text-white rounded-xl transition focus:outline-none focus:ring-2 focus:ring-cyber-purple cursor-pointer"
                  >
                    Print / Save Pass Code
                  </button>
                  <button
                    id="receipt-done-action"
                    onClick={handleCancelOrReset}
                    className="w-full sm:flex-1 py-3 bg-cyber-purple hover:bg-cyber-purple/80 text-xs font-display font-bold text-white rounded-xl shadow-md transition focus:outline-none focus:ring-2 focus:ring-cyber-purple cursor-pointer"
                  >
                    Book Another Station
                  </button>
                </div>

                <div className="text-center">
                  <button
                    id="receipt-home-action"
                    onClick={() => setRoute('/')}
                    className="text-xs font-mono text-gray-500 hover:text-gray-300 hover:underline focus:outline-none"
                  >
                    Return to Main Lobby Home Page
                  </button>
                </div>

              </motion.div>
            )}

          </AnimatePresence>

        </div>
      </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode="login"
      />
    </>
  );
}
