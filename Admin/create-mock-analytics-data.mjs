import PocketBase from 'pocketbase';
import { subDays, format } from 'date-fns';

const pb = new PocketBase('http://127.0.0.1:8090');

async function generateAnalyticsData() {
  try {
    console.log("Authenticating as admin...");
    await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin123');

    const properties = await pb.collection('properties').getFullList();
    const propertyId = properties.length > 0 ? properties[0].id : null;

    const stations = await pb.collection('stations').getFullList();
    if (stations.length === 0) {
      console.log("No stations found. Please run setup-gaming-data.mjs first.");
      return;
    }

    console.log("Generating 100 mock bookings for Analytics...");
    
    let createdCount = 0;
    const now = new Date();

    for (let i = 0; i < 100; i++) {
      const station = stations[Math.floor(Math.random() * stations.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const bookingDate = subDays(now, daysAgo);
      
      let hour;
      if (Math.random() > 0.4) {
        hour = 16 + Math.floor(Math.random() * 6); // 4 PM to 10 PM
      } else {
        hour = 10 + Math.floor(Math.random() * 6); // 10 AM to 4 PM
      }
      
      bookingDate.setHours(hour, 0, 0, 0);

      const minutesDuration = 30 + Math.floor(Math.random() * 150);
      const endDate = new Date(bookingDate.getTime() + minutesDuration * 60000);

      const isWalkIn = Math.random() < 0.7;
      const refPrefix = isWalkIn ? 'OT-' : 'ADV-';
      const refStr = `${refPrefix}${Math.floor(1000 + Math.random() * 9000)}`;

      const price = Math.round((station.price_per_hour / 60) * minutesDuration);

      const isWalkInName = isWalkIn ? 'Walk-in Guest' : `Player ${Math.floor(Math.random() * 50)}`;
      const isWalkInPhone = isWalkIn ? '0000000000' : `98765${Math.floor(10000 + Math.random() * 90000)}`;

      const booking = {
        property_id: propertyId,
        station_id: station.id,
        booking_reference: refStr,
        name: isWalkInName,
        guest_name: isWalkInName,
        email: isWalkIn ? 'walkin@gamez.in' : `player${Math.floor(Math.random() * 50)}@gamez.in`,
        guest_email: isWalkIn ? 'walkin@gamez.in' : `player${Math.floor(Math.random() * 50)}@gamez.in`,
        phone: isWalkInPhone,
        guest_phone: isWalkInPhone,
        status: 'confirmed',
        start_time: bookingDate.toISOString(),
        end_time: endDate.toISOString(),
        amount_paid: price,
        price: price,
        total_price: price,
        payment_status: 'paid',
        payment_mode: Math.random() > 0.5 ? 'cash' : 'upi',
        guests: 1 + Math.floor(Math.random() * 3),
        players: 1 + Math.floor(Math.random() * 3),
        source: isWalkIn ? 'walk_in' : 'direct',
        check_in_date: bookingDate.toISOString(),
        check_out_date: endDate.toISOString()
      };

      try {
        await pb.collection('bookings').create(booking);
        createdCount++;
        if (createdCount % 20 === 0) console.log(`Created ${createdCount} bookings...`);
      } catch (err) {
        if (createdCount === 0) console.error("Error creating booking:", err.response);
      }
    }

    console.log(`🎉 Successfully created ${createdCount} mock bookings! Check your Analytics dashboard.`);

  } catch (err) {
    console.error("Error:", err);
  }
}

generateAnalyticsData();
