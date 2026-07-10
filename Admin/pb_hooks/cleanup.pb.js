cronAdd("cleanup_pending_bookings", "*/1 * * * *", () => {
    // Delete pending bookings where expires_at is older than (now - 30 seconds grace period)
    try {
        const result = $app.db().newQuery("DELETE FROM bookings WHERE status = 'pending' AND expires_at <= datetime('now', '-30 seconds')").execute();
        if (result.rowsAffected() > 0) {
            console.log(`Cron: Cleaned up ${result.rowsAffected()} expired pending bookings.`);
        }
    } catch(err) {
        console.log("Cron cleanup error:", err);
    }
});
