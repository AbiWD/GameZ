import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import pb from '../lib/pocketbase';
import { Booking, Station } from '../types';
import { STATIONS } from '../data';

export interface MockUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
}

export interface SimulatedEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  timestamp: number;
  read: boolean;
}

interface AuthAndBookingContextType {
  currentUser: MockUser | null;
  users: MockUser[];
  bookings: Booking[];
  emails: SimulatedEmail[];
  activeNotification: SimulatedEmail | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, phone: string, password: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => Promise<void>;
  createBooking: (bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>) => Promise<{ success: boolean; booking?: Booking; error?: string }>;
  cancelBooking: (bookingId: string) => Promise<{ success: boolean; error?: string }>;
  extendBooking: (bookingId: string, additionalHours: number) => Promise<{ success: boolean; error?: string }>;
  checkSlotConflict: (stationId: string, date: string, time: string, duration: number, ignoreBookingId?: string) => Promise<{ conflict: boolean; details?: string }>;
  checkBanStatus: (email: string) => Promise<boolean>;
  dismissNotification: () => void;
  clearAllEmails: () => void;
  dynamicPricing: { hourlyRates: Record<string, number>; tierPrices: Record<string, number> };
  stationTypes: any[];
}

const AuthAndBookingContext = createContext<AuthAndBookingContextType | undefined>(undefined);

export function parseTimeToDecimal(timeStr: string): number {
  const match = timeStr.match(/^(\d+):00\s*(AM|PM)$/i);
  if (!match) return 11;
  let hour = parseInt(match[1], 10);
  const ampm = match[2].toUpperCase();
  if (ampm === 'PM' && hour !== 12) hour += 12;
  else if (ampm === 'AM' && hour === 12) hour = 0;
  return hour;
}

export function formatDecimalToTime(decimal: number): string {
  let hour = decimal % 24;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  let hour12 = hour % 12;
  if (hour12 === 0) hour12 = 12;
  return `${String(hour12).padStart(2, '0')}:00 ${ampm}`;
}

function mapPbToBooking(pbRec: any): Booking {
  const startObj = new Date(pbRec.start_time);
  const endObj = new Date(pbRec.end_time);
  const dateStr = startObj.toISOString().split('T')[0];
  let h = startObj.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const timeStr = `${String(h).padStart(2, '0')}:00 ${ampm}`;
  const diffMs = endObj.getTime() - startObj.getTime();
  const durationHours = diffMs / 3600000;
  return {
    id: pbRec.id,
    customerName: pbRec.name || 'Unknown',
    customerEmail: pbRec.email || '',
    customerPhone: pbRec.phone || '',
    stationId: pbRec.assigned_station_id,
    bookingDate: dateStr,
    startTime: timeStr,
    durationHours: Math.round(durationHours),
    totalPrice: pbRec.total_price,
    status: pbRec.status === 'pending' ? 'held' : pbRec.status as 'held' | 'confirmed' | 'expired',
    holdExpiresAt: new Date(pbRec.expires_at || 0).getTime(),
    createdAt: new Date(pbRec.created).getTime(),
    verificationCode: pbRec.booking_reference
  };
}

export const AuthAndBookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<MockUser | null>(null);
  const [users, setUsers] = useState<MockUser[]>([]); 
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [emails, setEmails] = useState<SimulatedEmail[]>([]);
  const [activeNotification, setActiveNotification] = useState<SimulatedEmail | null>(null);
  const [dynamicPricing, setDynamicPricing] = useState<{ hourlyRates: Record<string, number>; tierPrices: Record<string, number> }>({ hourlyRates: {}, tierPrices: {} });
  const [stationTypes, setStationTypes] = useState<any[]>([]);
  const [stTypesRaw, setStTypesRaw] = useState<any[]>([]);
  
  const bookingsRef = useRef(bookings);
  useEffect(() => {
    bookingsRef.current = bookings;
  }, [bookings]);
  const [pStationsRaw, setPStationsRaw] = useState<any[]>([]);

  const fetchBookings = async () => {
    try {
      const records = await pb.collection('bookings').getFullList({ sort: '-created' });
      setBookings(records.map(mapPbToBooking));
    } catch (e) {
      console.error('Failed to fetch bookings', e);
    }
  };

  const fetchPricing = async () => {
    try {
      const pStations = await pb.collection('stations').getFullList();
      const tPrices = await pb.collection('tier_prices').getFullList();
      const stTypes = await pb.collection('station_types').getFullList();
      
      setPStationsRaw(pStations);
      setStTypesRaw(stTypes);
      
      const hourlyRates: Record<string, number> = {};
      stTypes.forEach(st => {
        hourlyRates[st.name] = st.base_price;
      });
      
      const tierPrices: Record<string, number> = {};
      tPrices.forEach(t => {
        tierPrices[t.tier_id] = t.price;
      });
      
      setDynamicPricing({ hourlyRates, tierPrices });
    } catch (e) {
      console.error('Failed to fetch pricing', e);
    }
  };

  useEffect(() => {
    if (stTypesRaw.length === 0) return;
    
    const now = new Date();
    const currentBookings = bookings.filter(b => {
      if (b.status !== 'confirmed') return false;
      const bStart = new Date(b.bookingDate);
      const bStartHour = parseTimeToDecimal(b.startTime);
      bStart.setHours(Math.floor(bStartHour), (bStartHour % 1) * 60, 0, 0);
      const bEnd = new Date(bStart.getTime() + b.durationHours * 3600000);
      return bStart <= now && now < bEnd;
    });

    const enriched = STATIONS.map(staticStation => {
      // Find dynamic type by matching name
      const dynamicType = stTypesRaw.find(st => st.name === staticStation.name);
      
      const physical = pStationsRaw.filter(ps => ps.station_type === staticStation.name);
      
      let availableNowCount = 0;
      physical.forEach(ps => {
        if (ps.status === 'available' || ps.status === 'active') {
          const isBooked = currentBookings.some(b => b.stationId === ps.id);
          if (!isBooked) {
            availableNowCount++;
          }
        }
      });
      
      return {
        ...staticStation,
        ratePerHour: dynamicType ? dynamicType.base_price : staticStation.ratePerHour,
        totalSlots: physical.length > 0 ? physical.length : staticStation.totalSlots,
        availableNow: physical.length > 0 ? availableNowCount : staticStation.availableNow,
      };
    });
    setStationTypes(enriched);
  }, [bookings, stTypesRaw, pStationsRaw]);

  const dispatchEmailNotification = (to: string, subject: string, body: string) => {
    const newEmail: SimulatedEmail = {
      id: `em-${Date.now()}`, to, subject, body, timestamp: Date.now(), read: false
    };
    setEmails(prev => {
      const updatedEmails = [newEmail, ...prev];
      localStorage.setItem('gz_emails', JSON.stringify(updatedEmails));
      return updatedEmails;
    });
    setActiveNotification(newEmail);
  };

  useEffect(() => {
    const storedEmails = localStorage.getItem('gz_emails');
    if (storedEmails) setEmails(JSON.parse(storedEmails));

    // init user
    if (pb.authStore.isValid && pb.authStore.model) {
      setCurrentUser({
        id: pb.authStore.model.id,
        name: pb.authStore.model.name,
        email: pb.authStore.model.email,
        phone: pb.authStore.model.phone,
      });
    }

    fetchBookings();
    fetchPricing();

    const unsubscribeAuth = pb.authStore.onChange((token, model) => {
      if (model) {
        setCurrentUser({ id: model.id, name: model.name, email: model.email, phone: model.phone });
      } else {
        setCurrentUser(null);
      }
    });

    pb.collection('bookings').subscribe('*', function (e) {
       if (e.action === 'update' && e.record.status === 'cancelled') {
         const oldBooking = bookingsRef.current.find(b => b.id === e.record.id);
         if (oldBooking && oldBooking.status !== 'cancelled') {
           dispatchEmailNotification(
             e.record.email || oldBooking.customerEmail,
             `❌ Booking Cancelled: Pass Code ${e.record.booking_reference || oldBooking.verificationCode}`,
             `Hello ${e.record.name || oldBooking.customerName},\n\nYour booking reservation for station code ${e.record.booking_reference || oldBooking.verificationCode} on ${oldBooking.bookingDate} at ${oldBooking.startTime} has been successfully CANCELLED.\n\nNo cancellation fees apply under our fair-play policy. Your table has been released back into the available pool for other local gamers.\n\nHope to see you book again soon!\nTeam GameZ Mangaluru`
           );
         }
       }
       fetchBookings();
    });

    return () => {
      unsubscribeAuth();
      pb.collection('bookings').unsubscribe('*');
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const authData = await pb.collection('portal_users').authWithPassword(email, password);
      dispatchEmailNotification(
        email,
        '🔑 New Login Detected — GameZ Mangaluru',
        `Hello ${authData.record.name},\n\nYou have successfully logged in to your GameZ Account. If this wasn't you, please reset your password immediately.`
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Incorrect email or password.' };
    }
  };

  const register = async (name: string, email: string, phone: string, password: string) => {
    try {
      const user = await pb.collection('portal_users').create({
        username: phone || `testuser_${Date.now()}`,
        email,
        emailVisibility: true,
        password,
        passwordConfirm: password,
        name,
        phone
      });
      await pb.collection('portal_users').authWithPassword(email, password);
      dispatchEmailNotification(
        email,
        '🎮 Welcome to GameZ Arena — Account Activated!',
        `Hi ${name},\n\nYour premium gamer account has been activated! Secure real-time console bookings, monitor live wait times, and cancel or extend sessions instantly from your online dashboard.\n\nHappy gaming!\nTeam GameZ Mangaluru`
      );
      return { success: true };
    } catch (err: any) {
      console.error('Registration error:', err);
      let errMsg = err.response?.message || 'Failed to create account.';
      if (err.response?.data) {
        const errors = Object.entries(err.response.data).map(([field, e]: [string, any]) => {
          // Capitalize field name for better readability
          const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
          return `${fieldName}: ${e.message}`;
        });
        if (errors.length > 0) errMsg = errors.join(' | ');
      }
      return { success: false, error: errMsg };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await pb.collection('portal_users').requestPasswordReset(email);
      dispatchEmailNotification(
        email,
        '🔐 Password Reset Instructions',
        `Hello,\n\nWe received a request to reset your password. Please check your email inbox for the reset link.`
      );
      return { success: true, message: 'Password reset instructions have been dispatched to your email.' };
    } catch (err) {
      return { success: false, error: 'Failed to reset password.' };
    }
  };

  const logout = async () => {
    if (currentUser) {
      dispatchEmailNotification(
        currentUser.email,
        '🚪 Logged Out — GameZ Mangaluru',
        `Goodbye ${currentUser.name}. Your active reservation session was successfully stored. See you in the next battle!`
      );
    }
    pb.authStore.clear();
  };

  const checkSlotConflict = async (
    categoryId: string, 
    date: string, 
    time: string, 
    duration: number,
    ignoreBookingId?: string
  ) => {
    const startHour1 = parseTimeToDecimal(time);
    const endHour1 = startHour1 + duration;
    
    const reqStart = new Date(date);
    reqStart.setHours(Math.floor(startHour1), (startHour1 % 1) * 60, 0, 0);
    const reqEnd = new Date(reqStart.getTime() + duration * 3600000);

    try {
      const blackouts = await pb.collection('blackout_periods').getFullList();
      for (const b of blackouts) {
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        if (reqStart < bEnd && bStart < reqEnd) {
          return { conflict: true, details: `Store is closed during this time: ${b.reason}` };
        }
      }
    } catch(err) {
      console.error('Failed to fetch blackouts', err);
    }
    
    // Find category name from db or static data
    const staticStation = STATIONS.find(s => s.id === categoryId);
    const categoryName = staticStation ? staticStation.name : (stTypesRaw.find(s => s.id === categoryId)?.name || categoryId);
    if (!categoryName) return { conflict: true, details: 'Invalid station category.' };

    // Fetch all physical stations of this type from the DB
    let physicalStations: any[] = [];
    try {
      physicalStations = await pb.collection('stations').getFullList({
        filter: `station_type = "${categoryName}"`
      });
      physicalStations = physicalStations.filter(s => s.status === 'active' || s.status === 'available');
    } catch (err) {
      return { conflict: true, details: 'Failed to retrieve available stations.' };
    }

    if (physicalStations.length === 0) {
      return { conflict: true, details: 'No physical stations available for this category.' };
    }

    // Try to find AT LEAST ONE physical station that has NO conflicts
    for (const pStation of physicalStations) {
      const conflictingBookingsForThisStation = bookings.filter(b => {
        if (b.status !== 'confirmed') return false;
        if (b.stationId !== pStation.id) return false;
        if (b.bookingDate !== date) return false;
        if (ignoreBookingId && b.id === ignoreBookingId) return false;
        
        const startHour2 = parseTimeToDecimal(b.startTime);
        const endHour2 = startHour2 + b.durationHours;
        return startHour1 < endHour2 && startHour2 < endHour1;
      });

      if (conflictingBookingsForThisStation.length === 0) {
        // We found an available physical station!
        return { conflict: false, assignedStationId: pStation.id };
      }
    }

    // If we loop through all physical stations and ALL have conflicts:
    return {
      conflict: true,
      details: `All ${physicalStations.length} stations in this lounge are fully booked for the selected time.`
    };
  };

  const checkBanStatus = async (email: string) => {
    try {
      const customerCheck = await pb.collection('customers').getFirstListItem(`email = "${email}"`);
      return customerCheck && customerCheck.status === 'banned';
    } catch (err) {
      return false;
    }
  };

  const createBooking = async (bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>) => {
    // Check if user is banned from booking FIRST
    const isBanned = await checkBanStatus(bookingData.customerEmail);
    if (isBanned) {
      return { success: false, error: 'Your account has been restricted from making new bookings. Please contact support.' };
    }

    const conflictCheck = await checkSlotConflict(
      bookingData.stationId,
      bookingData.bookingDate,
      bookingData.startTime,
      bookingData.durationHours
    );

    if (conflictCheck.conflict || !conflictCheck.assignedStationId) {
      return { success: false, error: conflictCheck.details };
    }

    const randomCode = `OT-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Convert to PB fields
    const startHour = parseTimeToDecimal(bookingData.startTime);
    const startDate = new Date(bookingData.bookingDate);
    startDate.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0);
    const endDate = new Date(startDate.getTime() + bookingData.durationHours * 3600000);

    try {
      const rec = await pb.collection('bookings').create({
        assigned_station_id: conflictCheck.assignedStationId,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'confirmed',
        total_price: bookingData.totalPrice,
        players: 1,
        name: bookingData.customerName,
        email: bookingData.customerEmail,
        phone: bookingData.customerPhone,
        booking_reference: randomCode,
        customer_id: currentUser?.id,
        property_id: '20fml0zc3egjxy4'
      });
      
      const newBooking = mapPbToBooking(rec);

      dispatchEmailNotification(
        bookingData.customerEmail,
        `🎟️ Booking Confirmed: Pass Code ${newBooking.verificationCode}`,
        `Dear ${bookingData.customerName},\n\nYour gaming station has been successfully reserved! Present this receipt upon arrival at the desk:\n\n--- PLAYSTATION / GAME STATION RECEIPT ---\nCheck-in Pass: ${newBooking.verificationCode}\nScheduled Date: ${newBooking.bookingDate}\nStart Time: ${newBooking.startTime}\nSession Length: ${newBooking.durationHours} hour(s)\nTotal Price: ₹${newBooking.totalPrice} (Settle at desk)\n\n--- VENUE DIRECTIONS ---\n3rd Floor, Cyber Heights Mall, MG Road, Mangaluru.\n\nIf you need to change, extend, or cancel this booking, you can do so directly from your GameZ Online Dashboard.\n\nGet ready to conquer!\nTeam GameZ Mangaluru`
      );

      return { success: true, booking: newBooking };
    } catch(err: any) {
      return { success: false, error: err.response?.message || 'Failed to create booking' };
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      const targetBooking = bookings.find(b => b.id === bookingId);
      if (!targetBooking) return { success: false, error: 'Not found' };
      
      await pb.collection('bookings').update(bookingId, { status: 'cancelled' });

      // Note: The cancellation email is dispatched automatically by the realtime 
      // subscription listener in useEffect when it detects the status change.
      
      return { success: true };
    } catch(err) {
      return { success: false, error: 'Failed to cancel' };
    }
  };

  const extendBooking = async (bookingId: string, additionalHours: number) => {
    const targetBooking = bookings.find(b => b.id === bookingId);
    if (!targetBooking) return { success: false, error: 'Booking not found.' };

    const currentStartHour = parseTimeToDecimal(targetBooking.startTime);
    const newDuration = targetBooking.durationHours + additionalHours;

    if (newDuration > 6) {
      return { success: false, error: 'Sessions are limited to a maximum of 6 hours total to ensure fair station rotations.' };
    }

    if (currentStartHour + newDuration > 24) {
      return { success: false, error: 'Extensions cannot cross our standard midnight closing time.' };
    }

    // Check conflict for the CURRENT physical station
    const conflictingBookingsForThisStation = bookings.filter(b => {
      if (b.status !== 'confirmed') return false;
      if (b.stationId !== targetBooking.stationId) return false;
      if (b.bookingDate !== targetBooking.bookingDate) return false;
      if (b.id === bookingId) return false;
      
      const startHour2 = parseTimeToDecimal(b.startTime);
      const endHour2 = startHour2 + b.durationHours;
      return currentStartHour < endHour2 && startHour2 < currentStartHour + newDuration;
    });

    if (conflictingBookingsForThisStation.length > 0) {
      const conflict = conflictingBookingsForThisStation[0];
      return { success: false, error: `Extension Conflict: The station is reserved by another gamer immediately following your original slot. Reserved from ${conflict.startTime} for ${conflict.durationHours} hour(s).` };
    }

    const ratePerHour = targetBooking.totalPrice / targetBooking.durationHours;
    const additionalCost = ratePerHour * additionalHours;
    const newPrice = targetBooking.totalPrice + additionalCost;

    // Calculate new end time
    const startHourVal = parseTimeToDecimal(targetBooking.startTime);
    const startDate = new Date(targetBooking.bookingDate);
    startDate.setHours(Math.floor(startHourVal), (startHourVal % 1) * 60, 0, 0);
    const newEndDate = new Date(startDate.getTime() + newDuration * 3600000);

    try {
      const blackouts = await pb.collection('blackout_periods').getFullList();
      for (const b of blackouts) {
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        if (startDate < bEnd && bStart < newEndDate) {
          return { success: false, error: `Cannot extend. Store is closed during this time: ${b.reason}` };
        }
      }
    } catch(err) {
      console.error('Failed to fetch blackouts', err);
    }

    try {
      await pb.collection('bookings').update(bookingId, {
         end_time: newEndDate.toISOString(),
         total_price: newPrice
      });

      dispatchEmailNotification(
        targetBooking.customerEmail,
        `⚡ Session Extended: Pass Code ${targetBooking.verificationCode}`,
        `Hi ${targetBooking.customerName},\n\nYour active session for station code ${targetBooking.verificationCode} has been successfully EXTENDED by +${additionalHours} hour(s)!\n\n--- UPDATED BOOKING SLIP ---\nPass Code: ${targetBooking.verificationCode}\nScheduled Date: ${targetBooking.bookingDate}\nStart Time: ${targetBooking.startTime}\nNew Total Length: ${newDuration} hours\nNew Price Total: ₹${newPrice} (Pay outstanding balance at the counter)\n\nEnjoy your extra gameplay time!\nTeam GameZ Mangaluru`
      );

      return { success: true };
    } catch(err) {
      return { success: false, error: 'Failed to extend' };
    }
  };

  const dismissNotification = () => setActiveNotification(null);
  const clearAllEmails = () => { setEmails([]); localStorage.removeItem('gz_emails'); };

  return (
    <AuthAndBookingContext.Provider
      value={{
        currentUser, users, bookings, emails, activeNotification,
        login, register, resetPassword, logout,
        createBooking, cancelBooking, extendBooking, checkSlotConflict, checkBanStatus,
        dismissNotification, clearAllEmails, dynamicPricing, stationTypes
      }}
    >
      {children}
    </AuthAndBookingContext.Provider>
  );
};

export const useAuthAndBooking = () => {
  const context = useContext(AuthAndBookingContext);
  if (context === undefined) {
    throw new Error('useAuthAndBooking must be used within an AuthAndBookingProvider');
  }
  return context;
};
