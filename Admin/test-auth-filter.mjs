import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function testFetch() {
  await pb.admins.authWithPassword('admin@dreamhousehomestay.in', 'Admin@123');
  
  // Set bookings to request.auth.id != ""
  const coll = await pb.collections.getOne('bookings');
  coll.listRule = '@request.auth.id != ""';
  await pb.collections.update(coll.id, coll);
  console.log("Set bookings listRule to @request.auth.id != ''");
  
  // Now test with user
  pb.authStore.clear();
  await pb.collection('users').authWithPassword('testuser_booking@example.com', 'Password123!');
  console.log("Logged in as user.");
  
  try {
    const res = await pb.collection('bookings').getList(1, 1, { filter: 'booking_reference != ""' });
    console.log("User + filter on auth collection SUCCESS");
  } catch (e) {
    console.error("User + filter on auth collection FAIL:", e.response);
  }
}
testFetch();
