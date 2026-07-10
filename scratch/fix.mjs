import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function fix() {
  await pb.admins.authWithPassword('test@admin.com', 'admin@1234');
  
  const targetPropertyId = '20fml0zc3egjxy4';

  // Fix stations
  const stations = await pb.collection('stations').getFullList();
  for (const s of stations) {
    if (s.property_id !== targetPropertyId) {
      await pb.collection('stations').update(s.id, { property_id: targetPropertyId });
      console.log('Fixed station', s.id);
    }
  }

  // Fix bookings
  const bookings = await pb.collection('bookings').getFullList();
  for (const b of bookings) {
    if (b.property_id !== targetPropertyId) {
      await pb.collection('bookings').update(b.id, { property_id: targetPropertyId });
      console.log('Fixed booking', b.id);
    }
  }
}
fix();
