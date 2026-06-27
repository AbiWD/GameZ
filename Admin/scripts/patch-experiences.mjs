import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function fixSchema() {
  try {
    console.log("Authenticating as admin...");
    await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin@123');
    
    console.log("Fetching website_content collection...");
    const collection = await pb.collections.getOne('website_content');
    
    const targetArray = collection.fields ? collection.fields : collection.schema;
    
    const addField = (name, type) => {
      const fieldExists = targetArray.some(f => f.name === name);
      if (!fieldExists) {
         console.log(`Adding ${name} field...`);
         targetArray.push({
           system: false,
           name: name,
           type: type,
           required: false,
           presentable: false,
           unique: false,
           options: type === 'text' ? { min: null, max: null, pattern: "" } : { maxSize: 2000000 }
         });
      } else {
        console.log(`✅ ${name} field already exists.`);
      }
    };

    addField('experiences_title', 'text');
    addField('experiences_subtitle', 'text');
    addField('experiences_features', 'json');

    await pb.collections.update('website_content', collection);
    console.log("✅ Successfully updated website_content schema!");

  } catch (error) {
    console.error("Failed to update schema:", error.message);
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

fixSchema();
