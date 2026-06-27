import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function addSystemFields() {
  try {
    console.log("Authenticating as superuser...");
    await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin123');

    const collections = ['bookings', 'stations', 'station_types', 'website_content', 'properties'];
    
    for (const name of collections) {
      try {
        const coll = await pb.collections.getOne(name);
        
        const hasCreated = coll.fields.some(f => f.name === 'created');
        
        if (!hasCreated) {
          console.log(`Adding created/updated to ${name}...`);
          coll.fields.push({
            name: "created",
            type: "autodate",
            system: true,
            hidden: false,
            presentable: false,
            onCreate: true,
            onUpdate: false
          });
          coll.fields.push({
            name: "updated",
            type: "autodate",
            system: true,
            hidden: false,
            presentable: false,
            onCreate: true,
            onUpdate: true
          });
          
          await pb.collections.update(coll.id, { fields: coll.fields });
          console.log(`✅ Updated ${name}`);
        } else {
          console.log(`- ${name} already has system fields.`);
        }
      } catch (e) {
        console.error(`Failed to update ${name}:`, e.message);
      }
    }

    console.log("✅ All schemas patched with system fields!");
    
  } catch (error) {
    console.error("Failed:", error.message);
  }
}

addSystemFields();
