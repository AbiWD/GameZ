import type { Booking } from '../types';

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

export function mapPbToBooking(pbRec: any): Booking {
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
    status: pbRec.status === 'pending' ? 'held' : pbRec.status as 'held' | 'confirmed' | 'expired' | 'cancelled',
    holdExpiresAt: new Date(pbRec.expires_at || 0).getTime(),
    createdAt: new Date(pbRec.created).getTime(),
    verificationCode: pbRec.booking_reference
  };
}
