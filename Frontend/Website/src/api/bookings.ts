import pb from '../lib/pocketbase';
import type { Booking } from '../types';
import { parseTimeToDecimal, formatDecimalToTime, mapPbToBooking } from '../lib/utils';
import { stationsApi } from './stations';

export const bookingsApi = {
  fetchBookings: async () => {
    const records = await pb.collection('bookings').getFullList({ sort: '-created' });
    return records.map(mapPbToBooking);
  },

  checkBanStatus: async (email: string) => {
    try {
      const customerCheck = await pb.collection('customers').getFirstListItem(`email = "${email}"`);
      return customerCheck && customerCheck.status === 'banned';
    } catch (err) {
      return false;
    }
  },

  createBooking: async (
    bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>,
    existingBookings: Booking[]
  ) => {
    const isBanned = await bookingsApi.checkBanStatus(bookingData.customerEmail);
    if (isBanned) {
      throw new Error('Your account has been restricted from making new bookings. Please contact support.');
    }

    const conflictCheck = await stationsApi.checkSlotConflict(
      bookingData.stationId,
      bookingData.bookingDate,
      bookingData.startTime,
      bookingData.durationHours,
      existingBookings
    );

    if (conflictCheck.conflict || !conflictCheck.assignedStationId) {
      throw new Error(conflictCheck.details || 'Station conflict');
    }

    const randomCode = `OT-${Math.floor(100000 + Math.random() * 900000)}`;
    const startHour = parseTimeToDecimal(bookingData.startTime);
    const startDate = new Date(bookingData.bookingDate);
    startDate.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0);
    const endDate = new Date(startDate.getTime() + bookingData.durationHours * 3600000);

    let resolvedName = bookingData.customerName;
    if ((!resolvedName || resolvedName.trim() === '' || resolvedName.startsWith('Guest (')) && pb.authStore.model?.name) {
      resolvedName = pb.authStore.model.name;
    }
    if (!resolvedName || resolvedName.trim() === '') {
      resolvedName = bookingData.customerPhone ? `Guest (${bookingData.customerPhone})` : 'Gamer Guest';
    }

    let activePropertyId = '';
    try {
      const activeProp = await pb.collection('properties').getFirstListItem('is_active = true', { requestKey: null });
      if (activeProp) {
        activePropertyId = activeProp.id;
      }
    } catch (e) {}

    const rec = await pb.collection('bookings').create({
      assigned_station_id: conflictCheck.assignedStationId,
      station_type: bookingData.stationId,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      status: 'confirmed',
      total_price: bookingData.totalPrice,
      players: 1,
      name: resolvedName,
      email: bookingData.customerEmail,
      phone: bookingData.customerPhone,
      booking_reference: randomCode,
      customer_id: pb.authStore.model?.id,
      ...(activePropertyId ? { property_id: activePropertyId } : {})
    });
    
    return mapPbToBooking(rec);
  },

  cancelBooking: async (bookingId: string) => {
    const booking = await pb.collection('bookings').getOne(bookingId).catch(() => null);
    if (!booking) throw new Error('Booking not found.');

    if (booking.status === 'cancelled') {
      throw new Error('This booking is already cancelled.');
    }

    // Cancellation policy: self-service cancellation restricted within 1 hour of start time
    const startTimeObj = new Date(booking.start_time);
    const now = new Date();
    const diffMinutes = (startTimeObj.getTime() - now.getTime()) / (1000 * 60);

    if (diffMinutes < 60) {
      throw new Error('Self-service cancellation is restricted within 1 hour of scheduled start time. Please contact cafe management for assistance.');
    }

    const updateData: any = { status: 'cancelled' };
    if (booking.hold_token) {
      updateData.hold_token = booking.hold_token;
    }
    await pb.collection('bookings').update(bookingId, updateData);
    return true;
  },

  extendBooking: async (
    bookingId: string, 
    additionalHours: number, 
    existingBookings: Booking[]
  ) => {
    const targetBooking = existingBookings.find(b => b.id === bookingId);
    if (!targetBooking) throw new Error('Booking not found.');

    const currentStartHour = parseTimeToDecimal(targetBooking.startTime);
    const newDuration = targetBooking.durationHours + additionalHours;

    if (newDuration > 6) {
      throw new Error('Sessions are limited to a maximum of 6 hours total to ensure fair station rotations.');
    }

    if (currentStartHour + newDuration > 24) {
      throw new Error('Extensions cannot cross our standard midnight closing time.');
    }

    // Smart Multi-Station Availability Check:
    // First, check if current physical station is available for extended time.
    // If current station is taken by someone else, check if another physical station in the SAME lounge category is free!
    let assignedStationId = targetBooking.stationId;

    const currentStationConflicts = existingBookings.filter(b => {
      if (b.status !== 'confirmed') return false;
      if (b.stationId !== targetBooking.stationId) return false;
      if (b.bookingDate !== targetBooking.bookingDate) return false;
      if (b.id === bookingId) return false;
      
      const startHour2 = parseTimeToDecimal(b.startTime);
      const endHour2 = startHour2 + b.durationHours;
      return currentStartHour < endHour2 && startHour2 < currentStartHour + newDuration;
    });

    if (currentStationConflicts.length > 0) {
      // Current physical unit is booked by someone else during extension.
      // Check if ANY other physical station in the SAME category is available!
      const currentStationRecord = await pb.collection('stations').getOne(targetBooking.stationId).catch(() => null);
      const categoryName = currentStationRecord?.station_type;

      let foundAlternative = false;
      if (categoryName) {
        const categoryCheck = await stationsApi.checkSlotConflict(
          categoryName,
          targetBooking.bookingDate,
          targetBooking.startTime,
          newDuration,
          existingBookings,
          bookingId
        );
        if (!categoryCheck.conflict && categoryCheck.assignedStationId) {
          assignedStationId = categoryCheck.assignedStationId;
          foundAlternative = true;
        }
      }

      if (!foundAlternative) {
        const conflict = currentStationConflicts[0];
        const cStart = parseTimeToDecimal(conflict.startTime);
        const cEnd = cStart + conflict.durationHours;
        const cEndTimeFormatted = formatDecimalToTime(cEnd);
        throw new Error(`All stations in this lounge category are reserved from ${conflict.startTime} to ${cEndTimeFormatted}. To play more, you can book a new session for a later time or select another lounge!`);
      }
    }

    const ratePerHour = targetBooking.totalPrice / targetBooking.durationHours;
    const additionalCost = ratePerHour * additionalHours;
    const newPrice = targetBooking.totalPrice + additionalCost;

    const startHourVal = parseTimeToDecimal(targetBooking.startTime);
    const startDate = new Date(targetBooking.bookingDate);
    startDate.setHours(Math.floor(startHourVal), (startHourVal % 1) * 60, 0, 0);
    const newEndDate = new Date(startDate.getTime() + newDuration * 3600000);

    const blackouts = await pb.collection('blackout_periods').getFullList().catch(() => []);
    for (const b of blackouts) {
      const bStart = new Date(b.start_time);
      const bEnd = new Date(b.end_time);
      if (startDate < bEnd && bStart < newEndDate) {
        throw new Error(`Cannot extend. Store is closed during this time: ${b.reason}`);
      }
    }

    const rec = await pb.collection('bookings').getOne(bookingId).catch(() => null);
    const updatePayload: any = {
       end_time: newEndDate.toISOString(),
       total_price: newPrice
    };
    
    // Only include assigned_station_id if it actually changed to a different physical station ID to prevent PocketBase API permission error
    if (rec && assignedStationId && assignedStationId !== rec.assigned_station_id && assignedStationId !== targetBooking.stationId) {
       updatePayload.assigned_station_id = assignedStationId;
    }

    if (rec && rec.hold_token) {
      updatePayload.hold_token = rec.hold_token;
    }

    await pb.collection('bookings').update(bookingId, updatePayload);
    
    // We will handle the email dispatch from the UI level after the mutation succeeds, 
    // or return the updated data so the UI can construct the email.
    return { ...targetBooking, durationHours: newDuration, totalPrice: newPrice };
  }
};
