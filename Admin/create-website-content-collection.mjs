import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function createSchema() {
  try {
    console.log("Authenticating as admin...");
    await pb.collection('_superusers').authWithPassword('admin@dreamhousehomestay.in', 'Admin@123');
    
    // Check if collection exists
    try {
      await pb.collections.getOne('website_content');
      console.log("Collection 'website_content' already exists.");
    } catch (e) {
      if (e.status === 404) {
        console.log("Creating 'website_content' collection...");
        const collection = await pb.collections.create({
          name: 'website_content',
          type: 'base',
          listRule: '',
          viewRule: '',
          createRule: null, // Only admin can create
          updateRule: null, // Only admin can update
          deleteRule: null, // Only admin can delete
          schema: [
            {
              name: 'hero_headline',
              type: 'text',
              required: true,
              options: { min: null, max: null, pattern: '' }
            },
            {
              name: 'hero_subheadline',
              type: 'text',
              required: false,
              options: { min: null, max: null, pattern: '' }
            },
            {
              name: 'hero_video',
              type: 'file',
              required: false,
              options: { maxSelect: 1, maxSize: 52428800, mimeTypes: ['video/mp4', 'video/webm'] }
            },
            {
              name: 'hero_highlights',
              type: 'json',
              required: false,
              options: { maxSize: 2000000 }
            }
          ]
        });
        console.log("✅ Successfully created 'website_content' collection!", collection.id);

        console.log("Inserting default record...");
        await pb.collection('website_content').create({
          hero_headline: "A Peaceful Tropical Escape",
          hero_subheadline: "Experience village life, comfort, and nature — all in one place",
          hero_highlights: [
            { icon: "Leaf", text: "Tropical Surroundings" },
            { icon: "Home", text: "Cozy Rooms" },
            { icon: "Heart", text: "Authentic Experiences" },
            { icon: "MapPin", text: "Easy Access" }
          ]
        });
        console.log("✅ Successfully inserted default record!");
      } else {
        throw e;
      }
    }
  } catch (error) {
    console.error("Failed to create schema:", error.message);
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

createSchema();
