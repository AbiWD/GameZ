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
        if (stations.length === 0) {
            console.error("❌ No stations found. Run seed script first.");
            return;
        }

        const stationId = stations[0].id;
        console.log("Using Station:", stationId);

        const start = new Date(Date.now() + 60 * 60000); // 1 hr from now
        const end = new Date(start.getTime() + 60 * 60000); // +1 hr
        const token1 = crypto.randomUUID();

        // Clear auth so User 1 and User 2 test the GUEST flow
        pb1.authStore.clear();
        pb2.authStore.clear();

        console.log("\n[Test 1] User 1 locking station...");
        let booking1;
        try {
            booking1 = await pb1.collection('bookings').create({
                assigned_station_id: stationId,
                start_time: start.toISOString(),
                end_time: end.toISOString(),
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

        console.log("\n[Test 2] Firing concurrent overlapping requests (TOCTOU Race Condition Test)...");
        try {
            const overlapStart = new Date(start.getTime() + 30 * 60000); 
            const overlapEnd = new Date(end.getTime() + 30 * 60000);   
            
            const req1 = pb1.collection('bookings').create({
                assigned_station_id: stationId,
                start_time: overlapStart.toISOString(),
                end_time: overlapEnd.toISOString(),
                players: 1,
                name: 'Hacker 1',
                email: 'hacker1@test.com',
                phone: '1234567890'
            });

            const req2 = pb2.collection('bookings').create({
                assigned_station_id: stationId,
                start_time: overlapStart.toISOString(),
                end_time: overlapEnd.toISOString(),
                players: 1,
                name: 'Hacker 2',
                email: 'hacker2@test.com',
                phone: '1234567890'
            });

            // Fire simultaneously
            const results = await Promise.allSettled([req1, req2]);
            const successes = results.filter(r => r.status === 'fulfilled');
            const failures = results.filter(r => r.status === 'rejected');

            console.log(`✅ ${successes.length} request(s) succeeded, ${failures.length} request(s) failed.`);
            
            if (successes.length > 0) {
                console.error("❌ ERROR: One or more concurrent requests bypassed the atomic check despite overlapping!");
                console.log(successes.map(s => s.value.id));
            } else {
                console.log("✅ Expected behavior: BOTH failed because User 1 already holds the 10:00-12:00 slot!");
            }
        } catch(err) {
            console.error("❌ Unexpected test execution error:", err.message);
        }

        console.log("\n[Test 2.5] Admin overrides overlap check (Should Succeed)...");
        try {
            await pb1.admins.authWithPassword('test@admin.com', 'admin@1234');
            const overlapStart = new Date(start.getTime() + 30 * 60000); 
            const overlapEnd = new Date(end.getTime() + 30 * 60000);   
            
            const adminReq = await pb1.collection('bookings').create({
                assigned_station_id: stationId,
                start_time: overlapStart.toISOString(),
                end_time: overlapEnd.toISOString(),
                players: 1,
                name: 'Admin Override',
                email: 'admin_override@test.com',
                phone: '1234567890'
            });
            console.log("✅ Admin successfully bypassed overlap validation. ID:", adminReq.id);
            await pb1.collection('bookings').delete(adminReq.id);
        } catch(err) {
            console.error("❌ ERROR: Admin override failed!", err.response?.message || err.message);
        } finally {
            pb1.authStore.clear(); // Restore pb1 back to Guest
        }

        console.log("\n[Test 3] User 1 tries to confirm booking themselves (Should Fail)...");
        try {
            await pb1.send(`/api/custom/bookings/${booking1.id}/confirm`, {
                method: 'POST',
                body: { hold_token: token1 }
            });
            console.log("❌ ERROR: User 1 successfully confirmed booking as a guest!");
        } catch(err) {
            console.log("✅ Expected failure (Forbidden):", err.response?.message || err.message);
        }

        console.log("\n[Test 4] Admin confirms booking...");
        try {
            // Re-authenticate pb1 as admin just for the confirm step
            await pb1.admins.authWithPassword('test@admin.com', 'admin@1234');
            await pb1.send(`/api/custom/bookings/${booking1.id}/confirm`, {
                method: 'POST'
            });
            console.log("✅ Admin successfully confirmed booking.");
        } catch(err) {
            console.error("❌ Admin failed to confirm:", err.response?.message || err.message);
        }

        console.log("\n[Cleanup] Deleting test booking...");
        try {
            // Already admin
            await pb1.collection('bookings').delete(booking1.id);
            console.log("✅ Cleanup complete.");
        } catch(err) {
            console.error("❌ Cleanup failed:", err.message);
        }
    } catch(err) {
        console.error("❌ Test setup failed:", err.message);
    }
}

runTest();
