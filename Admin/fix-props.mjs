import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function fixProperties() {
  try {
    console.log("Authenticating...");
    await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin123');

    const collection = await pb.collections.getOne('properties');
    
    // Check if fields exist
    if (!collection.fields.some(f => f.name === 'name')) {
      console.log("Adding fields to properties...");
      collection.fields.push(
        { name: "name", type: "text", required: true },
        { name: "is_active", type: "bool", required: false },
        { name: "address", type: "text", required: false },
        { name: "phone", type: "text", required: false }
      );
      await pb.collections.update('properties', collection);
      console.log("✅ properties fields added.");
    }
    
    // Now update the single property to be active
    const props = await pb.collection('properties').getFullList();
    if (props.length > 0) {
       await pb.collection('properties').update(props[0].id, {
          name: "GameZ Main Branch",
          is_active: true,
          address: "123 Gamer Street",
          phone: "555-0100"
       });
       console.log("✅ property updated with data.");
    }

  } catch (err) {
    if (err.response) {
      console.error(JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err);
    }
  }
}

fixProperties();
