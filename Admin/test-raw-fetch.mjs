import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function testFetch() {
  await pb.collection('users').authWithPassword('testuser_booking@example.com', 'Password123!');
  console.log("Token:", pb.authStore.token);
  
  const res = await fetch('http://127.0.0.1:8090/api/collections/rooms/records?page=1&perPage=1', {
    headers: {
      'Authorization': pb.authStore.token
    }
  });
  
  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Response:", data);
}
testFetch();
