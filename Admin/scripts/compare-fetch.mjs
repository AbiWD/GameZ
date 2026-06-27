import PocketBase from 'pocketbase';

const originalFetch = global.fetch;
global.fetch = async (...args) => {
  if (args[0].includes('rooms')) {
    console.log('--- SDK FETCH ---');
    console.log('URL:', args[0]);
    console.log('HEADERS:', args[1]?.headers);
    const res = await originalFetch(...args);
    const clone = res.clone();
    console.log('RESPONSE:', res.status, await clone.text());
    return res;
  }
  return originalFetch(...args);
};

const pb = new PocketBase('http://127.0.0.1:8090');

async function execute() {
  await pb.collection('users').authWithPassword('testuser_booking@example.com', 'Password123!');
  console.log('Logged in.');
  try {
    await pb.collection('rooms').getList(1, 1, {});
  } catch(e) { }
  
  console.log('--- RAW FETCH ---');
  const res = await originalFetch('http://127.0.0.1:8090/api/collections/rooms/records?page=1&perPage=1', {
    headers: {
      'Authorization': pb.authStore.token
    }
  });
  console.log('RESPONSE:', res.status, await res.text());
}
execute();
