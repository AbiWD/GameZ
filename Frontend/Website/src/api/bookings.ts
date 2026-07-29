import pb from '../lib/pocketbase';
import type { Booking } from '../types';
import { parseTimeToDecimal, mapPbToBooking } from '../lib/utils';
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

    const randomCode = `OT-${Math.floor(10000 + Math.random() * 90000)}`;
    const startHour = parseTimeToDecimal(bookingData.startTime);
    const startDate = new Date(bookingData.bookingDate);
    startDate.setHours(Math.floor(startHour), (startHour % 1) * 60, 0, 0);
    const endDate = new Date(startDate.getTime() + bookingData.durationHours * 3600000);

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
      customer_id: pb.authStore.model?.id,
      property_id: '20fml0zc3egjxy4'
    });
    
    return mapPbToBooking(rec);
  },

  cancelBooking: async (bookingId: string) => {
    const booking = await pb.collection('bookings').getOne(bookingId).catch(() => null);
    const updateData: any = { status: 'cancelled' };
    if (booking && booking.hold_token) {
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

    const conflictingBookingsForThisStation = existingBookings.filter(b => {
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
      throw new Error(`Extension Conflict: The station is reserved by another gamer immediately following your original slot. Reserved from ${conflict.startTime} for ${conflict.durationHours} hour(s).`);
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
    if (rec && rec.hold_token) {
      updatePayload.hold_token = rec.hold_token;
    }

    await pb.collection('bookings').update(bookingId, updatePayload);
    
    // We will handle the email dispatch from the UI level after the mutation succeeds, 
    // or return the updated data so the UI can construct the email.
    return { ...targetBooking, durationHours: newDuration, totalPrice: newPrice };
  }
};
