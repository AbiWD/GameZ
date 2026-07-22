import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { UserLayout } from '../components/UserLayout';
import { useAuth } from '../contexts/AuthContext';
import pb from '../lib/pocketbase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { addHours, format, startOfHour, differenceInSeconds } from 'date-fns';

export default function Book() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<'selection' | 'checkout'>('selection');
  const [pendingBookingId, setPendingBookingId] = useState('');
  const [holdToken, setHoldToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [timeLeft, setTimeLeft] = useState(300);

  const [stationTypes, setStationTypes] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  
  const [selectedType, setSelectedType] = useState<string>(searchParams.get('type') || '');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [duration, setDuration] = useState<string>('1');
  const [selectedStation, setSelectedStation] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [unavailableStationIds, setUnavailableStationIds] = useState<string[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);

  // Realtime subscription for live availability updates
  useEffect(() => {
    let isSubscribed = true;
    pb.collection('bookings').subscribe('*', function () {
      if (isSubscribed) setRefreshTick(t => t + 1);
    });
    return () => {
      isSubscribed = false;
      pb.collection('bookings').unsubscribe('*');
    };
  }, []);

  useEffect(() => {
    const checkAvailability = async () => {
      if (!selectedDate || !selectedTime || !duration) {
        setUnavailableStationIds([]);
        return;
      }
      
      setCheckingAvailability(true);
      try {
        const startDateTime = new Date(`${selectedDate}T${selectedTime}`);
        const endDateTime = addHours(startDateTime, parseInt(duration));
        
        const filter = `status != 'cancelled' && start_time < '${endDateTime.toISOString()}' && end_time > '${startDateTime.toISOString()}'`;
        
        const overlappingBookings = await pb.collection('bookings').getFullList({
          filter: filter,
          requestKey: null
        });
        
        const unavailableIds = overlappingBookings.map(b => b.assigned_station_id);
        setUnavailableStationIds(unavailableIds);
        
        setSelectedStation(current => unavailableIds.includes(current) ? '' : current);
      } catch (err: any) {
        if (err.isAbort) return;
        console.error("Failed to check availability:", err);
      } finally {
        setCheckingAvailability(false);
      }
    };
    
    checkAvailability();
  }, [selectedDate, selectedTime, duration, refreshTick]);

  useEffect(() => {
    const init = async () => {
      try {
        const types = await pb.collection('station_types').getFullList();
        setStationTypes(types);
        
        const st = await pb.collection('stations').getFullList({
          filter: 'status != "maintenance"'
        });
        setStations(st);
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  // Countdown Timer
  useEffect(() => {
    if (step !== 'checkout' || !expiresAt) return;
    
    const interval = setInterval(() => {
      const remaining = differenceInSeconds(new Date(expiresAt), new Date());
      if (remaining <= 0) {
        clearInterval(interval);
        toast.error("Your hold expired! Please select a station again.");
        handleCancelHold(true);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [step, expiresAt]);

  const handleLockStation = async () => {
    if (!selectedType || !selectedDate || !selectedTime || !selectedStation) {
      toast.error('Please fill all fields');
      return;
    }

    if (!user) {
      toast.error('Please login to complete booking');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const type = stationTypes.find(t => t.id === selectedType);
      const startDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const endDateTime = addHours(startDateTime, parseInt(duration));
      const totalPrice = (type?.base_price || 0) * parseInt(duration);
      
      const token = crypto.randomUUID();
      const expires = new Date(Date.now() + 5 * 60000).toISOString(); // 5 min hold

      const bookingData = {
        name: user.name || user.username || 'Web User',
        email: user.email || 'guest@gamez.local',
        phone: user.phone || '0000000000',
        assigned_station_id: selectedStation,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        total_price: totalPrice,
        players: 1,
        status: 'pending',
        source: 'website',
        customer_id: user.customer_id,
        hold_token: token,
        expires_at: expires
      };

      const record = await pb.collection('bookings').create(bookingData);
      
      setPendingBookingId(record.id);
      setHoldToken(token);
      setExpiresAt(record.expires_at || expires);
      setStep('checkout');
      toast.success('Station locked for 5 minutes!');

    } catch (err: any) {
      console.error("Lock error:", err.response || err);
      let errorMsg = err.message || 'Failed to lock station.';
      if (err.response && err.response.data && Object.keys(err.response.data).length > 0) {
        errorMsg += " " + JSON.stringify(err.response.data);
      }
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    setLoading(true);
    try {
      await pb.collection('bookings').update(pendingBookingId, {
        status: 'confirmed',
        hold_token: holdToken // send back for backend validation
      });
      toast.success('Booking Confirmed!');
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Confirm error:", err);
      toast.error(err.message || 'Failed to confirm. The hold may have expired.');
      setStep('selection');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelHold = async (silent = false) => {
    setStep('selection');
    if (pendingBookingId) {
      try {
        await pb.collection('bookings').delete(pendingBookingId);
        if (!silent) toast.success('Hold released.');
      } catch (err) {
        // ignore errors on cancel
      }
    }
    setPendingBookingId('');
    setHoldToken('');
  };

  const selectedTypeObj = stationTypes.find(t => t.id === selectedType);
  const availableStationsForType = selectedTypeObj 
    ? stations.filter(s => (s.station_type === selectedTypeObj.name || s.station_type === selectedTypeObj.id) && !unavailableStationIds.includes(s.id))
    : [];

  const timeSlots = [];
  let currentSlot = startOfHour(addHours(new Date(), 1));
  for (let i = 0; i < 24; i++) {
    timeSlots.push(format(currentSlot, 'HH:mm'));
    currentSlot = addHours(currentSlot, 1);
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <UserLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">Book a Station</h1>
        
        {step === 'selection' ? (
          <Card>
            <CardHeader>
              <CardTitle>Select Details</CardTitle>
              <CardDescription>Choose your preferred gaming setup and time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-2">
                <Label>Station Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {stationTypes.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name} (₹{t.base_price}/hr)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input 
                    type="date" 
                    value={selectedDate} 
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => setSelectedDate(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(time => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Duration (Hours)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map(h => (
                      <SelectItem key={h.toString()} value={h.toString()}>{h} {h === 1 ? 'Hour' : 'Hours'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedType && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Available Stations</Label>
                  <Select value={selectedStation} onValueChange={setSelectedStation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a specific station" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStationsForType.length === 0 ? (
                        <SelectItem value="none" disabled>No stations available for this time</SelectItem>
                      ) : (
                        availableStationsForType.map(s => (
                          <SelectItem key={s.id} value={s.id}>Station {s.station_number}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    * Stations currently held by others are hidden live.
                  </p>
                </div>
              )}

              <Button 
                className="w-full mt-6" 
                size="lg" 
                onClick={handleLockStation}
                disabled={loading || !selectedStation || selectedStation === 'none'}
              >
                {loading ? 'Locking...' : checkingAvailability ? 'Checking availability...' : 'Lock Station'}
              </Button>

            </CardContent>
          </Card>
        ) : (
          <Card className="border-primary/50 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary/20">
              <div 
                className="h-full bg-primary transition-all duration-1000 ease-linear" 
                style={{ width: `${(timeLeft / 300) * 100}%` }}
              />
            </div>
            <CardHeader className="text-center pt-8">
              <CardTitle className="text-2xl">Confirm Your Booking</CardTitle>
              <CardDescription className="text-lg mt-2">
                Station held for <span className="font-bold text-primary">{formatTime(timeLeft)}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Station:</span>
                  <span className="font-semibold">{stations.find(s => s.id === selectedStation)?.station_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-semibold">{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-semibold">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-semibold">{duration} {parseInt(duration) === 1 ? 'Hour' : 'Hours'}</span>
                </div>
                <div className="pt-2 mt-2 border-t flex justify-between font-bold text-lg">
                  <span>Total Due:</span>
                  <span>₹{(stationTypes.find(t => t.id === selectedType)?.base_price || 0) * parseInt(duration)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button variant="outline" className="w-full" onClick={() => handleCancelHold()} disabled={loading}>
                Cancel Hold
              </Button>
              <Button className="w-full" size="lg" onClick={handleConfirmBooking} disabled={loading}>
                {loading ? 'Confirming...' : 'Confirm & Pay at Venue'}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </UserLayout>
  );
}