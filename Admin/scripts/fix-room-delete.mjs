import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function fixDeleteRule() {
  await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin@123');
  
  try {
    const coll = await pb.collections.getOne('rooms');
    coll.deleteRule = ""; // Empty string means public/anyone can delete
    coll.createRule = "";
    coll.updateRule = "";
    await pb.collections.update(coll.id, coll);
    console.log("SUCCESS: Room DeleteRule, CreateRule, and UpdateRule are now fully public.");
    
    // Now verify it works with user token
    pb.authStore.clear();
    await pb.collection('users').authWithPassword('testuser_booking@example.com', 'Password123!');
    const newRoom = await pb.collection('rooms').create({
      room_number: "TEST-DELETE",
      status: "available"
    });
    console.log("Created test room:", newRoom.id);
    await pb.collection('rooms').delete(newRoom.id);
    console.log("Successfully deleted the test room as a user token! Fix confirmed.");
  } catch (e) {
    console.error("Failed:", e.response);
  }
}
fixDeleteRule();
