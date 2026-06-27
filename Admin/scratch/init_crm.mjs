import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function initCRM() {
  try {
    console.log("Authenticating as superuser...");
    // In PB v0.23, admin auth was moved to pb.collection('_superusers').authWithPassword()
    try {
      await pb.collection('_superusers').authWithPassword('sysadmin@gamez.in', 'Password123!');
    } catch (e) {
      console.log("Superuser auth failed, falling back to old admin auth...");
      await pb.admins.authWithPassword('sysadmin@gamez.in', 'Password123!');
    }
    console.log("Authenticated successfully.");

    const customersCollection = {
      name: 'customers',
      type: 'base',
      system: false,
      schema: [
        { name: 'name', type: 'text', required: false },
        { name: 'phone', type: 'text', required: true },
        { name: 'email', type: 'email', required: false },
        { name: 'total_visits', type: 'number', required: false },
        { name: 'total_spent', type: 'number', required: false },
        { name: 'status', type: 'select', options: { maxSelect: 1, values: ['regular', 'vip', 'banned'] }, required: false },
        { name: 'notes', type: 'text', required: false }
      ],
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""'
    };

    let customersId = '';
    try {
      console.log("Creating customers collection...");
      const result = await pb.collections.create(customersCollection);
      customersId = result.id;
      console.log("Created successfully with ID:", customersId);
    } catch (e) {
      if (e.status === 400 && e.data?.data?.name?.code === 'validation_not_unique') {
        console.log("Collection already exists, retrieving ID...");
        const result = await pb.collections.getOne('customers');
        customersId = result.id;
      } else {
        throw e;
      }
    }

    console.log("Fetching bookings collection...");
    const bookingsCollection = await pb.collections.getOne('bookings');
    
    const hasCustomerField = bookingsCollection.schema.some(f => f.name === 'customer_id');
    if (!hasCustomerField) {
      console.log("Adding customer_id field to bookings...");
      bookingsCollection.schema.push({
        name: 'customer_id',
        type: 'relation',
        required: false,
        options: {
          collectionId: customersId,
          cascadeDelete: false,
          maxSelect: 1
        }
      });
      await pb.collections.update('bookings', bookingsCollection);
      console.log("Bookings collection updated.");
    } else {
      console.log("Bookings collection already has customer_id field.");
    }
    
    console.log("Done!");
  } catch (err) {
    console.error("Error:", err.response || err);
  }
}

initCRM();
