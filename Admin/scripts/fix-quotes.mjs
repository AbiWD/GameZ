import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function fixRules() {
  try {
    await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin@123');
    const collections = await pb.collections.getFullList();
    
    for (let coll of collections) {
      if (coll.name.startsWith('_')) continue;
      
      let changed = false;
      const rules = ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule'];
      
      for (let rule of rules) {
        if (coll[rule] && coll[rule].includes("''")) {
          coll[rule] = coll[rule].replace(/''/g, '""');
          coll[rule] = coll[rule].replace(/'([^']*)'/g, '"$1"'); // Also replace 'admin' with "admin"
          changed = true;
        }
      }
      
      if (changed) {
        console.log(`Updating rules for ${coll.name}...`);
        await pb.collections.update(coll.id, coll);
        console.log(`✅ Fixed ${coll.name}`);
      }
    }
    console.log("All done!");
  } catch (error) {
    console.error("Error updating rules:", error.message);
  }
}
fixRules();
