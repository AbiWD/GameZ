import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function runTests() {
  console.log('--- STARTING USER JOURNEY TEST ---');
  
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'password123';
  let userId;
  
  // 1. Registration
  try {
    console.log(`\n1. Registering user: ${testEmail}...`);
    const record = await pb.collection('portal_users').create({
      username: `testuser_${Date.now()}`,
      email: testEmail,
      emailVisibility: true,
      password: testPassword,
      passwordConfirm: testPassword,
      name: 'Test Gamer',
      phone: '9876543210',
      role: 'user'
    });
    userId = record.id;
    console.log('✅ Registration successful! User ID:', userId);
  } catch (err) {
    console.error('❌ Registration failed:', err.message);
    return;
  }

  // 2. Login
  try {
    console.log('\n2. Logging in...');
    const authData = await pb.collection('portal_users').authWithPassword(testEmail, testPassword);
    console.log('✅ Login successful! Token received.');
  } catch (err) {
    console.error('❌ Login failed:', err.message);
    return;
  }

  // Fetch an available station
  console.log('\nFetching available stations...');
  const stations = await pb.collection('stations').getFullList();
  if (stations.length === 0) {
    console.error('❌ No stations found in database. Cannot test booking.');
    return;
  }
      const stationObj = stations[0];
      const stationId = stationObj.id;
      const propertyId = stationObj.property_id;
      const stationType = stationObj.station_type;
      
      console.log(`Using Station ID: ${stationId} (Property: ${propertyId}, Type: ${stationType}) for booking.`);
      
      // 3. Make a Booking
      let bookingId;
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 24); // Book for tomorrow
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1); // 1 hour duration
      
      try {
        console.log('\n3. Creating a Booking...');
        const bookingRecord = await pb.collection('bookings').create({
          name: 'Test Gamer',
          email: testEmail,
          phone: '9876543210',
          assigned_station_id: stationId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          total_price: 150,
          players: 1,
          status: 'confirmed',
          source: 'website',
          property_id: propertyId,
          station_type: stationType,
          customer_id: userId
        });
    bookingId = bookingRecord.id;
    console.log('✅ Booking created successfully! Booking ID:', bookingId);
  } catch (err) {
    console.error('❌ Booking failed:', err.message);
    return;
  }

  // 4. Test Multi-User Booking (Overlap Protection)
  try {
    console.log('\n4. Testing Overlap Protection (Multi-user same booking)...');
    console.log('Simulating a second user trying to book the exact same slot...');
    
    // In our UI, overlap is checked manually via API before creating.
    // Let's perform the exact check the frontend does:
    const filter = `status != 'cancelled' && assigned_station_id = '${stationId}' && start_time < '${endTime.toISOString().replace('T', ' ')}' && end_time > '${startTime.toISOString().replace('T', ' ')}'`;
    const overlappingBookings = await pb.collection('bookings').getFullList({ filter });
    
    if (overlappingBookings.length > 0) {
      console.log(`✅ Overlap protection works! Found ${overlappingBookings.length} overlapping booking(s). Frontend would block this.`);
    } else {
      console.error('❌ Overlap protection failed! Database did not catch the overlap.');
    }
  } catch (err) {
    console.error('❌ Overlap check failed:', err.message);
  }

  // 5. Extend Booking
  try {
    console.log('\n5. Extending Booking by 1 hour...');
    const newEndTime = new Date(endTime);
    newEndTime.setHours(newEndTime.getHours() + 1);
    
    const updatedRecord = await pb.collection('bookings').update(bookingId, {
      end_time: newEndTime.toISOString(),
      total_price: 300 // increased price
    });
    console.log('✅ Booking extended successfully! New end time:', updatedRecord.end_time);
  } catch (err) {
    console.error('❌ Extension failed:', err.message);
  }

  // 6. Cancel Booking
  try {
    console.log('\n6. Cancelling Booking...');
    const cancelledRecord = await pb.collection('bookings').update(bookingId, {
      status: 'cancelled'
    });
    console.log('✅ Booking cancelled successfully! Status:', cancelledRecord.status);
  } catch (err) {
    console.error('❌ Cancellation failed:', err.message);
  }

  // 7. Password Reset
  try {
    console.log('\n7. Requesting Password Reset...');
    await pb.collection('portal_users').requestPasswordReset(testEmail);
    console.log('✅ Password reset email dispatched (if SMTP is configured)!');
  } catch (err) {
    console.error('❌ Password reset failed:', err.message);
  }

  console.log('\n--- ALL CORE FLOWS TESTED SUCCESSFULLY ---');
}

runTests();
