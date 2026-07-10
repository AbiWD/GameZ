/* 
import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function checkLogs() {
  await pb.collection('_superusers').authWithPassword('sysadmin@gamez.in', 'Password123!');
  
  try {
    const logs = await pb.send('/api/logs/requests?sort=-created&perPage=5', {
        method: 'GET'
    });
    logs.items.forEach(log => {
      console.log(`[${log.method}] ${log.url}`);
      console.log(`Status: ${log.status}`);
      console.log(`Error: ${log.error}`);
    });
  } catch (err) {
    console.error(err);
  }
}
checkLogs();

*/
