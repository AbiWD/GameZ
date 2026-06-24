import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function createBookingsCollection() {
  try {
    console.log("Authenticating as admin...");
    await pb.admins.authWithPassword('admin@gamez.in', 'Admin123');

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
          { name: "status", type: "text", required: true }, // confirmed, active, completed, cancelled
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
  } catch (error) {
    console.error("Failed:", error.message);
    if (error.response) console.error(JSON.stringify(error.response.data, null, 2));
  }
}

createBookingsCollection();
