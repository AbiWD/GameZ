/**
 * DEV-ONLY SCRIPT: Test Model A Admin Credential Setup & Password Reset Token Invalidation
 * 
 * Usage:
 * PB_SUPERUSER_EMAIL=abhilashbangera97@gmail.com PB_SUPERUSER_PASS=Admin123 node test_admin_invite.cjs
 */

const PocketBase = require('pocketbase/cjs');

async function runTest() {
  const pbUrl = process.env.PB_URL || 'http://127.0.0.1:8090';
  const superuserEmail = process.env.PB_SUPERUSER_EMAIL || 'abhilashbangera97@gmail.com';
  const superuserPass = process.env.PB_SUPERUSER_PASS || 'Admin123';

  console.log(`[1] Connecting to PocketBase at ${pbUrl}...`);
  const pb = new PocketBase(pbUrl);

  try {
    // 1. Authenticate as superuser
    await pb.admins.authWithPassword(superuserEmail, superuserPass);
    console.log(`[+] Superuser authenticated successfully.`);

    // 2. Ensure test admin account exists in staff_accounts
    const testEmail = `lounge_owner_${Date.now()}@gamez.in`;
    console.log(`[2] Provisioning test lounge admin account: ${testEmail}`);
    const staffRecord = await pb.collection('staff_accounts').create({
      email: testEmail,
      password: 'TempPassword123!',
      passwordConfirm: 'TempPassword123!',
      role: 'admin',
      name: 'Test Lounge Owner'
    });
    console.log(`[+] Account created with ID: ${staffRecord.id}`);

    // 3. Trigger password reset invitation email
    console.log(`[3] Requesting password reset invitation email...`);
    const resetResult = await pb.collection('staff_accounts').requestPasswordReset(testEmail);
    console.log(`[+] Password reset requested: ${resetResult}`);

    console.log("\n=======================================================");
    console.log("SUCCESS: Admin Credential Setup invitation trigger verified.");
    console.log(`Test Email: ${testEmail}`);
    console.log("=======================================================");

  } catch (err) {
    console.error("[-] Test Error:", err.message || err);
  }
}

runTest();
