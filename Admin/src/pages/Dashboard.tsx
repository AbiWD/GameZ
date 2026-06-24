import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import pb from '@/lib/pocketbase';
import { DollarSign, Users, Calendar, Gamepad2, Play, Clock, ArrowRight, LayoutGrid, LayoutTemplate, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProperty } from '@/contexts/PropertyContext';
import { formatDistanceToNowStrict } from 'date-fns';

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  start_time: string;
  end_time: string;
  price: number;
  players: number;
  status: string;
  assigned_station_id: string;
  total_price: number;
  booking_reference?: string;
}

interface Station {
  id: string;
  station_number: string;
  station_type: string;
  status: string;
  price_per_hour: number;
  max_players: number;
  amenities: string[];
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { activeProperty } = useProperty();
  const [stats, setStats] = useState({
    activePlayers: 0,
    todayRevenue: 0,
    todaySessions: 0,
    upcomingReservations: 0,
    utilizationPercentage: 0,
    activeStationsCount: 0,
    totalStations: 0,
  });
  
  const [layoutPref, setLayoutPref] = useState<'zones' | 'unified'>(() => {
    return (localStorage.getItem('gamez_dashboard_layout') as 'zones' | 'unified') || 'unified';
  });

  const handleLayoutChange = (pref: 'zones' | 'unified') => {
    setLayoutPref(pref);
    localStorage.setItem('gamez_dashboard_layout', pref);
  };
  
  const [stations, setStations] = useState<Station[]>([]);
  const [activeBookings, setActiveBookings] = useState<Record<string, Booking>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Auto-refresh the dashboard every minute to update remaining times
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeProperty) {
      fetchDashboardData();
    }
  }, [activeProperty]);

  const fetchDashboardData = async () => {
    try {
      const propertyFilter = `property_id = "${activeProperty?.id}"`;
      const now = new Date();
      
      const todayStart = new Date(now);
      todayStart.setHours(0,0,0,0);
      const todayStartStr = todayStart.toISOString().replace('T', ' ').substring(0, 19) + 'Z';
      
      const todayEnd = new Date(now);
      todayEnd.setHours(23,59,59,999);
      const todayEndStr = todayEnd.toISOString().replace('T', ' ').substring(0, 19) + 'Z';

      const nowStr = now.toISOString().replace('T', ' ').substring(0, 19) + 'Z';

      const [
        allStationsData,
        todayBookingsData,
        currentActiveData,
        upcomingData
      ] = await Promise.all([
        pb.collection('stations').getFullList({ sort: '+station_number', filter: propertyFilter, requestKey: null }),
        pb.collection('bookings').getFullList({ filter: `${propertyFilter} && start_time >= "${todayStartStr}" && start_time <= "${todayEndStr}" && status != "cancelled"`, requestKey: null }),
        pb.collection('bookings').getFullList({ filter: `${propertyFilter} && start_time <= "${nowStr}" && end_time >= "${nowStr}" && status != "cancelled" && status != "completed"`, requestKey: null }),
        pb.collection('bookings').getList(1, 1, { filter: `${propertyFilter} && start_time > "${nowStr}" && start_time <= "${todayEndStr}" && status != "cancelled"`, requestKey: null })
      ]);

      const todayRevenue = todayBookingsData.reduce((sum, b) => sum + (b.total_price || 0), 0);
      const activePlayers = currentActiveData.reduce((sum, b) => sum + (b.players || 0), 0);

      // Create a map of stationId -> current active booking
      const activeMap: Record<string, Booking> = {};
      currentActiveData.forEach(b => {
        if (b.assigned_station_id) {
          activeMap[b.assigned_station_id] = b as unknown as Booking;
        }
      });

      // MOCK DATA INJECTION FOR VISUALIZATION
      const mockActiveMap: Record<string, Booking> = { ...activeMap };
      
      // Find IDs for PS-1, POOL-1, CARROM-1 to inject mock sessions
      const ps1 = allStationsData.find(s => s.station_number === 'PS-1');
      const pool1 = allStationsData.find(s => s.station_number === 'POOL-1');
      const carrom1 = allStationsData.find(s => s.station_number === 'CARROM-1');

      if (ps1) {
        mockActiveMap[ps1.id] = {
          id: 'mock_1', name: 'Alex M. (Walk-in)', email: '', phone: '',
          start_time: new Date(Date.now() - 55 * 60000).toISOString(), // started 55 mins ago
          end_time: new Date(Date.now() + 5 * 60000).toISOString(), // ends in 5 mins (RED)
          price: 200, players: 2, status: 'checked_in', assigned_station_id: ps1.id, total_price: 200
        };
      }
      if (pool1) {
        mockActiveMap[pool1.id] = {
          id: 'mock_2', name: 'Sarah T. (Online)', email: '', phone: '',
          start_time: new Date(Date.now() - 40 * 60000).toISOString(), // started 40 mins ago
          end_time: new Date(Date.now() + 20 * 60000).toISOString(), // ends in 20 mins (AMBER)
          price: 300, players: 4, status: 'checked_in', assigned_station_id: pool1.id, total_price: 600
        };
      }
      if (carrom1) {
        mockActiveMap[carrom1.id] = {
          id: 'mock_3', name: 'Local Tournament', email: '', phone: '',
          start_time: new Date(Date.now() - 60 * 60000).toISOString(), // started 1 hr ago
          end_time: new Date(Date.now() + 120 * 60000).toISOString(), // ends in 2 hrs (GREEN)
          price: 100, players: 4, status: 'checked_in', assigned_station_id: carrom1.id, total_price: 500
        };
      }

      const activeStationsCount = Object.keys(mockActiveMap).length;
      const totalStations = allStationsData.length;
      const utilizationPercentage = totalStations > 0 ? Math.round((activeStationsCount / totalStations) * 100) : 0;

      setStats({
        activePlayers: activePlayers + 10, // Add mock players
        todayRevenue: todayRevenue + 1300, // Add mock revenue
        todaySessions: todayBookingsData.length + 3,
        upcomingReservations: upcomingData.totalItems + 5, // Mock upcoming
        utilizationPercentage,
        activeStationsCount,
        totalStations,
      });

      setStations(allStationsData as unknown as Station[]);
      setActiveBookings(mockActiveMap);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setFetchError(error?.response?.message || error?.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Active Players',
      value: stats.activePlayers,
      icon: Users,
    },
    {
      title: "Today's Revenue",
      value: `₹${stats.todayRevenue.toLocaleString()}`,
      icon: DollarSign,
    },
    {
      title: "Today's Sessions",
      value: stats.todaySessions,
      icon: Gamepad2,
    },
    {
      title: 'Upcoming Today',
      value: stats.upcomingReservations,
      icon: Calendar,
    },
  ];

  // Group stations by type
  const stationsByType = stations.reduce((acc, station) => {
    if (!acc[station.station_type]) acc[station.station_type] = [];
    acc[station.station_type].push(station);
    return acc;
  }, {} as Record<string, Station[]>);

  const extendSession = async (bookingId: string, minutes: number) => {
    try {
      if (bookingId.startsWith('mock_')) {
        const b = activeBookings[bookingId];
        const newEnd = new Date(new Date(b.end_time).getTime() + minutes * 60000).toISOString();
        setActiveBookings({...activeBookings, [bookingId]: {...b, end_time: newEnd}});
        return;
      }
      
      const record = await pb.collection('bookings').getOne(bookingId);
      const newEnd = new Date(new Date(record.end_time).getTime() + minutes * 60000).toISOString();
      await pb.collection('bookings').update(bookingId, { end_time: newEnd });
      fetchDashboardData();
    } catch(e) {
      console.error(e);
      alert("Failed to extend session");
    }
  };

  const endSession = async (bookingId: string) => {
    if (!window.confirm("Are you sure you want to end this session now?")) return;
    try {
      if (bookingId.startsWith('mock_')) {
        const newMap = {...activeBookings};
        delete newMap[bookingId];
        setActiveBookings(newMap);
        return;
      }
      
      const record = await pb.collection('bookings').getOne(bookingId);
      const updateData: any = { status: 'completed', end_time: new Date().toISOString() };
      
      if (record.booking_reference?.startsWith('OT-')) {
         const station = stations.find(s => s.id === record.assigned_station_id);
         if (station) {
            const elapsedMins = Math.floor((new Date().getTime() - new Date(record.start_time).getTime()) / 60000);
            updateData.price = (elapsedMins / 60) * station.price_per_hour;
         }
      }

      await pb.collection('bookings').update(bookingId, updateData);
      fetchDashboardData();
    } catch(e) {
      console.error(e);
      alert("Failed to end session");
    }
  };

  const handleStationClick = (station: Station, activeBooking?: Booking) => {
    if (station.status === 'maintenance') return;
    
    if (activeBooking) {
      navigate(`/admin/session-management?station=${station.id}`);
    } else {
      navigate(`/admin/create-booking?station=${station.id}&type=walk-in`);
    }
  };

  const renderStationCard = (station: Station, activeBooking?: Booking, showTypeBadge = false) => {
    let cardStyle = '';
    let remainingMins = 0;
    let progressPercent = 0;
    let barColor = "bg-emerald-500";
    let textColor = "text-emerald-900";
    let mutedColor = "text-emerald-700/70";
    let borderColor = "border-emerald-200";
    let headerBg = "bg-emerald-100/50";
    
    const isOpenTimer = activeBooking?.booking_reference?.startsWith('OT-') || false;

    if (activeBooking && !isOpenTimer) {
       remainingMins = Math.floor((new Date(activeBooking.end_time).getTime() - currentTime.getTime()) / 60000);
       const totalMins = Math.floor((new Date(activeBooking.end_time).getTime() - new Date(activeBooking.start_time).getTime()) / 60000);
       progressPercent = Math.min(100, Math.max(0, ((totalMins - remainingMins) / totalMins) * 100));

       if (remainingMins < 10) {
         barColor = "bg-red-500";
         cardStyle = 'bg-red-50 border-red-500 border-2 shadow-lg shadow-red-500/20';
         textColor = "text-red-950";
         mutedColor = "text-red-800/80";
         borderColor = "border-red-200";
         headerBg = "bg-red-100/80";
       } else if (remainingMins <= 30) {
         barColor = "bg-amber-500";
         cardStyle = 'bg-amber-50 border-amber-300 shadow-md shadow-amber-500/10';
         textColor = "text-amber-900";
         mutedColor = "text-amber-700/80";
         borderColor = "border-amber-200";
         headerBg = "bg-amber-100/50";
       } else {
         barColor = "bg-emerald-500";
         cardStyle = 'bg-emerald-50 border-emerald-300 shadow-md shadow-emerald-500/10';
         textColor = "text-emerald-900";
         mutedColor = "text-emerald-700/80";
         borderColor = "border-emerald-200";
         headerBg = "bg-emerald-100/50";
       }
    } else if (activeBooking && isOpenTimer) {
       barColor = "bg-emerald-400";
       cardStyle = 'bg-emerald-50 border-emerald-300 shadow-md shadow-emerald-500/10';
       textColor = "text-emerald-900";
       mutedColor = "text-emerald-700/80";
       borderColor = "border-emerald-200";
       headerBg = "bg-emerald-100/50";
       progressPercent = 100;
    } else if (station.status === 'maintenance') {
       cardStyle = 'bg-zinc-100 text-zinc-500 border-zinc-200';
    } else {
       cardStyle = 'bg-white border-border hover:border-emerald-400 cursor-pointer transition-all hover:shadow-md';
    }

    return (
      <div 
        key={station.id}
        onClick={() => {
           if (!activeBooking) handleStationClick(station, activeBooking);
        }}
        className={`group relative rounded-2xl p-4 sm:p-5 border ${cardStyle} transition-colors`}
      >
        <div className="flex justify-between items-center mb-4 gap-2">
          <div className={`rounded-xl px-3 py-2 shadow-sm border flex flex-col min-w-0 ${activeBooking ? `${headerBg} ${borderColor}` : 'bg-background border-border/50'}`}>
            <span className={`font-bold text-base sm:text-lg leading-none whitespace-nowrap overflow-hidden text-ellipsis ${activeBooking ? textColor : ''}`}>{station.station_number}</span>
            {showTypeBadge && (
              <span className={`text-[10px] uppercase font-bold tracking-wider mt-1 truncate ${activeBooking ? mutedColor : 'text-muted-foreground'}`}>
                {station.station_type}
              </span>
            )}
          </div>
          <div className="shrink-0">
          {activeBooking ? (
             isOpenTimer ? (
               <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500 text-emerald-50 shadow-sm animate-pulse`}>
                 Active Timer
               </span>
             ) : remainingMins < 10 
               ? <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-red-600 shadow-sm animate-pulse border border-red-200">
                   {remainingMins > 0 ? `${remainingMins} min left` : '0 min left'}
                 </span>
               : <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${remainingMins <= 30 ? 'bg-amber-500 text-amber-50' : 'bg-emerald-500 text-emerald-50'} shadow-sm`}>
                   In session
                 </span>
          ) : station.status === 'maintenance' ? (
             <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-200 text-zinc-600">Maintenance</span>
          ) : (
             <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-emerald-600 border border-emerald-200">Available</span>
          )}
          </div>
        </div>
        
        <div className="min-h-[60px]">
          {activeBooking ? (
            <div className="space-y-3">
              <div>
                <div className={`font-bold truncate text-sm ${textColor}`}>
                  {activeBooking.name || 'Walk-in Player'}
                </div>
                <div className={`flex flex-wrap items-center text-xs mt-1 ${mutedColor}`}>
                  {isOpenTimer ? (() => {
                     const elapsedMins = Math.floor((currentTime.getTime() - new Date(activeBooking.start_time).getTime()) / 60000);
                     const currentCost = (elapsedMins / 60) * (station.price_per_hour || 0);
                     const hrs = Math.floor(elapsedMins / 60);
                     const mins = elapsedMins % 60;
                     const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                     return (
                        <>
                          <span className="font-medium">{timeStr} elapsed</span>
                          <span className="mx-1.5 opacity-50">•</span>
                          <span className="font-bold text-emerald-600">₹{Math.round(currentCost)} so far</span>
                        </>
                     );
                  })() : remainingMins >= 10 ? (
                    <>
                      <span className="font-medium">{remainingMins} min left</span>
                      <span className="mx-1.5 opacity-50">•</span>
                      <span>ends {new Date(activeBooking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </>
                  ) : remainingMins <= 0 ? (
                    <>
                      <span className="font-bold text-red-600 text-sm uppercase tracking-wider">TIME UP</span>
                      <span className="mx-1.5 opacity-50">•</span>
                      <span>ends {new Date(activeBooking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{remainingMins} min left</span>
                      <span className="mx-1.5 opacity-50">•</span>
                      <span>ends {new Date(activeBooking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </>
                  )}
                </div>
              </div>
              <div className={`w-full ${headerBg} rounded-full h-1.5 overflow-hidden`}>
                <div 
                  className={`${barColor} h-full rounded-full transition-all duration-1000 ease-linear ${isOpenTimer ? 'animate-pulse' : ''}`} 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              
              <div className={`grid grid-cols-3 gap-2 mt-4 pt-4 border-t ${borderColor}`}>
                 {!isOpenTimer && remainingMins < 10 && (
                    <div className="col-span-3 -mt-2 mb-1">
                      <p className="text-[10px] text-red-500 font-bold tracking-wider">Extend or end session now</p>
                    </div>
                 )}
                 {!isOpenTimer && <Button size="sm" variant="outline" className={`h-8 text-xs bg-white/50 border-black/10 hover:bg-white shadow-sm ${textColor}`} onClick={(e) => { e.stopPropagation(); extendSession(activeBooking.id, 30); }}>+30m</Button>}
                 {!isOpenTimer && <Button size="sm" variant="outline" className={`h-8 text-xs bg-white/50 border-black/10 hover:bg-white shadow-sm ${textColor}`} onClick={(e) => { e.stopPropagation(); extendSession(activeBooking.id, 60); }}>+1h</Button>}
                 <Button size="sm" variant="outline" className={`h-8 text-xs ${isOpenTimer ? 'col-span-3 bg-red-50 border-red-200 text-red-600 hover:bg-red-100' : ''} ${!isOpenTimer && remainingMins < 10 ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' : !isOpenTimer ? 'bg-white/50 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300' : ''} shadow-sm`} onClick={(e) => { e.stopPropagation(); endSession(activeBooking.id); }}>End {isOpenTimer && 'Timer'}</Button>
              </div>
            </div>
          ) : station.status !== 'maintenance' ? (
            <div className="flex flex-col justify-center h-full" onClick={() => handleStationClick(station, activeBooking)}>
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Ready for Session</span>
              <span className="text-xs text-muted-foreground mt-0.5">Click to start walk-in (₹{station.price_per_hour}/hr)</span>
            </div>
          ) : (
            <div className="flex flex-col justify-center h-full">
              <span className="text-sm font-medium text-zinc-500">Out of Order</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Live floor</h1>
          <p className="text-muted-foreground mt-1">Real-time monitoring for {activeProperty?.name || 'your gaming cafe'}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex bg-secondary p-1 rounded-xl border border-border/50">
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleLayoutChange('zones')} 
                className={`rounded-lg px-3 ${layoutPref === 'zones' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LayoutTemplate className="w-4 h-4 mr-2" />
                Zones
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleLayoutChange('unified')} 
                className={`rounded-lg px-3 ${layoutPref === 'unified' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Grid
              </Button>
            </div>
          </div>
          <Button variant="outline" className="bg-background shadow-sm" onClick={() => navigate('/admin/create-booking?type=online')}>
            Advance booking
          </Button>
          <Button className="shadow-sm bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate('/admin/create-booking?type=walk-in')}>
            <Play className="w-4 h-4 mr-2 fill-current" />
            New walk-in session
          </Button>
        </div>
      </div>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <Card 
              key={stat.title} 
              className="bg-card border-border shadow-sm rounded-2xl transition-all duration-300 hover:shadow-md"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-5">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground uppercase">
                  {stat.title}
                </CardTitle>
                <div className="bg-primary/10 rounded-lg p-1.5 sm:p-2 text-primary hidden sm:block">
                  <stat.icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-5 pb-4 sm:px-5 pt-0">
                <div className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Dynamic Station Floor Plan */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
          </div>
        ) : fetchError ? (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 shadow-sm">
          <div className="mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          </div>
          <div>
            <h3 className="font-bold">Error loading dashboard</h3>
            <p className="text-sm mt-1">{fetchError}</p>
          </div>
        </div>
        ) : (
          <div className="mt-8 animate-fade-in">
            {/* NEW: Floor Utilisation Header */}
            <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Floor Occupancy</h3>
                  <div className="flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>Active ({Object.values(activeBookings).filter(b => Math.floor((new Date(b.end_time).getTime() - currentTime.getTime()) / 60000) > 30).length})</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>Warning ({Object.values(activeBookings).filter(b => { const r = Math.floor((new Date(b.end_time).getTime() - currentTime.getTime()) / 60000); return r <= 30 && r >= 10; }).length})</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>Ending soon ({Object.values(activeBookings).filter(b => Math.floor((new Date(b.end_time).getTime() - currentTime.getTime()) / 60000) < 10).length})</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800"></div>Available ({stations.length - Object.keys(activeBookings).length - stations.filter(s => s.status === 'maintenance').length})</div>
                  </div>
               </div>
               <div className="flex-1 max-w-md w-full">
                  <div className="flex justify-end items-end mb-3">
                     <span className="text-sm font-bold">{stats.activeStationsCount} / {stats.totalStations} stations active</span>
                  </div>
                  <div className="flex gap-1 h-2.5 w-full">
                    {[...stations].sort((a, b) => {
                       const getScore = (station: Station) => {
                          const booking = activeBookings[station.id];
                          if (booking) {
                             const remain = Math.floor((new Date(booking.end_time).getTime() - currentTime.getTime()) / 60000);
                             if (remain < 10) return 1;
                             if (remain <= 30) return 2;
                             return 3;
                          }
                          if (station.status === 'maintenance') return 5;
                          return 4;
                       };
                       return getScore(a) - getScore(b);
                    }).map(station => {
                       const booking = activeBookings[station.id];
                       let color = 'bg-zinc-200 dark:bg-zinc-800';
                       if (station.status === 'maintenance') color = 'bg-zinc-100 dark:bg-zinc-900';
                       if (booking) {
                         const isOpenTimer = booking.booking_reference?.startsWith('OT-');
                         if (isOpenTimer) {
                            color = 'bg-emerald-400';
                         } else {
                            const remain = Math.floor((new Date(booking.end_time).getTime() - currentTime.getTime()) / 60000);
                            if (remain < 10) color = 'bg-red-500';
                            else if (remain <= 30) color = 'bg-amber-500';
                            else color = 'bg-emerald-500';
                         }
                       }
                       return <div key={`seg-${station.id}`} className={`flex-1 rounded-sm ${color}`}></div>
                    })}
                  </div>
               </div>
            </div>
            
            {layoutPref === 'zones' ? (
              <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6">
                {Object.entries(stationsByType).map(([type, typeStations]) => (
                  <div key={type} className="break-inside-avoid bg-card border border-border/60 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-5">
                      <h2 className="text-xl font-bold text-foreground">{type}</h2>
                      <div className="h-px bg-border flex-1 ml-2 rounded"></div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {typeStations.map((station) => {
                        const activeBooking = activeBookings[station.id];
                        return renderStationCard(station, activeBooking, true);
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {stations.map(station => {
                  const activeBooking = activeBookings[station.id];
                  return renderStationCard(station, activeBooking, true);
                })}
              </div>
            )}
            
            {stations.length === 0 && (
              <div className="text-center py-12 text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
                <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No stations configured yet.</p>
                <Button variant="link" onClick={() => navigate('/admin/stations')} className="mt-2">Go to Stations Setup</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
