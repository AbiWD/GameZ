/* 
import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function fixSchema() {
  await pb.collection('_superusers').authWithPassword('sysadmin@gamez.in', 'Password123!');
  
  try {
    const collection = await pb.collections.getOne('portal_users');
    const customers = await pb.collections.getOne('customers');
    
    // Check and add missing fields
    const fields = collection.fields || [];
    
    if (!fields.find(f => f.name === 'customer_id')) {
        fields.push({
            id: "relation1234567890",
            name: 'customer_id',
            type: 'relation',
            required: false,
            presentable: false,
            system: false,
            hidden: false,
            collectionId: customers.id,
            cascadeDelete: false,
            minSelect: 0,
            maxSelect: 1
        });
    }
    
    if (!fields.find(f => f.name === 'name')) {
        fields.push({ id: "text1234567891", name: 'name', type: 'text', required: false, presentable: false, system: false, hidden: false, min: 0, max: 0, pattern: "", autogeneratePattern: "" });
    }
    
    if (!fields.find(f => f.name === 'phone')) {
        fields.push({ id: "text1234567892", name: 'phone', type: 'text', required: false, presentable: false, system: false, hidden: false, min: 0, max: 0, pattern: "", autogeneratePattern: "" });
    }

    if (!fields.find(f => f.name === 'username')) {
        fields.push({ id: "text1234567893", name: 'username', type: 'text', required: false, presentable: false, system: false, hidden: false, min: 0, max: 0, pattern: "", autogeneratePattern: "" });
    }

    collection.fields = fields;
    
    await pb.collections.update(collection.id, collection);
    console.log("✅ Schema updated successfully!");
  } catch (err) {
    console.error("❌ Failed to update schema:", err);
    if (err.response) {
      console.log(JSON.stringify(err.response.data, null, 2));
    }
  }
}

fixSchema();

*/
