/* 
import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function test() {
  await pb.collection('portal_users').authWithPassword('test1@example.com', 'Password123!');
  try {
    const d = {
      name: 'Test',
      phone: '0000000000',
      assigned_station_id: '7r15mz27dt879jb',
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 3600000).toISOString(),
      total_price: 200,
      players: 1,
      status: 'confirmed',
      source: 'website'
    };
    await pb.collection('bookings').create(d);
    console.log("Success");
  } catch (err) {
    console.error(err);
    if (err.response) console.log(JSON.stringify(err.response, null, 2));
  }
}
test();

*/
