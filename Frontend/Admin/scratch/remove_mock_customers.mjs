import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function removeMockCustomers() {
  try {
    console.log("Authenticating as superuser...");
    await pb.collection('_superusers').authWithPassword('sysadmin@gamez.in', 'Password123!');
    console.log("Authenticated successfully.");

    console.log("Fetching all customers...");
    const existing = await pb.collection('customers').getFullList();
    
    if (existing.length === 0) {
      console.log("No customers found. The database is already empty.");
      return;
    }

    console.log(`Deleting ${existing.length} customers...`);
    for (const record of existing) {
      await pb.collection('customers').delete(record.id);
    }

    console.log("Successfully removed all mock customers!");
  } catch (err) {
    console.error("Error:", err.response || err);
  }
}

removeMockCustomers();
