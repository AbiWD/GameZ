import { useState } from "react";
import { Link } from "react-router-dom";
import { pb } from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Search, Calendar, Users, CreditCard, Home } from "lucide-react";
import { formatDateIST } from "@/lib/dateUtils";

interface BookingDetails {
  booking_reference: string;
  name: string;
  email: string;
  phone: string;
  room_type: string;
  price: number;
  check_in: string;
  check_out: string;
  guests: number;
  status: string | null;
  payment_status: string | null;
  created_at: string;
}

const CheckBooking = () => {
  const [bookingRef, setBookingRef] = useState("");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(value);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBooking(null);

    if (!bookingRef.trim()) {
      setError("Please enter your Booking Reference (e.g., DH-0001)");
      return;
    }

    if (phone.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = `+91${phone}`;
      
      try {
        const data = await pb.collection("bookings").getFirstListItem(`booking_reference="${bookingRef.trim().toUpperCase()}" && phone="${formattedPhone}"`);
        setBooking(data as any);
      } catch (dbError) {
        console.error("Database error or not found:", dbError);
        setError("No booking found with this reference and phone number. Please check your details.");
        return;
      }
    } catch (err) {
      console.error("Error fetching booking:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "confirmed":
        return "text-green-600 bg-green-100";
      case "cancelled":
        return "text-red-600 bg-red-100";
      default:
        return "text-yellow-600 bg-yellow-100";
    }
  };

  const getPaymentStatusColor = (status: string | null) => {
    switch (status) {
      case "paid":
        return "text-green-600 bg-green-100";
      case "partial":
        return "text-blue-600 bg-blue-100";
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-yellow-600 bg-yellow-100";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary/10 py-8">
        <div className="container mx-auto px-4">
          <Link to="/" className="inline-flex items-center text-primary hover:underline mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
            Check Booking Status
          </h1>
          <p className="text-muted-foreground mt-2">
            Enter your booking details to view your reservation status
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto">
          {/* Search Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Find Your Booking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <Label htmlFor="bookingRef">Booking Reference</Label>
                  <Input
                    id="bookingRef"
                    type="text"
                    placeholder="e.g., DH-0048"
                    value={bookingRef}
                    onChange={(e) => setBookingRef(e.target.value)}
                    className="mt-1 uppercase"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex mt-1">
                    <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-muted-foreground text-sm">
                      +91
                    </span>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter 10-digit number"
                      value={phone}
                      onChange={handlePhoneChange}
                      className="rounded-l-none"
                      maxLength={10}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-destructive text-sm">{error}</p>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Searching..." : "Check Booking"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Booking Details */}
          {booking && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Booking Found!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Booking Reference */}
                <div className="p-3 bg-muted rounded-lg">
                 <p className="text-xs text-muted-foreground">Booking Reference</p>
                  <p className="font-mono text-lg font-semibold text-primary">{booking.booking_reference}</p>
                </div>

                {/* Guest Info */}
                <div>
                  <h3 className="font-semibold mb-2">Guest Details</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> {booking.name}</p>
                    <p><span className="text-muted-foreground">Email:</span> {booking.email}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {booking.phone}</p>
                  </div>
                </div>

                {/* Room Info */}
                <div className="flex items-start gap-3">
                  <Home className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Room</h3>
                    <p className="text-sm">{booking.room_type}</p>
                    <p className="text-sm text-muted-foreground">₹{booking.price}/night</p>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Stay Dates</h3>
                    <p className="text-sm">
                      {formatDateIST(booking.check_in)} → {formatDateIST(booking.check_out)}
                    </p>
                  </div>
                </div>

                {/* Guests */}
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-semibold">Guests</h3>
                    <p className="text-sm">{booking.guests} {booking.guests === 1 ? 'Guest' : 'Guests'}</p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Status</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(booking.status)}`}>
                        Booking: {booking.status || 'pending'}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getPaymentStatusColor(booking.payment_status)}`}>
                        Payment: {booking.payment_status || 'pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Booked On */}
                <div className="pt-4 border-t text-xs text-muted-foreground">
                  Booked on: {new Date(booking.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Text */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            Can't find your booking? Contact us at{" "}
            <a href="tel:+919876543210" className="text-primary hover:underline">
              +91 98765 43210
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CheckBooking;
