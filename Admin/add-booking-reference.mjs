import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function addBookingReference() {
  try {
    console.log("Authenticating as admin...");
    await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin123');

    const collection = await pb.collections.getOne('bookings');
    
    // Check if it exists
    const exists = collection.fields.some(f => f.name === 'booking_reference');
    if (!exists) {
      console.log("Adding booking_reference to bookings collection...");
      collection.fields.push({
        name: 'booking_reference',
        type: 'text',
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          pattern: ''
        }
      });
      await pb.collections.update('bookings', collection);
      console.log("✅ booking_reference added to schema.");
    } else {
      console.log("booking_reference already exists.");
    }

  } catch (err) {
    console.error("Error updating schema:", err);
  }
}

addBookingReference();
