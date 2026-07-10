/* 
import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function run() {
  await pb.collection('_superusers').authWithPassword('sysadmin@gamez.in', 'Password123!');
  
  const payload = {
    name: "John",
    email: "john@example.com",
    phone: "1234567890",
    status: "confirmed",
    total_price: 100,
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600).toISOString(),
    players: 1
  };
  
  try {
    const record = await pb.collection('bookings').create(payload);
    console.log("Success!", record.id);
  } catch (err) {
    console.error("Failed:", err.response);
  }
}
run();

*/
