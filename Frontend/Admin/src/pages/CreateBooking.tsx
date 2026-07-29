import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock, Users, Play, CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import pb from '@/lib/pocketbase';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProperty } from '@/contexts/PropertyContext';
import { usePropertyFilter } from '@/hooks/usePropertyFilter';

interface StationType {
  id?: string;
  name: string;
  base_price: number;
  default_occupancy: number;
}

export default function CreateBooking() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeProperty } = useProperty();
  const propertyFilter = usePropertyFilter();

  const [bookingMode, setBookingMode] = useState<'walk-in' | 'advance'>(
    searchParams.get('type') === 'online' ? 'advance' : 'walk-in'
  );

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    station_type: '',
    assigned_station_id: searchParams.get('station') || 'any',
    guests: 1 as number | '',
    start_date: new Date() as Date | undefined,
    start_time: format(new Date(), 'HH:mm'),
    duration: '60', // in minutes, or 'open'
    message: '',
  });

  const [stationTypes, setStationTypes] = useState<StationType[]>([]);
  const [physicalStations, setPhysicalStations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initData = async () => {
      try {
        let pStations = await pb.collection("stations").getFullList({ 
          filter: propertyFilter ? `status != 'maintenance' && ${propertyFilter}` : `status != 'maintenance'`,
          requestKey: null 
        });

        if (pStations.length === 0) {
          pStations = await pb.collection("stations").getFullList({ 
            filter: `status != 'maintenance'`,
            requestKey: null 
          });
        }
        setPhysicalStations(pStations);

        let typesResult = await pb.collection("station_types").getFullList({ 
          filter: propertyFilter || undefined,
          requestKey: null 
        });

        if (typesResult.length === 0) {
          typesResult = await pb.collection("station_types").getFullList({ requestKey: null });
        }

        const types = (typesResult as unknown as StationType[]).sort((a, b) => a.name.localeCompare(b.name));
        setStationTypes(types);

        const paramStationId = searchParams.get('station');
        let selectedType = '';

        if (paramStationId) {
          const matchedStation = pStations.find(st => st.id === paramStationId);
          if (matchedStation) {
            selectedType = matchedStation.station_type;
          }
        }

        setFormData(prev => ({
          ...prev,
          station_type: prev.station_type || selectedType,
          assigned_station_id: 'any'
        }));
      } catch (e) {
        console.error("Failed to fetch stations", e);
      }
    };
    initData();
  }, [activeProperty, propertyFilter, searchParams]);

  const handleStationTypeChange = (type: string) => {
    setFormData(prev => ({
      ...prev,
      station_type: type,
      assigned_station_id: 'any'
    }));
  };

  // Derived Values
  const selectedType = stationTypes.find(r => r.name === formData.station_type);
  const hourlyRate = selectedType?.base_price || 0;
  
  const calculatePrice = () => {
    if (formData.duration === 'open') return 0;
    const mins = parseInt(formData.duration) || 0;
    return (mins / 60) * hourlyRate;
  };

  const totalPrice = calculatePrice();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.station_type) {
      toast.error('Please select a station type');
      return;
    }

    setLoading(true);
    try {
      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      const isOpenTimer = bookingMode === 'walk-in' && formData.duration === 'open';
      const booking_reference = isOpenTimer ? `OT-${randomCode}` : `WT-${randomCode}`;

      let startDateTime = new Date();
      if (bookingMode === 'advance') {
        if (!formData.start_date) throw new Error("Start date is required");
        startDateTime = new Date(formData.start_date);
        const [hours, minutes] = formData.start_time.split(':');
        startDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      }

      let endDateTime = new Date(startDateTime);
      if (isOpenTimer) {
        endDateTime.setHours(endDateTime.getHours() + 24);
      } else {
        endDateTime.setMinutes(endDateTime.getMinutes() + parseInt(formData.duration));
      }

      // Check if requested time overlaps with a Blackout Period
      const blackouts = await pb.collection('blackout_periods').getFullList().catch(() => []);
      for (const b of blackouts) {
        const bStart = new Date(b.start_time);
        const bEnd = new Date(b.end_time);
        if (startDateTime < bEnd && endDateTime > bStart) {
          toast.error(`Cannot create booking: Store is in a Blackout Period (${b.reason})`);
          setLoading(false);
          return;
        }
      }

      // If assigned_station_id is 'any', auto-assign the first free station of this type
      let finalAssignedStationId = formData.assigned_station_id;
      if (!finalAssignedStationId || finalAssignedStationId === 'any') {
        const freeStation = physicalStations.find(s => s.station_type === formData.station_type && s.status !== 'maintenance');
        finalAssignedStationId = freeStation ? freeStation.id : null;
      }

      let customerId = null;
      if (formData.phone) {
        try {
          const existingCustomers = await pb.collection('portal_users').getList(1, 1, {
            filter: `phone = "${formData.phone}"`
          });
          
          if (existingCustomers.items.length > 0) {
            const customerRecord = existingCustomers.items[0];
            if (customerRecord.status === 'banned') {
              toast.error(`Cannot create booking: Customer (${customerRecord.name || formData.phone}) is marked as BANNED.`);
              setLoading(false);
              return;
            }
            customerId = customerRecord.id;
          } else {
            const customerEmail = formData.email || (formData.phone ? `${formData.phone}@guest.gamez.in` : `guest_${Date.now()}@gamez.in`);
            const newCustomer = await pb.collection('portal_users').create({
              name: formData.name || 'Walk-in Guest',
              phone: formData.phone,
              email: customerEmail,
              password: 'WalkInGuest@123',
              passwordConfirm: 'WalkInGuest@123',
              total_visits: 0,
              total_spent: 0,
              status: 'regular'
            });
            customerId = newCustomer.id;
          }
        } catch (err) {
          console.error("Failed to process customer CRM data", err);
        }
      }

      await pb.collection('bookings').create({
        name: formData.name || 'Walk-in Guest',
        email: formData.email || 'walkin@gamez.in',
        phone: formData.phone || '',
        station_type: formData.station_type,
        assigned_station_id: finalAssignedStationId,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        message: formData.message,
        guests: formData.guests || 1,
        players: formData.guests || 1,
        total_price: totalPrice,
        booking_reference,
        status: 'confirmed',
        property_id: activeProperty?.id,
        source: bookingMode === 'walk-in' ? 'walk_in' : 'direct',
        customer_id: customerId
      });

      toast.success('Walk-in booking created successfully!');
      navigate('/admin/bookings');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const filteredStations = physicalStations.filter(s => s.station_type === formData.station_type);

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Create Booking</h1>
            <p className="text-muted-foreground mt-1">Start a new session or book for the future</p>
          </div>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex bg-secondary p-1 rounded-2xl w-full md:w-fit border border-border shadow-sm">
          <button
            type="button"
            onClick={() => setBookingMode('walk-in')}
            className={cn(
              "flex-1 md:w-48 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all",
              bookingMode === 'walk-in' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Play className="w-4 h-4" />
            Walk-in (Now)
          </button>
          <button
            type="button"
            onClick={() => setBookingMode('advance')}
            className={cn(
              "flex-1 md:w-48 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all",
              bookingMode === 'advance' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarPlus className="w-4 h-4" />
            Advance Booking
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card border border-border rounded-[32px] p-6 md:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Player Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium ml-1 text-muted-foreground">Player Name {bookingMode === 'advance' && '*'}</Label>
                  <Input
                    id="name"
                    required={bookingMode === 'advance'}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={bookingMode === 'walk-in' ? 'Optional for Walk-ins' : 'Enter full name'}
                    className="rounded-xl bg-secondary border-border px-4 py-6 font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium ml-1 text-muted-foreground">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    maxLength={10}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="10-digit mobile"
                    className="rounded-xl bg-secondary border-border px-4 py-6 font-medium"
                  />
                </div>
              </div>
            </div>

            <hr className="border-border/60" />

            <div>
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Session Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium ml-1 text-muted-foreground">Station Type *</Label>
                  <Select
                    value={formData.station_type}
                    onValueChange={handleStationTypeChange}
                  >
                    <SelectTrigger className="rounded-xl bg-secondary border-border px-4 py-6 font-medium">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border shadow-lg">
                      {stationTypes.map(t => (
                        <SelectItem key={t.name} value={t.name}>
                          {t.name} (₹{t.base_price}/hr)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium ml-1 text-muted-foreground">Duration *</Label>
                  <Select
                    value={formData.duration}
                    onValueChange={(val) => setFormData({ ...formData, duration: val })}
                  >
                    <SelectTrigger className="rounded-xl bg-secondary border-border px-4 py-6 font-medium">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border shadow-lg">
                      <SelectItem value="30">30 Minutes</SelectItem>
                      <SelectItem value="60">1 Hour</SelectItem>
                      <SelectItem value="90">1.5 Hours</SelectItem>
                      <SelectItem value="120">2 Hours</SelectItem>
                      <SelectItem value="180">3 Hours</SelectItem>
                      {bookingMode === 'walk-in' && (
                        <SelectItem value="open">
                          Open Timer (Pay at end)
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {bookingMode === 'advance' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  <div className="space-y-2 flex flex-col">
                    <Label className="text-sm font-medium ml-1 text-muted-foreground">Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-medium rounded-xl bg-secondary border border-border px-4 py-6",
                            !formData.start_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.start_date ? format(formData.start_date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.start_date}
                          onSelect={(d) => d && setFormData({ ...formData, start_date: d })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1 text-muted-foreground">Time *</Label>
                    <Input 
                      type="time" 
                      required 
                      value={formData.start_time}
                      onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                      className="rounded-xl bg-secondary border-border px-4 py-6 font-medium w-full flex" 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MINI BOOKING & CANCELLATION POLICY */}
          <div className="bg-secondary/40 border border-border rounded-2xl p-4 text-xs space-y-1 text-muted-foreground">
            <p className="font-bold text-foreground flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5 text-primary" /> Booking & Cancellation Policy
            </p>
            <p className="text-[11.5px] leading-relaxed">
              • <strong>Payment & Refunds:</strong> Cancellations up to 2 hours prior to slot start time are eligible for refund/reschedule.<br />
              • <strong>Hold Expiry:</strong> Unconfirmed advance bookings automatically expire 5 minutes after scheduled start time.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 pt-4">
            <div className="w-full md:w-auto flex-1 bg-primary/10 border border-primary/20 rounded-3xl p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-primary font-bold uppercase tracking-wider mb-1">Total Upfront</p>
                {formData.duration === 'open' ? (
                  <p className="text-muted-foreground font-medium">To be calculated at end</p>
                ) : (
                  <p className="text-muted-foreground font-medium">{parseInt(formData.duration)} mins @ ₹{hourlyRate}/hr</p>
                )}
              </div>
              <p className="text-4xl font-black text-primary">
                {formData.duration === 'open' ? '₹0' : `₹${Math.round(totalPrice)}`}
              </p>
            </div>
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full md:w-64 rounded-3xl bg-primary hover:bg-primary/90 py-8 h-auto text-primary-foreground font-bold text-xl shadow-lg hover:shadow-xl transition-all"
            >
              {loading ? 'Processing...' : bookingMode === 'walk-in' ? 'Start Session' : 'Book Slot'}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
