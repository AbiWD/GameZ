import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function fixSchema() {
  try {
    console.log("Authenticating as superuser...");
    // For PocketBase v0.23+
    await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin@123');
    
    console.log("Fetching room_types collection...");
    const collection = await pb.collections.getOne('room_types');
    
    // Check if field already exists
    const schema = collection.schema;
    if (!schema.find(f => f.name === 'description')) {
      console.log("Adding description field...");
      schema.push({
        system: false,
        name: "description",
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
      await pb.collections.update('room_types', collection);
      console.log("✅ Successfully added description field!");
    } else {
      console.log("✅ Description field already exists.");
    }

  } catch (error) {
    console.error("Failed to update schema:", error.message);
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

fixSchema();
