import('pocketbase').then(async m => {
  const pb = new m.default('http://127.0.0.1:8090');
  try {
    await pb.collection('stations').getFullList({ filter: "status = 'active'" });
    console.log('stations ok');
    await pb.collection('tier_prices').getFullList();
    console.log('tier_prices ok');
    await pb.collection('station_types').getFullList();
    console.log('station_types ok');
    console.log('success');
  } catch (e) {
    console.error('fetchPricing failed', e.response || e);
  }
});
