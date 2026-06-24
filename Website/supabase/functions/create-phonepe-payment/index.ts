import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, amount, customerName, customerEmail, customerPhone, redirectUrl } = await req.json();

    console.log('Creating PhonePe payment for booking:', bookingId);
    const amountInPaise = amount * 100; // Convert rupees to paise
    console.log('Amount:', amount, 'rupees =', amountInPaise, 'paise');

    // Get PhonePe credentials from environment
    const clientId = Deno.env.get('PHONEPE_CLIENT_ID');
    const clientSecret = Deno.env.get('PHONEPE_CLIENT_SECRET');
    const clientVersion = Deno.env.get('PHONEPE_CLIENT_VERSION');
    const merchantId = Deno.env.get('PHONEPE_MERCHANT_ID');

    if (!clientId || !clientSecret || !merchantId) {
      console.error('Missing PhonePe credentials');
      throw new Error('PhonePe configuration missing');
    }

    // Step 1: Get OAuth token
    console.log('Getting PhonePe OAuth token...');
    const authResponse = await fetch('https://api.phonepe.com/apis/identity-manager/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'client_id': clientId,
        'client_version': clientVersion || '1',
        'client_secret': clientSecret,
        'grant_type': 'client_credentials',
      }),
    });

    if (!authResponse.ok) {
      const authError = await authResponse.text();
      console.error('OAuth token error:', authError);
      throw new Error('Failed to get PhonePe access token');
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;
    console.log('Got OAuth token successfully');

    // Step 2: Create payment order
    const merchantOrderId = `DH-${bookingId}-${Date.now()}`;

    // Build redirect URL with merchantOrderId for booking lookup after payment
    const baseRedirectUrl = redirectUrl || 'https://www.dreamhousehomestay.in/payment-status';
    const finalRedirectUrl = `${baseRedirectUrl}${baseRedirectUrl.includes('?') ? '&' : '?'}orderId=${encodeURIComponent(merchantOrderId)}`;
    
    const paymentPayload = {
      merchantOrderId: merchantOrderId,
      amount: amountInPaise, // Amount in paise (100 paise = 1 rupee)
      expireAfter: 1200, // 20 minutes
      metaInfo: {
        udf1: bookingId,
        udf2: customerEmail,
      },
      paymentFlow: {
        type: "PG_CHECKOUT",
        message: `Payment for Dream House Homestay booking`,
        merchantUrls: {
          redirectUrl: finalRedirectUrl,
        },
      },
    };

    console.log('Creating payment order with payload:', JSON.stringify(paymentPayload));

    const paymentResponse = await fetch('https://api.phonepe.com/apis/pg/checkout/v2/pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `O-Bearer ${accessToken}`,
      },
      body: JSON.stringify(paymentPayload),
    });

    const paymentData = await paymentResponse.json();
    console.log('PhonePe payment response:', JSON.stringify(paymentData));

    // PhonePe v2 API returns state: 'PENDING' with redirectUrl on success
    if (!paymentResponse.ok || !paymentData.redirectUrl) {
      throw new Error(paymentData.message || 'Failed to create payment');
    }

    // Update booking with payment details
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_status: 'pending',
        phonepe_order_id: paymentData.orderId,
        merchant_order_id: merchantOrderId,
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      orderId: paymentData.orderId,
      merchantOrderId: merchantOrderId,
      redirectUrl: paymentData.redirectUrl,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in create-phonepe-payment:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
