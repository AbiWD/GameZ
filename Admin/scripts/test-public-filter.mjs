import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function testFetch() {
  await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin@123');
  
  // Set bookings to public
  const coll = await pb.collections.getOne('bookings');
  coll.listRule = "";
  await pb.collections.update(coll.id, coll);
  console.log("Set bookings listRule to public.");
  
  // Now test with user
  pb.authStore.clear();
  await pb.collection('users').authWithPassword('testuser_booking@example.com', 'Password123!');
  console.log("Logged in as user.");
  
  try {
    const res = await pb.collection('bookings').getList(1, 1, { filter: 'booking_reference != ""' });
    console.log("User + filter on public collection SUCCESS");
  } catch (e) {
    console.error("User + filter on public collection FAIL:", e.response);
  }
}
testFetch();
