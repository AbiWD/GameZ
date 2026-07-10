import PocketBase from 'pocketbase';
async function fix() {
  const pb = new PocketBase('http://127.0.0.1:8090');
  await pb.admins.authWithPassword('test@admin.com', 'admin@1234');
  
  const s = await pb.collections.getOne('stations');
  s.listRule = "";
  s.viewRule = "";
  await pb.collections.update(s.id, s);
  
  const b = await pb.collections.getOne('bookings');
  b.createRule = "";
  await pb.collections.update(b.id, b);
  
  console.log('Fixed rules');
}
fix();
