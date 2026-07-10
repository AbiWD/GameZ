/* 
import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');
async function run() {
  await pb.collection('_superusers').authWithPassword('sysadmin@gamez.in', 'Password123!');
  const collectionName = process.argv[2] || 'bookings';
  const collection = await pb.collections.getOne(collectionName);
  console.log(JSON.stringify(collection, null, 2));
}
run();

*/
