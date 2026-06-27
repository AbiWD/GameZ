import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function run() {
  try {
    await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin123');
    const propertyFilter = 'property_id = "properties12345"';
    const now = new Date();
    const todayStartStr = new Date(now.setHours(0,0,0,0)).toISOString().replace('T', ' ').substring(0, 19) + 'Z';
    const todayEndStr = new Date(now.setHours(23,59,59,999)).toISOString().replace('T', ' ').substring(0, 19) + 'Z';
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z';

    await Promise.all([
      pb.collection('stations').getFullList({ sort: '+station_number', filter: propertyFilter, requestKey: null }),
      pb.collection('bookings').getFullList({ filter: `${propertyFilter} && start_time >= "${todayStartStr}" && start_time <= "${todayEndStr}" && status != "cancelled"`, requestKey: null }),
      pb.collection('bookings').getFullList({ filter: `${propertyFilter} && start_time <= "${nowStr}" && end_time >= "${nowStr}" && status != "cancelled" && status != "completed"`, requestKey: null }),
      pb.collection('bookings').getList(1, 1, { filter: `${propertyFilter} && start_time > "${nowStr}" && start_time <= "${todayEndStr}" && status != "cancelled"`, requestKey: null })
    ]);
    console.log("SUCCESS!");
  } catch(e) {
    console.error("FAILED!", JSON.stringify(e, null, 2));
  }
}
run();
