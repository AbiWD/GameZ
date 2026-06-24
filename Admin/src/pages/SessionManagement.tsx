import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import pb from "@/lib/pocketbase";
import { format } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import { toast } from "sonner";
import { Calendar, CheckCircle2, LogOut, User, CreditCard, AlertCircle, IndianRupee } from "lucide-react";
import { useProperty } from '@/contexts/PropertyContext';

const safeFormatDate = (dateString: string | null | undefined, formatStr: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return formatInTimeZone(date, 'Asia/Kolkata', formatStr);
};

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  station_type: string;
  guests: number;
  start_time: string;
  end_time: string;
  created: string;
  status: string;
  actual_start_time?: string;
  actual_end_time?: string;
  assigned_station_id?: string;
  id_type?: string;
  id_number?: string;
  payment_status: string;
  amount_paid: number;
  price: number;
  payment_mode?: string;
  stations?: {
    id: string;
    station_number: string;
  };
}

interface Station {
  id: string;
  station_number: string;
  station_type: string;
  status: string;
}

export default function SessionManagement() {
  const { activeProperty } = useProperty();
  const [todaysArrivals, setTodaysArrivals] = useState<Booking[]>([]);
  const [currentGuests, setCurrentGuests] = useState<Booking[]>([]);
  const [todaysDepartures, setTodaysDepartures] = useState<Booking[]>([]);
  const [availableStations, setAvailableStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [startSessionDialog, setCheckInDialog] = useState(false);
  const [endSessionDialog, setCheckOutDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [startSessionForm, setCheckInForm] = useState({
    id_type: "",
    id_number: "",
    assigned_station_id: "",
    payment_mode: "",
    additional_payment: 0,
  });

  useEffect(() => {
    if (activeProperty) {
      fetchData();
    }
  }, [activeProperty]);

  const fetchData = async () => {
    setLoading(true);
    const nowIST = toZonedTime(new Date(), "Asia/Kolkata");
    const today = format(nowIST, "yyyy-MM-dd");

    try {


      // Fetch today's arrivals (start_time >= today start and < today end AND status = 'pending' or 'confirmed')
      // Note: start_time in PB is typically a full datetime string. Using ~ (like) for simplicity, or explicit bounds.
      const arrivalsData = await pb.collection("bookings").getFullList({
        filter: `start_time ~ "${today}" && (status="pending" || status="confirmed") && property_id = "${activeProperty?.id}"`,
        expand: "assigned_station_id"
      });
      // Sort manually by created ascending
      const sortedArrivals = (arrivalsData as unknown as Booking[]).sort((a, b) => {
        return new Date(a.created).getTime() - new Date(b.created).getTime();
      });

      // Fetch current guests (status = 'checked_in')
      const currentData = await pb.collection("bookings").getFullList({
        filter: `status="checked_in" && property_id = "${activeProperty?.id}"`,
        expand: "assigned_station_id"
      });
      // Sort manually by start_time descending
      const sortedCurrent = (currentData as unknown as Booking[]).sort((a, b) => {
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      });

      // Fetch today's departures (end_time = today AND status = 'checked_in')
      const departuresData = await pb.collection("bookings").getFullList({
        filter: `end_time ~ "${today}" && status="checked_in" && property_id = "${activeProperty?.id}"`,
        expand: "assigned_station_id"
      });
      // Sort manually by actual_start_time ascending
      const sortedDepartures = (departuresData as unknown as Booking[]).sort((a, b) => {
        const dateA = a.actual_start_time ? new Date(a.actual_start_time).getTime() : 0;
        const dateB = b.actual_start_time ? new Date(b.actual_start_time).getTime() : 0;
        return dateA - dateB;
      });

      // Fetch available stations
      const stationsData = await pb.collection("stations").getFullList({
        filter: `status="available" && property_id = "${activeProperty?.id}"`,
      });
      // Sort manually by station_number ascending
      const sortedStations = (stationsData as unknown as Station[]).sort((a, b) => {
        return a.station_number.localeCompare(b.station_number);
      });
      
      // Map PocketBase expandable relations to the expected component format
      const mapBooking = (b: any): Booking => ({
        ...b,
        stations: b.expand?.assigned_station_id ? {
          id: b.expand.assigned_station_id.id,
          station_number: b.expand.assigned_station_id.station_number
        } : undefined
      });

      setTodaysArrivals(arrivalsData.map(mapBooking));
      setCurrentGuests(currentData.map(mapBooking));
      setTodaysDepartures(departuresData.map(mapBooking));
      setAvailableStations(stationsData as any);
    } catch (error) {
       console.error("Error fetching data:", error);
       toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const openCheckInDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setCheckInForm({
      id_type: booking.id_type || "",
      id_number: booking.id_number || "",
      assigned_station_id: booking.assigned_station_id || "",
      payment_mode: "",
      additional_payment: 0,
    });
    setCheckInDialog(true);
  };

  const getBalanceDue = (booking: Booking) => {
    return Math.max(0, booking.price - (booking.amount_paid || 0));
  };

  const getTotalPaidAtCheckIn = () => {
    if (!selectedBooking) return 0;
    return (selectedBooking.amount_paid || 0) + (startSessionForm.additional_payment || 0);
  };

  const openCheckOutDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setCheckOutDialog(true);
  };

  const handleCheckIn = async () => {
    if (!selectedBooking) return;

    const totalPaid = getTotalPaidAtCheckIn();
    
    try {
      await pb.collection("bookings").update(selectedBooking.id, {
        status: "checked_in",
        actual_start_time: toZonedTime(new Date(), "Asia/Kolkata").toISOString(),
        id_type: startSessionForm.id_type,
        id_number: startSessionForm.id_number,
        assigned_station_id: startSessionForm.assigned_station_id,
        payment_mode: startSessionForm.additional_payment > 0 ? startSessionForm.payment_mode : selectedBooking.payment_mode,
        amount_paid: totalPaid,
        payment_status: totalPaid >= selectedBooking.price ? "paid" : "partial",
      });

      // Update station status to occupied
      if (startSessionForm.assigned_station_id) {
        await pb.collection("stations").update(startSessionForm.assigned_station_id, { 
          status: "occupied" 
        });
      }

      toast.success("Session started successfully!");
      setCheckInDialog(false);
      fetchData();
    } catch (bookingError) {
      console.error(bookingError);
      toast.error("Failed to start session");
    }
  };

  const handleCheckOut = async () => {
    if (!selectedBooking) return;

    try {
      await pb.collection("bookings").update(selectedBooking.id, {
        status: "checked_out",
        actual_end_time: toZonedTime(new Date(), "Asia/Kolkata").toISOString(),
      });

      // Update station status to available
      if (selectedBooking.assigned_station_id) {
        await pb.collection("stations").update(selectedBooking.assigned_station_id, { 
          status: "available" 
        });
      }

      toast.success("Session ended successfully!");
      setCheckOutDialog(false);
      fetchData();
    } catch (bookingError) {
      console.error(bookingError);
      toast.error("Failed to end session");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Session Management
            </h1>
            <p className="text-muted-foreground mt-1">Manage daily arrivals, departures, and currently staying guests</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Today's Arrivals */}
            <div className="bg-card border border-border rounded-3xl p-5 lg:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-500/10 p-3 rounded-2xl shadow-sm border border-blue-500/20">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  Today's Arrivals ({todaysArrivals.length})
                </h2>
              </div>
              
              {todaysArrivals.length === 0 ? (
                <p className="text-muted-foreground font-medium">No arrivals today</p>
              ) : (
                <div className="space-y-4">
                  {todaysArrivals.map((booking) => {
                    const balanceDue = getBalanceDue(booking);
                    return (
                      <div
                        key={booking.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-secondary/50 hover:bg-secondary rounded-3xl transition-colors gap-4 border border-border shadow-sm"
                      >
                        <div className="space-y-2">
                          <p className="font-bold text-lg text-foreground flex items-center gap-2">
                            <span className="bg-background p-1.5 rounded-xl shadow-sm border border-border"><User className="h-4 w-4 text-primary" /></span>
                            {booking.name}
                          </p>
                          <p className="text-sm font-medium text-muted-foreground">
                            {booking.station_type} • {booking.guests} player(s)
                          </p>
                          <p className="text-sm text-muted-foreground/80">
                            {booking.phone} • {booking.email}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 pt-4 border-t border-border mt-3">
                            <span className="text-sm flex items-center gap-1.5 text-green-700 dark:text-green-400 font-bold">
                              <CreditCard className="h-4 w-4" />
                              Paid Online: ₹{booking.amount_paid || 0}
                            </span>
                            {balanceDue > 0 && (
                              <span className="text-sm flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-bold">
                                <AlertCircle className="h-4 w-4" />
                                Balance to Collect: ₹{balanceDue}
                              </span>
                            )}
                            {balanceDue === 0 && (
                              <span className="text-sm flex items-center gap-1.5 text-green-700 dark:text-green-400 font-bold">
                                <CheckCircle2 className="h-4 w-4" />
                                Fully Paid
                              </span>
                            )}
                          </div>
                        </div>
                        <Button onClick={() => openCheckInDialog(booking)} className="rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 h-auto shrink-0 shadow-sm border-none font-bold text-base">
                          <CheckCircle2 className="mr-2 h-5 w-5" />
                          Start Session
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Currently Staying */}
            <div className="bg-card border border-border rounded-3xl p-5 lg:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-500/10 p-3 rounded-2xl shadow-sm border border-green-500/20">
                  <User className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  Currently Staying ({currentGuests.length})
                </h2>
              </div>
              
              {currentGuests.length === 0 ? (
                <p className="text-muted-foreground font-medium">No guests currently staying</p>
              ) : (
                <div className="space-y-4">
                  {currentGuests.map((booking) => {
                    const balanceDue = getBalanceDue(booking);
                    return (
                      <div
                        key={booking.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-secondary/50 hover:bg-secondary rounded-3xl transition-colors gap-4 border border-border shadow-sm"
                      >
                        <div className="space-y-2">
                          <p className="font-bold text-lg text-foreground">{booking.name}</p>
                          <p className="text-sm font-medium text-muted-foreground">
                            Station: {booking.stations?.station_number || "Not assigned"} • End:{" "}
                            {safeFormatDate(booking.end_time, "MMM dd, yyyy")}
                          </p>
                          <div className="flex items-center gap-4 pt-1">
                            <span className="text-sm font-bold text-muted-foreground">
                              Paid: ₹{booking.amount_paid} / ₹{booking.price}
                            </span>
                            {balanceDue > 0 && (
                              <span className="text-sm text-orange-600 dark:text-orange-400 font-bold">
                                Balance: ₹{balanceDue}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button onClick={() => openCheckOutDialog(booking)} className="rounded-2xl bg-background hover:bg-muted text-foreground border border-border px-8 py-6 h-auto shrink-0 shadow-sm font-bold text-base">
                          <LogOut className="mr-2 h-5 w-5 text-green-600 dark:text-green-400" />
                          End Session
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Today's Departures */}
            <div className="bg-card border border-border rounded-3xl p-5 lg:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-orange-500/10 p-3 rounded-2xl shadow-sm border border-orange-500/20">
                  <LogOut className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  Today's Departures ({todaysDepartures.length})
                </h2>
              </div>
              
              {todaysDepartures.length === 0 ? (
                <p className="text-muted-foreground font-medium">No departures scheduled today</p>
              ) : (
                <div className="space-y-4">
                  {todaysDepartures.map((booking) => {
                    const balanceDue = getBalanceDue(booking);
                    return (
                      <div
                        key={booking.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-secondary/50 hover:bg-secondary rounded-3xl transition-colors gap-4 border border-border shadow-sm"
                      >
                        <div className="space-y-2">
                          <p className="font-bold text-lg text-foreground">{booking.name}</p>
                          <p className="text-sm font-medium text-muted-foreground">
                            Station: {booking.stations?.station_number || "Not assigned"}
                          </p>
                          {balanceDue > 0 && (
                            <span className="text-sm text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1 pt-2">
                              <AlertCircle className="h-4 w-4" />
                              Balance to Collect: ₹{balanceDue}
                            </span>
                          )}
                        </div>
                        <Button onClick={() => openCheckOutDialog(booking)} className="rounded-2xl bg-background hover:bg-muted text-foreground px-8 py-6 h-auto shrink-0 shadow-sm border border-border font-bold text-base">
                          <LogOut className="mr-2 h-5 w-5 text-orange-600 dark:text-orange-400" />
                          End Session
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Start Session Dialog */}
        <Dialog open={startSessionDialog} onOpenChange={setCheckInDialog}>
          <DialogContent className="w-[95vw] sm:max-w-md bg-card border border-border rounded-3xl p-5 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="mb-2">
              <DialogTitle className="text-2xl font-bold text-foreground">Start Session for Player</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium ml-1">Player Name</Label>
                <Input value={selectedBooking?.name || ""} disabled className="rounded-xl bg-secondary border border-border px-4 py-6 mt-1 font-medium text-foreground opacity-100" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium ml-1">ID Type</Label>
                  <Select value={startSessionForm.id_type} onValueChange={(value) => setCheckInForm({ ...startSessionForm, id_type: value })}>
                    <SelectTrigger className="rounded-xl bg-secondary border border-border px-4 py-6 mt-1 focus:ring-primary/20">
                      <SelectValue placeholder="Select ID type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-border shadow-xl">
                      <SelectItem value="aadhaar">Aadhaar Card</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="driving_license">Driving License</SelectItem>
                      <SelectItem value="voter_id">Voter ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium ml-1">ID Number</Label>
                  <Input
                    value={startSessionForm.id_number}
                    onChange={(e) => setCheckInForm({ ...startSessionForm, id_number: e.target.value })}
                    placeholder="Enter ID number"
                    className="rounded-xl bg-secondary border border-border px-4 py-6 mt-1 focus-visible:ring-primary/20"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium ml-1">Assign Station</Label>
                <Select
                  value={startSessionForm.assigned_station_id}
                  onValueChange={(value) => setCheckInForm({ ...startSessionForm, assigned_station_id: value })}
                >
                  <SelectTrigger className="rounded-xl bg-secondary border border-border px-4 py-6 mt-1 focus:ring-primary/20">
                    <SelectValue placeholder="Select station" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-border shadow-xl">
                    {availableStations
                      .filter((station) => station.station_type === selectedBooking?.station_type)
                      .map((station) => (
                        <SelectItem key={station.id} value={station.id}>
                          Station {station.station_number} - {station.station_type}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Summary Section */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 space-y-3 mt-6">
                <div className="flex items-center gap-2 font-bold text-foreground mb-1">
                  <div className="bg-background border border-border p-1.5 rounded-lg shadow-sm">
                    <IndianRupee className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  Payment Summary
                </div>
                <div className="space-y-2 text-sm px-1">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="font-medium">Total Amount:</span>
                    <span className="font-bold text-foreground text-base">₹{selectedBooking?.price}</span>
                  </div>
                  <div className="flex justify-between items-center text-green-700 dark:text-green-400">
                    <span className="flex items-center gap-1 font-medium">
                      <CreditCard className="h-4 w-4" />
                      Paid Online:
                    </span>
                    <span className="font-bold text-base">₹{selectedBooking?.amount_paid || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-orange-600 dark:text-orange-400">
                    <span className="font-medium">Balance Due:</span>
                    <span className="font-bold text-base">₹{selectedBooking ? getBalanceDue(selectedBooking) : 0}</span>
                  </div>
                </div>
              </div>

              {/* Collect Payment at Start */}
              {selectedBooking && getBalanceDue(selectedBooking) > 0 && (
                <div className="space-y-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl p-5">
                  <Label className="text-base font-bold text-foreground ml-1">Collect Additional Payment</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground ml-1">Payment Mode</Label>
                      <Select
                        value={startSessionForm.payment_mode}
                        onValueChange={(value) => setCheckInForm({ ...startSessionForm, payment_mode: value })}
                      >
                        <SelectTrigger className="rounded-xl bg-secondary border border-border px-4 py-6 mt-1 shadow-sm focus:ring-orange-500/20">
                          <SelectValue placeholder="Mode" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-border shadow-xl">
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground ml-1">Amount Given Now</Label>
                      <Input
                        type="number"
                        value={startSessionForm.additional_payment || ''}
                        onChange={(e) => setCheckInForm({ ...startSessionForm, additional_payment: parseInt(e.target.value) || 0 })}
                        placeholder="₹0"
                        max={getBalanceDue(selectedBooking)}
                        className="rounded-xl bg-secondary border border-border px-4 py-6 mt-1 shadow-sm focus-visible:ring-orange-500/20 font-bold"
                      />
                    </div>
                  </div>
                  {startSessionForm.additional_payment > 0 && (
                    <div className="text-sm pb-1 pt-3 border-t border-border mt-3 space-y-2 px-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-muted-foreground">Paid (After Start):</span>
                        <span className="font-bold text-green-700 dark:text-green-400">₹{getTotalPaidAtCheckIn()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-muted-foreground">Remaining Balance:</span>
                        <span className={`font-bold ${selectedBooking.price - getTotalPaidAtCheckIn() > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-700 dark:text-green-400'}`}>
                          ₹{Math.max(0, selectedBooking.price - getTotalPaidAtCheckIn())}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedBooking && getBalanceDue(selectedBooking) === 0 && (
                <div className="bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 rounded-2xl p-5 flex items-center gap-3">
                  <div className="bg-background border border-border p-2 rounded-xl shadow-sm">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <span className="font-bold">Fully Paid - No balance to collect</span>
                </div>
              )}
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" className="rounded-xl px-8 py-6 h-auto bg-transparent hover:bg-secondary font-bold text-foreground border-border" onClick={() => setCheckInDialog(false)}>
                Cancel
              </Button>
              <Button className="rounded-xl bg-primary hover:bg-primary/90 px-8 py-6 h-auto text-primary-foreground font-bold" onClick={handleCheckIn}>
                Complete Check-In
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* End Session Dialog */}
        <Dialog open={endSessionDialog} onOpenChange={setCheckOutDialog}>
          <DialogContent className="w-[95vw] sm:max-w-md bg-card border border-border rounded-3xl p-5 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
            <DialogHeader className="mb-2">
              <DialogTitle className="text-2xl font-bold text-foreground">End Session for Player</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium ml-1">Player Name</Label>
                <Input value={selectedBooking?.name || ""} disabled className="rounded-xl bg-secondary border border-border px-4 py-6 mt-1 font-medium text-foreground opacity-100" />
              </div>
              <div>
                <Label className="text-sm font-medium ml-1">Station Number</Label>
                <Input value={selectedBooking?.stations?.station_number || "Not assigned"} disabled className="rounded-xl bg-secondary border border-border px-4 py-6 mt-1 font-medium text-foreground opacity-100" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <div>
                  <Label className="text-sm font-medium ml-1">Total Amount</Label>
                  <Input value={`₹${selectedBooking?.price}`} disabled className="rounded-xl bg-secondary border border-border px-4 py-6 mt-1 font-bold text-foreground opacity-100" />
                </div>
                <div>
                  <Label className="text-sm font-medium ml-1">Amount Paid</Label>
                  <Input value={`₹${selectedBooking?.amount_paid}`} disabled className="rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 px-4 py-6 mt-1 font-bold opacity-100" />
                </div>
              </div>
              <div className="mt-2">
                <Label className="text-sm font-medium ml-1">Balance</Label>
                <Input
                  value={`₹${(selectedBooking?.price || 0) - (selectedBooking?.amount_paid || 0)}`}
                  disabled
                  className={`rounded-xl px-4 py-6 mt-1 font-bold opacity-100 border ${
                    (selectedBooking?.price || 0) - (selectedBooking?.amount_paid || 0) > 0 ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400" : "bg-card border-border text-foreground"
                  }`}
                />
              </div>
              {(selectedBooking?.price || 0) - (selectedBooking?.amount_paid || 0) > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl p-5 flex items-center gap-3 mt-4">
                  <div className="bg-background border border-border p-2 rounded-xl shadow-sm">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="font-bold text-sm">Payment pending. Collect balance before checkout.</span>
                </div>
              )}
            </div>
            <DialogFooter className="mt-8">
              <Button variant="outline" className="rounded-xl px-8 py-6 h-auto bg-transparent hover:bg-secondary font-bold text-foreground border-border" onClick={() => setCheckOutDialog(false)}>
                Cancel
              </Button>
              <Button className="rounded-xl bg-primary hover:bg-primary/90 px-8 py-6 h-auto text-primary-foreground font-bold" onClick={handleCheckOut}>
                Complete Check-Out
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
