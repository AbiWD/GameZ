onRecordCreateRequest((e) => {
    const record = e.record;
    if (record.getString('status') === 'cancelled') return e.next();

    const station = record.getString('assigned_station_id');
    const start = record.getString('start_time');
    const end = record.getString('end_time');
    const customer = record.getString('customer_id');
    
    if (!station || !start || !end) return e.next();

    // 1. Limit to 1 active hold per user
    if (customer && record.getString('status') === 'pending') {
        const userHolds = $app.findRecordsByFilter("bookings", `customer_id = '${customer}' && status = 'pending' && expires_at > @now`, "", 1, 0);
        if (userHolds && userHolds.length > 0) {
            throw new BadRequestError("You already have an active hold on a station. Please finish or cancel that booking first.");
        }
    }

    // 2. Lazy Cleanup for this exact slot
    try {
        const staleOverlaps = $app.findRecordsByFilter("bookings", `assigned_station_id = '${station}' && status = 'pending' && expires_at <= @now && start_time < '${end}' && end_time > '${start}'`, "", 100, 0);
        for (let stale of staleOverlaps) {
            $app.delete(stale);
            console.log("Lazy cleanup deleted stale hold:", stale.id);
        }
    } catch(err) {
        console.log("Lazy cleanup error:", err);
    }

    // 3. Overlap Check (in case there's a confirmed booking or active hold)
    const overlapFilter = `assigned_station_id = '${station}' && status != 'cancelled' && (status != 'pending' || expires_at > @now) && start_time < '${end}' && end_time > '${start}'`;
    
    try {
        const overlaps = $app.findRecordsByFilter("bookings", overlapFilter, "", 1, 0);
        if (overlaps && overlaps.length > 0) {
            throw new BadRequestError("This station is already booked or held for the selected time period.");
        }
    } catch(err) {
        if (err.message && err.message.includes("booked or held")) {
            throw err;
        }
        console.log("Hook overlap check error:", err);
    }
    
    return e.next();
}, "bookings");

onRecordUpdateRequest((e) => {
    const record = e.record;
    if (record.getString('status') === 'cancelled') return e.next();

    const station = record.getString('assigned_station_id');
    const start = record.getString('start_time');
    const end = record.getString('end_time');
    if (!station || !start || !end) return e.next();

    const oldRecord = $app.findRecordById("bookings", record.id);
    const isConfirming = oldRecord.getString("status") === "pending" && record.getString("status") === "confirmed";
    
    // Overlap Check (excluding self)
    const overlapFilter = `assigned_station_id = '${station}' && status != 'cancelled' && (status != 'pending' || expires_at > @now) && start_time < '${end}' && end_time > '${start}' && id != '${record.id}'`;
    
    try {
        const overlaps = $app.findRecordsByFilter("bookings", overlapFilter, "", 1, 0);
        if (overlaps && overlaps.length > 0) {
            throw new BadRequestError("This station is already booked or held for the selected time period.");
        }
    } catch(err) {
        if (err.message && err.message.includes("booked or held")) {
            throw err;
        }
        console.log("Hook overlap check error:", err);
    }

    e.next(); // Continue with the update

    // Email logic post-success
    if (isConfirming) {
        const email = record.getString('email');
        if (!email || email === 'guest@gamez.local') return;

        try {
            const message = new MailerMessage({
                from: {
                    address: $app.settings().meta.senderAddress || "noreply@gamez.in",
                    name: $app.settings().meta.senderName || "GameZ",
                },
                to: [{address: email}],
                subject: "Your GameZ Booking Confirmation",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>Booking Confirmed!</h2>
                        <p>Hi ${record.getString('name') || 'Gamer'},</p>
                        <p>Your booking has been successfully confirmed. Here are the details:</p>
                        <ul>
                            <li><strong>Start Time:</strong> ${new Date(record.getString('start_time')).toLocaleString()}</li>
                            <li><strong>End Time:</strong> ${new Date(record.getString('end_time')).toLocaleString()}</li>
                            <li><strong>Total Price:</strong> ₹${record.getFloat('total_price')}</li>
                        </ul>
                        <p>Thank you for choosing GameZ. We look forward to seeing you!</p>
                    </div>
                `
            });
            
            $app.newMailClient().send(message);
            console.log("Sent booking confirmation email to:", email);
        } catch(err) {
            console.log("Could not send email (SMTP likely not configured):", err);
        }
    }
}, "bookings");
