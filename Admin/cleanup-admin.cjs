const fs = require('fs');
const path = require('path');

const adminSrc = path.join(__dirname, 'src');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;
    for (const [search, replace] of replacements) {
        content = content.split(search).join(replace);
    }
    if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${filePath}`);
    }
}

// Analytics.tsx
replaceInFile(path.join(adminSrc, 'pages', 'Analytics.tsx'), [
    ['room counts', 'station counts'],
    ['room nights', 'station hours'],
    ['Slow room alert', 'Low usage station alert'],
    ['View room settings', 'View station settings'],
    ['Room Performance', 'Station Performance'],
    ['Room Name', 'Station Name'],
    ['Guest Insights', 'Player Insights'],
    ['Room', 'Station'],
    ['room', 'station']
]);

// Bookings.tsx
replaceInFile(path.join(adminSrc, 'pages', 'Bookings.tsx'), [
    ['Guest Name', 'Player Name'],
    ['>Guest<', '>Player<'],
    ['Check-in', 'Start Time'],
    ['Check-out', 'End Time']
]);

// CreateBooking.tsx
replaceInFile(path.join(adminSrc, 'pages', 'CreateBooking.tsx'), [
    ['Guest Details', 'Player Details'],
    ['Guest Name', 'Player Name'],
    ['Check-in Date', 'Start Date'],
    ['Check-out Date', 'End Date'],
    ['check-in and check-out dates', 'start and end dates'],
    ['Total Price (/night)', 'Total Price (/hour)']
]);

// Dashboard.tsx
replaceInFile(path.join(adminSrc, 'pages', 'Dashboard.tsx'), [
    ['Manage Guest Flow', 'Manage Player Flow'],
    ['To Check-In', 'To Start'],
    ['To Check-Out', 'To End']
]);

// SessionManagement.tsx
replaceInFile(path.join(adminSrc, 'pages', 'SessionManagement.tsx'), [
    ['Guest checked in successfully', 'Session started successfully'],
    ['Failed to check in guest', 'Failed to start session'],
    ['Guest checked out successfully', 'Session ended successfully'],
    ['Failed to check out guest', 'Failed to end session'],
    ['Check In Guest', 'Start Session for Player'],
    ['Check Out Guest', 'End Session for Player'],
    ['Check-In / Out', 'Session Management'],
    ['Check In', 'Start Session'],
    ['Check Out', 'End Session'],
    ['check-in', 'start'],
    ['check-out', 'end'],
    ['Check-in', 'Start'],
    ['Check-out', 'End'],
    ['Guest Name', 'Player Name'],
    ['guest(s)', 'player(s)']
]);

// Stations.tsx
replaceInFile(path.join(adminSrc, 'pages', 'Stations.tsx'), [
    ['Bed Type', 'Equipment Specs'],
    ['Double Bed', 'PS5 Console'],
    ['Single Bed', 'Standard PC'],
    ['/night', '/hour'],
    ['ROOM LOGIC', 'STATION LOGIC'],
    ['ROOM TYPE LOGIC', 'STATION TYPE LOGIC']
]);

// WebsiteContent.tsx
replaceInFile(path.join(adminSrc, 'pages', 'WebsiteContent.tsx'), [
    ['room types', 'station types'],
    ['Rooms tab', 'Stations tab'],
    ['rooms list', 'stations list'],
    ['Guest Testimonials', 'Player Testimonials'],
    ["guest's", "player's"],
    ['Guest Name', 'Player Name']
]);

console.log("Cleanup script finished.");
