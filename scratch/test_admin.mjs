/* 
import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function test() {
  try {
    const authData = await pb.admins.authWithPassword('sysadmin@gamez.in', 'Password123!');
  } catch (e) {
    console.error("Admin auth failed. Creating admin...");
    // use a raw fetch to /api/admins to create one if necessary
  }
}
test();

*/
