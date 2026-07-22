const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('http://127.0.0.1:8090');
pb.collection('stations').getFullList({filter: 'station_type = "PlayStation 5 Lounge"'})
  .then(res => console.log('Found unauthenticated:', res.length))
  .catch(console.error);
