import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function check() {
  try {
    const tPrices = await pb.collection('tier_prices').getFullList();
    console.log('Tier Prices:', JSON.stringify(tPrices, null, 2));
  } catch (err) {
    console.error(err);
  }
}

check();
