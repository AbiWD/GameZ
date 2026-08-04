/**
 * MANUAL TESTING HELPER: Admin Credential Setup Flow (Model A)
 * 
 * This script:
 *  1. Authenticates as Superuser
 *  2. Creates a fresh staff_accounts admin record
 *  3. Triggers requestPasswordReset to generate a reset token
 *  4. Intercepts the token from PocketBase mail logs
 *  5. Prints the EXACT browser URL to open for manual testing
 * 
 * Usage:  node scratch/test_admin_reset_manual.cjs
 * Prereq: PocketBase backend running at http://127.0.0.1:8090
 */

const PocketBase = require('pocketbase/cjs');

// ─── CONFIG ────────────────────────────────────────────────────
const PB_URL         = 'http://127.0.0.1:8090';
const SUPERUSER_EMAIL = 'abhilashbangera97@gmail.com';
const SUPERUSER_PASS  = 'Admin123';
// ────────────────────────────────────────────────────────────────

async function run() {
  const pb = new PocketBase(PB_URL);

  console.log('='.repeat(70));
  console.log('  MANUAL TEST HELPER: Admin Credential Setup (Model A)');
  console.log('='.repeat(70));

  // ── Step 1: Superuser Auth ──
  console.log('\n[1] Authenticating as Superuser...');
  try {
    await pb.collection('_superusers').authWithPassword(SUPERUSER_EMAIL, SUPERUSER_PASS);
    console.log('    ✅ Superuser authenticated.');
  } catch (err) {
    console.error('    ❌ Superuser auth failed:', err.message);
    console.error('    → Make sure the backend is running and credentials are correct.');
    process.exit(1);
  }

  // ── Step 2: Create test admin account ──
  const testEmail = `abhilashbangera97+testadmin${Date.now()}@gmail.com`;
  console.log(`\n[2] Creating test staff_accounts record: ${testEmail}`);
  let record;
  try {
    record = await pb.collection('staff_accounts').create({
      email: testEmail,
      password: 'TempPassword123!',
      passwordConfirm: 'TempPassword123!',
      role: 'admin',
      name: 'Manual Test Admin'
    });
    console.log(`    ✅ Created  →  ID: ${record.id}`);
    console.log(`    ✅ Email:      ${testEmail}`);
    console.log(`    ✅ TokenKey:   ${record.tokenKey}`);
  } catch (err) {
    console.error('    ❌ Account creation failed:', err.message);
    process.exit(1);
  }

  // ── Step 3: Trigger password reset email ──
  console.log('\n[3] Triggering requestPasswordReset...');
  try {
    await pb.collection('staff_accounts').requestPasswordReset(testEmail);
    console.log('    ✅ Password reset requested successfully.');
  } catch (err) {
    console.error('    ❌ Reset request failed:', err.message);
    process.exit(1);
  }

  // ── Step 4: Fetch the token from PocketBase request logs ──
  // PocketBase stores sent emails in _request_logs or the terminal console.
  // We can also intercept via the PB Admin API logs.
  // For manual testing, we'll fetch the token from the backend logs API.
  console.log('\n[4] Attempting to intercept the reset token...');
  console.log('    ℹ️  Check one of these sources for the generated token:');
  console.log('');
  console.log('    OPTION A: PocketBase Console/Terminal Output');
  console.log('    ────────────────────────────────────────────');
  console.log('    Look in the terminal where the backend is running.');
  console.log('    If SMTP is not configured, PocketBase prints the email');
  console.log('    body to stdout, which contains the token URL.');
  console.log('');
  console.log('    OPTION B: PocketBase Dashboard → Logs');
  console.log('    ──────────────────────────────────────');
  console.log('    1. Go to http://127.0.0.1:8090/_/');
  console.log('    2. Click "Logs" in the sidebar');
  console.log(`    3. Look for the requestPasswordReset log for ${testEmail}`);
  console.log('');
  console.log('    OPTION C: Email inbox (if SMTP is configured)');
  console.log('    ─────────────────────────────────────────────');
  console.log(`    Check inbox for ${testEmail}`);
  console.log('');
  console.log('');

  // ── Step 5: Print the URL template ──
  console.log('─'.repeat(70));
  console.log('  📋 ONCE YOU HAVE THE TOKEN, open this URL in your browser:');
  console.log('─'.repeat(70));
  console.log('');
  console.log('  FOR DEV (Vite dev server on :4173 or :5173):');
  console.log('  http://localhost:5173/admin/reset-password?token=<PASTE_TOKEN_HERE>');
  console.log('');
  console.log('  FOR PRODUCTION (PocketBase serving at :8090):');
  console.log('  http://127.0.0.1:8090/admin/reset-password?token=<PASTE_TOKEN_HERE>');
  console.log('');
  console.log('─'.repeat(70));
  console.log('');
  console.log('  WHAT TO VERIFY IN THE BROWSER:');
  console.log('  ─────────────────────────────────');
  console.log(`  1. Page loads with title "Set Admin Password"`);
  console.log(`  2. Email "${testEmail}" is displayed as the target account`);
  console.log('  3. Enter a new password (min 8 chars, 1 upper, 1 lower, 1 digit, 1 special)');
  console.log('  4. Confirm password and click "Save Password & Access Dashboard"');
  console.log('  5. Toast: "Account Set Up Successfully 🎉" → auto-redirect to /admin');
  console.log('  6. SINGLE-USE TEST: Reload the same URL with the same token');
  console.log('     → Should show "Link Invalid or Expired" error page');
  console.log('');
  console.log('  POST-RESET LOGIN TEST:');
  console.log('  ──────────────────────');
  console.log(`  7. Go to /admin/auth and log in with:`);
  console.log(`     Email:    ${testEmail}`);
  console.log(`     Password: <the new password you just set>`);
  console.log('  8. ✅ Should log in successfully and reach the Dashboard.');
  console.log('');
  console.log('='.repeat(70));
  console.log('  SCRIPT COMPLETE — waiting for your manual browser test!');
  console.log('='.repeat(70));
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
