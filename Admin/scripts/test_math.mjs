import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');
async function test() {
  const checkIn = "2024-12-01";
  const checkOut = "2024-12-05";

  // create a dummy booking
  const b = await pb.collection("bookings").create({
    booking_reference: "DH-MATH",
    name: "Test User",
    email: "test@example.com",
    phone: "+911234567890",
    check_in: checkIn,
    check_out: checkOut,
    guests: 2,
    room_type: "Single bed Ac",
    price: 1500,
    payment_mode: "property",
    payment_status: "pending",
    amount_paid: 0,
    status: "confirmed"
  });

  const physicalRooms = await pb.collection("rooms").getFullList({ filter: "status != 'maintenance'" });
  const overlapping = await pb.collection("bookings").getFullList({
    filter: `check_in < "${checkOut}" && check_out > "${checkIn}" && status != 'cancelled'`
  });
  const typesResult = await pb.collection("room_types").getFullList();

  console.log("AFTER CREATING BOOKING...");
  console.log("OVERLAPPING BOOKINGS:", overlapping.length);
  overlapping.forEach(b => console.log(` - ref: ${b.booking_reference}, type: ${b.room_type}, dates: ${b.check_in} to ${b.check_out}`));

  console.log("FINAL AVAILABILITY MATH:");
  typesResult.forEach(type => {
    const totalRooms = physicalRooms.filter((r) => r.room_type === type.name).length;
    const bookedCount = overlapping.filter((b) => b.room_type === type.name).length;
    const available = totalRooms - bookedCount;
    if (type.name === 'Single bed Ac') console.log(`TYPE: ${type.name} -> Total: ${totalRooms}, Booked: ${bookedCount}, Avail: ${available}`);
  });

  // delete dummy
  await pb.collection("bookings").delete(b.id);
  console.log("Deleted mock booking")
}
test().catch(console.error);
