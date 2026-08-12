import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import pb from '@/lib/pocketbase';
import { IndianRupee, Users, Calendar, Gamepad2, Play, Clock, ArrowRight, LayoutGrid, LayoutTemplate, Activity, CreditCard, Banknote, Smartphone, Star, ArrowDownUp, GripHorizontal, CalendarX, Phone, Mail, UserCheck, Ticket } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { useNavigate } from 'react-router-dom';
import { useProperty } from '@/contexts/PropertyContext';
import { usePropertyFilter } from '@/hooks/usePropertyFilter';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNowStrict } from 'date-fns';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn, calculateOpenTimerCost } from "../lib/utils";

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  start_time: string;
  end_time: string;

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

function SortableZone({ id, children, isReordering, isPinned, togglePin }: { id: string, children: React.ReactNode, isReordering: boolean, isPinned: boolean, togglePin: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="break-inside-avoid bg-card border border-border/60 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all relative">
      <div className="absolute top-5 right-5 flex items-center gap-1">
        <button onClick={() => togglePin(id)} className={`p-1.5 rounded-full transition-colors ${isPinned ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20' : 'text-muted-foreground hover:bg-muted'}`} title="Pin to top">
          <Star className="w-4 h-4" fill={isPinned ? "currentColor" : "none"} />
        </button>
        {isReordering && (
          <button {...attributes} {...listeners} className="p-1.5 rounded-full text-muted-foreground hover:bg-muted cursor-grab active:cursor-grabbing">
            <GripHorizontal className="w-4 h-4" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { activeProperty } = useProperty();
  const propertyFilter = usePropertyFilter();
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
  
  const [sortMode, setSortMode] = useLocalStorage<'size' | 'busiest' | 'custom'>('gamez_dashboard_sort_mode', 'size');
  const [pinnedZones, setPinnedZones] = useLocalStorage<string[]>('gamez_dashboard_pinned_zones', []);
  const [customZoneOrder, setCustomZoneOrder] = useLocalStorage<string[]>('gamez_dashboard_custom_order', []);
  const [isReordering, setIsReordering] = useState(false);
  const [sessionToEnd, setSessionToEnd] = useState<{ bookingId: string, mode: string } | null>(null);
  
  // Grid View States
  const [gridStatusFilter, setGridStatusFilter] = useLocalStorage<string>('gamez_dashboard_grid_status', 'all');
  const [gridTypeFilter, setGridTypeFilter] = useLocalStorage<string>('gamez_dashboard_grid_type', 'all');
  const [gridSort, setGridSort] = useLocalStorage<'number' | 'urgency' | 'status'>('gamez_dashboard_grid_sort', 'number');
  const [manualCompactMode, setManualCompactMode] = useLocalStorage<'auto' | 'detailed' | 'compact'>('gamez_dashboard_grid_compact', 'auto');

  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [stations, setStations] = useState<Station[]>([]);
  const [activeBookings, setActiveBookings] = useState<Record<string, Booking>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // POS State
  const [selectedSession, setSelectedSession] = useState<{station: Station, booking: Booking} | null>(null);
  const [paymentMode, setPaymentMode] = useState<string>('upi');
  const [durationStep, setDurationStep] = useState<30 | 60>(30);
  const [lastAdjustmentDelta, setLastAdjustmentDelta] = useState<string | null>(null);

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
      const propertyFilter = '';
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
        pb.collection('stations').getFullList({ sort: '+station_number', filter: propertyFilter, expand: 'station_type', requestKey: null }),
        pb.collection('bookings').getFullList({ filter: propertyFilter ? `(${propertyFilter}) && start_time >= "${todayStartStr}" && start_time <= "${todayEndStr}" && status != "cancelled"` : `start_time >= "${todayStartStr}" && start_time <= "${todayEndStr}" && status != "cancelled"`, requestKey: null }),
        pb.collection('bookings').getFullList({ filter: propertyFilter ? `(${propertyFilter}) && start_time <= "${nowStr}" && end_time >= "${nowStr}" && status != "cancelled" && status != "completed"` : `start_time <= "${nowStr}" && end_time >= "${nowStr}" && status != "cancelled" && status != "completed"`, requestKey: null }),
        pb.collection('bookings').getList(1, 1, { filter: propertyFilter ? `(${propertyFilter}) && start_time > "${nowStr}" && start_time <= "${todayEndStr}" && status != "cancelled"` : `start_time > "${nowStr}" && start_time <= "${todayEndStr}" && status != "cancelled"`, requestKey: null })
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

      const activeStationsCount = allStationsData.filter(s => !!activeMap[s.id] || s.status === 'occupied').length;
      const totalStations = allStationsData.length;
      const utilizationPercentage = totalStations > 0 ? Math.round((activeStationsCount / totalStations) * 100) : 0;

      setStats({
        activePlayers: activePlayers,
        todayRevenue: todayRevenue,
        todaySessions: todayBookingsData.length,
        upcomingReservations: upcomingData.totalItems,
        utilizationPercentage,
        activeStationsCount,
        totalStations,
      });

      setStations(allStationsData as unknown as Station[]);
      setActiveBookings(activeMap);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setFetchError(error?.response?.message || error?.message || 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const { userRole } = useAuth();

  const statCards = [
    {
      title: 'Active Players',
      value: stats.activePlayers,
      icon: Users,
    },
    ...(userRole === 'admin' ? [{
      title: "Today's Revenue",
      value: `₹${stats.todayRevenue.toLocaleString()}`,
      icon: IndianRupee,
    }] : []),
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

  // Toggle pinning a zone
  const togglePin = (type: string) => {
    setPinnedZones(prev => prev.includes(type) ? prev.filter(p => p !== type) : [...prev, type]);
  };

  // Drag and drop end handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCustomZoneOrder((items) => {
        // If we don't have a custom order yet, initialize it from current sorted order
        const currentOrder = items.length > 0 ? items : sortedZones.map(z => z[0]);
        const oldIndex = currentOrder.indexOf(active.id as string);
        const newIndex = currentOrder.indexOf(over.id as string);
        return arrayMove(currentOrder, oldIndex, newIndex);
      });
      setSortMode('custom');
    }
  };

  // Group stations by type
  const stationsByType = stations.reduce((acc, station) => {
    if (!acc[station.station_type]) acc[station.station_type] = [];
    acc[station.station_type].push(station);
    return acc;
  }, {} as Record<string, Station[]>);

  // Advanced Sorting Logic
  const sortedZones = Object.entries(stationsByType).sort(([typeA, stationsA], [typeB, stationsB]) => {
    const aPinned = pinnedZones.includes(typeA);
    const bPinned = pinnedZones.includes(typeB);
    
    // 1. Pinned Zones ALWAYS go first
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    // 2. Based on current Sort Mode
    if (sortMode === 'custom' && customZoneOrder.length > 0) {
      const idxA = customZoneOrder.indexOf(typeA);
      const idxB = customZoneOrder.indexOf(typeB);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1; // A is custom, B is not
      if (idxB !== -1) return 1;  // B is custom, A is not
    } else if (sortMode === 'busiest') {
      const aActive = stationsA.filter(s => activeBookings[s.id]).length;
      const bActive = stationsB.filter(s => activeBookings[s.id]).length;
      const aPct = stationsA.length > 0 ? aActive / stationsA.length : 0;
      const bPct = stationsB.length > 0 ? bActive / stationsB.length : 0;
      // Sort by highest occupancy percentage first
      if (Math.abs(bPct - aPct) > 0.01) return bPct - aPct;
    }
    
    // 3. Default Fallback: Sort by Size (Total stations descending)
    return stationsB.length - stationsA.length;
  });

  // Grid View Logic
  const filteredGridStations = stations.filter(station => {
    if (gridTypeFilter !== 'all' && station.station_type !== gridTypeFilter) return false;
    
    if (gridStatusFilter !== 'all') {
      const activeBooking = activeBookings[station.id];
      const isOccupied = !!activeBooking || station.status === 'occupied';
      const isMaintenance = station.status === 'maintenance';
      
      if (gridStatusFilter === 'available' && (isOccupied || isMaintenance)) return false;
      if (gridStatusFilter === 'occupied' && !isOccupied) return false;
      if (gridStatusFilter === 'maintenance' && !isMaintenance) return false;
      if (gridStatusFilter === 'ending_soon') {
        if (!activeBooking) return false;
        const remain = Math.floor((new Date(activeBooking.end_time).getTime() - currentTime.getTime()) / 60000);
        if (remain > 15) return false;
      }
    }
    return true;
  });

  const sortedGridStations = [...filteredGridStations].sort((a, b) => {
    if (gridSort === 'urgency') {
      const aBooking = activeBookings[a.id];
      const bBooking = activeBookings[b.id];
      const aRemain = aBooking ? Math.floor((new Date(aBooking.end_time).getTime() - currentTime.getTime()) / 60000) : 9999;
      const bRemain = bBooking ? Math.floor((new Date(bBooking.end_time).getTime() - currentTime.getTime()) / 60000) : 9999;
      return aRemain - bRemain;
    }
    if (gridSort === 'status') {
      const aScore = a.status === 'maintenance' ? 3 : (activeBookings[a.id] ? 2 : 1);
      const bScore = b.status === 'maintenance' ? 3 : (activeBookings[b.id] ? 2 : 1);
      if (aScore !== bScore) return aScore - bScore;
    }
    // Default fallback to prefix and number
    const aNum = parseInt(a.station_number.replace(/\D/g, '')) || 0;
    const bNum = parseInt(b.station_number.replace(/\D/g, '')) || 0;
    const aPrefix = a.station_number.replace(/[^A-Za-z]/g, '');
    const bPrefix = b.station_number.replace(/[^A-Za-z]/g, '');
    
    if (aPrefix !== bPrefix) {
      return aPrefix.localeCompare(bPrefix);
    }
    return aNum - bNum;
  });

  const isCompactView = manualCompactMode === 'auto' ? stations.length > 12 : manualCompactMode === 'compact';

  const renderCompactStationCard = (station: Station, activeBooking?: Booking) => {
    const isMaintenance = station.status === 'maintenance';
    
    let colorClass = 'bg-zinc-100 dark:bg-zinc-900 border-border/50 text-muted-foreground';
    let pulseClass = '';
    
    if (activeBooking) {
       const isOpenTimer = activeBooking.booking_reference?.startsWith('OT-');
       if (isOpenTimer) {
         colorClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
       } else {
         const remain = Math.floor((new Date(activeBooking.end_time).getTime() - currentTime.getTime()) / 60000);
         if (remain < 10) {
           colorClass = 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400';
           pulseClass = 'animate-pulse';
         } else if (remain <= 30) {
           colorClass = 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400';
         } else {
           colorClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
         }
       }
    } else if (station.status === 'occupied') {
       colorClass = 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400';
    } else if (!isMaintenance) {
       colorClass = 'bg-card border-border hover:border-primary/30 text-foreground';
    }

    return (
      <div 
        key={station.id} 
        onClick={() => handleStationClick(station, activeBooking)}
        className={`relative flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${colorClass} ${pulseClass}`}
      >
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 opacity-70" />
          <div className="font-bold text-lg">{station.station_number}</div>
        </div>
        {activeBooking && (
          <div className="text-xs font-bold bg-background/50 px-2 py-1 rounded-md">
            {activeBooking.booking_reference?.startsWith('OT-') 
              ? formatDistanceToNowStrict(new Date(activeBooking.start_time)) 
              : `${Math.floor((new Date(activeBooking.end_time).getTime() - currentTime.getTime()) / 60000)}m left`}
          </div>
        )}
        {isMaintenance && <div className="text-xs font-bold uppercase tracking-wider opacity-70">Maint</div>}
      </div>
    );
  };

  const extendSession = async (bookingId: string, minutes: number) => {
    try {
      const record = await pb.collection('bookings').getOne(bookingId);
      const newEndMs = new Date(record.end_time).getTime() + minutes * 60000;
      const startMs = new Date(record.start_time).getTime();
      
      if (newEndMs < startMs + 60000) {
        toast({
          title: "Minimum Duration Limit",
          description: "Cannot reduce session duration below 1 minute from start time.",
          variant: "destructive",
        });
        return;
      }

      const newEnd = new Date(newEndMs).toISOString();
      await pb.collection('bookings').update(bookingId, { end_time: newEnd });
      
      if (selectedSession && selectedSession.booking.id === bookingId) {
          setSelectedSession({...selectedSession, booking: {...selectedSession.booking, end_time: newEnd}});
      }

      const pricePerHr = selectedSession?.station.price_per_hour || 100;
      const costDelta = Math.round((Math.abs(minutes) / 60) * pricePerHr);
      const absMins = Math.abs(minutes);
      const durationLabel = absMins >= 60 ? `${absMins / 60}h` : `${absMins}m`;
      const label = minutes > 0 ? `+${durationLabel} (+₹${costDelta})` : `−${durationLabel} (−₹${costDelta})`;
      setLastAdjustmentDelta(label);

      toast({
        title: minutes > 0 ? "Session Extended" : "Session Reduced",
        description: `Adjusted duration by ${label}`,
      });

      fetchDashboardData();
    } catch(e) {
      console.error(e);
      toast({
        title: "Adjustment Failed",
        description: "Failed to adjust session time. Please try again.",
        variant: "destructive",
      });
    }
  };

  const confirmEndSession = async () => {
    if (!sessionToEnd) return;
    const { bookingId, mode } = sessionToEnd;
    try {
      
      const record = await pb.collection('bookings').getOne(bookingId);
      
      let finalPrice = record.total_price || 0;
      if (record.booking_reference?.startsWith('OT-')) {
         const station = stations.find(s => s.id === record.assigned_station_id);
         if (station) {
            finalPrice = calculateOpenTimerCost(record.start_time, station.price_per_hour, new Date());
         }
      }

      const updateData: any = { 
        status: 'completed', 
        end_time: new Date().toISOString(),
        payment_mode: mode,
        payment_status: 'paid',
        amount_paid: finalPrice,
        total_price: finalPrice
      };

      await pb.collection('bookings').update(bookingId, updateData);
      
      // Update CRM Customer Stats
      if (record.customer_id) {
        try {
          const customer = await pb.collection('portal_users').getOne(record.customer_id);
          await pb.collection('portal_users').update(record.customer_id, {
            total_visits: (customer.total_visits || 0) + 1,
            total_spent: (customer.total_spent || 0) + finalPrice
          });
        } catch (err) {
          console.error("Failed to update CRM customer stats:", err);
        }
      }

      // Update station status to available
      await pb.collection('stations').update(record.assigned_station_id, { status: 'available' });

      setSelectedSession(null);
      setSessionToEnd(null);
      fetchDashboardData();
      toast({ title: 'Session Ended', description: 'Payment collected successfully.' });
    } catch(e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to end session', variant: 'destructive' });
    }
  };

  const endSession = (bookingId: string, mode: string) => {
    setSessionToEnd({ bookingId, mode });
  };

  const handleStationClick = (station: Station, activeBooking?: Booking) => {
    if (station.status === 'maintenance') return;
    
    if (activeBooking) {
      setSelectedSession({ station, booking: activeBooking });
      setPaymentMode('upi');
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
    } else if (station.status === 'occupied') {
       cardStyle = 'bg-amber-50 border-amber-300 shadow-md shadow-amber-500/10';
       textColor = "text-amber-900";
       mutedColor = "text-amber-700/80";
       borderColor = "border-amber-200";
       headerBg = "bg-amber-100/50";
    } else if (station.status === 'maintenance') {
       cardStyle = 'bg-zinc-100 text-zinc-500 border-zinc-200';
    } else {
       cardStyle = 'bg-white border-border hover:border-emerald-400 cursor-pointer transition-all hover:shadow-md';
    }

    return (
      <div 
        key={station.id}
        onClick={() => handleStationClick(station, activeBooking)}
        className={`group relative rounded-2xl p-4 sm:p-5 border ${cardStyle} transition-colors`}
      >
        <div className="flex justify-between items-center mb-4 gap-2">
          <div className={`rounded-xl px-3 py-2 shadow-sm border flex flex-col min-w-0 ${activeBooking || station.status === 'occupied' ? `${headerBg} ${borderColor}` : 'bg-background border-border/50'}`}>
            <span className={`font-bold text-base sm:text-lg leading-none whitespace-nowrap overflow-hidden text-ellipsis ${activeBooking || station.status === 'occupied' ? textColor : ''}`}>{station.station_number}</span>
            {showTypeBadge && (
              <span className={`text-[10px] uppercase font-bold tracking-wider mt-1 truncate ${activeBooking || station.status === 'occupied' ? mutedColor : 'text-muted-foreground'}`}>
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
          ) : station.status === 'occupied' ? (
             <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500 text-amber-50 shadow-sm">Occupied</span>
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
                <div className={`font-bold truncate text-sm flex items-center ${textColor}`}>
                  {activeBooking.name || (activeBooking.source === 'website' ? 'Online Customer' : 'Walk-in Player')}
                  {activeBooking.source === 'website' && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                      Online Customer
                    </span>
                  )}
                </div>
                <div className={`flex flex-wrap items-center text-xs mt-1 ${mutedColor}`}>
                  {isOpenTimer ? (() => {
                     const elapsedMins = Math.floor((currentTime.getTime() - new Date(activeBooking.start_time).getTime()) / 60000);
                     const currentCost = calculateOpenTimerCost(activeBooking.start_time, station.price_per_hour || 0, currentTime);
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
              
              <div className="mt-3 pt-3 border-t border-black/5 opacity-70 group-hover:opacity-100 flex items-center justify-between transition-opacity">
                 <span className="text-xs font-bold uppercase tracking-wider">Manage Session</span>
                 <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ) : station.status === 'occupied' ? (
            <div className="flex flex-col justify-center h-full cursor-pointer" onClick={() => handleStationClick(station, activeBooking)}>
              <span className="text-sm font-bold text-amber-900">Occupied (Manual Session)</span>
              <span className="text-xs text-amber-700/80 mt-0.5">Click to start walk-in or manage</span>
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <AlertDialog open={!!sessionToEnd} onOpenChange={(open) => !open && setSessionToEnd(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Session?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to collect payment and end this session? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEndSession} className="bg-primary text-primary-foreground">Confirm & End</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Live floor</h1>
          <p className="text-muted-foreground mt-1">Real-time monitoring for {activeProperty?.name || 'your gaming cafe'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-4 md:mt-0">
          <div className="flex bg-secondary p-1 rounded-xl border border-border/50">
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
          <Button variant="outline" className="bg-background border-border shadow-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={() => navigate('/admin/stations?tab=blackouts')}>
            <CalendarX className="w-4 h-4 mr-2" />
            Blackout / Closure
          </Button>
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
          {loading ? (
            [
              { title: 'Active Players', icon: Users },
              ...(userRole === 'admin' ? [{ title: "Today's Revenue", icon: IndianRupee }] : []),
              { title: "Today's Sessions", icon: Gamepad2 },
              { title: 'Upcoming Today', icon: Calendar },
            ].map((stat, i) => (
              <Card key={i} className="bg-card border-border shadow-sm rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-4 sm:p-5">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground uppercase">
                    {stat.title}
                  </CardTitle>
                  <div className="bg-primary/10 rounded-lg p-1.5 sm:p-2 text-primary hidden sm:block">
                    <stat.icon className="h-4 w-4 opacity-50" />
                  </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-5 pb-4 sm:px-5 pt-0">
                  <Skeleton className="h-8 w-20 rounded-lg animate-pulse" />
                </CardContent>
              </Card>
            ))
          ) : (
            statCards.map((stat, index) => (
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
            ))
          )}
        </div>

        {/* Dynamic Station Floor Plan */}
        {loading ? (
          <div className="mt-8 space-y-6">
            {/* Floor Occupancy Header Skeleton */}
            <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Floor Occupancy</h3>
                <div className="flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/30 animate-pulse"></div><Skeleton className="h-3.5 w-16 rounded-md" /></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500/30 animate-pulse"></div><Skeleton className="h-3.5 w-20 rounded-md" /></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500/30 animate-pulse"></div><Skeleton className="h-3.5 w-24 rounded-md" /></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700 animate-pulse"></div><Skeleton className="h-3.5 w-20 rounded-md" /></div>
                </div>
              </div>
              <div className="flex-1 max-w-md w-full">
                <div className="flex justify-end items-end mb-3">
                  <Skeleton className="h-4 w-32 rounded-md" />
                </div>
                <div className="flex gap-1 h-2.5 w-full">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex-1 rounded-sm bg-secondary animate-pulse" />
                  ))}
                </div>
              </div>
            </div>

            {/* Filter bar shell */}
            <div className="flex items-center justify-between bg-card border border-border/50 rounded-xl p-2.5 shadow-sm flex-wrap gap-2">
              <div className="flex items-center gap-2 overflow-x-auto py-0.5">
                {['All', 'Available', 'Occupied', 'Ending Soon', 'Any Type'].map((_, i) => (
                  <Skeleton key={i} className="h-7 w-20 rounded-full" />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-24 rounded-lg" />
                <Skeleton className="h-7 w-20 rounded-lg" />
              </div>
            </div>

            {/* Station Card Grid Skeletons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="rounded-2xl p-4 sm:p-5 border border-border/60 bg-card/60 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-24 rounded-xl" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <div className="space-y-2 pt-2">
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="h-3 w-36 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
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
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>Occupied / Warning ({stations.filter(s => s.status === 'occupied' && !activeBookings[s.id]).length + Object.values(activeBookings).filter(b => { const r = Math.floor((new Date(b.end_time).getTime() - currentTime.getTime()) / 60000); return r <= 30 && r >= 10; }).length})</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>Ending soon ({Object.values(activeBookings).filter(b => Math.floor((new Date(b.end_time).getTime() - currentTime.getTime()) / 60000) < 10).length})</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-zinc-200 dark:bg-zinc-800"></div>Available ({stations.filter(s => !activeBookings[s.id] && s.status !== 'occupied' && s.status !== 'maintenance').length})</div>
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
                          if (station.status === 'occupied') return 2.5;
                          if (station.status === 'maintenance') return 5;
                          return 4;
                       };
                       return getScore(a) - getScore(b);
                    }).map(station => {
                       const booking = activeBookings[station.id];
                       let color = 'bg-zinc-200 dark:bg-zinc-800';
                       if (station.status === 'maintenance') color = 'bg-zinc-100 dark:bg-zinc-900';
                       else if (station.status === 'occupied') color = 'bg-amber-500';
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
            
            {layoutPref === 'zones' && (
              <div className="flex items-center justify-between mb-4 bg-card border border-border/50 rounded-xl px-4 py-2 shadow-sm flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5 hidden sm:flex"><ArrowDownUp className="w-4 h-4" /> Sort Zones</span>
                  <div className="flex bg-secondary p-1 rounded-lg border border-border/50">
                    <Button variant="ghost" size="sm" onClick={() => setSortMode('size')} className={`h-7 px-3 text-xs rounded-md ${sortMode === 'size' ? 'bg-background shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>Size</Button>
                    <Button variant="ghost" size="sm" onClick={() => setSortMode('busiest')} className={`h-7 px-3 text-xs rounded-md ${sortMode === 'busiest' ? 'bg-background shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>Busiest</Button>
                    <Button variant="ghost" size="sm" onClick={() => setSortMode('custom')} className={`h-7 px-3 text-xs rounded-md ${sortMode === 'custom' ? 'bg-background shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>Custom</Button>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsReordering(!isReordering)} className={`h-8 px-3 text-xs rounded-lg border transition-colors ${isReordering ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}>
                  <GripHorizontal className="w-4 h-4 mr-2" />
                  {isReordering ? 'Save Layout' : 'Rearrange'}
                </Button>
              </div>
            )}

            {layoutPref === 'zones' ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={sortedZones.map(z => z[0])} strategy={rectSortingStrategy}>
                  <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6 pb-12">
                    {sortedZones.map(([type, typeStations]) => (
                      <SortableZone key={type} id={type} isReordering={isReordering} isPinned={pinnedZones.includes(type)} togglePin={togglePin}>
                        <div className="flex items-center gap-3 mb-5 mt-1">
                          <h2 className="text-xl font-bold text-foreground">{type}</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {typeStations.map((station) => {
                            const activeBooking = activeBookings[station.id];
                            return renderStationCard(station, activeBooking, true);
                          })}
                        </div>
                      </SortableZone>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="flex flex-col space-y-4">
                {/* Grid Toolbar */}
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-card border border-border/50 rounded-xl px-4 py-3 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Status Filters */}
                    <div className="flex flex-wrap bg-secondary p-1 rounded-lg border border-border/50">
                      <Button variant="ghost" size="sm" onClick={() => setGridStatusFilter('all')} className={`h-7 px-3 text-xs rounded-md ${gridStatusFilter === 'all' ? 'bg-background shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>All</Button>
                      <Button variant="ghost" size="sm" onClick={() => setGridStatusFilter('available')} className={`h-7 px-3 text-xs rounded-md ${gridStatusFilter === 'available' ? 'bg-background shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>Available</Button>
                      <Button variant="ghost" size="sm" onClick={() => setGridStatusFilter('occupied')} className={`h-7 px-3 text-xs rounded-md ${gridStatusFilter === 'occupied' ? 'bg-background shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>Occupied</Button>
                      <Button variant="ghost" size="sm" onClick={() => setGridStatusFilter('ending_soon')} className={`h-7 px-3 text-xs rounded-md ${gridStatusFilter === 'ending_soon' ? 'bg-background shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>Ending Soon</Button>
                    </div>

                    {/* Type Filters */}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setGridTypeFilter('all')} className={`h-7 px-3 text-xs rounded-full border ${gridTypeFilter === 'all' ? 'bg-primary/10 border-primary/30 text-primary font-bold' : 'bg-background border-border text-muted-foreground hover:text-foreground'}`}>Any Type</Button>
                      {Object.keys(stationsByType).map(type => (
                        <Button key={type} variant="ghost" size="sm" onClick={() => setGridTypeFilter(type)} className={`h-7 px-3 text-xs rounded-full border ${gridTypeFilter === type ? 'bg-primary/10 border-primary/30 text-primary font-bold' : 'bg-background border-border text-muted-foreground hover:text-foreground'}`}>
                          {type}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-auto xl:ml-0">
                     <div className="flex bg-secondary p-1 rounded-lg border border-border/50">
                        <Button variant="ghost" size="sm" onClick={() => setGridSort('number')} className={`h-7 px-3 text-xs rounded-md ${gridSort === 'number' ? 'bg-background shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>Sort: #</Button>
                        <Button variant="ghost" size="sm" onClick={() => setGridSort('urgency')} className={`h-7 px-3 text-xs rounded-md ${gridSort === 'urgency' ? 'bg-background shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>Urgency</Button>
                        <Button variant="ghost" size="sm" onClick={() => setGridSort('status')} className={`h-7 px-3 text-xs rounded-md ${gridSort === 'status' ? 'bg-background shadow-sm text-foreground font-bold' : 'text-muted-foreground hover:text-foreground'}`}>Status</Button>
                     </div>

                     <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setManualCompactMode(prev => prev === 'compact' ? 'detailed' : 'compact')} 
                        className={`h-8 px-3 text-xs rounded-lg border transition-colors ${isCompactView ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}
                     >
                       <LayoutGrid className="w-4 h-4 mr-2" />
                       Compact
                     </Button>
                  </div>
                </div>

                <div className={`grid gap-4 ${isCompactView ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'}`}>
                  {sortedGridStations.map(station => {
                    const activeBooking = activeBookings[station.id];
                    return isCompactView ? renderCompactStationCard(station, activeBooking) : renderStationCard(station, activeBooking, true);
                  })}
                </div>
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


      {/* POS Active Session Panel */}
      <Sheet open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
        <SheetContent className="sm:max-w-md w-full bg-card border-l border-border p-0 flex flex-col h-full overflow-hidden shadow-2xl">
          {selectedSession && (() => {
            const { station, booking } = selectedSession;
            const isOpenTimer = booking.booking_reference?.startsWith('OT-') || false;
            
            let runningCost = booking.total_price || 0;
            if (isOpenTimer) {
                runningCost = calculateOpenTimerCost(booking.start_time, station.price_per_hour || 0, currentTime);
            }

            const elapsedMins = Math.max(0, Math.floor((currentTime.getTime() - new Date(booking.start_time).getTime()) / 60000));
            const remainingMins = Math.floor((new Date(booking.end_time).getTime() - currentTime.getTime()) / 60000);

            const customerNameResolved = (booking as any).customer_name || booking.name || (booking.phone ? `Guest (${booking.phone})` : 'Walk-in Player');
            const phoneResolved = booking.phone || (booking as any).customerPhone || '';
            const emailResolved = booking.email || (booking as any).customerEmail || '';
            const refCode = booking.booking_reference || booking.id.substring(0, 8).toUpperCase();
            const stationCategory = station.station_type || (station as any).type || 'Gaming Station';

            return (
              <>
                {/* Header */}
                <SheetHeader className="p-5 bg-gradient-to-r from-primary/10 via-secondary/40 to-background border-b border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">
                          {stationCategory}
                        </span>
                        {refCode && (
                          <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                            <Ticket className="w-3 h-3 text-primary/70" /> #{refCode}
                          </span>
                        )}
                      </div>
                      <SheetTitle className="text-2xl font-black tracking-tight text-foreground mt-1 flex items-center gap-2">
                        Station {station.station_number || station.name}
                      </SheetTitle>
                    </div>

                    {isOpenTimer ? (
                      <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-extrabold tracking-wider uppercase flex items-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Open Timer
                      </span>
                    ) : (
                      <span className="text-xs font-mono text-muted-foreground font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Fixed duration
                      </span>
                    )}
                  </div>
                </SheetHeader>

                <div className="p-5 flex-1 overflow-y-auto space-y-6">
                  
                  {/* RICH CUSTOMER DETAILS CARD */}
                  <div className="p-4 rounded-2xl bg-secondary/40 border border-border space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Customer Profile</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> Gamer Info
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shrink-0">
                        {customerNameResolved.charAt(0).toUpperCase()}
                      </div>
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <h4 className="font-bold text-foreground text-base truncate">{customerNameResolved}</h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          {phoneResolved && (
                            <a href={`tel:${phoneResolved}`} className="flex items-center gap-1 hover:text-primary transition-colors font-mono">
                              <Phone className="w-3 h-3 text-primary" /> {phoneResolved}
                            </a>
                          )}
                          {emailResolved && (
                            <span className="flex items-center gap-1 truncate max-w-[180px]">
                              <Mail className="w-3 h-3 text-primary shrink-0" /> {emailResolved}
                            </span>
                          )}
                          {!phoneResolved && !emailResolved && (
                            <span className="text-xs text-muted-foreground italic">No contact specified</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/60 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground font-mono uppercase">Party Size</span>
                        <span className="block font-semibold text-foreground">{booking.players || 1} Player{(booking.players || 1) > 1 ? 's' : ''}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground font-mono uppercase">Hourly Rate</span>
                        <span className="block font-semibold text-primary">₹{station.price_per_hour || 100}/hr</span>
                      </div>
                    </div>
                  </div>

                  {/* LIVE TIMER WIDGET */}
                  <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-secondary/60 to-secondary/30 rounded-3xl border border-border shadow-sm relative overflow-hidden">
                    <div className="absolute top-3 right-3">
                      <Activity className="w-4 h-4 text-primary animate-pulse" />
                    </div>
                    {isOpenTimer ? (
                      <>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary" /> Elapsed Playing Time
                        </span>
                        <span className="text-5xl font-black text-foreground tabular-nums tracking-tight">
                          {Math.floor(elapsedMins / 60)}h {String(elapsedMins % 60).padStart(2, '0')}m
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-primary" /> Time Remaining
                        </span>
                        <span className={`text-5xl font-black tabular-nums tracking-tight ${remainingMins < 10 ? 'text-red-500 animate-pulse' : 'text-foreground'}`}>
                          {remainingMins > 0 ? `${Math.floor(remainingMins / 60)}h ${String(remainingMins % 60).padStart(2, '0')}m` : 'TIME UP'}
                        </span>
                      </>
                    )}
                  </div>

                  {/* ADJUST DURATION STEPPER (Fixed sessions) */}
                  {!isOpenTimer && (() => {
                    const endMs = new Date(booking.end_time).getTime();
                    const startMs = new Date(booking.start_time).getTime();
                    const canSubtract = (endMs - durationStep * 60000) >= (startMs + 60000);

                    return (
                      <div className="space-y-3 p-4 rounded-2xl bg-secondary/30 border border-border">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Adjust duration
                          </Label>
                          
                          {/* Unit Selector Toggle Pills */}
                          <div className="flex items-center p-1 bg-background rounded-xl border border-border">
                            <button
                              type="button"
                              onClick={() => setDurationStep(30)}
                              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                durationStep === 30
                                  ? 'bg-secondary text-foreground shadow-sm border border-border'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              30 min
                            </button>
                            <button
                              type="button"
                              onClick={() => setDurationStep(60)}
                              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                durationStep === 60
                                  ? 'bg-secondary text-foreground shadow-sm border border-border'
                                  : 'text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              1 hour
                            </button>
                          </div>
                        </div>

                        {/* Single - / + Stepper Row */}
                        <div className="grid grid-cols-3 gap-3 items-center">
                          <Button
                            variant="outline"
                            disabled={!canSubtract}
                            className={`h-14 rounded-2xl border-border font-black text-2xl transition-all shadow-sm ${
                              !canSubtract 
                                ? 'opacity-30 cursor-not-allowed bg-muted/20 border-border/40 text-muted-foreground' 
                                : 'text-foreground hover:bg-secondary active:scale-95 cursor-pointer'
                            }`}
                            onClick={() => canSubtract && extendSession(booking.id, -durationStep)}
                            title={!canSubtract ? `Cannot reduce session below 1 min from start time` : `Remove ${durationStep} minutes`}
                          >
                            −
                          </Button>

                          <div className="text-center flex flex-col justify-center">
                            {lastAdjustmentDelta ? (
                              <span className={`text-sm font-extrabold font-mono tracking-tight animate-fade-in ${
                                lastAdjustmentDelta.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'
                              }`}>
                                {lastAdjustmentDelta}
                              </span>
                            ) : (
                              <span className="text-sm font-bold text-muted-foreground">
                                No change
                              </span>
                            )}
                          </div>

                          <Button
                            variant="outline"
                            className="h-14 rounded-2xl border-border text-foreground hover:bg-secondary font-black text-2xl transition-all active:scale-95 cursor-pointer shadow-sm"
                            onClick={() => extendSession(booking.id, durationStep)}
                            title={`Add ${durationStep} minutes`}
                          >
                            +
                          </Button>
                        </div>

                        {!canSubtract && (
                          <p className="text-[10px] text-center font-mono text-amber-500/80 font-medium pt-1">
                            Min session limit reached ({durationStep === 60 ? '1 hour' : '30 min'} deduction disabled)
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* BILLING & PAYMENT SELECTOR */}
                  <div className="space-y-4 pt-2">
                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Checkout & Payment Settlement</Label>
                    
                    <div className="flex items-center justify-between p-4 bg-primary/10 rounded-2xl border border-primary/20 shadow-sm">
                      <div>
                        <span className="text-xs text-muted-foreground uppercase font-mono tracking-wider block">Total Outstanding Due</span>
                        <span className="text-xs text-primary font-semibold">Includes play session & taxes</span>
                      </div>
                      <span className="text-3xl font-black text-primary font-mono">₹{Math.round(runningCost)}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <button 
                        type="button"
                        className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${paymentMode === 'upi' ? 'border-primary bg-primary/10 text-primary font-bold shadow-md shadow-primary/10 scale-[1.02]' : 'border-border bg-background text-muted-foreground hover:bg-secondary'}`}
                        onClick={() => setPaymentMode('upi')}
                      >
                        <Smartphone className="w-5 h-5" />
                        <span className="text-xs">UPI</span>
                      </button>
                      <button 
                        type="button"
                        className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${paymentMode === 'cash' ? 'border-primary bg-primary/10 text-primary font-bold shadow-md shadow-primary/10 scale-[1.02]' : 'border-border bg-background text-muted-foreground hover:bg-secondary'}`}
                        onClick={() => setPaymentMode('cash')}
                      >
                        <Banknote className="w-5 h-5" />
                        <span className="text-xs">Cash</span>
                      </button>
                      <button 
                        type="button"
                        className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${paymentMode === 'card' ? 'border-primary bg-primary/10 text-primary font-bold shadow-md shadow-primary/10 scale-[1.02]' : 'border-border bg-background text-muted-foreground hover:bg-secondary'}`}
                        onClick={() => setPaymentMode('card')}
                      >
                        <CreditCard className="w-5 h-5" />
                        <span className="text-xs">Card</span>
                      </button>
                    </div>
                  </div>

                </div>

                {/* ACTION FOOTER */}
                <div className="p-5 border-t border-border bg-background shadow-lg">
                  <Button 
                    className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-lg shadow-lg active:scale-98 transition-all cursor-pointer"
                    onClick={() => endSession(booking.id, paymentMode)}
                  >
                    Collect ₹{Math.round(runningCost)} & End Session
                  </Button>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

    </AdminLayout>
  );
};

export default Dashboard;
