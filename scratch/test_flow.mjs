/* 
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function runTests() {
  console.log("🎮 Starting GameZ User Flow Test...\n");
  
  const testEmail = `gamer_${Date.now()}@test.com`;
  const testPhone = `999${Math.floor(1000000 + Math.random() * 9000000)}`;
  const password = "password123";
  let userId;
  let customerId;
  let bookingId;

  try {
    // 1. Registration
    console.log(`[1/6] Registering new user: ${testEmail}...`);
    const userRecord = await pb.collection('portal_users').create({
      username: testPhone,
      email: testEmail,
      emailVisibility: true,
      password: password,
      passwordConfirm: password,
      name: "Test Gamer",
      phone: testPhone,
    });
    userId = userRecord.id;
    console.log(`✅ Registration successful! User ID: ${userId}`);

    // Wait a second for pb_hooks to finish creating the customer record async
    await new Promise(r => setTimeout(r, 1000));

    // 2. Login
    console.log(`\n[2/6] Logging in as ${testEmail}...`);
    const authData = await pb.collection('portal_users').authWithPassword(testEmail, password);
    customerId = authData.record.customer_id;
    console.log(`Record retrieved: `, authData.record);
    
    if (customerId) {
      console.log(`✅ Login successful!`);
      console.log(`✅ CRM Link Confirmed! Automatically linked to Customer ID: ${customerId}`);
    } else {
      console.log(`❌ Login failed or CRM link missing.`);
      // let's try fetching the record directly
      const fetchedUser = await pb.collection('portal_users').getOne(userId);
      console.log('Fetched directly:', fetchedUser);
      if(fetchedUser.customer_id) {
         customerId = fetchedUser.customer_id;
      } else {
         return;
      }
    }

    // 3. Booking
    console.log(`\n[3/6] Attempting to book a station...`);
    // Get first available station
    const stations = await pb.collection('stations').getFullList();
    const station = stations[0];
    const stationType = await pb.collection('station_types').getOne(station.station_type);

    // Set time for tomorrow
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 1);
    startTime.setHours(14, 0, 0, 0); // 2 PM tomorrow
    
    const endTime = new Date(startTime);
    endTime.setHours(startTime.getHours() + 2); // 2 hours

    const bookingData = {
      name: "Test Gamer",
      email: testEmail,
      phone: testPhone,
      station_type: stationType.id,
      assigned_station_id: station.id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      total_price: stationType.base_price * 2,
      guests: 1,
      booking_reference: 'TEST-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      status: 'confirmed',
      source: 'website',
      customer_id: customerId
    };

    const booking = await pb.collection('bookings').create(bookingData);
    bookingId = booking.id;
    console.log(`✅ Booking created successfully! Booking ID: ${bookingId} (Station: ${station.station_number})`);

    // 4. Double Booking Prevention Test
    console.log(`\n[4/6] Attempting to double-book the SAME station at the SAME time...`);
    try {
      await pb.collection('bookings').create({
        ...bookingData,
        booking_reference: 'TEST-DOUBLE'
      });
      console.log(`❌ FAIL: The system allowed a double booking!`);
    } catch (err) {
      console.log(`✅ SUCCESS: The system successfully blocked the double booking! (Error: ${err.status})`);
    }

    // 5. Extend Booking
    console.log(`\n[5/6] Extending the booking by 1 hour...`);
    const newEndTime = new Date(endTime);
    newEndTime.setHours(newEndTime.getHours() + 1);
    
    const extendedBooking = await pb.collection('bookings').update(bookingId, {
      end_time: newEndTime.toISOString(),
      total_price: stationType.base_price * 3
    });
    console.log(`✅ Booking extended successfully! New end time: ${extendedBooking.end_time}`);

    // 6. Cancel Booking & Password Reset
    console.log(`\n[6/6] Cancelling booking and requesting password reset...`);
    await pb.collection('bookings').update(bookingId, { status: 'cancelled' });
    console.log(`✅ Booking cancelled successfully!`);

    await pb.collection('portal_users').requestPasswordReset(testEmail);
    console.log(`✅ Password reset email requested for ${testEmail}!`);

    console.log(`\n🎉 All functionalities verified successfully!`);

  } catch (err) {
    console.error("❌ Test failed with error:", err.message);
  }
}

runTests();

*/
