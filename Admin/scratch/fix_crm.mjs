import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function fixCRM() {
  try {
    console.log("Authenticating as superuser...");
    await pb.collection('_superusers').authWithPassword('sysadmin@gamez.in', 'Password123!');
    console.log("Authenticated successfully.");

    console.log("Updating customers collection...");
    const collection = await pb.collections.getOne('customers');
    
    collection.fields = [
        { name: 'name', type: 'text', required: false, options: { max: 0, min: 0, pattern: "" } },
        { name: 'phone', type: 'text', required: true, options: { max: 0, min: 0, pattern: "" } },
        { name: 'email', type: 'email', required: false, options: { exceptDomains: null, onlyDomains: null } },
        { name: 'total_visits', type: 'number', required: false, options: { max: null, min: null, noDecimal: true } },
        { name: 'total_spent', type: 'number', required: false, options: { max: null, min: null, noDecimal: false } },
        { name: 'status', type: 'select', options: { maxSelect: 1, values: ['regular', 'vip', 'banned'] }, required: false },
        { name: 'notes', type: 'text', required: false, options: { max: 0, min: 0, pattern: "" } }
    ];

    await pb.collections.update('customers', collection);
    console.log("Collection updated successfully!");
  } catch (err) {
    console.error("Error:", err.response || err);
  }
}

fixCRM();
