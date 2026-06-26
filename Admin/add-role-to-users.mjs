import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function updateUsersCollection() {
  try {
    console.log("Authenticating as admin...");
    
    // For PocketBase v0.22, admins are in pb.admins but JS SDK v0.26 doesn't have it.
    // So we use raw fetch.
    const adminAuthData = await fetch('http://127.0.0.1:8090/api/admins/auth-with-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: 'admin@gamez.in', password: 'Admin123' })
    }).then(r => r.json());

    if (!adminAuthData.token) {
      console.log("Admin auth failed:", adminAuthData);
      return;
    }

    pb.authStore.save(adminAuthData.token, adminAuthData.admin);

    const collection = await pb.collections.getOne('users');
    
    // Check if role field exists (schema for v0.22)
    const exists = collection.schema.some(f => f.name === 'role');
    if (!exists) {
      console.log("Adding role to users collection...");
      collection.schema.push({
        name: 'role',
        type: 'select',
        required: true,
        presentable: false,
        unique: false,
        options: {
          maxSelect: 1,
          values: ['admin', 'staff']
        }
      });
      await pb.collections.update('users', collection);
      console.log("✅ role field added to users collection.");
    } else {
      console.log("role field already exists.");
    }

  } catch (err) {
    console.error("Error updating schema:", err);
  }
}

updateUsersCollection();
