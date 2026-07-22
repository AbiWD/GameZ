import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function check() {
  const stations = await pb.collection('stations').getFullList();
  const statuses = stations.map(s => s.status);
  console.log('Statuses:', statuses);
}

check();
