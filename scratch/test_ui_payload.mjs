/* 
import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function run() {
  try {
    const email = "test_booking_" + Date.now() + "@example.com";
    const user = await pb.collection('portal_users').create({
      email: email,
      password: "password123",
      passwordConfirm: "password123",
      name: "Test User",
      phone: "1231231234"
    });
    
    // Auth
    await pb.collection('portal_users').authWithPassword(email, "password123");
    
    try {
      const u = await pb.collection('portal_users').getOne(user.id);
      console.log("I can view myself:", u.id);
    } catch(err) {
      console.error("I CANNOT view myself:", err.response);
    }
    
    const payload = {
        name: user.name || 'Web User',
        email: user.email,
        phone: user.phone || '0000000000',
        assigned_station_id: "7r15mz27dt879jb", // Using an actual PS5 station ID from our earlier dump
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
        total_price: 200,
        players: 1,
        status: 'confirmed',
        source: 'website',
        web_user_id: user.id
    };
    
    console.log("Sending payload:", payload);
    try {
      const record = await pb.collection('bookings').create(payload);
      console.log("Success!", record.id);
    } catch (createErr) {
      console.error("CREATE FAILED:", JSON.stringify(createErr.response, null, 2));
    }
  } catch (err) {
    console.error("SETUP FAILED:", JSON.stringify(err.response, null, 2));
  }
}
run();

*/
