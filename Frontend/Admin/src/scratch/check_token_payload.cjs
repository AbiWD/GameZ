const PocketBase = require('pocketbase/cjs');

async function inspectToken() {
  const pb = new PocketBase('http://127.0.0.1:8090');
  
  try {
    // Authenticate as superuser to trigger a password reset for testing
    await pb.admins.authWithPassword('abhilashbangera97@gmail.com', 'Admin123');
    
    // Trigger reset for admin@gamez.in
    const res = await pb.collection('staff_accounts').requestPasswordReset('admin@gamez.in');
    console.log("Password reset requested:", res);
  } catch (err) {
    console.error("Error inspecting token:", err);
  }
}

inspectToken();
