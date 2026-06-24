import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  console.log('PhonePe webhook received');
  console.log('Method:', req.method);
  
  // Handle only POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Verify Basic Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      console.error('Missing or invalid Authorization header');
      return new Response('Unauthorized', { status: 401 });
    }

    const base64Credentials = authHeader.substring(6);
    const credentials = atob(base64Credentials);
    const [username, password] = credentials.split(':');

    const expectedUsername = Deno.env.get('PHONEPE_WEBHOOK_USERNAME');
    const expectedPassword = Deno.env.get('PHONEPE_WEBHOOK_PASSWORD');

    if (username !== expectedUsername || password !== expectedPassword) {
      console.error('Invalid credentials');
      return new Response('Unauthorized', { status: 401 });
    }

    console.log('Authentication successful');

    // Parse webhook payload
    const payload = await req.json();
    console.log('Webhook payload:', JSON.stringify(payload));

    const eventType = payload.type;
    const data = payload.payload;

    console.log('Event type:', eventType);

    // Handle pg.order.completed event
    if (eventType === 'pg.order.completed') {
      const orderId = data.orderId;
      const merchantOrderId = data.merchantOrderId;
      const state = data.state;
      const amount = data.amount;

      console.log('Processing order completion:', {
        orderId,
        merchantOrderId,
        state,
        amount,
      });

      // Initialize Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Find the booking first to get total price
      const { data: booking, error: findError } = await supabase
        .from('bookings')
        .select('*')
        .or(`phonepe_order_id.eq.${orderId},merchant_order_id.eq.${merchantOrderId}`)
        .single();

      if (findError || !booking) {
        console.error('Booking not found:', findError);
        // Return 200 to acknowledge receipt even if booking not found
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.log('Found booking:', booking.id, booking.booking_reference);

      // Determine payment status based on state and amount
      let paymentStatus = 'pending';
      const amountPaid = amount ? Math.round(amount / 100) : 0;
      
      if (state === 'COMPLETED') {
        // Check if full or partial payment
        paymentStatus = amountPaid >= booking.price ? 'paid' : 'partial';
      } else if (state === 'FAILED') {
        paymentStatus = 'failed';
      }

      console.log('Payment status:', paymentStatus, 'Amount paid:', amountPaid, 'Total price:', booking.price);
      
      // Update booking payment status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          payment_status: paymentStatus,
          amount_paid: amountPaid,
          phonepe_order_id: orderId,
          phonepe_transaction_id: data.transactionId || null,
          payment_completed_at: paymentStatus !== 'pending' && paymentStatus !== 'failed' ? new Date().toISOString() : null,
        })
        .eq('id', booking.id);

      if (updateError) {
        console.error('Error updating booking:', updateError);
      } else {
        console.log('Booking updated successfully with payment status:', paymentStatus);
      }

      // If payment successful, send confirmation email
      if (paymentStatus === 'paid') {
        try {
          console.log('Sending confirmation email...');
          await fetch(`${supabaseUrl}/functions/v1/send-booking-confirmation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              name: booking.name,
              email: booking.email,
              phone: booking.phone,
              guests: booking.guests,
              roomType: booking.room_type,
              price: booking.price,
              checkIn: booking.check_in,
              checkOut: booking.check_out,
              specialRequests: booking.message,
              bookingReference: booking.booking_reference,
            }),
          });
          console.log('Confirmation email sent');
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError);
        }
      }
    }

    // Always return 200 to acknowledge receipt
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', error);
    // Return 200 to prevent retries for parsing errors
    return new Response(JSON.stringify({ received: true, error: errorMessage }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
