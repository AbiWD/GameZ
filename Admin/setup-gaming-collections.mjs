import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function setupCollections() {
  try {
    console.log("Authenticating as admin...");
    // Update admin credentials if needed
    await pb.admins.authWithPassword('admin@gamez.in', 'Admin123');

    // 1. CREATE station_types collection
    console.log("Creating/Updating 'station_types' collection...");
    let stationTypesId = "";
    try {
      const coll = await pb.collections.getOne('station_types');
      console.log("'station_types' already exists.");
      stationTypesId = coll.id;
    } catch {
      const coll = await pb.collections.create({
        name: "station_types",
        type: "base",
        system: false,
        schema: [
          { name: "name", type: "text", required: true },
          { name: "base_price", type: "number", required: true },
          { name: "max_players", type: "number", required: true },
          { name: "specs", type: "text", required: false }, // Replaces bed_type
          { name: "features", type: "json", required: false },
          { name: "amenities", type: "json", required: false },
          { name: "is_popular", type: "bool", required: false },
          { name: "image", type: "file", required: false, options: { maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"] } },
          { name: "description", type: "text", required: false },
          { name: "property_id", type: "relation", required: false, options: { collectionId: "properties", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: null } }
        ],
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
      });
      console.log("✅ Created 'station_types' collection.");
      stationTypesId = coll.id;
    }

    // 2. CREATE stations collection
    console.log("Creating/Updating 'stations' collection...");
    try {
      await pb.collections.getOne('stations');
      console.log("'stations' already exists.");
    } catch {
      await pb.collections.create({
        name: "stations",
        type: "base",
        system: false,
        schema: [
          { name: "station_number", type: "text", required: true },
          { name: "station_type", type: "text", required: true }, // name of the type
          { name: "status", type: "text", required: true }, // available, occupied, maintenance
          { name: "price_per_hour", type: "number", required: true },
          { name: "max_players", type: "number", required: true },
          { name: "amenities", type: "json", required: false },
          { name: "property_id", type: "relation", required: false, options: { collectionId: "properties", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: null } }
        ],
        listRule: "",
        viewRule: "",
        createRule: "",
        updateRule: "",
        deleteRule: "",
      });
      console.log("✅ Created 'stations' collection.");
    }

    // 3. CREATE / UPDATE bookings to support time and players
    console.log("Creating/Updating 'bookings' collection...");
    try {
      let bookingCollection = await pb.collections.getOne('bookings');
      console.log("'bookings' exists. Updating fields for gaming...");
      
      const fields = bookingCollection.fields || bookingCollection.schema;
      
      // We will ensure start_time and end_time exist (as datetime)
      if (!fields.some(f => f.name === 'start_time')) {
        fields.push({ name: "start_time", type: "date", required: true, system: false, options: { min: "", max: "" } });
      }
      if (!fields.some(f => f.name === 'end_time')) {
        fields.push({ name: "end_time", type: "date", required: true, system: false, options: { min: "", max: "" } });
      }
      if (!fields.some(f => f.name === 'players')) {
        fields.push({ name: "players", type: "number", required: true, system: false, options: { min: null, max: null } });
      }
      if (!fields.some(f => f.name === 'assigned_station_id')) {
        fields.push({ name: "assigned_station_id", type: "relation", required: false, system: false, options: { collectionId: "stations", cascadeDelete: false, minSelect: null, maxSelect: 1, displayFields: null } });
      }

      if (bookingCollection.fields) {
        bookingCollection.fields = fields;
      } else {
        bookingCollection.schema = fields;
      }
      await pb.collections.update('bookings', bookingCollection);
      console.log("✅ Updated 'bookings' collection.");
    } catch (err) {
      console.log("'bookings' collection check failed.", err.message);
    }

    console.log("🎉 Setup complete!");

  } catch (error) {
    console.error("Failed to setup schema:", error.message);
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

setupCollections();
