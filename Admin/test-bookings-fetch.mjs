import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function testFetchAllBookings() {
  await pb.collection('users').authWithPassword('testuser_booking@example.com', 'Password123!');
  console.log("Token acquired.");

  try {
    const res = await fetch('http://127.0.0.1:8090/api/collections/bookings/records?sort=-created', {
      headers: {
        'Authorization': pb.authStore.token
      }
    });
    console.log(`STATUS: ${res.status}`);
    if (res.status !== 200) {
      console.log("BODY:", await res.text());
    } else {
      const data = await res.json();
      console.log(`FOUND: ${data.items.length} bookings.`);
    }
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}
testFetchAllBookings();
