import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function fixPropertiesSchema() {
  try {
    console.log("Authenticating as superuser...");
    await pb.collection('_superusers').authWithPassword('sysadmin@gamez.in', 'Password123!');
    
    console.log("Updating properties collection...");
    const collection = await pb.collections.getOne('properties');
    
    // Add email field if it doesn't exist
    const hasEmail = collection.fields.some(f => f.name === 'email' || f.name === 'contact_email');
    if (!hasEmail) {
      collection.fields.push({
        name: 'email',
        type: 'email',
        required: false,
        options: { exceptDomains: null, onlyDomains: null }
      });
      await pb.collections.update('properties', collection);
      console.log("Added email field to properties schema.");
    } else {
      console.log("Email field already exists.");
    }

  } catch (err) {
    console.error("Error:", JSON.stringify(err.response || err, null, 2));
  }
}

fixPropertiesSchema();
