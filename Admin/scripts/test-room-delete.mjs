import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function testDelete() {
  await pb.collection('users').authWithPassword('testuser_booking@example.com', 'Password123!');
  console.log("Logged in.");

  try {
    const defaultRoom = await pb.collection('rooms').getFirstListItem('room_number="101"');
    console.log("Found room to delete:", defaultRoom.id);
    await pb.collection('rooms').delete(defaultRoom.id);
    console.log("Deleted successfully.");
  } catch (e) {
    console.error("Delete failed:", e.response);
  }
}
testDelete();
