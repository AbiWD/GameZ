import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function test() {
  try {
    await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin@123');
    const properties = await pb.collection('properties').getFullList();
    
    // In node, FormData isn't natively available in this exact PB version unless polyfilled or using node-fetch's
    // pocketbase allows passing FormData, but in modern node we can just pass an object if we don't have files
    
    const record = await pb.collection('facilities').create({
      title: 'Common space',
      description: 'Comfortable common space for guests',
      icon: 'Users',
      property_id: properties[0].id
    });
    console.log('Success inserted:', record.id);
  } catch (err) {
    console.error('ERROR DATA:', err.data);
  }
}

test();
