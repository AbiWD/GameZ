import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function restoreRules() {
  await pb.admins.authWithPassword('admin@dreamhousehomestay.in', 'Admin@123');
  try {
    const collections = await pb.collections.getFullList();
    
    for (let coll of collections) {
      if (coll.name.startsWith('_') || coll.name === 'users') continue;
      
      console.log(`Attempting to update ${coll.name} (${coll.id})...`);
      
      const updateData = {
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
      };
      
      try {
        await pb.collections.update(coll.id, updateData);
        console.log(`✅ Restored ${coll.name}`);
      } catch (e) {
        console.error(`Error updating ${coll.name}:`, e.response);
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}
restoreRules();
