import pb from '../lib/pocketbase';
import type { Booking } from '../types';
import { parseTimeToDecimal } from '../lib/utils';
import { STATIONS } from '../data';

export const stationsApi = {
  fetchPricing: async () => {
    const pStations = await pb.collection('stations').getFullList();
    const tPrices = await pb.collection('tier_prices').getFullList();
    const stTypes = await pb.collection('station_types').getFullList();
    
    const hourlyRates: Record<string, number> = {};
    stTypes.forEach(st => {
      hourlyRates[st.name] = st.base_price;
    });
    
    const tierPrices: Record<string, number> = {};
    tPrices.forEach(t => {
      tierPrices[t.tier_id] = t.price;
    });
    
    return { pStations, tPrices, stTypes, hourlyRates, tierPrices };
  },

  checkSlotConflict: async (
    categoryId: string, 
    date: string, 
    time: string, 
    duration: number,
    existingBookings: Booking[], // pass from cache or fetch
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
    
    let stTypesRaw: any[] = [];
    try { stTypesRaw = await pb.collection('station_types').getFullList(); } catch(e) {}

    const staticStation = STATIONS.find(s => s.id === categoryId);
    const categoryName = staticStation ? staticStation.name : (stTypesRaw.find(s => s.id === categoryId)?.name || categoryId);
    if (!categoryName) return { conflict: true, details: 'Invalid station category.' };

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

    for (const pStation of physicalStations) {
      const conflictingBookingsForThisStation = existingBookings.filter(b => {
        if (b.status !== 'confirmed') return false;
        if (b.stationId !== pStation.id) return false;
        if (b.bookingDate !== date) return false;
        if (ignoreBookingId && b.id === ignoreBookingId) return false;
        
        const startHour2 = parseTimeToDecimal(b.startTime);
        const endHour2 = startHour2 + b.durationHours;
        return startHour1 < endHour2 && startHour2 < endHour1;
      });

      if (conflictingBookingsForThisStation.length === 0) {
        return { conflict: false, assignedStationId: pStation.id };
      }
    }

    return {
      conflict: true,
      details: `All ${physicalStations.length} stations in this lounge are fully booked for the selected time.`
    };
  }
};
