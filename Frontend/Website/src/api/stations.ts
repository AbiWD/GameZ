import pb from '../lib/pocketbase';
import type { Booking } from '../types';
import { parseTimeToDecimal } from '../lib/utils';
import { STATIONS } from '../data';
function sNameLowerIcon(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('snooker') || n.includes('pool') || n.includes('8 ball')) return 'CircleDot';
  if (n.includes('carrom')) return 'Grid';
  return 'Gamepad2';
}

export const stationsApi = {
  fetchPricing: async () => {
    let pStations: any[] = [];
    let tPrices: any[] = [];
    let stTypes: any[] = [];

    try { pStations = await pb.collection('stations').getFullList({ requestKey: null }); } catch (e) {}
    try { stTypes = await pb.collection('station_types').getFullList({ requestKey: null }); } catch (e) {}
    
    const hourlyRates: Record<string, number> = {};
    stTypes.forEach(st => {
      const price = st.base_price ?? st.hourly_rate ?? st.price_per_hour;
      const parsedPrice = typeof price === 'number' ? price : parseFloat(price);
      if (!isNaN(parsedPrice) && parsedPrice > 0) {
        hourlyRates[st.name] = parsedPrice;
      }
    });
    
    const tierPrices: Record<string, number> = {};
    tPrices.forEach(t => {
      const price = typeof t.price === 'number' ? t.price : parseFloat(t.price);
      if (!isNaN(price) && price > 0) {
        tierPrices[t.tier_id] = price;
      }
    });

    const liveAvailability: Record<string, { total: number; available: number }> = {};
    
    pStations.forEach(ps => {
      const matchedType = stTypes.find(st => st.id === ps.station_type || st.name === ps.station_type);
      const categoryName = matchedType ? matchedType.name : (ps.station_type || '');

      if (categoryName) {
        if (!liveAvailability[categoryName]) {
          liveAvailability[categoryName] = { total: 0, available: 0 };
        }
        const statusLower = (ps.status || '').toLowerCase();
        liveAvailability[categoryName].total += 1;
        if (statusLower === 'available') {
          liveAvailability[categoryName].available += 1;
        }
      }
    });

    const dynamicStationCategories = stTypes.map(st => {
      // 1. Resolve rate
      const rawPrice = st.base_price ?? st.hourly_rate ?? st.price_per_hour;
      const ratePerHour = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice) || 100;

      // 2. Resolve features JSON array
      let features: string[] = [];
      if (Array.isArray(st.features)) {
        features = st.features;
      } else if (typeof st.features === 'string' && st.features.trim() !== '') {
        try {
          const parsed = JSON.parse(st.features);
          if (Array.isArray(parsed)) features = parsed;
          else features = st.features.split('\n').filter(Boolean);
        } catch (e) {
          features = st.features.split(',').map(s => s.trim()).filter(Boolean);
        }
      }

      // 3. Resolve PocketBase image file URL or theme fallback
      let imageUrl = '';
      if (st.image) {
        imageUrl = pb.files.getURL(st, st.image);
      }
      if (!imageUrl) {
        imageUrl = '/images/gaming-placeholder.jpg';
      }

      // 4. Availability counts
      const availInfo = liveAvailability[st.name] || { total: 0, available: 0 };

      return {
        id: st.id,
        name: st.name,
        ratePerHour,
        description: st.description || '',
        features: features.length > 0 ? features : ['High Performance Setup', 'Comfortable Recliners', 'High Speed Connectivity'],
        totalSlots: availInfo.total,
        availableNow: availInfo.available,
        imageUrl,
        iconName: sNameLowerIcon(st.name)
      };
    });
    
    return { pStations, tPrices, stTypes, hourlyRates, tierPrices, liveAvailability, dynamicStationCategories };
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
      const blackouts = await pb.collection('blackout_periods').getFullList({ requestKey: null });
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
    try { stTypesRaw = await pb.collection('station_types').getFullList({ requestKey: null }); } catch(e) {}

    const staticStation = STATIONS.find(s => s.id === categoryId);
    const categoryName = staticStation ? staticStation.name : (stTypesRaw.find(s => s.id === categoryId)?.name || categoryId);
    if (!categoryName) return { conflict: true, details: 'Invalid station category.' };

    let allCategoryStations: any[] = [];
    try {
      allCategoryStations = await pb.collection('stations').getFullList({
        filter: `station_type = "${categoryName}"`,
        requestKey: null
      });
    } catch (err) {
      return { conflict: true, details: 'Failed to retrieve available stations.' };
    }

    const bookableStations = allCategoryStations.filter(s => s.status !== 'maintenance');

    if (bookableStations.length === 0) {
      return { conflict: true, details: 'All stations in this category are currently under maintenance.' };
    }

    for (const pStation of bookableStations) {
      const isToday = date === new Date().toISOString().split('T')[0];
      const isManuallyOccupiedNow = isToday && pStation.status === 'occupied';

      const conflictingBookingsForThisStation = existingBookings.filter(b => {
        if (b.status !== 'confirmed') return false;
        if (b.stationId !== pStation.id) return false;
        if (b.bookingDate !== date) return false;
        if (ignoreBookingId && b.id === ignoreBookingId) return false;
        
        const startHour2 = parseTimeToDecimal(b.startTime);
        const endHour2 = startHour2 + b.durationHours;
        return startHour1 < endHour2 && startHour2 < endHour1;
      });

      if (!isManuallyOccupiedNow && conflictingBookingsForThisStation.length === 0) {
        return { conflict: false, assignedStationId: pStation.id };
      }
    }

    return {
      conflict: true,
      details: `All ${bookableStations.length} stations in this lounge are fully booked for the selected time.`
    };
  }
};
