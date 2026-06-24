import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function test() {
  await pb.admins.authWithPassword('admin@dreamhousehomestay.in', 'Admin@123');
  try {
    const coll = await pb.collections.getOne('users');
    console.log('--- users ---');
    console.log('authRule:', coll.authRule);
    console.log('manageRule:', coll.manageRule);
    console.log('options:', coll.options);
  } catch (e) {
    console.error('Error:', e.response);
  }
}
test();
