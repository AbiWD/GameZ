import React, { createContext, useContext, useState, useEffect } from 'react';
import { Booking, Station } from '../types';

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
  login: (email: string, password: string) => { success: boolean; error?: string };
  register: (name: string, email: string, phone: string, password: string) => { success: boolean; error?: string };
  resetPassword: (email: string) => { success: boolean; message?: string; error?: string };
  logout: () => void;
  createBooking: (bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>) => { success: boolean; booking?: Booking; error?: string };
  cancelBooking: (bookingId: string) => { success: boolean; error?: string };
  extendBooking: (bookingId: string, additionalHours: number) => { success: boolean; error?: string };
  checkSlotConflict: (stationId: string, date: string, time: string, duration: number, ignoreBookingId?: string) => { conflict: boolean; details?: string };
  dismissNotification: () => void;
  clearAllEmails: () => void;
}

const AuthAndBookingContext = createContext<AuthAndBookingContextType | undefined>(undefined);

// Helper to parse "11:00 AM" or "02:00 PM" into decimal hour (e.g. 11.0 or 14.0)
export function parseTimeToDecimal(timeStr: string): number {
  const match = timeStr.match(/^(\d+):00\s*(AM|PM)$/i);
  if (!match) return 11; // fallback
  let hour = parseInt(match[1], 10);
  const ampm = match[2].toUpperCase();
  
  if (ampm === 'PM' && hour !== 12) {
    hour += 12;
  } else if (ampm === 'AM' && hour === 12) {
    hour = 0;
  }
  return hour;
}

// Helper to format decimal hour back into string (e.g. 14 -> "02:00 PM")
export function formatDecimalToTime(decimal: number): string {
  let hour = decimal % 24;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  let hour12 = hour % 12;
  if (hour12 === 0) hour12 = 12;
  return `${String(hour12).padStart(2, '0')}:00 ${ampm}`;
}

export const AuthAndBookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<MockUser | null>(null);
  const [users, setUsers] = useState<MockUser[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [emails, setEmails] = useState<SimulatedEmail[]>([]);
  const [activeNotification, setActiveNotification] = useState<SimulatedEmail | null>(null);

  // Load initial mock database and persist state
  useEffect(() => {
    // 1. Initial Users
    const storedUsers = localStorage.getItem('gz_users');
    let parsedUsers: MockUser[] = [];
    if (storedUsers) {
      parsedUsers = JSON.parse(storedUsers);
    } else {
      parsedUsers = [
        {
          id: 'usr-1',
          name: 'Abhilash Bangera',
          email: 'abhilashbangera97@gmail.com',
          phone: '9876543210',
          password: 'password123'
        },
        {
          id: 'usr-2',
          name: 'Varun Kumar',
          email: 'varun@gamez.com',
          phone: '9123456789',
          password: 'password123'
        }
      ];
      localStorage.setItem('gz_users', JSON.stringify(parsedUsers));
    }
    setUsers(parsedUsers);

    // 2. Initial Current User Session
    const storedCurrentUser = localStorage.getItem('gz_current_user');
    if (storedCurrentUser) {
      setCurrentUser(JSON.parse(storedCurrentUser));
    }

    // 3. Initial Bookings (Pre-seed a collision booking for demonstration)
    const storedBookings = localStorage.getItem('gz_bookings');
    let parsedBookings: Booking[] = [];
    if (storedBookings) {
      parsedBookings = JSON.parse(storedBookings);
    } else {
      // Create a booking for tomorrow by Varun to show Collision / Double booking blocks
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      parsedBookings = [
        {
          id: 'bk-seeded-1',
          customerName: 'Varun Kumar',
          customerEmail: 'varun@gamez.com',
          customerPhone: '9123456789',
          stationId: 'ps5-station', // Dual PS5 station
          bookingDate: tomorrowStr,
          startTime: '04:00 PM',
          durationHours: 2,
          totalPrice: 240,
          status: 'confirmed',
          holdExpiresAt: Date.now(),
          createdAt: Date.now() - 3600000,
          verificationCode: 'GZ-8899'
        },
        {
          id: 'bk-seeded-2',
          customerName: 'Rohit Shenoy',
          customerEmail: 'rohit@gmail.com',
          customerPhone: '8877665544',
          stationId: 'pool-table',
          bookingDate: new Date().toISOString().split('T')[0], // Today
          startTime: '07:00 PM',
          durationHours: 1,
          totalPrice: 150,
          status: 'confirmed',
          holdExpiresAt: Date.now(),
          createdAt: Date.now() - 7200000,
          verificationCode: 'GZ-4411'
        }
      ];
      localStorage.setItem('gz_bookings', JSON.stringify(parsedBookings));
    }
    setBookings(parsedBookings);

    // 4. Initial Simulated Emails
    const storedEmails = localStorage.getItem('gz_emails');
    if (storedEmails) {
      setEmails(JSON.parse(storedEmails));
    }
  }, []);

  // Helper to trigger email notification
  const dispatchEmailNotification = (to: string, subject: string, body: string) => {
    const newEmail: SimulatedEmail = {
      id: `em-${Date.now()}`,
      to,
      subject,
      body,
      timestamp: Date.now(),
      read: false
    };

    const updatedEmails = [newEmail, ...emails];
    setEmails(updatedEmails);
    localStorage.setItem('gz_emails', JSON.stringify(updatedEmails));
    setActiveNotification(newEmail);
  };

  // 1. Login Handler
  const login = (email: string, password: string) => {
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!foundUser) {
      return { success: false, error: 'No account found with this email address.' };
    }
    if (foundUser.password !== password) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    const { password: _, ...userSession } = foundUser;
    setCurrentUser(userSession);
    localStorage.setItem('gz_current_user', JSON.stringify(userSession));

    // Simulated email on login
    dispatchEmailNotification(
      userSession.email,
      '🔑 New Login Detected — GameZ Mangaluru',
      `Hello ${userSession.name},\n\nYou have successfully logged in to your GameZ Account. If this wasn't you, please reset your password immediately.`
    );

    return { success: true };
  };

  // 2. Registration Handler
  const register = (name: string, email: string, phone: string, password: string) => {
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'An account with this email address already exists.' };
    }

    const newUser: MockUser = {
      id: `usr-${Date.now()}`,
      name,
      email,
      phone,
      password
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('gz_users', JSON.stringify(updatedUsers));

    // Auto-login
    const { password: _, ...userSession } = newUser;
    setCurrentUser(userSession);
    localStorage.setItem('gz_current_user', JSON.stringify(userSession));

    // Simulated email on registration
    dispatchEmailNotification(
      newUser.email,
      '🎮 Welcome to GameZ Arena — Account Activated!',
      `Hi ${newUser.name},\n\nYour premium gamer account has been activated! Secure real-time console bookings, monitor live wait times, and cancel or extend sessions instantly from your online dashboard.\n\nHappy gaming!\nTeam GameZ Mangaluru`
    );

    return { success: true };
  };

  // 3. Password Reset
  const resetPassword = (email: string) => {
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!foundUser) {
      return { success: false, error: 'No account found with this email address.' };
    }

    const tempCode = Math.floor(100000 + Math.random() * 900000);
    
    // Dispatch simulated recovery email
    dispatchEmailNotification(
      foundUser.email,
      '🔐 Password Reset Verification Code',
      `Hello ${foundUser.name},\n\nWe received a request to reset your password. Use the following code to complete your recovery:\n\nVerification Code: ${tempCode}\n\nThis code will expire in 15 minutes. If you did not make this request, please disregard this email.`
    );

    return { 
      success: true, 
      message: `A simulated password reset code (${tempCode}) has been dispatched to your email address!` 
    };
  };

  // 4. Logout
  const logout = () => {
    if (currentUser) {
      dispatchEmailNotification(
        currentUser.email,
        '🚪 Logged Out — GameZ Mangaluru',
        `Goodbye ${currentUser.name}. Your active reservation session was successfully stored. See you in the next battle!`
      );
    }
    setCurrentUser(null);
    localStorage.removeItem('gz_current_user');
  };

  // 5. Conflict Checker (Checks for overlapping bookings on the same station and date)
  const checkSlotConflict = (
    stationId: string, 
    date: string, 
    time: string, 
    duration: number,
    ignoreBookingId?: string
  ) => {
    const startHour1 = parseTimeToDecimal(time);
    const endHour1 = startHour1 + duration;

    // Filter confirmed/active bookings for the same date and station
    const conflictingBookings = bookings.filter(b => {
      if (b.status !== 'confirmed') return false;
      if (b.stationId !== stationId) return false;
      if (b.bookingDate !== date) return false;
      if (ignoreBookingId && b.id === ignoreBookingId) return false;

      const startHour2 = parseTimeToDecimal(b.startTime);
      const endHour2 = startHour2 + b.durationHours;

      // Overlap condition: start1 < end2 && start2 < end1
      return startHour1 < endHour2 && startHour2 < endHour1;
    });

    if (conflictingBookings.length > 0) {
      const conflict = conflictingBookings[0];
      return {
        conflict: true,
        details: `Station already reserved from ${conflict.startTime} for ${conflict.durationHours} hour(s) by customer ${conflict.customerName}.`
      };
    }

    return { conflict: false };
  };

  // 6. Create Booking Handler
  const createBooking = (bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>) => {
    // Perform safety collision check
    const conflictCheck = checkSlotConflict(
      bookingData.stationId,
      bookingData.bookingDate,
      bookingData.startTime,
      bookingData.durationHours
    );

    if (conflictCheck.conflict) {
      return { success: false, error: conflictCheck.details };
    }

    const randomCode = `GZ-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBooking: Booking = {
      ...bookingData,
      id: `bk-${Date.now()}`,
      status: 'confirmed',
      holdExpiresAt: Date.now(),
      createdAt: Date.now(),
      verificationCode: randomCode
    };

    const updatedBookings = [newBooking, ...bookings];
    setBookings(updatedBookings);
    localStorage.setItem('gz_bookings', JSON.stringify(updatedBookings));

    // Dispatch rich receipt email
    dispatchEmailNotification(
      newBooking.customerEmail,
      `🎟️ Booking Confirmed: Pass Code ${newBooking.verificationCode}`,
      `Dear ${newBooking.customerName},\n\nYour gaming station has been successfully reserved! Present this receipt upon arrival at the desk:\n\n--- PLAYSTATION / GAME STATION RECEIPT ---\nCheck-in Pass: ${newBooking.verificationCode}\nScheduled Date: ${newBooking.bookingDate}\nStart Time: ${newBooking.startTime}\nSession Length: ${newBooking.durationHours} hour(s)\nTotal Price: ₹${newBooking.totalPrice} (Settle at desk)\n\n--- VENUE DIRECTIONS ---\n3rd Floor, Cyber Heights Mall, MG Road, Mangaluru.\n\nIf you need to change, extend, or cancel this booking, you can do so directly from your GameZ Online Dashboard.\n\nGet ready to conquer!\nTeam GameZ Mangaluru`
    );

    return { success: true, booking: newBooking };
  };

  // 7. Cancel Booking
  const cancelBooking = (bookingId: string) => {
    const bookingIndex = bookings.findIndex(b => b.id === bookingId);
    if (bookingIndex === -1) {
      return { success: false, error: 'Booking not found.' };
    }

    const targetBooking = bookings[bookingIndex];
    const updatedBookings = bookings.filter(b => b.id !== bookingId); // we can remove it or mark it cancelled
    // Let's mark it as cancelled or remove it so space is freed up
    setBookings(updatedBookings);
    localStorage.setItem('gz_bookings', JSON.stringify(updatedBookings));

    // Dispatch cancellation receipt
    dispatchEmailNotification(
      targetBooking.customerEmail,
      `❌ Booking Cancelled: Pass Code ${targetBooking.verificationCode}`,
      `Hello ${targetBooking.customerName},\n\nYour booking reservation for station code ${targetBooking.verificationCode} on ${targetBooking.bookingDate} at ${targetBooking.startTime} has been successfully CANCELLED.\n\nNo cancellation fees apply under our fair-play policy. Your table has been released back into the available pool for other local gamers.\n\nHope to see you book again soon!\nTeam GameZ Mangaluru`
    );

    return { success: true };
  };

  // 8. Extend Booking Hours
  const extendBooking = (bookingId: string, additionalHours: number) => {
    const bookingIndex = bookings.findIndex(b => b.id === bookingId);
    if (bookingIndex === -1) {
      return { success: false, error: 'Booking not found.' };
    }

    const targetBooking = bookings[bookingIndex];
    const currentStartHour = parseTimeToDecimal(targetBooking.startTime);
    const newDuration = targetBooking.durationHours + additionalHours;

    // Safety limit checking: maximum 6 hours continuous or crossing past closing hours (Midnight = 24.0)
    if (newDuration > 6) {
      return { success: false, error: 'Sessions are limited to a maximum of 6 hours total to ensure fair station rotations.' };
    }

    if (currentStartHour + newDuration > 24) {
      return { success: false, error: 'Extensions cannot cross our standard midnight closing time.' };
    }

    // Overlap collision checking (ignoring this booking itself)
    const conflictCheck = checkSlotConflict(
      targetBooking.stationId,
      targetBooking.bookingDate,
      targetBooking.startTime,
      newDuration,
      bookingId
    );

    if (conflictCheck.conflict) {
      return { 
        success: false, 
        error: `Extension Conflict: The station is reserved by another gamer immediately following your original slot. ${conflictCheck.details}` 
      };
    }

    // Update pricing calculation
    const ratePerHour = targetBooking.totalPrice / targetBooking.durationHours;
    const additionalCost = ratePerHour * additionalHours;
    const newPrice = targetBooking.totalPrice + additionalCost;

    const updatedBooking: Booking = {
      ...targetBooking,
      durationHours: newDuration,
      totalPrice: newPrice
    };

    const updatedBookings = bookings.map(b => b.id === bookingId ? updatedBooking : b);
    setBookings(updatedBookings);
    localStorage.setItem('gz_bookings', JSON.stringify(updatedBookings));

    // Dispatch extension notice email
    dispatchEmailNotification(
      targetBooking.customerEmail,
      `⚡ Session Extended: Pass Code ${targetBooking.verificationCode}`,
      `Hi ${targetBooking.customerName},\n\nYour active session for station code ${targetBooking.verificationCode} has been successfully EXTENDED by +${additionalHours} hour(s)!\n\n--- UPDATED BOOKING SLIP ---\nPass Code: ${targetBooking.verificationCode}\nScheduled Date: ${targetBooking.bookingDate}\nStart Time: ${targetBooking.startTime}\nNew Total Length: ${newDuration} hours\nNew Price Total: ₹${newPrice} (Pay outstanding balance at the counter)\n\nEnjoy your extra gameplay time!\nTeam GameZ Mangaluru`
    );

    return { success: true };
  };

  const dismissNotification = () => {
    setActiveNotification(null);
  };

  const clearAllEmails = () => {
    setEmails([]);
    localStorage.removeItem('gz_emails');
  };

  return (
    <AuthAndBookingContext.Provider
      value={{
        currentUser,
        users,
        bookings,
        emails,
        activeNotification,
        login,
        register,
        resetPassword,
        logout,
        createBooking,
        cancelBooking,
        extendBooking,
        checkSlotConflict,
        dismissNotification,
        clearAllEmails
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
