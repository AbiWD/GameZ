import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function fixSchema() {
  try {
    console.log("Authenticating as admin...");
    await pb.admins.authWithPassword('admin@dreamhousehomestay.in', 'Admin@123');
    
    console.log("Fetching bookings collection...");
    const collection = await pb.collections.getOne('bookings');
    
    const fieldExists = (collection.fields || collection.schema).some(f => f.name === 'booking_reference');
    if (!fieldExists) {
      console.log("Adding booking_reference field...");
      const targetArray = collection.fields ? collection.fields : collection.schema;
      targetArray.push({
        system: false,
        name: "booking_reference",
        type: "text",
        required: false,
        presentable: false,
        unique: false,
        options: {
          min: null,
          max: null,
          pattern: ""
        }
      });
      await pb.collections.update('bookings', collection);
      console.log("✅ Successfully added booking_reference field!");
    } else {
      console.log("✅ booking_reference field already exists.");
    }

  } catch (error) {
    console.error("Failed to update schema:", error.message);
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

fixSchema();
