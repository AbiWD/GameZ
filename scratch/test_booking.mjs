import PocketBase from 'pocketbase';
async function test() {
  const pb = new PocketBase('http://127.0.0.1:8090');
  try {
    // 1. Get stations
    const physicalStations = await pb.collection('stations').getFullList({ filter: "station_type = 'Championship Snooker' && status = 'active'" });
    console.log('stations found:', physicalStations.length);
    
    if (physicalStations.length === 0) {
      console.log('No stations found!');
      return;
    }

    // 2. Create booking
    const res = await pb.collection('bookings').create({
        assigned_station_id: physicalStations[0].id,
        start_time: new Date('2026-07-11T15:00:00Z').toISOString(),
        end_time: new Date('2026-07-11T17:00:00Z').toISOString(),
        status: 'confirmed',
        total_price: 800,
        players: 1,
        name: 'Tony Stark',
        email: 'tony@gmail.com',
        phone: '9878769877',
        booking_reference: 'OT-1234',
        property_id: '20fml0zc3egjxy4'
    });
    console.log('booking created:', res.id);
  } catch (err) {
    console.error('Error:', err.response);
  }
}
test();
