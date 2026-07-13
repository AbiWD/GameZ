import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function run() {
  try {
    await pb.admins.authWithPassword('test@admin.com', 'admin@1234');
    
    // Create tier_prices collection
    try {
      await pb.collections.create({
        name: 'tier_prices',
        type: 'base',
        system: false,
        schema: [
          { name: 'tier_id', type: 'text', required: true, options: { min: 1, max: 255 } },
          { name: 'price', type: 'number', required: true, options: { min: 0 } }
        ],
        listRule: "",
        viewRule: "",
        createRule: null,
        updateRule: null,
        deleteRule: null
      });
      console.log('Created tier_prices collection');
    } catch (e) {
      console.log('Collection might already exist:', e.message);
    }
    
    // Clear old data
    const existing = await pb.collection('tier_prices').getFullList();
    for (const item of existing) {
      await pb.collection('tier_prices').delete(item.id);
    }
    
    // Seed new data
    const tiers = [
      { tier_id: 'tier-hourly', price: 100 },
      { tier_id: 'tier-midnight', price: 500 },
      { tier_id: 'tier-monthly-unlimited', price: 6000 },
      { tier_id: 'tier-more-packs', price: 0 }
    ];
    
    for (const t of tiers) {
      await pb.collection('tier_prices').create(t);
      console.log('Seeded:', t.tier_id);
    }
    
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
