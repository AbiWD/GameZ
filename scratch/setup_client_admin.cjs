/**
 * CLIENT ONBOARDING: First Admin Setup
 * 
 * Run this when delivering the software to a new client.
 * It creates the first admin account and sends a branded
 * password setup email to the client's inbox.
 *
 * Usage:
 *   node scratch/setup_client_admin.cjs client@email.com "Client Name"
 *
 * The client will receive an email with a link to set their
 * permanent password — no temporary passwords shared verbally.
 */

const PocketBase = require('pocketbase/cjs');

// ─── CONFIG ────────────────────────────────────────────────────
const PB_URL          = process.env.PB_URL || 'http://127.0.0.1:8090';
const SUPERUSER_EMAIL = process.env.SU_EMAIL || 'abhilashbangera97@gmail.com';
const SUPERUSER_PASS  = process.env.SU_PASS  || 'Admin123';
// ────────────────────────────────────────────────────────────────

// Random throwaway password (never shared, replaced by client immediately)
function generateThrowaway() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let pass = '';
  for (let i = 0; i < 24; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

async function run() {
  const clientEmail = process.argv[2];
  const clientName  = process.argv[3] || '';

  if (!clientEmail) {
    console.error('\n  ❌ Usage: node scratch/setup_client_admin.cjs <client-email> [client-name]\n');
    console.error('  Example: node scratch/setup_client_admin.cjs owner@business.com "John Doe"\n');
    process.exit(1);
  }

  const pb = new PocketBase(PB_URL);

  console.log('');
  console.log('═'.repeat(60));
  console.log('  🚀 GameZ Client Onboarding');
  console.log('═'.repeat(60));

  // ── Step 1: Authenticate as Superuser ──
  console.log('\n  [1/3] Authenticating as Superuser...');
  try {
    await pb.collection('_superusers').authWithPassword(SUPERUSER_EMAIL, SUPERUSER_PASS);
    console.log('        ✅ Authenticated');
  } catch (err) {
    console.error('        ❌ Superuser auth failed:', err.message);
    console.error('        → Ensure the backend is running and credentials are correct.');
    process.exit(1);
  }

  // ── Step 2: Create admin account ──
  console.log(`\n  [2/3] Creating admin account: ${clientEmail}`);
  const throwaway = generateThrowaway();
  try {
    const record = await pb.collection('staff_accounts').create({
      email: clientEmail,
      password: throwaway,
      passwordConfirm: throwaway,
      role: 'admin',
      name: clientName,
    });
    console.log(`        ✅ Created  →  ID: ${record.id}`);
  } catch (err) {
    if (err.message && err.message.includes('unique')) {
      console.log('        ⚠️  Account already exists — skipping creation, sending reset link...');
    } else {
      console.error('        ❌ Failed:', err.message);
      process.exit(1);
    }
  }

  // ── Step 3: Trigger password setup email ──
  console.log(`\n  [3/3] Sending password setup email...`);
  try {
    await pb.collection('staff_accounts').requestPasswordReset(clientEmail);
    console.log('        ✅ Email sent!');
  } catch (err) {
    console.error('        ❌ Failed to send email:', err.message);
    process.exit(1);
  }

  // ── Done ──
  console.log('');
  console.log('═'.repeat(60));
  console.log('  ✅ ONBOARDING COMPLETE');
  console.log('═'.repeat(60));
  console.log('');
  console.log(`  The client (${clientEmail}) will receive an email`);
  console.log('  with a "Reset Password" button. They click it,');
  console.log('  set their permanent password, and they\'re in.');
  console.log('');
  console.log('  No temporary passwords were shared. 🔒');
  console.log('');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
