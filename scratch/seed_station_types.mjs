import PocketBase from 'pocketbase';

const STATIONS = [
  {
    name: 'PlayStation 5 Lounge',
    base_price: 200,
    description: 'Immersive next-gen gaming with DualSense controllers on 55" 4K 120Hz gaming screens and high-fidelity headsets.',
    features: [
      'DualSense Wireless Controllers',
      '55" 4K LG OLED 120Hz Screens',
      'Premium 3D Audio Headsets',
      'Comfortable Gaming Recliners',
      'Latest game titles pre-installed'
    ],
    max_players: 2,
    is_popular: true,
  },
  {
    name: 'Championship Snooker',
    base_price: 400,
    description: 'Professional-grade tournament snooker tables with high-spec billiard lighting, premium slate, and imported cues.',
    features: [
      'Tournament-spec English Slate Tables',
      'Imported West of England cloth',
      'Ash wood cues (various weights)',
      'Shadowless overhead tournament lighting',
      'Spacious viewing sofas'
    ],
    max_players: 4,
    is_popular: false,
  },
  {
    name: 'Premium Carrom Arena',
    base_price: 100,
    description: 'Frictionless professional carrom boards with precise coins, heavyweight strikers, and dedicated overhead focus lamps.',
    features: [
      'Sysca / Champion brand boards',
      'High-grade boric powder application',
      'Professional acrylic strikers',
      'Dedicated warm-white focus lighting',
      'Sized perfectly for doubles or singles'
    ],
    max_players: 4,
    is_popular: false,
  },
  {
    name: '8 Balls Pool',
    base_price: 250,
    description: 'Professional 8-ball pool tables with premium speed cloth, tournament ball sets, and balanced pool cues.',
    features: [
      'Standard 8ft professional pool tables',
      'High-grade fast-speed wool-blend cloth',
      'Aramith tournament ball sets',
      'Ergonomic pool cues (various cue tips)',
      'Warm ambient overhead pool light'
    ],
    max_players: 4,
    is_popular: false,
  }
];

async function run() {
  const pb = new PocketBase('http://127.0.0.1:8090');
  await pb.admins.authWithPassword('test@admin.com', 'admin@1234');

  for (const st of STATIONS) {
    try {
      await pb.collection('station_types').create({
        name: st.name,
        base_price: st.base_price,
        description: st.description,
        features: st.features,
        max_players: st.max_players,
        is_popular: st.is_popular
      });
      console.log('Created:', st.name);
    } catch(err) {
      console.error('Failed to create:', st.name, err.response);
    }
  }
}

run();
