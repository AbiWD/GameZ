import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function testUserQuery() {
  try {
    console.log("Authenticating as a user record...");
    // Let's create a user if one doesn't exist, or just try to auth using the same creds if they exist.
    // If we don't know the user password, we can create one using admin token first, then auth as it.
    await pb.admins.authWithPassword('admin@dreamhousehomestay.in', 'Admin@123');
    
    // Create a temporary user
    let user;
    try {
      user = await pb.collection('users').create({
        email: 'testuser_booking@example.com',
        password: 'Password123!',
        passwordConfirm: 'Password123!',
        name: 'Test Booking User'
      });
    } catch(e) {
      user = await pb.collection('users').getFirstListItem('email="testuser_booking@example.com"');
    }

    // Now clear auth and auth as this user
    pb.authStore.clear();
    await pb.collection('users').authWithPassword('testuser_booking@example.com', 'Password123!');
    console.log("Logged in as normal user. Token valid:", pb.authStore.isValid);

    console.log("Attempting the GET request on rooms...");
    const latestRooms = await pb.collection('rooms').getList(1, 1, {
      sort: '-created',
      requestKey: null
    });
    console.log("Success:", latestRooms.items.length);
  } catch (error) {
    console.error("Failed with error:");
    if (error.response) {
      console.error(JSON.stringify(error.response, null, 2));
    } else {
      console.error(error);
    }
  }
}
testUserQuery();
