routerAdd("GET", "/api/test-email", (e) => {
    try {
        const message = new MailerMessage({
            from: {
                address: $app.settings().meta.senderAddress || "noreply@gamez.in",
                name: $app.settings().meta.senderName || "GameZ",
            },
            to: [{address: "test@example.com"}],
            subject: "Test Booking Confirmation",
            html: "<h1>Booking Confirmed</h1><p>Your booking was successful.</p>"
        });
        
        $app.newMailClient().send(message);
        return e.json(200, { success: true });
    } catch(err) {
        return e.json(500, { error: err.message || String(err) });
    }
});
