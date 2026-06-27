import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function testSpecificDelete() {
  await pb.collection('users').authWithPassword('testuser_booking@example.com', 'Password123!');
  console.log("Logged in.");

  try {
    const records = await pb.collection('rooms').getFullList();
    console.log("Rooms available for deletion:");
    for (const r of records) {
      console.log(`- Room ${r.room_number}: ID ${r.id}`);
    }

    if (records.length > 0) {
      const targetRoom = records[0];
      console.log(`\nAttempting to delete Room ${targetRoom.room_number} (${targetRoom.id})...`);
      await pb.collection('rooms').delete(targetRoom.id);
      console.log("Deleted successfully.");
    }
  } catch (e) {
    console.error("Delete failed:", JSON.stringify(e.response, null, 2));
  }
}
testSpecificDelete();
