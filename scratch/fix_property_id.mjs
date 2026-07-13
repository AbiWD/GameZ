import PocketBase from 'pocketbase';

async function run() {
  const pb = new PocketBase('http://127.0.0.1:8090');
  await pb.admins.authWithPassword('test@admin.com', 'admin@1234');
  
  try {
    const props = await pb.collection('properties').getFullList();
    if (props.length === 0) {
      console.log('No properties found.');
      return;
    }
    const propId = props[0].id;
    console.log('Using property ID:', propId);
    
    const stTypes = await pb.collection('station_types').getFullList();
    for (const st of stTypes) {
      if (!st.property_id) {
        await pb.collection('station_types').update(st.id, { property_id: propId });
        console.log('Updated station_type:', st.name);
      }
    }
    console.log('All station types updated.');
  } catch (err) {
    console.error(err);
  }
}

run();
