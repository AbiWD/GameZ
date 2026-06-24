const fs = require('fs');
const path = require('path');

const websiteSrc = path.join(__dirname, 'src');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;
    for (const [search, replace] of replacements) {
        content = content.split(search).join(replace);
    }
    if(original !== content) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
}

// 1. Rename and refactor Rooms.tsx -> Stations.tsx
const oldRoomsPath = path.join(websiteSrc, 'components', 'Rooms.tsx');
const newStationsPath = path.join(websiteSrc, 'components', 'Stations.tsx');
if (fs.existsSync(oldRoomsPath)) {
    let content = fs.readFileSync(oldRoomsPath, 'utf-8');
    content = content
        .replace(/Rooms/g, 'Stations')
        .replace(/rooms/g, 'stations')
        .replace(/Room/g, 'Station')
        .replace(/room/g, 'station')
        .replace(/price_per_night/g, 'price_per_hour')
        .replace(/per night/g, 'per hour')
        .replace(/night/g, 'hour')
        .replace(/Night/g, 'Hour')
        .replace(/max_occupancy/g, 'max_players')
        .replace(/guests/g, 'players')
        .replace(/Guests/g, 'Players')
        .replace(/bed_type/g, 'specs')
        .replace(/Bed Type/g, 'Specs')
        .replace(/pb\.collection\('room_types'\)/g, "pb.collection('station_types')");
    fs.writeFileSync(newStationsPath, content);
    fs.unlinkSync(oldRoomsPath);
    console.log("Renamed Rooms.tsx -> Stations.tsx");
}

// 2. Update Index.tsx
replaceInFile(path.join(websiteSrc, 'pages', 'Index.tsx'), [
    ['import Rooms from "@/components/Rooms";', 'import Stations from "@/components/Stations";'],
    ['<Rooms />', '<Stations />'],
    ['best coastal getaway at', 'best gaming experience at'],
    ['stay', 'session']
]);

// 3. Update Hero.tsx
replaceInFile(path.join(websiteSrc, 'components', 'Hero.tsx'), [
    ['Find your perfect stay', 'Book your ultimate gaming experience'],
    ['Experience the best coastal getaway', 'Experience the best gaming sessions'],
    ['Book Your Stay', 'Book a Station']
]);

// 4. Update Booking.tsx
replaceInFile(path.join(websiteSrc, 'components', 'Booking.tsx'), [
    ['Book Your Stay', 'Book Your Session'],
    ['pb.collection(\'room_types\')', 'pb.collection(\'station_types\')'],
    ['room_types', 'station_types'],
    ['roomTypes', 'stationTypes'],
    ['setRoomTypes', 'setStationTypes'],
    ['RoomType', 'StationType'],
    ['room', 'station'],
    ['Room', 'Station'],
    ['Rooms', 'Stations'],
    ['rooms', 'stations'],
    ['check_in', 'start_time'],
    ['check_out', 'end_time'],
    ['Check In', 'Start Time'],
    ['Check Out', 'End Time'],
    ['check in', 'start time'],
    ['check out', 'end time'],
    ['Guests', 'Players'],
    ['guests', 'players'],
    ['max_occupancy', 'max_players'],
    ['night', 'hour'],
    ['Night', 'Hour']
]);

// 5. Update Amenities.tsx
replaceInFile(path.join(websiteSrc, 'components', 'Amenities.tsx'), [
    ['Property Amenities', 'Cafe Perks'],
    ['Everything you need for a comfortable stay', 'Everything you need for an ultimate gaming session'],
    ['amenities', 'perks'],
    ['Amenities', 'Perks']
]);

// 6. Update Experiences.tsx
replaceInFile(path.join(websiteSrc, 'components', 'Experiences.tsx'), [
    ['Curated Experiences', 'Game Library & Tournaments'],
    ['Discover local culture and adventure', 'Discover top-tier games and compete in tournaments']
]);

console.log("Website refactoring script completed.");
