import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function seedData() {
  try {
    console.log("Authenticating as admin...");
    await pb.admins.authWithPassword('admin@gamez.in', 'Admin123');

    const defaultProperty = await pb.collections.getOne('properties').catch(() => null);
    let propertyId = null;
    if (!defaultProperty) {
      console.log("No properties found. Creating a default GameZ Branch...");
      const prop = await pb.collection('properties').create({
        name: "GameZ Main Branch",
        is_active: true,
        address: "123 Gamer Street",
        phone: "555-0100"
      }).catch(e => {
        // collection might be empty, try to fetch all
        return null;
      });
      if(prop) propertyId = prop.id;
    } else {
      const props = await pb.collection('properties').getFullList();
      if(props.length > 0) propertyId = props[0].id;
    }

    console.log("Creating Station Types...");
    const types = [
      { name: 'PlayStation 5', base_price: 200, max_players: 2, specs: 'PS5, 4K TV, 2 Controllers' },
      { name: '8-Ball Pool', base_price: 300, max_players: 4, specs: 'Standard Pool Table' },
      { name: 'Snooker', base_price: 400, max_players: 4, specs: 'Full-size Snooker Table' },
      { name: 'Carrom Board', base_price: 100, max_players: 4, specs: 'Tournament Carrom Board' }
    ];

    const createdTypes = {};

    for (const t of types) {
      try {
        const existing = await pb.collection('station_types').getFirstListItem(`name="${t.name}"`);
        console.log(`Type ${t.name} already exists.`);
        createdTypes[t.name] = existing.id;
      } catch (e) {
        const created = await pb.collection('station_types').create({
          ...t,
          property_id: propertyId
        });
        console.log(`✅ Created Type ${t.name}`);
        createdTypes[t.name] = created.id;
      }
    }

    console.log("Creating Stations...");
    const stations = [
      ...Array.from({ length: 5 }).map((_, i) => ({ station_number: `PS-${i+1}`, typeName: 'PlayStation 5', price: 200, max_players: 2 })),
      ...Array.from({ length: 2 }).map((_, i) => ({ station_number: `POOL-${i+1}`, typeName: '8-Ball Pool', price: 300, max_players: 4 })),
      ...Array.from({ length: 1 }).map((_, i) => ({ station_number: `SNOOKER-1`, typeName: 'Snooker', price: 400, max_players: 4 })),
      ...Array.from({ length: 2 }).map((_, i) => ({ station_number: `CARROM-${i+1}`, typeName: 'Carrom Board', price: 100, max_players: 4 }))
    ];

    for (const s of stations) {
      try {
        await pb.collection('stations').getFirstListItem(`station_number="${s.station_number}"`);
        console.log(`Station ${s.station_number} already exists.`);
      } catch (e) {
        await pb.collection('stations').create({
          station_number: s.station_number,
          station_type: s.typeName, // we store the name as per schema
          status: 'available',
          price_per_hour: s.price,
          max_players: s.max_players,
          property_id: propertyId
        });
        console.log(`✅ Created Station ${s.station_number}`);
      }
    }

    console.log("🎉 Data Seed Complete!");
  } catch (error) {
    console.error("Failed to seed data:", error.message);
  }
}

seedData();
