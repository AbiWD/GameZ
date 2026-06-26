import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function cleanBookings() {
  try {
    console.log("Authenticating as admin...");
    await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin123');

    console.log("Fetching all bookings...");
    const bookings = await pb.collection('bookings').getFullList();
    
    console.log(`Deleting ${bookings.length} bookings...`);
    for (const b of bookings) {
      await pb.collection('bookings').delete(b.id);
    }
    console.log("✅ All bookings deleted.");

  } catch (err) {
    console.error("Error:", err);
  }
}

cleanBookings();
