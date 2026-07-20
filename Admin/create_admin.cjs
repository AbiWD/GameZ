const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');
pb.collection('_superusers').authWithPassword('sysadmin@gamez.in', 'Password123!')
  .then(() => pb.collection('users').create({email: 'admin@gamez.in', password: 'Admin123', passwordConfirm: 'Admin123', role: 'admin', name: 'Admin'}))
  .then(() => console.log('Created admin user'))
  .catch(e => {
    console.log('User might already exist or error:', e.message);
    return pb.collection('users').getFirstListItem('email="admin@gamez.in"')
      .then(u => pb.collection('users').update(u.id, {password: 'Admin123', passwordConfirm: 'Admin123'}))
      .then(() => console.log('Updated admin user password'));
  }).catch(console.error);
