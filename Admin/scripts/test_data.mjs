import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');
async function test() {
  const bookings = await pb.collection("bookings").getFullList();
  console.log("Total Bookings in DB:", bookings.length);
  bookings.slice(-5).forEach(b => {
    console.log(`Booking: ${b.id} | room_type: ${b.room_type} | check_in: ${b.check_in} | check_out: ${b.check_out} | status: ${b.status}`);
  });
}
test().catch(console.error);
