import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function testPermutations() {
  await pb.collection('users').authWithPassword('testuser_booking@example.com', 'Password123!');
  console.log("Token acquired.");

  const permutations = [
    'http://127.0.0.1:8090/api/collections/rooms/records?page=1&perPage=1',
    'http://127.0.0.1:8090/api/collections/rooms/records?page=1&perPage=1&sort=-created',
    'http://127.0.0.1:8090/api/collections/bookings/records?page=1&perPage=1',
    'http://127.0.0.1:8090/api/collections/bookings/records?page=1&perPage=1&sort=-created'
  ];

  for (const url of permutations) {
    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': pb.authStore.token
        }
      });
      console.log(`\n\n=== RESULT FOR: ${url.split('api/collections/')[1]} ===`);
      console.log(`STATUS: ${res.status}`);
      if (res.status !== 200) {
        console.log("BODY:", await res.text());
      }
    } catch (e) {
      console.error("Fetch failed:", e);
    }
  }
}
testPermutations();
