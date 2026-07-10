import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function seed() {
  try {
    await pb.admins.authWithPassword('test@admin.com', 'admin@1234');
    
    // get existing stations and delete them
    const existing = await pb.collection('stations').getFullList();
    for (const s of existing) {
      await pb.collection('stations').delete(s.id);
      console.log('Deleted old station:', s.id);
    }

    const targetPropertyId = '20fml0zc3egjxy4';

    const stationsToCreate = [
      // 6 PS5 Stations
      { id: 'ps5station00001', station_number: 'PS5-01', station_type: 'PlayStation 5 Lounge', status: 'active', price_per_hour: 200, max_players: 6, property_id: targetPropertyId },
      { id: 'ps5station00002', station_number: 'PS5-02', station_type: 'PlayStation 5 Lounge', status: 'active', price_per_hour: 200, max_players: 6, property_id: targetPropertyId },
      { id: 'ps5station00003', station_number: 'PS5-03', station_type: 'PlayStation 5 Lounge', status: 'active', price_per_hour: 200, max_players: 6, property_id: targetPropertyId },
      { id: 'ps5station00004', station_number: 'PS5-04', station_type: 'PlayStation 5 Lounge', status: 'active', price_per_hour: 200, max_players: 6, property_id: targetPropertyId },
      { id: 'ps5station00005', station_number: 'PS5-05', station_type: 'PlayStation 5 Lounge', status: 'active', price_per_hour: 200, max_players: 6, property_id: targetPropertyId },
      { id: 'ps5station00006', station_number: 'PS5-06', station_type: 'PlayStation 5 Lounge', status: 'active', price_per_hour: 200, max_players: 6, property_id: targetPropertyId },
      
      // 2 Snooker Stations
      { id: 'snookertable001', station_number: 'SNK-01', station_type: 'Championship Snooker', status: 'active', price_per_hour: 400, max_players: 2, property_id: targetPropertyId },
      { id: 'snookertable002', station_number: 'SNK-02', station_type: 'Championship Snooker', status: 'active', price_per_hour: 400, max_players: 2, property_id: targetPropertyId },

      // 4 Carrom Stations
      { id: 'carromboard0001', station_number: 'CAR-01', station_type: 'Premium Carrom Arena', status: 'active', price_per_hour: 100, max_players: 4, property_id: targetPropertyId },
      { id: 'carromboard0002', station_number: 'CAR-02', station_type: 'Premium Carrom Arena', status: 'active', price_per_hour: 100, max_players: 4, property_id: targetPropertyId },
      { id: 'carromboard0003', station_number: 'CAR-03', station_type: 'Premium Carrom Arena', status: 'active', price_per_hour: 100, max_players: 4, property_id: targetPropertyId },
      { id: 'carromboard0004', station_number: 'CAR-04', station_type: 'Premium Carrom Arena', status: 'active', price_per_hour: 100, max_players: 4, property_id: targetPropertyId },

      // 3 Pool Stations
      { id: 'pooltable000001', station_number: 'POL-01', station_type: '8 Balls Pool', status: 'active', price_per_hour: 250, max_players: 3, property_id: targetPropertyId },
      { id: 'pooltable000002', station_number: 'POL-02', station_type: '8 Balls Pool', status: 'active', price_per_hour: 250, max_players: 3, property_id: targetPropertyId },
      { id: 'pooltable000003', station_number: 'POL-03', station_type: '8 Balls Pool', status: 'active', price_per_hour: 250, max_players: 3, property_id: targetPropertyId }
    ];

    for (const station of stationsToCreate) {
      await pb.collection('stations').create(station);
      console.log("Created station:", station.station_number);
    }
  } catch (err) {
    console.error("Failed", err);
  }
}
seed();
