import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { merchantOrderId } = await req.json();
    
    if (!merchantOrderId) {
      return new Response(
        JSON.stringify({ error: "merchantOrderId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Checking payment status for:", merchantOrderId);

    // Get PhonePe credentials
    const clientId = Deno.env.get("PHONEPE_CLIENT_ID");
    const clientSecret = Deno.env.get("PHONEPE_CLIENT_SECRET");
    const clientVersion = Deno.env.get("PHONEPE_CLIENT_VERSION") || "1";
    const merchantId = Deno.env.get("PHONEPE_MERCHANT_ID");

    if (!clientId || !clientSecret || !merchantId) {
      throw new Error("PhonePe credentials not configured");
    }

    // Step 1: Get OAuth token
    console.log("Getting OAuth token...");
    const tokenResponse = await fetch("https://api.phonepe.com/apis/identity-manager/v1/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_version: clientVersion,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Failed to get OAuth token:", tokenData);
      throw new Error("Failed to get OAuth token");
    }

    const accessToken = tokenData.access_token;
    console.log("OAuth token obtained successfully");

    // Step 2: Check order status
    const statusUrl = `https://api.phonepe.com/apis/pg/checkout/v2/order/${merchantOrderId}/status?details=true`;
    console.log("Checking order status at:", statusUrl);

    const statusResponse = await fetch(statusUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `O-Bearer ${accessToken}`,
      },
    });

    const statusData = await statusResponse.json();
    console.log("PhonePe order status response:", JSON.stringify(statusData, null, 2));

    if (!statusResponse.ok) {
      console.error("Failed to get order status:", statusData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to get order status",
          details: statusData 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Update booking if payment is completed
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const orderState = statusData.state;
    const paymentDetails = statusData.paymentDetails?.[0];
    
    console.log("Order state:", orderState);
    console.log("Payment details:", paymentDetails);

    let updateData: any = {};
    let shouldUpdate = false;

    if (orderState === "COMPLETED" && paymentDetails?.state === "COMPLETED") {
      const amountPaid = paymentDetails.amount ? Math.round(paymentDetails.amount / 100) : 0;
      const transactionId = paymentDetails.transactionId;

      // Fetch booking to get total price for partial payment check
      const { data: existingBooking } = await supabaseClient
        .from("bookings")
        .select("price")
        .eq("merchant_order_id", merchantOrderId)
        .single();
      
      const bookingPrice = existingBooking?.price || 0;
      const isFullPayment = amountPaid >= bookingPrice;
      
      updateData = {
        payment_status: amountPaid >= bookingPrice ? "paid" : "partial",
        amount_paid: amountPaid,
        phonepe_transaction_id: transactionId,
        payment_completed_at: new Date().toISOString(),
        status: "confirmed",
      };
      shouldUpdate = true;
      console.log("Payment completed. Amount paid:", amountPaid, "Total price:", bookingPrice, "Status:", isFullPayment ? "paid" : "partial");
    } else if (orderState === "FAILED") {
      updateData = {
        payment_status: "failed",
      };
      shouldUpdate = true;
      console.log("Payment failed");
    }

    let booking = null;

    if (shouldUpdate) {
      // Update the booking
      const { data, error: updateError } = await supabaseClient
        .from("bookings")
        .update(updateData)
        .eq("merchant_order_id", merchantOrderId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating booking:", updateError);
      } else {
        booking = data;
        console.log("Booking updated successfully:", booking?.booking_reference);

        // Send confirmation email if payment completed
        if (orderState === "COMPLETED" && booking) {
          try {
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-booking-confirmation`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                bookingReference: booking.booking_reference,
                guestName: booking.name,
                email: booking.email,
                phone: booking.phone,
                roomType: booking.room_type,
                checkIn: booking.check_in,
                checkOut: booking.check_out,
                guests: booking.guests,
                totalAmount: booking.price,
                amountPaid: booking.amount_paid,
                balanceDue: booking.price - booking.amount_paid,
              }),
            });
            console.log("Confirmation email sent:", emailResponse.ok);
          } catch (emailError) {
            console.error("Error sending confirmation email:", emailError);
          }
        }
      }
    } else {
      // Just fetch current booking state
      const { data } = await supabaseClient
        .from("bookings")
        .select()
        .eq("merchant_order_id", merchantOrderId)
        .single();
      booking = data;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        orderState,
        paymentStatus: updateData.payment_status || booking?.payment_status,
        booking,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in check-payment-status:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
