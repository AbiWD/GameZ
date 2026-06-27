import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function updateBookings() {
  try {
    console.log("Authenticating as superuser...");
    await pb.collection('_superusers').authWithPassword('sysadmin@gamez.in', 'Password123!');
    console.log("Authenticated successfully.");

    console.log("Fetching bookings collection...");
    const bookingsCollection = await pb.collections.getOne('bookings');
    
    // In PB SDK for v0.23, it's .fields
    const hasCustomerField = bookingsCollection.fields.some(f => f.name === 'customer_id');
    if (!hasCustomerField) {
      console.log("Adding customer_id field to bookings...");
      bookingsCollection.fields.push({
        name: 'customer_id',
        type: 'text',
        required: false,
        options: {
          min: 0,
          max: 0,
          pattern: ""
        }
      });
      await pb.collections.update('bookings', bookingsCollection);
      console.log("Bookings collection updated.");
    } else {
      console.log("Bookings collection already has customer_id field.");
    }
  } catch (err) {
    console.error("Error:", err.response || err);
  }
}

updateBookings();
