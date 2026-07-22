const fs = require('fs');
let content = fs.readFileSync('src/pages/Book.tsx', 'utf8');

// Patch 1: Encoding character fix
content = content.replace('â€¢', '&bull;');

// Patch 2: ISOString replace for overlap check
const isoStrOrig = `const filter = \`status != 'cancelled' && start_time < '\${endDateTime.toISOString()}' && end_time > '\${startDateTime.toISOString()}'\`;`;
const isoStrNew = `const filter = \`status != 'cancelled' && start_time < '\${endDateTime.toISOString().replace('T', ' ')}' && end_time > '\${startDateTime.toISOString().replace('T', ' ')}'\`;`;
content = content.replace(isoStrOrig, isoStrNew);

// Patch 3 & 4: Map types in handleTimeSubmit and handleInfoSubmit
const originalCheck = `    const selectedTypeObj = stationTypes.find(t => t.name === selectedStation?.name);`;
const newCheck = `    const mapType = (name) => {
      if (name.includes('PlayStation')) return 'PlayStation 5';
      if (name.includes('Snooker')) return 'Snooker';
      if (name.includes('Carrom')) return 'Carrom Board';
      if (name.includes('Pool') || name.includes('8 Ball')) return '8-Ball Pool';
      return name;
    };
    const mappedName = mapType(selectedStation?.name || '');
    const selectedTypeObj = stationTypes.find(t => t.name === mappedName);`;
// Replace BOTH occurrences
content = content.replaceAll(originalCheck, newCheck);

// Patch 5: Add property_id and station_type to bookingData payload
const originalPayload = `        status: 'pending',
        source: 'website',
        customer_id: user.customer_id || '',`;
const newPayload = `        status: 'pending',
        source: 'website',
        property_id: availableStations[0].property_id || '',
        station_type: availableStations[0].station_type || '',
        customer_id: user.customer_id || '',`;
content = content.replace(originalPayload, newPayload);

fs.writeFileSync('src/pages/Book.tsx', content);
console.log('Patches applied successfully.');
