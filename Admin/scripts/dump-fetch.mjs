import PocketBase from 'pocketbase';
import fs from 'fs';

const originalFetch = global.fetch;
global.fetch = async (...args) => {
  if (args[0].includes('rooms/records')) {
    fs.writeFileSync('fetch-dump.json', JSON.stringify({
      url: args[0],
      options: args[1]
    }, null, 2));
  }
  return originalFetch(...args);
};

const pb = new PocketBase('http://127.0.0.1:8090');

async function testFetch() {
  await pb.collection('users').authWithPassword('testuser_booking@example.com', 'Password123!');
  try {
    await pb.collection('rooms').getList(1, 1, {});
  } catch (e) {
    console.log("SDK Failed with 400.");
  }
}
testFetch();
