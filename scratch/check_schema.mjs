import PocketBase from 'pocketbase';

async function run() {
  const pb = new PocketBase('http://127.0.0.1:8090');
  await pb.admins.authWithPassword('test@admin.com', 'admin@1234');
  const st = await pb.collections.getOne('station_types');
  console.log(st.fields.map(f => `${f.name}: ${f.type}`));
}

run();
