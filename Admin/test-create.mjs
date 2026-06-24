import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function simulateFrontend() {
  await pb.admins.authWithPassword('admin@dreamhousehomestay.in', 'Admin@123');
  try {
      const payload = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '9878798798',
        room_type: 'Single Bed AC',
        guests: NaN,
        check_in: '2026-03-17',
        check_out: '2026-03-18',
        message: 'Test',
        price: NaN,
        booking_reference: 'DH-0001'
      };
      
      console.log('Posting payload:', payload);
      await pb.collection('bookings').create(payload);
      console.log('POST success');
  } catch (e) {
    console.log(JSON.stringify(e, null, 2));
    console.log("Error details:", e.data);
  }
}
simulateFrontend();
