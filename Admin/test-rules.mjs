import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function test() {
  await pb.admins.authWithPassword('admin@dreamhousehomestay.in', 'Admin@123');
  try {
    const coll = await pb.collections.getOne('bookings');
    console.log('ListRule:', coll.listRule);
    console.log('ViewRule:', coll.viewRule);
    console.log('CreateRule:', coll.createRule);
    console.log('UpdateRule:', coll.updateRule);
    console.log('DeleteRule:', coll.deleteRule);
    console.log('Schema:', JSON.stringify(coll.fields || coll.schema, null, 2));
  } catch (e) {
    console.error('Error:', e.response);
  }
}
test();
