import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function check() {
  // Use admin auth to get collections
  await pb.admins.authWithPassword('admin@example.com', 'admin123456');
  const collections = await pb.collections.getFullList();
  console.log(collections.map(c => c.name));
}

check().catch(e => console.error(e));
