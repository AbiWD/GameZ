import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BookingEmailRequest {
  bookingReference: string;
  guestName: string;
  email: string;
  phone: string;
  roomType: string;
  totalAmount: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  amountPaid?: number;
  balanceDue?: number;
  message?: string;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const getPaymentMessage = (amountPaid?: number, balanceDue?: number): string => {
  if (balanceDue === 0 || (amountPaid && amountPaid > 0 && balanceDue === 0)) {
    return `✅ <strong>Full payment received - Thank you!</strong>`;
  } else if (amountPaid && amountPaid > 0 && balanceDue && balanceDue > 0) {
    return `💳 <strong>Advance payment of ₹${amountPaid.toLocaleString('en-IN')} received.</strong><br>Balance of ₹${balanceDue.toLocaleString('en-IN')} to be paid at check-in.`;
  } else {
    return `💳 <strong>Payment will be collected at the property upon check-in</strong>`;
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bookingData: BookingEmailRequest = await req.json();
    console.log("Received booking data:", bookingData);

    const {
      bookingReference,
      guestName,
      email,
      phone,
      roomType,
      totalAmount,
      checkIn,
      checkOut,
      guests,
      amountPaid,
      balanceDue,
      message,
    } = bookingData;

  const paymentMessage = getPaymentMessage(amountPaid, balanceDue);
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation - Dream House Homestay</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #2d5a27 0%, #4a7c59 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🏡 Dream House Homestay</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Your Tropical Retreat Awaits</p>
    </div>
    
    <!-- Success Banner -->
    <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 20px 30px; margin: 0;">
      <h2 style="color: #155724; margin: 0; font-size: 22px;">✅ Booking Confirmed!</h2>
     <p style="color: #155724; margin: 10px 0 0 0;">Thank you for choosing Dream House Homestay, ${guestName}!</p>
    </div>
    
    <!-- Booking Reference -->
    <div style="background-color: #fff3cd; padding: 20px 30px; text-align: center; border-bottom: 1px solid #e9ecef;">
      <p style="margin: 0; color: #856404; font-size: 14px;">Your Booking Reference</p>
      <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: bold; color: #2d5a27; font-family: monospace; letter-spacing: 2px;">${bookingReference}</p>
    </div>
    
    <!-- Booking Details -->
    <div style="padding: 30px;">
      <h3 style="color: #2d5a27; margin: 0 0 20px 0; font-size: 18px; border-bottom: 2px solid #2d5a27; padding-bottom: 10px;">📋 Booking Details</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #6c757d; width: 40%;">Guest Name</td>
         <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #212529; font-weight: 500;">${guestName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #6c757d;">Phone</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #212529; font-weight: 500;">${phone}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #6c757d;">Room Type</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #212529; font-weight: 500;">${roomType}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #6c757d;">Check-in</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #212529; font-weight: 500;">📅 ${formatDate(checkIn)}<br><span style="color: #6c757d; font-size: 13px;">From 12:00 PM</span></td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #6c757d;">Check-out</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #212529; font-weight: 500;">📅 ${formatDate(checkOut)}<br><span style="color: #6c757d; font-size: 13px;">By 1:00 PM</span></td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #6c757d;">Number of Guests</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #212529; font-weight: 500;">👥 ${guests} Guest${guests > 1 ? 's' : ''}</td>
        </tr>
        ${message ? `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #6c757d;">Special Requests</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #212529;">${message}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <!-- Payment Summary -->
    <div style="padding: 0 30px 30px 30px;">
      <h3 style="color: #2d5a27; margin: 0 0 20px 0; font-size: 18px; border-bottom: 2px solid #2d5a27; padding-bottom: 10px;">💰 Payment Summary</h3>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #6c757d; width: 40%;">Total Amount</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #212529; font-weight: bold; font-size: 18px;">₹${totalAmount?.toLocaleString('en-IN') || '0'}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #6c757d;">Amount Paid</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #28a745; font-weight: 500;">₹${(amountPaid || 0).toLocaleString('en-IN')}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #6c757d;">Balance Due</td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: ${(balanceDue || 0) > 0 ? '#dc3545' : '#28a745'}; font-weight: bold; font-size: 18px;">₹${(balanceDue || totalAmount || 0).toLocaleString('en-IN')}</td>
        </tr>
      </table>
    </div>
    
    <!-- Payment Notice -->
    <div style="background-color: #e7f3ff; padding: 20px 30px; margin: 0 30px; border-radius: 8px; text-align: center;">
      <p style="margin: 0; color: #004085; font-size: 15px;">${paymentMessage}</p>
    </div>
    
    <!-- Check Booking Button -->
    <div style="padding: 30px; text-align: center;">
      <a href="https://dreamhousehomestay.in/check-booking" style="display: inline-block; background: linear-gradient(135deg, #2d5a27 0%, #4a7c59 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Check Your Booking Status</a>
    </div>
    
    <!-- Contact Information -->
    <div style="background-color: #f8f9fa; padding: 25px 30px; text-align: center;">
      <h4 style="color: #2d5a27; margin: 0 0 15px 0;">Need Assistance?</h4>
      <p style="margin: 5px 0; color: #495057;">📞 Phone: <a href="tel:+918317309867" style="color: #2d5a27; text-decoration: none;">+91 83173 09867</a></p>
      <p style="margin: 5px 0; color: #495057;">✉️ Email: <a href="mailto:admin@dreamhousehomestay.in" style="color: #2d5a27; text-decoration: none;">admin@dreamhousehomestay.in</a></p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #2d5a27; padding: 20px 30px; text-align: center;">
      <p style="margin: 0; color: rgba(255,255,255,0.8); font-size: 13px;">© ${new Date().getFullYear()} Dream House Homestay. All rights reserved.</p>
      <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.6); font-size: 12px;">Karkala, Karnataka, India</p>
    </div>
  </div>
</body>
</html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Dhanush Homestay <onboarding@resend.dev>",
        to: [email],
        subject: `Booking Confirmed - ${bookingReference} | Dream House Homestay`,
        html: emailHtml,
      }),
    });

    const emailResponse = await res.json();
    
    if (!res.ok) {
      console.error("Resend API error:", emailResponse);
      throw new Error(emailResponse.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-booking-confirmation function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
