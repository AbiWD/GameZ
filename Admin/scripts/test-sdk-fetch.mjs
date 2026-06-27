import PocketBase from 'pocketbase';

const originalFetch = global.fetch;
global.fetch = async (...args) => {
  console.log('--- FETCH CALLED ---');
  console.log('URL:', args[0]);
  console.log('OPTIONS:', JSON.stringify(args[1], null, 2));
  const res = await originalFetch(...args);
  const clone = res.clone();
  console.log('RESPONSE STATUS:', res.status);
  console.log('RESPONSE BODY:', await clone.text());
  return res;
};

const pb = new PocketBase('http://127.0.0.1:8090');

async function execute() {
  await pb.collection('users').authWithPassword('testuser_booking@example.com', 'Password123!');
  try {
    const latestRooms = await pb.collection('rooms').getList(1, 1, {
      sort: '-created',
      requestKey: null
    });
    console.log("SDK Success:", latestRooms.items.length);
  } catch (error) {
    console.error("SDK Failed with error:", error.status);
  }
}
execute();
