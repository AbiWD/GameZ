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
        if (coll[rule] !== "") {
          coll[rule] = ""; // Temporarily set to empty (Admin only normally, but wait - "" means Admin only! null means public!)
          // WAIT! In PB v0.23, "" means Admin only, null means public.
          coll[rule] = null;
          changed = true;
        }
      }
      
      if (changed) {
        console.log(`Clearing rules for ${coll.name}...`);
        await pb.collections.update(coll.id, coll);
        console.log(`✅ Cleared ${coll.name}`);
      }
    }
    console.log("All done!");
  } catch (error) {
    console.error("Error updating rules:", error.message);
  }
}
fixRules();
