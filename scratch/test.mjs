import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function run() {
  try {
    await pb.admins.authWithPassword('test@admin.com', 'admin@1234');
    
    // First, let's get a station
    const stations = await pb.collection('stations').getFullList();
    if (stations.length === 0) {
      console.log('NO STATIONS IN DB!');
      return;
    }
    const stationId = stations[0].id;
    
    const startDate = new Date();
    startDate.setHours(startDate.getHours() + 1, 0, 0, 0);
    const endDate = new Date(startDate.getTime() + 3600000);

    console.log("Trying to create booking...");
    const rec = await pb.collection('bookings').create({
        assigned_station_id: stationId,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'confirmed',
        total_price: 100,
        players: 1,
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '1234567890',
        booking_reference: 'OT-1234',
        customer_id: null // Let's test with null
    });
    console.log("Success!", rec.id);
  } catch (err) {
    console.error("Failed!", err.response?.message);
    console.error(err.response?.data);
  }
}
run();
