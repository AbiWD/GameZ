import PocketBase from 'pocketbase';

async function del() {
  const pb = new PocketBase('http://127.0.0.1:8090');
  await pb.admins.authWithPassword('test@admin.com', 'admin@1234');
  const users = await pb.collection('portal_users').getFullList({ filter: 'email = "dom@gmail.com"' });
  for (const u of users) {
    await pb.collection('portal_users').delete(u.id);
    console.log('deleted', u.email);
  }
}
del();
