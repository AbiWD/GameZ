import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function createMissingCollections() {
  try {
    console.log("Authenticating as admin...");
    await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin123');

    // CREATE properties collection
    console.log("Creating 'properties' collection...");
    let propertyId = null;
    try {
      await pb.collections.getOne('properties');
      console.log("'properties' already exists.");
    } catch {
      await pb.collections.create({
        name: "properties",
        type: "base",
        system: false,
        schema: [
          { name: "name", type: "text", required: true },
          { name: "is_active", type: "bool", required: false },
          { name: "address", type: "text", required: false },
          { name: "phone", type: "text", required: false }
        ],
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
      });
      console.log("✅ Created 'properties' collection.");
      const prop = await pb.collection('properties').create({
        name: "GameZ Main Branch",
        is_active: true,
        address: "123 Gamer Street",
        phone: "555-0100"
      });
      propertyId = prop.id;
    }

    // CREATE bookings collection
    console.log("Creating 'bookings' collection...");
    try {
      await pb.collections.getOne('bookings');
      console.log("'bookings' already exists.");
    } catch {
      await pb.collections.create({
        name: "bookings",
        type: "base",
        system: false,
        schema: [
          { name: "name", type: "text", required: true },
          { name: "email", type: "email", required: true },
          { name: "phone", type: "text", required: true },
          { name: "status", type: "text", required: true },
          { name: "total_price", type: "number", required: true },
          { name: "start_time", type: "date", required: true },
          { name: "end_time", type: "date", required: true },
          { name: "players", type: "number", required: true },
          { name: "assigned_station_id", type: "relation", required: false, options: { collectionId: "stations", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: null } },
          { name: "property_id", type: "relation", required: false, options: { collectionId: "properties", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: null } }
        ],
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
      });
      console.log("✅ Created 'bookings' collection.");
    }

    // CREATE website_content collection
    console.log("Creating 'website_content' collection...");
    try {
      await pb.collections.getOne('website_content');
      console.log("'website_content' already exists.");
    } catch {
      await pb.collections.create({
        name: "website_content",
        type: "base",
        system: false,
        schema: [
          { name: "type", type: "text", required: true },
          { name: "content", type: "json", required: true },
          { name: "property_id", type: "relation", required: false, options: { collectionId: "properties", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: null } }
        ],
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
      });
      console.log("✅ Created 'website_content' collection.");
    }
  } catch (error) {
    console.error("Failed:", error.message);
    if (error.response) console.error(JSON.stringify(error.response.data, null, 2));
  }
}

createMissingCollections();
