import fs from 'fs';

const filePath = 'd:/Ab/StarchData/GameZ/Admin/src/pages/Stations.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace ROOM_STATUS
content = content.replace(/ROOM_STATUS/g, 'STATION_STATUS');

// 2. Replace Icons imports
content = content.replace(/Bed, DoorOpen, Settings2/g, 'Gamepad2 as ConsoleIcon, Settings2');
content = content.replace(/<Bed className/g, '<ConsoleIcon className');
content = content.replace(/import \{ Gamepad2 \} from 'lucide-react';\n/g, '');

// 3. Update AVAILABLE_ICONS
content = content.replace(
  /const AVAILABLE_ICONS = \['AirVent', 'Wifi', 'Coffee', 'Tv', 'Wind', 'Bath', 'Sofa', 'Monitor'\];/,
  `const AVAILABLE_ICONS = ['Gamepad2', 'Monitor', 'Headphones', 'Mouse', 'Keyboard', 'Tv', 'Sofa', 'Coffee', 'Wifi', 'Cpu', 'Speaker'];`
);

// 4. Update UI Labels in the render method
content = content.replace(/Default Occupancy/g, 'Max Players');
content = content.replace(/Base Price/g, 'Price per Hour');
content = content.replace(/default_occupancy: 2/g, 'max_players: 2');
content = content.replace(/default_occupancy: type\.default_occupancy/g, 'max_players: type.default_occupancy');
content = content.replace(/typeFormData\.default_occupancy/g, 'typeFormData.max_players');

// Also fix in the form data initial state
content = content.replace(/default_occupancy:/g, 'max_players:');

// Let's replace 'Price per Night' to 'Price per Hour' just in case
content = content.replace(/Price per Night/g, 'Price per Hour');

// Fix the 'base_price' naming to 'price_per_hour' in StationType UI logic where appropriate
// Actually, station_types table has 'base_price' in PocketBase, so let's keep 'base_price' in the object to avoid breaking the DB schema, but change the UI label.
content = content.replace(/>Base Price \(₹\)</g, '>Price per Hour (₹)<');
content = content.replace(/>Base Price</g, '>Price per Hour<');

// Remove duplicate Gamepad2 import
content = content.replace(/import \{ Gamepad2 \} from 'lucide-react';/g, '');
// Re-add one at the top
content = content.replace(/import \* as LucideIcons from 'lucide-react';/, "import * as LucideIcons from 'lucide-react';\nimport { Gamepad2 } from 'lucide-react';");

fs.writeFileSync(filePath, content);
console.log('Stations.tsx patched successfully');
