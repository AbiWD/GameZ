import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Home, Calendar, CreditCard } from "lucide-react";
import { pb } from "@/lib/pocketbase";
import { formatDateIST } from "@/lib/dateUtils";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PaymentStatus = () => {
  const [searchParams] = useSearchParams();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const orderId = searchParams.get("orderId");
  const status = searchParams.get("status");

  useEffect(() => {
    const fetchAndVerifyPayment = async () => {
      if (!orderId) {
        // Check if this is a user-initiated cancellation based on status param
        if (status === "CANCELLED" || status === "USER_CANCELLED") {
          setError("CANCELLED");
        } else if (status === "FAILED") {
          setError("FAILED");
        } else {
          setError("NO_ORDER_ID");
        }
        setLoading(false);
        return;
      }

      try {
        // Fetch booking from PocketBase
        let initialBooking;
        try {
          initialBooking = await pb.collection("bookings").getFirstListItem(`merchant_order_id="${orderId}"`);
        } catch (fetchError) {
          console.error("Error fetching booking:", fetchError);
          setError("Could not find booking details");
          setLoading(false);
          return;
        }

        // Note: PhonePe Edge Function check bypassed for PocketBase migration
        setBooking(initialBooking);
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchAndVerifyPayment();
  }, [orderId, status]);

  const getStatusDisplay = () => {
    if (booking?.payment_status === "paid" || booking?.payment_status === "partial") {
      return {
        icon: <CheckCircle className="w-16 h-16 text-green-500" />,
        title: "Payment Successful!",
        description: booking.payment_status === "partial" 
          ? "Your advance payment has been received. Remaining balance is due at check-in."
          : "Your full payment has been received. Your booking is confirmed!",
        color: "text-green-600",
        bgColor: "bg-green-50",
      };
    } else if (status === "FAILED" || booking?.payment_status === "failed") {
      return {
        icon: <XCircle className="w-16 h-16 text-red-500" />,
        title: "Payment Failed",
        description: "Your payment could not be processed. Please try again or contact support.",
        color: "text-red-600",
        bgColor: "bg-red-50",
      };
    } else {
      return {
        icon: <Clock className="w-16 h-16 text-yellow-500" />,
        title: "Payment Processing",
        description: "Your payment is being processed. Please wait a moment...",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
      };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 py-20 px-4">
        <div className="container mx-auto max-w-xl">
          <Card className="shadow-lg">
            <CardContent className="p-8">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading payment status...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  {error === "CANCELLED" ? (
                    <>
                      <div className="inline-flex p-6 rounded-full bg-orange-50 mb-6">
                        <XCircle className="w-16 h-16 text-orange-500" />
                      </div>
                      <h2 className="text-xl font-semibold mb-2 text-orange-600">Payment Cancelled</h2>
                      <p className="text-muted-foreground mb-6">
                        You have cancelled the payment transaction. No amount has been deducted from your account.
                      </p>
                    </>
                  ) : error === "FAILED" ? (
                    <>
                      <div className="inline-flex p-6 rounded-full bg-red-50 mb-6">
                        <XCircle className="w-16 h-16 text-red-500" />
                      </div>
                      <h2 className="text-xl font-semibold mb-2 text-red-600">Payment Failed</h2>
                      <p className="text-muted-foreground mb-6">
                        Your payment could not be processed. Please try again.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="inline-flex p-6 rounded-full bg-red-50 mb-6">
                        <XCircle className="w-16 h-16 text-red-500" />
                      </div>
                      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
                      <p className="text-muted-foreground mb-6">
                        The payment session could not be verified. Please try booking again.
                      </p>
                    </>
                  )}
                  <Link to="/#booking">
                    <Button className="bg-gradient-tropical text-primary-foreground">
                      Try Booking Again
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="text-center">
                  <div className={`inline-flex p-6 rounded-full ${statusDisplay.bgColor} mb-6`}>
                    {statusDisplay.icon}
                  </div>
                  
                  <h1 className={`text-2xl font-bold mb-2 ${statusDisplay.color}`}>
                    {statusDisplay.title}
                  </h1>
                  <p className="text-muted-foreground mb-8">
                    {statusDisplay.description}
                  </p>

                  {booking && (
                    <div className="bg-muted/50 rounded-lg p-6 text-left space-y-4 mb-6">
                      <div>
                        <p className="text-sm text-muted-foreground">Booking Reference</p>
                        <p className="font-mono font-semibold text-primary text-lg">
                          {booking.booking_reference}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Guest Name</p>
                        <p className="font-medium">{booking.name}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Room Type</p>
                        <p className="font-medium">{booking.room_type}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Check-in</p>
                          <p className="font-medium">{formatDateIST(booking.check_in)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Check-out</p>
                          <p className="font-medium">{formatDateIST(booking.check_out)}</p>
                        </div>
                      </div>

                      <div className="border-t pt-4 mt-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-muted-foreground">Total Amount</span>
                          <span className="font-semibold">₹{booking.price}</span>
                        </div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <CreditCard className="w-4 h-4" /> Amount Paid
                          </span>
                          <span className="font-semibold text-green-600">₹{booking.amount_paid || 0}</span>
                        </div>
                        {(booking.price - (booking.amount_paid || 0)) > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Balance Due at Check-in</span>
                            <span className="font-semibold text-orange-600">
                              ₹{booking.price - (booking.amount_paid || 0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link to="/" className="flex-1">
                      <Button variant="outline" className="w-full">
                        <Home className="w-4 h-4 mr-2" />
                        Back to Home
                      </Button>
                    </Link>
                    <Link to="/check-booking" className="flex-1">
                      <Button className="w-full bg-gradient-tropical text-primary-foreground">
                        <Calendar className="w-4 h-4 mr-2" />
                        View Booking
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentStatus;
