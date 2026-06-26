import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function testFilter() {
  await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin@123');

  try {
    console.log("Testing with double quotes:");
    await pb.collection('bookings').getList(1, 1, { filter: 'booking_reference != ""' });
    console.log("Double quotes SUCCESS");
  } catch (e) {
    console.error("Double quotes FAIL:", e.response);
  }

  try {
    console.log("Testing with single quotes:");
    await pb.collection('bookings').getList(1, 1, { filter: "booking_reference != ''" });
    console.log("Single quotes SUCCESS");
  } catch (e) {
    console.error("Single quotes FAIL:", e.response);
  }

  try {
    console.log("Testing with no filter:");
    await pb.collection('bookings').getList(1, 1, {});
    console.log("No filter SUCCESS");
  } catch (e) {
    console.error("No filter FAIL:", e.response);
  }
}

testFilter();
