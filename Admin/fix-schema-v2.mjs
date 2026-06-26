import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function fixSchema() {
  try {
    console.log("Authenticating as superuser...");
    await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin123');

    const collectionsToDrop = ['bookings', 'stations', 'station_types', 'website_content', 'properties'];
    for (const name of collectionsToDrop) {
      try {
        const coll = await pb.collections.getOne(name);
        await pb.collections.delete(coll.id);
        console.log(`Deleted collection: ${name}`);
      } catch (e) {
        // Ignore if not exists
      }
    }

    console.log("Recreating properties...");
    await pb.collections.create({
      name: "properties",
      type: "base",
      fields: [
        { name: "id", type: "text", required: true, primaryKey: true, system: true },
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

    console.log("Recreating station_types...");
    await pb.collections.create({
      name: "station_types",
      type: "base",
      fields: [
        { name: "id", type: "text", required: true, primaryKey: true, system: true },
        { name: "name", type: "text", required: true },
        { name: "base_price", type: "number", required: true },
        { name: "max_players", type: "number", required: true },
        { name: "specs", type: "text", required: false },
        { name: "features", type: "json", required: false },
        { name: "amenities", type: "json", required: false },
        { name: "is_popular", type: "bool", required: false },
        { name: "image", type: "file", required: false, options: { maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"] } },
        { name: "description", type: "text", required: false },
        { name: "property_id", type: "relation", required: false, options: { collectionId: "properties", maxSelect: 1 } }
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    });

    console.log("Recreating stations...");
    await pb.collections.create({
      name: "stations",
      type: "base",
      fields: [
        { name: "id", type: "text", required: true, primaryKey: true, system: true },
        { name: "station_number", type: "text", required: true },
        { name: "station_type", type: "text", required: true },
        { name: "status", type: "text", required: true },
        { name: "price_per_hour", type: "number", required: true },
        { name: "max_players", type: "number", required: true },
        { name: "amenities", type: "json", required: false },
        { name: "property_id", type: "relation", required: false, options: { collectionId: "properties", maxSelect: 1 } }
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    });

    console.log("Recreating bookings...");
    await pb.collections.create({
      name: "bookings",
      type: "base",
      fields: [
        { name: "id", type: "text", required: true, primaryKey: true, system: true },
        { name: "name", type: "text", required: true },
        { name: "email", type: "email", required: true },
        { name: "phone", type: "text", required: true },
        { name: "status", type: "text", required: true },
        { name: "total_price", type: "number", required: true },
        { name: "start_time", type: "date", required: true },
        { name: "end_time", type: "date", required: true },
        { name: "players", type: "number", required: true },
        { name: "assigned_station_id", type: "relation", required: false, options: { collectionId: "stations", maxSelect: 1 } },
        { name: "property_id", type: "relation", required: false, options: { collectionId: "properties", maxSelect: 1 } }
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    });

    console.log("Recreating website_content...");
    await pb.collections.create({
      name: "website_content",
      type: "base",
      fields: [
        { name: "id", type: "text", required: true, primaryKey: true, system: true },
        { name: "type", type: "text", required: true },
        { name: "content", type: "json", required: true },
        { name: "property_id", type: "relation", required: false, options: { collectionId: "properties", maxSelect: 1 } }
      ],
      listRule: "",
      viewRule: "",
      createRule: "",
      updateRule: "",
      deleteRule: "",
    });

    console.log("✅ All schemas fixed!");
    
    // Seed the property
    const prop = await pb.collection('properties').create({
      name: "GameZ Main Branch",
      is_active: true,
      address: "123 Gamer Street",
      phone: "555-0100"
    });
    
  } catch (error) {
    console.error("Failed:", error.message);
    if (error.response) console.error(JSON.stringify(error.response.data, null, 2));
  }
}

fixSchema();
