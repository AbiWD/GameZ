Created At: 2026-07-06T13:43:31Z
Completed At: 2026-07-06T13:43:31Z
File Path: `file:///D:/Ab/StarchData/GameZ/Website/src/pages/Book.tsx`
Total Lines: 207
Total Bytes: 7560
Showing lines 1 to 207
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
1: import { useState, useEffect } from 'react';
2: import { useSearchParams, useNavigate } from 'react-router-dom';
3: import { UserLayout } from '../components/UserLayout';
4: import { useAuth } from '../contexts/AuthContext';
5: import pb from '../lib/pocketbase';
6: import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
7: import { Button } from '../components/ui/button';
8: import { Input } from '../components/ui/input';
9: import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
10: import { Label } from '../components/ui/label';
11: import { toast } from 'sonner';
12: import { addHours, format, startOfHour, isBefore } from 'date-fns';
13: 
14: export default function Book() {
15:   const [searchParams] = useSearchParams();
16:   const { user } = useAuth();
17:   const navigate = useNavigate();
18: 
19:   const [stationTypes, setStationTypes] = useState<any[]>([]);
20:   const [stations, setStations] = useState<any[]>([]);
21:   
22:   const [selectedType, setSelectedType] = useState<string>(searchParams.get('type') || '');
23:   const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
24:   const [selectedTime, setSelectedTime] = useState<string>('');
25:   const [duration, setDuration] = useState<string>('1');
26:   const [selectedStation, setSelectedStation] = useState<string>('');
27:   
28:   const [loading, setLoading] = useState(false);
29:   const [checkingAvailability, setCheckingAvailability] = useState(false);
30: 
31:   useEffect(() => {
32:     const init = async () => {
33:       try {
34:         const types = await pb.collection('station_types').getFullList();
35:         setStationTypes(types);
36:         
37:         const st = await pb.collection('stations').getFullList({
38:           filter: 'status != "maintenance"'
39:         });
40:         setStations(st);
41:       } catch (err) {
42:         console.error(err);
43:       }
44:     };
45:     init();
46:   }, []);
47: 
48:   const handleBook = async () => {
49:     if (!selectedType || !selectedDate || !selectedTime || !selectedStation) {
50:       toast.error('Please fill all fields');
51:       return;
52:     }
53: 
54:     if (!user) {
55:       toast.error('Please login to complete booking');
56:       navigate('/login');
57:       return;
58:     }
59: 
60:     setLoading(true);
61:     try {
62:       const type = stationTypes.find(t => t.id === selectedType);
63:       const startDateTime = new Date(`${selectedDate}T${selectedTime}`);
64:       const endDateTime = addHours(startDateTime, parseInt(duration));
65:       
66:       const totalPrice = (type?.base_price || 0) * parseInt(duration);
67: 
68:       const bookingData = {
69:         name: user.name || user.username,
70:         email: user.email,
71:         phone: user.phone,
72:         station_type: selectedType,
73:         assigned_station_id: selectedStation,
74:         start_time: startDateTime.toISOString(),
75:         end_time: endDateTime.toISOString(),
76:         total_price: totalPrice,
77:         guests: 1,
78:         booking_reference: 'WEB-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
79:         status: 'confirmed',
80:         source: 'website',
81:         customer_id: user.customer_id
82:       };
83: 
84:       await pb.collection('bookings').create(bookingData);
85:       toast.success('Booking Confirmed!');
86:       navigate('/dashboard');
87: 
88:     } catch (err: any) {
89:       console.error(err);
90:       // Backend hook throws 400 if double booked
91:       toast.error(err.message || 'Failed to book. This slot might have just been taken.');
92:     } finally {
93:       setLoading(false);
94:     }
95:   };
96: 
97:   // Filter stations based on type
98:   const availableStationsForType = stations.filter(s => s.station_type === selectedType);
99: 
100:   // Generate time slots (next 24 hours, hourly)
101:   const timeSlots = [];
102:   let currentSlot = startOfHour(addHours(new Date(), 1));
103:   for (let i = 0; i < 24; i++) {
104:     timeSlots.push(format(currentSlot, 'HH:mm'));
105:     currentSlot = addHours(currentSlot, 1);
106:   }
107: 
108:   return (
109:     <UserLayout>
110:       <div className="container mx-auto px-4 py-8 max-w-2xl">
111:         <h1 className="text-3xl font-bold mb-8">Book a Station</h1>
112:         
113:         <Card>
114:           <CardHeader>
115:             <CardTitle>Select Details</CardTitle>
116:             <CardDescription>Choose your preferred gaming setup and time.</CardDescription>
117:           </CardHeader>
118:           <CardContent className="space-y-6">
119:             
120:             <div className="space-y-2">
121:               <Label>Station Type</Label>
122:               <Select value={selectedType} onValueChange={setSelectedType}>
123:                 <SelectTrigger>
124:                   <SelectValue placeholder="Select type" />
125:                 </SelectTrigger>
126:                 <SelectContent>
127:                   {stationTypes.map(t => (
128:                     <SelectItem key={t.id} value={t.id}>{t.name} (₹{t.base_price}/hr)</SelectItem>
129:                   ))}
130:                 </SelectContent>
131:               </Select>
132:             </div>
133: 
134:             <div className="grid grid-cols-2 gap-4">
135:               <div className="space-y-2">
136:                 <Label>Date</Label>
137:                 <Input 
138:                   type="date" 
139:                   value={selectedDate} 
140:                   min={format(new Date(), 'yyyy-MM-dd')}
141:                   onChange={(e) => setSelectedDate(e.target.value)} 
142:                 />
143:               </div>
144:               <div className="space-y-2">
145:                 <Label>Time</Label>
146:                 <Select value={selectedTime} onValueChange={setSelectedTime}>
147:                   <SelectTrigger>
148:                     <SelectValue placeholder="Select time" />
149:                   </SelectTrigger>
150:                   <SelectContent>
151:                     {timeSlots.map(time => (
152:                       <SelectItem key={time} value={time}>{time}</SelectItem>
153:                     ))}
154:                   </SelectContent>
155:                 </Select>
156:               </div>
157:             </div>
158: 
159:             <div className="space-y-2">
160:               <Label>Duration (Hours)</Label>
161:               <Select value={duration} onValueChange={setDuration}>
162:                 <SelectTrigger>
163:                   <SelectValue />
164:                 </SelectTrigger>
165:                 <SelectContent>
166:                   {[1, 2, 3, 4, 5, 6].map(h => (
167:                     <SelectItem key={h.toString()} value={h.toString()}>{h} {h === 1 ? 'Hour' : 'Hours'}</SelectItem>
168:                   ))}
169:                 </SelectContent>
170:               </Select>
171:             </div>
172: 
173:             {selectedType && (
174:               <div className="space-y-2 pt-4 border-t">
175:                 <Label>Available Stations</Label>
176:                 <Select value={selectedStation} onValueChange={setSelectedStation}>
177:                   <SelectTrigger>
178:                     <SelectValue placeholder="Select a specific station" />
179:                   </SelectTrigger>
180:                   <SelectContent>
181:                     {availableStationsForType.map(s => (
182:                       <SelectItem key={s.id} value={s.id}>Station {s.station_number}</SelectItem>
183:                     ))}
184:                   </SelectContent>
185:                 </Select>
186:                 <p className="text-xs text-muted-foreground mt-1">
187:                   * If the station is already booked for this time, the system will prevent the booking to avoid overlaps.
188:                 </p>
189:               </div>
190:             )}
191: 
192:             <Button 
193:               className="w-full mt-6" 
194:               size="lg" 
195:               onClick={handleBook}
196:               disabled={loading || !selectedStation}
197:             >
198:               {loading ? 'Confirming...' : 'Confirm Booking'}
199:             </Button>
200: 
201:           </CardContent>
202:         </Card>
203:       </div>
204:     </UserLayout>
205:   );
206: }
207: 
The above content shows the entire, complete file contents of the requested file.
