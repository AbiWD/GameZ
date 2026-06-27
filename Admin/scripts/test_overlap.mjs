import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');
async function test() {
  const b1 = await pb.collection("bookings").create({
    booking_reference: "DH-19-20",
    name: "User 1",
    email: "t@t.com",
    phone: "+91123",
    check_in: "2026-03-19",
    check_out: "2026-03-20",
    guests: 1,
    room_type: "Single bed Ac",
    price: 1500,
    payment_mode: "property",
    payment_status: "pending",
    amount_paid: 0,
    status: "confirmed"
  });

  const checkIn2 = "2026-03-20";
  const checkOut2 = "2026-03-21";
  
  const overlapping = await pb.collection("bookings").getFullList({
    filter: `check_in < "${checkOut2}" && check_out > "${checkIn2}" && status != 'cancelled' && id = '${b1.id}'`
  });

  console.log(`Checking if 19->20 overlaps with 20->21:`);
  console.log("Overlap Found?", overlapping.length > 0 ? "YES (BUG!)" : "NO (CORRECT)");
  
  await pb.collection("bookings").delete(b1.id);
  
  // also what if we try 19->19 to 19->19
  const b2 = await pb.collection("bookings").create({
    booking_reference: "DH-19-19",
    name: "User 2",
    email: "t@t.com",
    phone: "+91123",
    check_in: "2026-03-19T00:00:00.000Z",
    check_out: "2026-03-19T00:00:00.000Z",
    guests: 1,
    room_type: "Single bed Ac",
    price: 1500,
    payment_mode: "property",
    payment_status: "pending",
    amount_paid: 0,
    status: "confirmed"
  });

  const checkIn3 = "2026-03-19";
  const checkOut3 = "2026-03-19";
  const overlapping2 = await pb.collection("bookings").getFullList({
    filter: `check_in < "${checkOut3}" && check_out > "${checkIn3}" && status != 'cancelled' && id = '${b2.id}'`
  });
  console.log(`Checking if 19->19 overlaps with 19->19:`);
  console.log("Overlap Found?", overlapping2.length > 0 ? "YES" : "NO (BUG!)");
  await pb.collection("bookings").delete(b2.id);
}
test().catch(console.error);
