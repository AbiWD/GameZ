import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function createSchemas() {
  try {
    console.log("Authenticating...");
    await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin123');

    // Get properties collection ID
    const propCol = await pb.collections.getOne('properties');
    const propertiesId = propCol.id;

    console.log("Creating 'station_types'...");
    const stationTypesCol = await pb.collections.create({
      name: "station_types",
      type: "base",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "base_price", type: "number", required: true },
        { name: "max_players", type: "number", required: true },
        { name: "specs", type: "text", required: false },
        { name: "features", type: "json", required: false },
        { name: "amenities", type: "json", required: false },
        { name: "is_popular", type: "bool", required: false },
        { name: "image", type: "file", required: false, maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/webp"] },
        { name: "description", type: "text", required: false },
        { name: "property_id", type: "relation", required: false, collectionId: propertiesId, cascadeDelete: false, maxSelect: 1 }
      ]
    });
    console.log("✅ station_types created.");

    console.log("Creating 'stations'...");
    const stationsCol = await pb.collections.create({
      name: "stations",
      type: "base",
      fields: [
        { name: "station_number", type: "text", required: true },
        { name: "station_type", type: "text", required: true },
        { name: "status", type: "text", required: true },
        { name: "price_per_hour", type: "number", required: true },
        { name: "max_players", type: "number", required: true },
        { name: "amenities", type: "json", required: false },
        { name: "property_id", type: "relation", required: false, collectionId: propertiesId, cascadeDelete: false, maxSelect: 1 }
      ]
    });
    console.log("✅ stations created.");

    console.log("Creating 'bookings'...");
    await pb.collections.create({
      name: "bookings",
      type: "base",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "email", type: "email", required: true },
        { name: "phone", type: "text", required: true },
        { name: "status", type: "text", required: true },
        { name: "total_price", type: "number", required: true },
        { name: "start_time", type: "date", required: true },
        { name: "end_time", type: "date", required: true },
        { name: "players", type: "number", required: true },
        { name: "assigned_station_id", type: "relation", required: false, collectionId: stationsCol.id, cascadeDelete: false, maxSelect: 1 },
        { name: "property_id", type: "relation", required: false, collectionId: propertiesId, cascadeDelete: false, maxSelect: 1 }
      ]
    });
    console.log("✅ bookings created.");

    console.log("Creating 'website_content'...");
    await pb.collections.create({
      name: "website_content",
      type: "base",
      fields: [
        { name: "type", type: "text", required: true },
        { name: "content", type: "json", required: true },
        { name: "property_id", type: "relation", required: false, collectionId: propertiesId, cascadeDelete: false, maxSelect: 1 }
      ]
    });
    console.log("✅ website_content created.");

  } catch (err) {
    if (err.response) {
      console.error(JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err);
    }
  }
}

createSchemas();
