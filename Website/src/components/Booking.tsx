import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Users, Phone, CheckCircle, CreditCard, Wallet, Building, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { pb } from "@/lib/pocketbase";
import { formatDateIST, getTodayIST } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { useProperty } from "@/contexts/PropertyContext";

const getNextDay = (dateString: string) => {
  if (!dateString) return getTodayIST();
  const date = new Date(dateString);
  date.setDate(date.getDate() + 1);
  return date.toISOString().split('T')[0];
};

const MIN_ADVANCE = 1;

type PaymentOption = "full" | "advance" | "property";

interface StationType {
  id?: string;
  name: string;
  base_price: number;
  default_occupancy: number;
  available?: number;
}

const Booking = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    checkIn: "",
    checkOut: "",
    players: "",
    message: "",
  });

  const [cart, setCart] = useState<Record<string, number>>({});
  const [stationTypes, setStationTypes] = useState<StationType[]>([]);
  const [paymentOption, setPaymentOption] = useState<PaymentOption>("property");
  const [advanceAmount, setAdvanceAmount] = useState(MIN_ADVANCE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);

  const [physicalStationsList, setPhysicalStationsList] = useState<any[]>([]);
  const [futureBookings, setFutureBookings] = useState<any[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(true);

  // New States for Tabbed Dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("tab1");
  const { activeProperty } = useProperty();

  useEffect(() => {
    if (!activeProperty) return;
    const fetchCalendarData = async () => {
      try {
        setIsCalendarLoading(true);
        const propertyFilter = `property_id = "${activeProperty.id}"`;
        const physicalStations = await pb.collection("stations").getFullList({ filter: `status != 'maintenance' && ${propertyFilter}` });
        setPhysicalStationsList(physicalStations);
        
        const todayStr = getTodayIST() + " 00:00:00.000Z";
        const bookings = await pb.collection("bookings").getFullList({
          filter: `end_time > "${todayStr}" && status != 'cancelled' && ${propertyFilter}`
        });
        setFutureBookings(bookings);
      } catch (error) {
        console.error("Error fetching data for calendar:", error);
      } finally {
        setIsCalendarLoading(false);
      }
    };
    fetchCalendarData();
  }, [activeProperty]);

  const isDateFullyBooked = (date: Date) => {
    if (isCalendarLoading) return true;
    if (physicalStationsList.length === 0) return true;
    
    const dateStr = format(date, 'yyyy-MM-dd');
    const targetIn = dateStr + " 00:00:00.000Z";
    
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const targetOut = format(nextDate, 'yyyy-MM-dd') + " 00:00:00.000Z";
    
    const overlappingBookings = futureBookings.filter(b => {
      return b.start_time < targetOut && b.end_time > targetIn;
    });
    
    const stationTypesInProperty = Array.from(new Set(physicalStationsList.map(r => r.station_type)));
    if (stationTypesInProperty.length === 0) return true;

    for (const rt of stationTypesInProperty) {
      const typeTotal = physicalStationsList.filter(r => r.station_type === rt).length;
      const typeBooked = overlappingBookings.filter(b => b.station_type === rt).length;
      const typeAvailable = typeTotal - typeBooked;
      
      if (typeAvailable > 0) {
        return false;
      }
    }
    
    return true;
  };

  useEffect(() => {
    if (!activeProperty) return;
    const initTypes = async () => {
      try {
        const typesResult = await pb.collection("station_types").getFullList({ 
          filter: `property_id = "${activeProperty.id}"`,
          requestKey: null 
        });
        const types = typesResult as unknown as StationType[];
        setStationTypes(types);
        if (types.length > 0) {
          // Initialize cart with 0 logic is handled simply by reading from `cart` state dynamically
        }
      } catch(e) {
        console.error("Failed to fetch initial station types", e);
      }
    };
    initTypes();

    pb.collection('station_types').subscribe('*', function () {
      initTypes();
    });

    return () => {
      pb.collection('station_types').unsubscribe('*');
    };
  }, [activeProperty]);

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!formData.checkIn || !formData.checkOut || !activeProperty) {
        setStationTypes(prev => prev.map(t => ({ ...t, available: undefined })));
        return;
      }
      try {
        const propertyFilter = `property_id = "${activeProperty.id}"`;
        const physicalStations = await pb.collection("stations").getFullList({ filter: `status != 'maintenance' && ${propertyFilter}` });
        const overlapping = await pb.collection("bookings").getFullList({
          filter: `start_time < "${formData.checkOut} 00:00:00.000Z" && end_time > "${formData.checkIn} 00:00:00.000Z" && status != 'cancelled' && ${propertyFilter}`
        });

        setStationTypes(prevTypes => prevTypes.map(type => {
          const totalStations = physicalStations.filter((r: any) => r.station_type === type.name).length;
          const bookedCount = overlapping.filter((b: any) => b.station_type === type.name).length;
          const available = totalStations - bookedCount;
          return { ...type, available };
        }));
      } catch (error) {
        console.error("Error calculating availability:", error);
      }
    };
    fetchAvailability();
  }, [formData.checkIn, formData.checkOut, activeProperty]);


  const calculateHours = (checkIn: string, checkOut: string): number => {
    if (!checkIn || !checkOut) return 1;
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  };

  const numberOfHours = calculateHours(formData.checkIn, formData.checkOut);
  const totalStationsInCart = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  
  const totalPricePerHour = Object.entries(cart).reduce((sum, [stationName, qty]) => {
    const station = stationTypes.find(r => r.name === stationName);
    return sum + (station?.base_price || 0) * qty;
  }, 0);
  
  const totalPrice = totalPricePerHour * numberOfHours;

  const getPaymentAmount = () => {
    switch (paymentOption) {
      case "full":
        return totalPrice;
      case "advance":
        return Math.max(MIN_ADVANCE, Math.min(advanceAmount, totalPrice));
      case "property":
        return 0;
    }
  };

  const handleNextTab1 = () => {
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error("Please fill in all contact details (Name, Email, Phone).");
      return;
    }
    if (!/^\d{10}$/.test(formData.phone)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    setCurrentTab("tab2");
  };

  const handleNextTab2 = () => {
    if (!formData.checkIn || !formData.checkOut) {
      toast.error("Please select both check-in and check-out dates.");
      return;
    }
    if (totalStationsInCart === 0) {
      toast.error("Please add at least one station to your booking.");
      return;
    }
    
    let hasError = false;
    Object.entries(cart).forEach(([stationName, qty]) => {
      if (qty > 0) {
        const station = stationTypes.find(r => r.name === stationName);
        if (station && station.available !== undefined && station.available < qty) {
          toast.error(`Sorry, only ${station.available} ${station.name} station(s) are available for your selected dates.`);
          hasError = true;
        }
      }
    });
    if (hasError) return;
    if (!formData.players) {
      toast.error("Please enter the number of players.");
      return;
    }
    setCurrentTab("tab3");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validations
    if (paymentOption === "advance" && advanceAmount < MIN_ADVANCE) {
      toast.error(`Minimum advance amount is ₹${MIN_ADVANCE}`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const paymentMode = paymentOption === "property" ? "property" : "online";
      const mockBookingRef = "DH-" + Math.floor(1000 + Math.random() * 9000);

      let data;
      try {
        const playersPerStation = Math.ceil((parseInt(formData.players) || 1) / Math.max(1, totalStationsInCart));
        const bookedTypes = Object.entries(cart).filter(([_, qty]) => qty > 0);
        let firstData = null;

        for (const [stationName, qty] of bookedTypes) {
          const station = stationTypes.find(r => r.name === stationName);
          const pricePerHourForThisType = station?.base_price || 0;
          const pricePerBookingForThisType = pricePerHourForThisType * numberOfHours;

          for (let i = 0; i < qty; i++) {
            data = await pb.collection("bookings").create({
              booking_reference: mockBookingRef,
              name: formData.name,
              email: formData.email,
              phone: `+91${formData.phone}`,
              start_time: formData.checkIn,
              end_time: formData.checkOut,
              players: playersPerStation,
              station_type: stationName,
              price: pricePerBookingForThisType,
              message: formData.message || null,
              payment_mode: paymentMode,
              payment_status: "pending",
              amount_paid: 0,
              status: "confirmed",
              property_id: activeProperty?.id
            });
            if (!firstData) firstData = data;
          }
        }
        data = firstData; // Set data to the first record for the confirmation modal
      } catch (err) {
        toast.error("Failed to create booking. Please try again.");
        console.error("Booking error:", err);
        return;
      }

      setBookingDetails(data);
      setShowConfirmation(true);
      setIsDialogOpen(false); // Close dialog on success
      
      setFormData({
        name: "",
        email: "",
        phone: "",
        checkIn: "",
        checkOut: "",
        players: "",
        message: "",
      });
      setCart({});
      setPaymentOption("property");
      setAdvanceAmount(MIN_ADVANCE);
      setCurrentTab("tab1"); // Reset form
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
      console.error("Unexpected error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
      setFormData({ ...formData, [name]: digitsOnly });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const getButtonText = () => {
    if (isSubmitting) {
      return paymentOption === "property" ? "Confirming..." : "Processing...";
    }
    
    switch (paymentOption) {
      case "full":
        return `Pay ₹${totalPrice} Now`;
      case "advance":
        return `Pay ₹${getPaymentAmount()} Now`;
      case "property":
        return "Confirm Booking";
    }
  };

  if (physicalStationsList.length === 0 && !isCalendarLoading) {
    return (
      <section id="booking" className="py-20 bg-gradient-tropical">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-md rounded-3xl p-12 text-center shadow-xl border border-white/20">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0d101b] mb-4">Temporarily Unavailable</h2>
            <p className="text-xl text-[#0d101b]/70 font-medium">We will back soon for booking, system is currently under maintenance</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="booking" className="py-12 md:py-20 bg-gradient-tropical scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-playfair font-bold text-primary-foreground mb-4">
            Book Your Tropical Escape
          </h2>
          <div className="w-24 h-1 bg-primary-foreground mx-auto mb-6" />
          <p className="text-lg text-primary-foreground/90 mb-8">
            Start planning your peaceful retreat amidst nature
          </p>
          <Button 
            onClick={() => setIsDialogOpen(true)} 
            className="text-xl py-8 px-12 bg-white text-emerald-900 hover:bg-gray-100 shadow-xl"
          >
            <CalendarIcon className="w-6 h-6 mr-3" />
            Start Your Booking
          </Button>

          <div className="mt-12 text-center text-primary-foreground/90">
            <p className="mb-2"><strong>Contact Information:</strong></p>
            <p>Phone: +91 83173 09867</p>
            <p>Email: admin@dreamhousehomestay.in</p>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent 
          className="max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-playfair">Complete Your Booking</DialogTitle>
          </DialogHeader>

          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full mt-2">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="tab1" disabled className="text-sm md:text-base">1. Basic Details</TabsTrigger>
              <TabsTrigger value="tab2" disabled className="text-sm md:text-base">2. Stay Details</TabsTrigger>
              <TabsTrigger value="tab3" disabled className="text-sm md:text-base">3. Payment</TabsTrigger>
            </TabsList>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* TAB 1: BASIC DETAILS */}
              <TabsContent value="tab1" className="space-y-6">
                {activeProperty && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-[24px] p-6 mb-2 shadow-sm relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 p-4 opacity-[0.03]">
                      <Building className="w-32 h-32" />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-5">
                      <div className="bg-white p-3 rounded-2xl shadow-sm text-emerald-600 shrink-0">
                        <Building className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-emerald-950 font-bold text-lg mb-1.5 flex items-center gap-2">
                          Booking Confirmation
                        </h4>
                        <p className="text-emerald-800/80 font-medium text-sm leading-relaxed">
                          You are currently making a reservation for <span className="font-bold text-emerald-900 bg-white/70 px-2.5 py-1 rounded-md inline-block mx-1 shadow-sm border border-emerald-100/50">{activeProperty.name}</span>. 
                          Please confirm this is the correct resort before entering your details below.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground">Full Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your name"
                      className="border-border focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      className="border-border focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-foreground">Phone Number *</Label>
                    <div className="flex gap-2">
                      <div className="flex items-center px-3 py-2 bg-muted border border-border rounded-md">
                        <span className="text-foreground font-medium">+91</span>
                      </div>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="9876543210"
                        maxLength={10}
                        className="flex-1 border-border focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 p-4 rounded-lg flex items-start gap-3 border border-primary/20 mt-6">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-foreground">Please verify your contact details</p>
                    <p className="text-xs text-muted-foreground mt-1">We will send your booking confirmation and all stay-related updates to this email and phone number.</p>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
                  <Button type="button" onClick={handleNextTab1} className="bg-gradient-tropical text-white">
                    Next Step <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 2: STAY DETAILS */}
              <TabsContent value="tab2" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2 flex flex-col">
                    <Label htmlFor="checkIn" className="text-foreground">Check-in Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal border-border focus:ring-primary pl-10 h-10 relative",
                            !formData.checkIn && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground mb-0" />
                          {formData.checkIn ? format(new Date(formData.checkIn), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.checkIn ? new Date(formData.checkIn) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              const localDateString = format(date, 'yyyy-MM-dd');
                              handleChange({ target: { name: 'checkIn', value: localDateString } } as any);
                              if (formData.checkOut && new Date(localDateString) >= new Date(formData.checkOut)) {
                                handleChange({ target: { name: 'checkOut', value: '' } } as any);
                              }
                            }
                          }}
                          disabled={(date) => {
                            const today = new Date(getTodayIST());
                            today.setHours(0,0,0,0);
                            if (date < today) return true;
                            return isDateFullyBooked(date);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2 flex flex-col">
                    <Label htmlFor="checkOut" className="text-foreground">Check-out Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-normal border-border focus:ring-primary pl-10 h-10 relative",
                            !formData.checkOut && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground mb-0" />
                          {formData.checkOut ? format(new Date(formData.checkOut), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.checkOut ? new Date(formData.checkOut) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              handleChange({ target: { name: 'checkOut', value: format(date, 'yyyy-MM-dd') } } as any);
                            }
                          }}
                          disabled={(date) => {
                            const minOut = formData.checkIn ? new Date(formData.checkIn) : new Date(getTodayIST());
                            minOut.setHours(0,0,0,0);
                            if (date <= minOut) return true;
                            
                            if (formData.checkIn) {
                              const start = new Date(formData.checkIn);
                              start.setHours(0,0,0,0);
                              let current = new Date(start);
                              while (current < date) {
                                if (isDateFullyBooked(current)) {
                                  return true;
                                }
                                current.setDate(current.getDate() + 1);
                              }
                            }
                            return false;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="players" className="text-foreground">Total Players *</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="players"
                        name="players"
                        type="number"
                        min="1"
                        required
                        value={formData.players}
                        onChange={handleChange}
                        placeholder="2"
                        className="pl-10 border-border focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 md:col-span-2 mt-4">
                    <Label className="text-foreground text-lg">Select Stations *</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {stationTypes.map((station) => {
                        const isSoldOut = station.available !== undefined && station.available <= 0;
                        const qtyInCart = cart[station.name] || 0;
                        const maxAvailable = station.available !== undefined ? station.available : 10;
                        
                        return (
                        <div
                          key={station.name}
                          className={`flex flex-col border border-border rounded-xl p-5 transition-all ${
                            isSoldOut ? "bg-muted opacity-60" : "hover:border-primary/40 bg-white shadow-sm hover:shadow-md"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                               <h4 className="font-semibold text-foreground text-lg leading-tight">{station.name}</h4>
                               {station.available !== undefined && (
                                <div className="text-sm mt-1.5">
                                  {isSoldOut ? (
                                    <span className="text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded text-xs">Sold Out</span>
                                  ) : (
                                    <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded text-xs">{station.available} available</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <span className="font-bold text-primary text-lg">₹{station.base_price}<span className="text-sm text-muted-foreground font-normal">/hour</span></span>
                          </div>
                          
                          <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/60">
                            <span className="text-sm text-foreground font-medium">Quantity</span>
                            <div className="flex items-center gap-3">
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="icon" 
                                className="h-9 w-9 rounded-full border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors"
                                disabled={qtyInCart === 0}
                                onClick={() => setCart(prev => ({ ...prev, [station.name]: Math.max(0, qtyInCart - 1) }))}
                              >
                                -
                              </Button>
                              <span className="w-6 text-center font-bold text-lg">{qtyInCart}</span>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="icon" 
                                className="h-9 w-9 rounded-full border-primary/20 hover:bg-primary/10 hover:text-primary transition-colors"
                                disabled={isSoldOut || qtyInCart >= maxAvailable}
                                onClick={() => setCart(prev => ({ ...prev, [station.name]: qtyInCart + 1 }))}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </div>
                      )})}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <Button type="button" variant="outline" onClick={() => setCurrentTab("tab1")}>
                    <ChevronLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button type="button" onClick={handleNextTab2} className="bg-gradient-tropical text-white">
                    Next Step <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 3: PAYMENT & EXTRAS */}
              <TabsContent value="tab3" className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-foreground">Special Requests (Optional)</Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Let us know if you have any special requirements..."
                    className="min-h-[100px] border-border focus:ring-primary"
                  />
                </div>
                
                <div className="space-y-4">
                  <Label className="text-foreground text-lg font-semibold">Payment Option *</Label>
                  <RadioGroup
                    value={paymentOption}
                    onValueChange={(value) => setPaymentOption(value as PaymentOption)}
                    className="space-y-3"
                  >
                    <div
                      className={`flex items-start space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${
                        paymentOption === "full" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"
                      }`}
                    >
                      <RadioGroupItem value="full" id="pay-full" className="mt-1" />
                      <Label htmlFor="pay-full" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <CreditCard className="w-4 h-4 text-primary" />
                          <span className="font-semibold">Pay Full Amount Online</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Pay ₹{totalPrice} now ({numberOfHours} hour{numberOfHours > 1 ? 's' : ''} for {totalStationsInCart} station{totalStationsInCart > 1 ? 's' : ''})
                        </p>
                      </Label>
                    </div>

                    <div
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        paymentOption === "advance" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <RadioGroupItem value="advance" id="pay-advance" className="mt-1" />
                        <Label htmlFor="pay-advance" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 mb-1">
                            <Wallet className="w-4 h-4 text-primary" />
                            <span className="font-semibold">Pay Advance Online</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Pay minimum ₹{MIN_ADVANCE} to confirm. Remaining balance at check-in
                          </p>
                        </Label>
                      </div>
                      
                      {paymentOption === "advance" && (
                        <div className="mt-4 ml-7 space-y-2">
                          <Label htmlFor="advanceAmount" className="text-sm">Advance Amount (Min ₹{MIN_ADVANCE})</Label>
                          <div className="flex items-center gap-3">
                            <span className="text-foreground font-medium">₹</span>
                            <Input
                              id="advanceAmount"
                              type="number"
                              min={MIN_ADVANCE}
                              max={totalPrice}
                              value={advanceAmount}
                              onChange={(e) => setAdvanceAmount(Math.max(MIN_ADVANCE, parseInt(e.target.value) || MIN_ADVANCE))}
                              className="w-32"
                            />
                            <span className="text-sm text-muted-foreground">
                              Balance: ₹{totalPrice - getPaymentAmount()} (Total: ₹{totalPrice})
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div
                      className={`flex items-start space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${
                        paymentOption === "property" ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"
                      }`}
                    >
                      <RadioGroupItem value="property" id="pay-property" className="mt-1" />
                      <Label htmlFor="pay-property" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <Building className="w-4 h-4 text-primary" />
                          <span className="font-semibold">Pay at Property</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          No advance required. Pay full amount ₹{totalPrice} at check-in ({numberOfHours} hour{numberOfHours > 1 ? 's' : ''})
                        </p>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex justify-between mt-6 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setCurrentTab("tab2")}>
                    <ChevronLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-tropical text-primary-foreground min-w-[200px] hover:opacity-90"
                  >
                    {paymentOption === "property" ? <CheckCircle className="w-5 h-5 mr-2" /> : <CreditCard className="w-5 h-5 mr-2" />}
                    {getButtonText()}
                  </Button>
                </div>
              </TabsContent>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Booking Confirmation Modal */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Thank You for Booking!
            </DialogTitle>
          </DialogHeader>
          
          {bookingDetails && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Booking Reference</p>
                  <p className="font-mono font-semibold text-primary text-lg">{bookingDetails.booking_reference}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Guest Name</p>
                  <p className="font-medium">{bookingDetails.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stations Booked</p>
                  <p className="font-medium">{totalStationsInCart} Station(s)</p>
                  <p className="text-lg font-semibold text-primary mt-1">₹{totalPrice} total</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Check-in</p>
                    <p className="font-medium">{formatDateIST(bookingDetails.start_time)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Check-out</p>
                    <p className="font-medium">{formatDateIST(bookingDetails.end_time)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Number of Players</p>
                  <p className="font-medium">{bookingDetails.players}</p>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-sm text-foreground text-center font-medium">
                  💳 Payment will be collected at the property upon check-in
                </p>
              </div>

              <p className="text-sm text-muted-foreground text-center">
               You can check your booking status anytime at{" "}
                <Link to="/check-booking" className="text-primary hover:underline font-medium">
                  Check Booking
                </Link>
              </p>

              <Button
                onClick={() => setShowConfirmation(false)} 
                className="w-full bg-gradient-tropical text-primary-foreground hover:opacity-90"
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default Booking;
