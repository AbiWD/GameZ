import PocketBase from 'pocketbase';
async function run() {
  const pb = new PocketBase('http://127.0.0.1:8090');
  await pb.admins.authWithPassword('test@admin.com', 'admin@1234');
  try {
    const st = await pb.collections.getOne('station_types');
    console.log('station_types exists with fields:');
    console.log(st.fields.map(f => `${f.name} (${f.type})`).join(', '));
  } catch (e) {
    console.log('station_types does not exist');
  }
}
run();
