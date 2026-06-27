import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function fixSchema() {
  try {
    console.log("Authenticating as admin...");
    await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin@123');
    
    console.log("Fetching bookings collection...");
    const collection = await pb.collections.getOne('bookings');
    
    const targetArray = collection.fields ? collection.fields : collection.schema;
    const fieldExists = targetArray.some(f => f.name === 'source');
    if (!fieldExists) {
      console.log("Adding source field...");
      targetArray.push({
        system: false,
        name: "source",
        type: "select",
        required: false,
        presentable: false,
        unique: false,
        options: {
          maxSelect: 1,
          values: ["direct", "walk_in", "ota"]
        }
      });
      await pb.collections.update('bookings', collection);
      console.log("✅ Successfully added source field!");
    } else {
      console.log("✅ source field already exists.");
    }

    console.log("Fetching all bookings to update source...");
    const bookings = await pb.collection('bookings').getFullList();
    let updated = 0;
    for (const b of bookings) {
      if (!b.source) {
        let source = "direct";
        // Heuristic: if there's an OTA-like string in booking_reference or somewhere else, we could map it.
        // For now, default to direct as requested.
        if (b.booking_reference && (b.booking_reference.toLowerCase().includes('bkg') || b.booking_reference.toLowerCase().includes('mmt') || b.booking_reference.toLowerCase().includes('agoda'))) {
           source = "ota";
        }
        await pb.collection('bookings').update(b.id, { source });
        updated++;
      }
    }
    console.log(`✅ Updated ${updated} bookings to have a default source.`);

  } catch (error) {
    console.error("Failed to update schema:", error.message);
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

fixSchema();
