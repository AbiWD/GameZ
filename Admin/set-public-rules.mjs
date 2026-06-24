import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function fixRules() {
  try {
    await pb.admins.authWithPassword('admin@dreamhousehomestay.in', 'Admin@123');
    const collections = await pb.collections.getFullList();
    
    for (let coll of collections) {
      if (coll.name.startsWith('_')) continue;
      
      let changed = false;
      const rules = ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule'];
      
      for (let rule of rules) {
        if (coll[rule] !== "") {
          coll[rule] = ""; // Empty string = public access in PB
          changed = true;
        }
      }
      
      if (changed) {
        console.log(`Setting public rules for ${coll.name}...`);
        await pb.collections.update(coll.id, coll);
        console.log(`✅ Set public rules for ${coll.name}`);
      }
    }
    console.log("All done!");
  } catch (error) {
    console.error("Error updating rules:", error.message);
  }
}
fixRules();
