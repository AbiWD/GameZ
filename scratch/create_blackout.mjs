import PocketBase from 'pocketbase';

async function run() {
  const pb = new PocketBase('http://127.0.0.1:8090');
  await pb.admins.authWithPassword('test@admin.com', 'admin@1234');
  try {
    const col = await pb.collections.getOne('blackout_periods');
    console.log('Collection exists:', col.name);
  } catch (e) {
    if (e.status === 404) {
      console.log('Collection not found, creating...');
      await pb.collections.create({
        name: 'blackout_periods',
        type: 'base',
        system: false,
        schema: [
          { name: 'start_time', type: 'date', required: true },
          { name: 'end_time', type: 'date', required: true },
          { name: 'reason', type: 'text', required: true },
        ],
        listRule: '',
        viewRule: '',
        createRule: null,
        updateRule: null,
        deleteRule: null,
      });
      console.log('Collection created.');
    } else {
      console.error(e);
    }
  }
}

run();
