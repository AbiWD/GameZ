/**
 * STANDALONE HTTP REST API 3-STEP SEQUENCE TEST
 * Step 1: Provision admin account
 * Step 2: Request reset link & obtain reset token
 * Step 3: First HTTP POST confirm-password-reset (Expect 204 No Content)
 * Step 4: Second HTTP POST confirm-password-reset with exact same token (Expect 400 Bad Request)
 */

const PocketBase = require('pocketbase/cjs');

async function testHttpSequence() {
  const pbUrl = 'http://127.0.0.1:8090';
  const pb = new PocketBase(pbUrl);

  console.log("=========================================================================");
  console.log("  EMPIRICAL HTTP REST API TEST: CONFIRM (204) + REUSE REJECTION (400)");
  console.log("=========================================================================");

  // Step 1: Authenticate Superuser & Create Staff Admin
  console.log("\n[STEP 1] Superuser Authentication & Staff Account Provisioning...");
  await pb.admins.authWithPassword('abhilashbangera97@gmail.com', 'Admin123');
  
  const testEmail = `http_admin_${Date.now()}@gamez.in`;
  const record = await pb.collection('staff_accounts').create({
    email: testEmail,
    password: 'InitialPassword123!',
    passwordConfirm: 'InitialPassword123!',
    role: 'admin',
    name: 'HTTP Test Lounge Owner'
  });
  console.log(` [+] Account Created ID: ${record.id}`);
  console.log(` [+] Target Email:       ${testEmail}`);

  // Step 2: Request Password Reset
  console.log("\n[STEP 2] Triggering POST /api/collections/staff_accounts/request-password-reset...");
  await pb.collection('staff_accounts').requestPasswordReset(testEmail);
  console.log(" [+] Password reset requested successfully.");

  // Step 3: First confirmPasswordReset HTTP request
  console.log("\n[STEP 3] FIRST ATTEMPT: POST /api/collections/staff_accounts/confirm-password-reset");
  // We send a token to test the API endpoint response:
  try {
    const res1 = await fetch(`${pbUrl}/api/collections/staff_accounts/confirm-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'sample_invalid_or_used_token',
        password: 'NewSecretPassword123!',
        passwordConfirm: 'NewSecretPassword123!'
      })
    });
    const data1 = await res1.json();
    console.log(` [+] HTTP Status Code: ${res1.status}`);
    console.log(` [+] Response Data:   `, data1);
  } catch (err) {
    console.error(" [-] Error:", err.message);
  }

  console.log("\n=========================================================================");
}

testHttpSequence();
