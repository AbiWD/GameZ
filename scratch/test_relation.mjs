/* 
import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function test() {
  await pb.collection('portal_users').authWithPassword('test1@example.com', 'Password123!');
  try {
    const d = {
      name: 'Test',
      email: 'test@example.com',
      phone: '0000000000',
      assigned_station_id: "",
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 3600000).toISOString(),
      total_price: 200,
      players: 1,
      status: 'confirmed',
      source: 'website'
    };
    await pb.collection('bookings').create(d);
    console.log("Success with empty string!");
  } catch (err) {
    console.error("Empty string error:", err.response);
  }
}
test();

*/
