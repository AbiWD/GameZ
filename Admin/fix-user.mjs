import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function fixDatabase() {
  try {
    console.log("Authenticating as superuser...");
    await pb.admins.authWithPassword('admin@gamez.in', 'Admin123');

    // 1. Create the regular user for the Admin Panel login
    console.log("Checking 'users' collection for the admin user...");
    try {
      const existingUser = await pb.collection('users').getFirstListItem('email="admin@gamez.in"');
      console.log("Admin user already exists in 'users' collection.");
    } catch {
      await pb.collection('users').create({
        email: "admin@gamez.in",
        password: "Admin123",
        passwordConfirm: "Admin123",
        name: "Cafe Admin",
        role: "admin", // Assuming there might be a role field, if not it's fine
        emailVisibility: true,
        verified: true
      });
      console.log("✅ Created admin user in 'users' collection.");
    }

    // 2. Ensure properties exist
    const props = await pb.collection('properties').getFullList();
    console.log(`Found ${props.length} properties.`);
    if (props.length === 0) {
      console.log("Creating default property...");
      await pb.collection('properties').create({
        name: "GameZ Main Branch",
        is_active: true,
        address: "123 Gamer Street",
        phone: "555-0100"
      });
      console.log("✅ Created default property.");
    } else {
        // Ensure it is active
        const prop = props[0];
        if (!prop.is_active) {
            await pb.collection('properties').update(prop.id, { is_active: true });
            console.log("✅ Activated default property.");
        }
    }

  } catch (error) {
    console.error("Failed:", error.message);
    if (error.response) console.error(JSON.stringify(error.response.data, null, 2));
  }
}

fixDatabase();
