import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function testFetch() {
  await pb.collection('users').authWithPassword('testuser_booking@example.com', 'Password123!');
  console.log("Token:", pb.authStore.token);
  
  // Notice the filter query string exactly as the browser sends it!
  const url = 'http://127.0.0.1:8090/api/collections/bookings/records?page=1&perPage=1&sort=-created&filter=booking_reference%20!%3D%20%22%22';
  console.log("Fetching:", url);
  const res = await fetch(url, {
    headers: {
      'Authorization': pb.authStore.token
    }
  });
  
  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Response:", data);
}
testFetch();
