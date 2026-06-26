import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function test() {
  await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin123');
  const recs = await pb.collection('properties').getFullList();
  console.log(recs);
}
test();
