const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');

async function run() {
  try {
    await pb.collection('_superusers').authWithPassword('sysadmin@gamez.in', 'Password123!');
    const col = await pb.collections.getOne('bookings');
    
    // Check if it already exists
    if (!col.fields.find(f => f.name === 'booking_reference')) {
      col.fields.push({
        id: "text_booking_ref",
        name: "booking_reference",
        type: "text",
        required: false,
        system: false,
        presentable: false,
        max: 20,
        min: 0,
        pattern: ""
      });
      await pb.collections.update(col.id, col);
      console.log('Added booking_reference to bookings collection');
    } else {
      console.log('booking_reference already exists');
    }
  } catch (err) {
    console.error(err);
  }
}

run();
