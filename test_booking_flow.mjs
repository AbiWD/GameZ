import PocketBase from 'pocketbase';
import crypto from 'crypto';

const pb1 = new PocketBase('http://127.0.0.1:8090');
const pb2 = new PocketBase('http://127.0.0.1:8090');

async function runTest() {
    console.log("=== Starting Temporary Hold Test ===");

    try {
        await pb1.admins.authWithPassword('test@admin.com', 'admin@1234');
        await pb2.admins.authWithPassword('test@admin.com', 'admin@1234');
        console.log("Admins authenticated.");

        const stations = await pb1.collection('stations').getFullList();
        const stationId = stations[0].id;
        console.log("Using Station:", stationId);

        const start = new Date();
        start.setHours(start.getHours() + 1, 0, 0, 0); // Next hour
        const end = new Date(start);
        end.setHours(end.getHours() + 1);
        
        const token1 = crypto.randomUUID();
        const expires1 = new Date(Date.now() + 5 * 60000).toISOString();

        console.log("\n[Test 1] User 1 locking station...");
        let booking1;
        try {
            booking1 = await pb1.collection('bookings').create({
                assigned_station_id: stationId,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                status: 'pending',
                customer_id: 'customer1234567',
                hold_token: token1,
                expires_at: expires1,
                total_price: 100,
                players: 1,
                name: 'User 1',
                email: 'user1@test.com',
                phone: '1234567890'
            });
            console.log("✅ User 1 successfully locked station. ID:", booking1.id);
        } catch(err) {
            console.error("❌ User 1 failed to lock station:", err.response?.message || err.message);
            if (err.response?.data) console.error(err.response.data);
            return;
        }

        console.log("\n[Test 2] User 1 trying to lock a second station (Hold Limit)...");
        try {
            await pb1.collection('bookings').create({
                assigned_station_id: stations[1].id,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                status: 'pending',
                customer_id: 'customer1234567',
                hold_token: crypto.randomUUID(),
                expires_at: expires1,
                total_price: 100,
                players: 1,
                name: 'User 1',
                email: 'user1@test.com',
                phone: '1234567890'
            });
            console.error("❌ ERROR: User 1 bypassed the hold limit!");
        } catch(err) {
            console.log("✅ Expected failure:", err.response?.message || err.message);
        }

        console.log("\n[Test 3] User 2 trying to lock the SAME station...");
        try {
            await pb2.collection('bookings').create({
                assigned_station_id: stationId,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
                status: 'pending',
                customer_id: 'customer_456',
                hold_token: crypto.randomUUID(),
                expires_at: expires1,
                total_price: 100,
                players: 1,
                name: 'User 2',
                email: 'user2@test.com',
                phone: '1234567890'
            });
            console.error("❌ ERROR: User 2 bypassed the overlap prevention!");
        } catch(err) {
            console.log("✅ Expected failure:", err.response?.message || err.message);
        }

        console.log("\n[Test 4] User 1 confirms booking...");
        try {
            await pb1.collection('bookings').update(booking1.id, {
                status: 'confirmed',
                hold_token: token1
            });
            console.log("✅ User 1 successfully confirmed booking.");
        } catch(err) {
            console.error("❌ User 1 failed to confirm:", err.response?.message || err.message);
        }

        console.log("\n[Cleanup] Deleting test booking...");
        await pb1.collection('bookings').delete(booking1.id);
        console.log("✅ Cleanup complete.");

    } catch(err) {
        console.error("Test setup failed:", err);
    }
}

runTest();
