import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function test() {
  await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin@123');
  try {
    const records = await pb.collection('bookings').getList(1, 1, { filter: 'booking_reference != ""', requestKey: null });
    console.log('Success', records);
  } catch (e) {
    console.error('Error getting list:', e.response);
  }
}
test();
