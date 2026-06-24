const fs = require('fs');
const path = require('path');

const adminSrc = path.join(__dirname, 'src');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf-8');
    for (const [search, replace] of replacements) {
        content = content.split(search).join(replace);
    }
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
}

const roomsReplacements = [
    ["Room Inventory", "Station Inventory"],
    ["Manage Room Types", "Manage Station Types"],
    ["Add Room", "Add Station"],
    ["Room Number", "Station Number"],
    ["room_number", "station_number"],
    ["Room Type", "Station Type"],
    ["room_type", "station_type"],
    ["Price per Night", "Price per Hour"],
    ["price_per_night", "price_per_hour"],
    ["Max Occupancy", "Max Players"],
    ["max_occupancy", "max_players"],
    ["Bed Type", "Equipment Specs"],
    ["bed_type", "specs"],
    ["Rooms & Property Manager", "Stations & Branches Manager"],
    ["pb.collection('rooms')", "pb.collection('stations')"],
    ["pb.collection('room_types')", "pb.collection('station_types')"],
    ["Room", "Station"],
    ["room", "station"],
    ["Rooms", "Stations"],
    ["rooms", "stations"]
];

// Careful with case-insensitive replaces, we do exact matches.
const exactReplacementsRooms = [
    ["Room Inventory", "Station Inventory"],
    ["Manage Room Types", "Manage Station Types"],
    ["Add Room", "Add Station"],
    ["Room Number", "Station Number"],
    ["Room Type", "Station Type"],
    ["Price per Night (₹)", "Price per Hour (₹)"],
    ["Price per Night", "Price per Hour"],
    ["Max Occupancy", "Max Players"],
    ["Bed Type", "Equipment Specs"],
    ["Rooms & Property Manager", "Stations & Branches Manager"],
    ["pb.collection('rooms')", "pb.collection('stations')"],
    ["pb.collection('room_types')", "pb.collection('station_types')"],
    ["room_number", "station_number"],
    ["room_type", "station_type"],
    ["price_per_night", "price_per_hour"],
    ["max_occupancy", "max_players"],
    ["bed_type", "specs"],
    ["Room Image", "Station Image"],
    ["Room Categories", "Station Categories"],
    ["All Rooms", "All Stations"],
    ["Room No.", "Station No."],
    ["roomTypes", "stationTypes"],
    ["setRoomTypes", "setStationTypes"],
    ["editingRoom", "editingStation"],
    ["setEditingRoom", "setEditingStation"],
    ["fetchRooms", "fetchStations"],
    ["fetchRoomTypes", "fetchStationTypes"],
    ["room_id", "station_id"],
    ["assigned_room_id", "assigned_station_id"],
    ["room", "station"],
    ["Room", "Station"],
    ["rooms", "stations"],
    ["Rooms", "Stations"]
];

// Rename Rooms.tsx -> Stations.tsx
const oldRoomsPath = path.join(adminSrc, 'pages', 'Rooms.tsx');
const newStationsPath = path.join(adminSrc, 'pages', 'Stations.tsx');
if (fs.existsSync(oldRoomsPath)) {
    let content = fs.readFileSync(oldRoomsPath, 'utf-8');
    // manual replacements to preserve syntax
    const replaces = [
        ["Room", "Station"],
        ["room", "station"],
        ["Rooms", "Stations"],
        ["rooms", "stations"],
        ["Bed", "Gamepad2"],
        ["price_per_night", "price_per_hour"],
        ["max_occupancy", "max_players"],
        ["bed_type", "specs"],
        ["Night", "Hour"],
        ["Occupancy", "Players"],
    ];
    // Simple naive replace is dangerous, let's do targeted:
    content = content
        .replace(/Room/g, 'Station')
        .replace(/room/g, 'station')
        .replace(/Rooms/g, 'Stations')
        .replace(/rooms/g, 'stations')
        .replace(/price_per_night/g, 'price_per_hour')
        .replace(/max_occupancy/g, 'max_players')
        .replace(/bed_type/g, 'specs')
        .replace(/Night/g, 'Hour')
        .replace(/Occupancy/g, 'Players')
        .replace(/<Gamepad2/g, '<Gamepad2') // just in case
        .replace(/lucide-react';/g, "lucide-react';\nimport { Gamepad2 } from 'lucide-react';");

    fs.writeFileSync(newStationsPath, content);
    fs.unlinkSync(oldRoomsPath);
    console.log("Renamed and updated Rooms.tsx to Stations.tsx");
}

// Rename CheckInOut.tsx -> SessionManagement.tsx
const oldCheckInOutPath = path.join(adminSrc, 'pages', 'CheckInOut.tsx');
const newSessionMgmtPath = path.join(adminSrc, 'pages', 'SessionManagement.tsx');
if (fs.existsSync(oldCheckInOutPath)) {
    let content = fs.readFileSync(oldCheckInOutPath, 'utf-8');
    content = content
        .replace(/CheckInOut/g, 'SessionManagement')
        .replace(/Check In\/Out/g, 'Session Management')
        .replace(/check_in/g, 'start_time')
        .replace(/check_out/g, 'end_time')
        .replace(/checkIn/g, 'startSession')
        .replace(/checkOut/g, 'endSession')
        .replace(/assigned_room_id/g, 'assigned_station_id')
        .replace(/rooms/g, 'stations')
        .replace(/room/g, 'station')
        .replace(/Room/g, 'Station');
    fs.writeFileSync(newSessionMgmtPath, content);
    fs.unlinkSync(oldCheckInOutPath);
    console.log("Renamed and updated CheckInOut.tsx to SessionManagement.tsx");
}

// Update App.tsx
replaceInFile(path.join(adminSrc, 'App.tsx'), [
    ['import Rooms from "./pages/Rooms";', 'import Stations from "./pages/Stations";'],
    ['import CheckInOut from "./pages/CheckInOut";', 'import SessionManagement from "./pages/SessionManagement";'],
    ['<Route path="/admin/rooms" element={<Rooms />} />', '<Route path="/admin/stations" element={<Stations />} />'],
    ['<Route path="/admin/check-in-out" element={<CheckInOut />} />', '<Route path="/admin/session-management" element={<SessionManagement />} />']
]);

// Update AdminSidebar.tsx
replaceInFile(path.join(adminSrc, 'components', 'AdminSidebar.tsx'), [
    ['url: \'/admin/rooms\'', 'url: \'/admin/stations\''],
    ['url: \'/admin/check-in-out\'', 'url: \'/admin/session-management\'']
]);

// Update Dashboard.tsx
replaceInFile(path.join(adminSrc, 'pages', 'Dashboard.tsx'), [
    ["pb.collection('rooms')", "pb.collection('stations')"],
    ["check_in", "start_time"],
    ["check_out", "end_time"],
    ["todayCheckIns", "todayStarts"],
    ["todayDepartures", "todayEnds"],
    ["room", "station"],
    ["Room", "Station"],
    ["rooms", "stations"],
    ["Rooms", "Stations"]
]);

// Update Bookings.tsx
replaceInFile(path.join(adminSrc, 'pages', 'Bookings.tsx'), [
    ["pb.collection('rooms')", "pb.collection('stations')"],
    ["pb.collection('room_types')", "pb.collection('station_types')"],
    ["check_in", "start_time"],
    ["check_out", "end_time"],
    ["assigned_room_id", "assigned_station_id"],
    ["room", "station"],
    ["Room", "Station"],
    ["rooms", "stations"],
    ["Rooms", "Stations"]
]);

// Update CreateBooking.tsx
replaceInFile(path.join(adminSrc, 'pages', 'CreateBooking.tsx'), [
    ["pb.collection('rooms')", "pb.collection('stations')"],
    ["pb.collection('room_types')", "pb.collection('station_types')"],
    ["check_in", "start_time"],
    ["check_out", "end_time"],
    ["room", "station"],
    ["Room", "Station"],
    ["rooms", "stations"],
    ["Rooms", "Stations"]
]);

console.log("Admin Panel refactoring script completed.");
