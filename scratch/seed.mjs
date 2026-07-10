import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function seed() {
  try {
    await pb.admins.authWithPassword('test@admin.com', 'admin@1234');
    console.log("Logged in");

    // The property
    let propertyId = 'propertymangalu';
    try {
      await pb.collection('properties').create({
        id: propertyId,
        name: 'GameZ Mangaluru',
        location: 'Mangaluru',
        status: 'active'
      });
      console.log("Created property");
    } catch(e) {
      console.log("Property exists");
    }

    const stationsToCreate = [
      {
        id: 'ps5station00000',
        station_number: 'PS5-01',
        station_type: 'PlayStation 5 Lounge',
        status: 'active',
        price_per_hour: 200,
        max_players: 6,
        property_id: propertyId
      },
      {
        id: 'snookertable000',
        station_number: 'SNK-01',
        station_type: 'Championship Snooker',
        status: 'active',
        price_per_hour: 400,
        max_players: 2,
        property_id: propertyId
      },
      {
        id: 'carromboard0000',
        station_number: 'CAR-01',
        station_type: 'Premium Carrom Arena',
        status: 'active',
        price_per_hour: 100,
        max_players: 4,
        property_id: propertyId
      },
      {
        id: 'pooltable000000',
        station_number: 'POL-01',
        station_type: '8 Balls Pool',
        status: 'active',
        price_per_hour: 250,
        max_players: 3,
        property_id: propertyId
      }
    ];

    for (const station of stationsToCreate) {
      try {
        await pb.collection('stations').create(station);
        console.log("Created station:", station.id);
      } catch (err) {
        console.log("Failed to create station:", station.id, err.response?.message);
      }
    }
  } catch(e) {
    console.error("Auth failed", e);
  }
}
seed();
