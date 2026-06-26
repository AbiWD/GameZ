import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function testRules() {
  await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin@123');
  
  const roomsColl = await pb.collections.getOne('rooms');
  console.log("DeleteRule for Rooms:", roomsColl.deleteRule);
}
testRules();
