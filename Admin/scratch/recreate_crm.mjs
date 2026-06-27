import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function recreateCRM() {
  try {
    console.log("Authenticating as superuser...");
    await pb.collection('_superusers').authWithPassword('sysadmin@gamez.in', 'Password123!');
    
    try {
      const customers = await pb.collections.getOne('customers');
      await pb.collections.delete(customers.id);
      console.log("Deleted old customers collection");
    } catch (e) {
      console.log("No old customers collection found");
    }

    const customersCollection = {
      name: 'customers',
      type: 'base',
      system: false,
      fields: [
        { name: 'name', type: 'text', required: false, options: { max: 0, min: 0, pattern: "" } },
        { name: 'phone', type: 'text', required: true, options: { max: 0, min: 0, pattern: "" } },
        { name: 'email', type: 'email', required: false, options: { exceptDomains: null, onlyDomains: null } },
        { name: 'total_visits', type: 'number', required: false, options: { max: null, min: null, noDecimal: true } },
        { name: 'total_spent', type: 'number', required: false, options: { max: null, min: null, noDecimal: false } },
        { name: 'status', type: 'text', required: false, options: { max: 0, min: 0, pattern: "" } },
        { name: 'notes', type: 'text', required: false, options: { max: 0, min: 0, pattern: "" } }
      ],
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""'
    };

    console.log("Creating new customers collection...");
    await pb.collections.create(customersCollection);
    console.log("Collection recreated successfully!");
  } catch (err) {
    console.error("Error:", JSON.stringify(err.response || err, null, 2));
  }
}

recreateCRM();
