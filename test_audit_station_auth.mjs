import PocketBase from 'pocketbase';
import crypto from 'crypto';

const pb = new PocketBase('http://127.0.0.1:8090');
const pbGuest = new PocketBase('http://127.0.0.1:8090'); // No auth

async function runTest() {
    console.log("=== Starting Final Hardening Test ===");
    
    try {
        await pb.admins.authWithPassword('test@admin.com', 'admin@1234');
        console.log("Admin authenticated.");

        // --- 1. TEST STATION DELETION LOCK ---
        console.log("\n[Test 1] Prevent deleting a station with an active booking...");
        const stations = await pb.collection('stations').getFullList();
        if (stations.length === 0) throw new Error("No stations found");
        const stationId = stations[0].id;

        // Create a fake active booking
        const start = new Date(Date.now() + 60 * 60000); 
        const end = new Date(start.getTime() + 60 * 60000);
        
        const booking = await pb.collection('bookings').create({
            assigned_station_id: stationId,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            players: 1,
            name: 'Deletion Test',
            email: 'test@deletion.com',
            phone: '1234567890',
            status: 'confirmed'
        });

        try {
            await pb.collection('stations').delete(stationId);
            console.error("❌ ERROR: Successfully deleted station with active booking! This should have failed.");
        } catch(err) {
            console.log("✅ Station deletion correctly rejected:", err.response?.message);
        }

        // --- 2. TEST MAINTENANCE LOCK ---
        console.log("\n[Test 2] Prevent putting a station in maintenance if it has future bookings...");
        try {
            await pb.collection('stations').update(stationId, { status: 'maintenance' });
            console.error("❌ ERROR: Successfully put station in maintenance! This should have failed.");
        } catch(err) {
            console.log("✅ Maintenance mode correctly rejected:", err.response?.message);
        }

        // Cleanup the booking
        await pb.collection('bookings').delete(booking.id);


        // --- 3. TEST AUTH ESCALATION & BANNING ---
        console.log("\n[Test 3] Prevent privilege escalation on registration...");
        const fakeEmail = `test_user_${Date.now()}@example.com`;
        const newUser = await pbGuest.collection('portal_users').create({
            email: fakeEmail,
            password: 'password123',
            passwordConfirm: 'password123',
            status: 'vip' // Attempting to make ourselves VIP
        });

        if (newUser.status !== 'regular') {
            console.error("❌ ERROR: Guest successfully made themselves VIP! Status is:", newUser.status);
        } else {
            console.log("✅ Guest status was forcibly downgraded to 'regular'.");
        }

        console.log("\n[Test 4] Prevent banned users from logging in...");
        // Admin bans the user
        await pb.collection('portal_users').update(newUser.id, { status: 'banned' });

        try {
            await pbGuest.collection('portal_users').authWithPassword(fakeEmail, 'password123');
            console.error("❌ ERROR: Banned user successfully logged in!");
        } catch(err) {
            console.log("✅ Banned user login correctly rejected:", err.response?.message);
        }

        // Cleanup user
        await pb.collection('portal_users').delete(newUser.id);


        // --- 5. TEST AUDIT LOGS ---
        console.log("\n[Test 5] Verify Audit Logs were created...");
        const logs = await pb.collection('audit_logs').getList(1, 50);
        
        let foundCreate = false;
        let foundUpdate = false;
        let foundDelete = false;

        for (const log of logs.items) {
            if (log.collection_name === 'portal_users' && log.action === 'CREATE') foundCreate = true;
            if (log.collection_name === 'portal_users' && log.action === 'UPDATE') {
                foundUpdate = true;
                console.log(`   - Diff recorded: ${log.details}`);
            }
            if (log.collection_name === 'portal_users' && log.action === 'DELETE') foundDelete = true;
        }

        if (foundCreate && foundUpdate && foundDelete) {
            console.log("✅ Audit logs successfully captured CREATE, UPDATE, and DELETE actions.");
        } else {
            console.error("❌ ERROR: Missing some audit logs:", { foundCreate, foundUpdate, foundDelete });
        }


    } catch (err) {
        console.error("Test framework error:", err.message);
    }
}

runTest();
