import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function fixGamingSchemas() {
  try {
    console.log("Authenticating...");
    await pb.collection('_superusers').authWithPassword('admin@gamez.in', 'Admin123');

    // 1. Fix station_types
    try {
      const stationTypes = await pb.collections.getOne('station_types');
      if (!stationTypes.fields.some(f => f.name === 'name')) {
        console.log("Adding fields to station_types...");
        stationTypes.fields.push(
          { name: "name", type: "text", required: true },
          { name: "base_price", type: "number", required: true },
          { name: "max_players", type: "number", required: true },
          { name: "specs", type: "text", required: false },
          { name: "features", type: "json", required: false },
          { name: "amenities", type: "json", required: false },
          { name: "is_popular", type: "bool", required: false },
          { name: "description", type: "text", required: false },
          { name: "property_id", type: "relation", required: false, collectionId: "properties", cascadeDelete: false, minSelect: null, maxSelect: 1 }
        );
        await pb.collections.update('station_types', stationTypes);
        console.log("✅ station_types fixed.");
      }
    } catch(e) { console.error("Error station_types:", e.message); }

    // 2. Fix stations
    try {
      const stations = await pb.collections.getOne('stations');
      if (!stations.fields.some(f => f.name === 'station_number')) {
        console.log("Adding fields to stations...");
        stations.fields.push(
          { name: "station_number", type: "text", required: true },
          { name: "station_type", type: "text", required: true },
          { name: "status", type: "text", required: true },
          { name: "price_per_hour", type: "number", required: true },
          { name: "max_players", type: "number", required: true },
          { name: "amenities", type: "json", required: false },
          { name: "property_id", type: "relation", required: false, collectionId: "properties", cascadeDelete: false, minSelect: null, maxSelect: 1 }
        );
        await pb.collections.update('stations', stations);
        console.log("✅ stations fixed.");
      }
    } catch(e) { console.error("Error stations:", e.message); }

    // 3. Fix bookings
    try {
      const bookings = await pb.collections.getOne('bookings');
      if (!bookings.fields.some(f => f.name === 'name')) {
        console.log("Adding fields to bookings...");
        bookings.fields.push(
          { name: "name", type: "text", required: true },
          { name: "email", type: "email", required: true },
          { name: "phone", type: "text", required: true },
          { name: "status", type: "text", required: true },
          { name: "total_price", type: "number", required: true },
          { name: "start_time", type: "date", required: true },
          { name: "end_time", type: "date", required: true },
          { name: "players", type: "number", required: true },
          { name: "assigned_station_id", type: "relation", required: false, collectionId: "stations", cascadeDelete: false, minSelect: null, maxSelect: 1 },
          { name: "property_id", type: "relation", required: false, collectionId: "properties", cascadeDelete: false, minSelect: null, maxSelect: 1 }
        );
        await pb.collections.update('bookings', bookings);
        console.log("✅ bookings fixed.");
      }
    } catch(e) { console.error("Error bookings:", e.message); }

    // 4. Fix website_content
    try {
      const website_content = await pb.collections.getOne('website_content');
      if (!website_content.fields.some(f => f.name === 'type')) {
        console.log("Adding fields to website_content...");
        website_content.fields.push(
          { name: "type", type: "text", required: true },
          { name: "content", type: "json", required: true },
          { name: "property_id", type: "relation", required: false, collectionId: "properties", cascadeDelete: false, minSelect: null, maxSelect: 1 }
        );
        await pb.collections.update('website_content', website_content);
        console.log("✅ website_content fixed.");
      }
    } catch(e) { console.error("Error website_content:", e.message); }

  } catch (err) {
    if (err.response) {
      console.error(JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err);
    }
  }
}

fixGamingSchemas();
