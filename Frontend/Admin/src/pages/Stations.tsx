import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import pb from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import * as LucideIcons from 'lucide-react';
import { Gamepad2 } from 'lucide-react';

import { useSearchParams } from 'react-router-dom';
import { Plus, Edit, Trash2, Gamepad2 as ConsoleIcon, Settings2, ChevronLeft, ChevronRight, Sparkles, Image as ImageIcon, X, DoorOpen, CalendarX, Clock, AlertTriangle, Phone, MessageSquare, AlertCircle, ShieldAlert } from 'lucide-react';

import { useProperty } from '@/contexts/PropertyContext';
import { usePropertyFilter } from '@/hooks/usePropertyFilter';

interface Station {
  id: string;
  station_number: string;
  station_type: string;
  status: string;
  price_per_hour: number;
  max_players: number;
  amenities: string[];
  created_at: string;
  updated_at: string;
}

interface StationType {
  id: string;
  name: string;
  base_price: number;
  max_players: number;
  specs?: string;
  features?: string[];
  amenities?: string[];
  is_popular?: boolean;
  image?: string;
  description?: string;
}

interface BlackoutPeriod {
  id: string;
  reason: string;
  start_time: string;
  end_time: string;
  property_id?: string;
  created?: string;
}

const STATION_STATUS = ['available', 'occupied', 'maintenance'];
const AVAILABLE_ICONS = ['Gamepad2', 'Monitor', 'Headphones', 'Mouse', 'Keyboard', 'Tv', 'Sofa', 'Coffee', 'Wifi', 'Cpu', 'Speaker'];

const Stations = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'inventory';
  const [activeTab, setActiveTab] = useState(initialTab);
  const tabsListRef = useRef<HTMLDivElement>(null);

  // Auto-center active tab on mobile view
  useEffect(() => {
    if (activeTab && tabsListRef.current) {
      const activeEl = tabsListRef.current.querySelector(`[data-tab-value="${activeTab}"]`) as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTab]);

  const { properties, activeProperty } = useProperty();
  const propertyFilter = usePropertyFilter();
  
  // Inventory State
  const [stations, setStations] = useState<Station[]>([]);
  const [allStations, setAllStations] = useState<Station[]>([]); // Raw dashboard stats data
  const [stationTypes, setStationTypes] = useState<StationType[]>([]);
  
const WhatsAppIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={`${className} fill-current`} viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.461c-1.926 0-3.72-.51-5.275-1.4l-.378-.217-3.921 1.028 1.046-3.822-.243-.387a10.05 10.05 0 0 1-1.542-5.385C2.238 6.46 6.698 2 12.051 2c2.62 0 5.084 1.021 6.937 2.874a9.78 9.78 0 0 1 2.876 6.937c0 5.417-4.46 9.878-9.813 9.878M12.051 0C5.452 0 0 5.453 0 12.054a11.98 11.98 0 0 0 1.841 6.417L0 24l5.707-1.497A11.96 11.96 0 0 0 12.051 24c6.6 0 12.053-5.453 12.053-12.054C24.104 5.453 18.651 0 12.051 0" />
  </svg>
);

interface ConflictingBooking {
  id: string;
  name: string;
  phone: string;
  email: string;
  station_name: string;
  start_time: string;
  end_time: string;
  total_price: number;
}

  // Blackouts State
  const [blackouts, setBlackouts] = useState<BlackoutPeriod[]>([]);
  const [loadingBlackouts, setLoadingBlackouts] = useState(false);
  const [blackoutDialogOpen, setBlackoutDialogOpen] = useState(false);
  const [blackoutStep, setBlackoutStep] = useState<'form' | 'conflicts'>('form');
  const [conflictingBookings, setConflictingBookings] = useState<ConflictingBooking[]>([]);
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [savingBlackout, setSavingBlackout] = useState(false);
  const [blackoutFormData, setBlackoutFormData] = useState({
    reason: '',
    start_time: '',
    end_time: ''
  });

  const [loading, setLoading] = useState(true);
  const [loadingTypes, setLoadingTypes] = useState(true);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 10; // Number of stations per page
  
  // Station Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  
  // Station Type Dialog State
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<StationType | null>(null);

  const { toast } = useToast();

  const [formData, setFormData] = useState({
    station_number: '',
    station_type: '',
    status: 'available',
    price_per_hour: 1500,
    max_players: 2,
    amenities: [] as string[]
  });

  const [typeFormData, setTypeFormData] = useState({
    name: '',
    base_price: 1500,
    max_players: 2,
    specs: 'PS5 Console',
    features: ['Air Conditioning'] as string[],
    amenities: ['Wifi'] as string[],
    is_popular: false,
    imageFile: null as File | null,
    imagePreview: '' as string,
    description: ''
  });

  const fetchStations = async () => {
    setLoading(true);
    try {
      // 1. POCKETBASE SERVER PAGINATION: Fetch specifically for current page
      const result = await pb.collection('stations').getList(page, perPage, {
        sort: '+station_number',
        filter: propertyFilter
      });
      setStations(result.items as unknown as Station[]);
      setTotalPages(result.totalPages);

      // 2. DASHBOARD DATA: Fetch lightweight data of ALL stations strictly for Dashboard math counts
      const allData = await pb.collection('stations').getFullList({
        fields: 'id,station_type,status',
        filter: propertyFilter
      });
      setAllStations(allData as unknown as Station[]);

    } catch (error) {
      console.error('Error fetching stations:', error);
      toast({ title: 'Error', description: 'Failed to fetch stations', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStationTypes = async () => {
    setLoadingTypes(true);
    try {
      const data = await pb.collection('station_types').getFullList({
        filter: propertyFilter
      });
      const fetchedTypes = (data as unknown as StationType[]).sort((a, b) => a.name.localeCompare(b.name));
      setStationTypes(fetchedTypes);
      
      if (fetchedTypes.length > 0 && !formData.station_type) {
        setFormData(prev => ({ ...prev, station_type: fetchedTypes[0].name }));
      }
    } catch (error) {
      console.error('Error fetching station types. You may need to create the collection first:', error);
    } finally {
      setLoadingTypes(false);
    }
  };

  const fetchBlackouts = async () => {
    setLoadingBlackouts(true);
    try {
      const data = await pb.collection('blackout_periods').getFullList({
        sort: '-start_time',
        filter: propertyFilter
      });
      setBlackouts(data as unknown as BlackoutPeriod[]);
    } catch (error) {
      console.error('Error fetching blackout periods:', error);
    } finally {
      setLoadingBlackouts(false);
    }
  };

  // Re-fetch stations when the page number changes or property changes
  useEffect(() => {
    if (activeProperty) {
      fetchStations();
      fetchStationTypes();
      fetchBlackouts();
    }
  }, [page, activeProperty]);

  // --- BLACKOUT PERIOD LOGIC ---
  const handleBlackoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blackoutFormData.reason || !blackoutFormData.start_time || !blackoutFormData.end_time) {
      toast({ title: 'Error', description: 'Please fill in all blackout period fields.', variant: 'destructive' });
      return;
    }

    const bStart = new Date(blackoutFormData.start_time).getTime();
    const bEnd = new Date(blackoutFormData.end_time).getTime();
    if (bEnd <= bStart) {
      toast({ title: 'Error', description: 'End time must be after start time.', variant: 'destructive' });
      return;
    }

    try {
      setCheckingConflicts(true);
      // Fetch all confirmed/pending bookings
      const bookings = await pb.collection('bookings').getFullList({
        expand: 'assigned_station_id',
      });

      const conflicts: ConflictingBooking[] = [];

      for (const bk of bookings) {
        if (bk.status === 'cancelled' || bk.status === 'expired' || bk.status === 'completed') continue;
        const bkStart = new Date(bk.start_time).getTime();
        const bkEnd = new Date(bk.end_time).getTime();

        // Check time overlap
        if (bkStart < bEnd && bkEnd > bStart) {
          const stName = bk.expand?.assigned_station_id?.station_type || bk.expand?.assigned_station_id?.station_number || 'Gaming Station';
          conflicts.push({
            id: bk.id,
            name: bk.name || 'Gamer Customer',
            phone: bk.phone || '',
            email: bk.email || '',
            station_name: stName,
            start_time: bk.start_time,
            end_time: bk.end_time,
            total_price: bk.total_price || 0,
          });
        }
      }

      if (conflicts.length > 0) {
        setConflictingBookings(conflicts);
        setSelectedBookingIds(conflicts.map(c => c.id));
        setBlackoutStep('conflicts');
      } else {
        // No conflicts! Save immediately.
        await executeSaveBlackoutWithCancellations([]);
      }
    } catch (error: any) {
      console.error('Error checking blackout conflicts:', error);
      toast({ title: 'Error', description: error.message || 'Failed to check booking conflicts', variant: 'destructive' });
    } finally {
      setCheckingConflicts(false);
    }
  };

  const executeSaveBlackoutWithCancellations = async (idsToCancel: string[]) => {
    try {
      setSavingBlackout(true);

      // 1. Cancel selected bookings (this triggers the backend email hook with refund notice + reschedule link!)
      for (const id of idsToCancel) {
        await pb.collection('bookings').update(id, {
          status: 'cancelled'
        });
      }

      // 2. Save blackout period
      await pb.collection('blackout_periods').create({
        ...blackoutFormData,
        property_id: activeProperty?.id
      });

      toast({
        title: 'Blackout Period Saved! 🚀',
        description: idsToCancel.length > 0
          ? `${idsToCancel.length} customer booking(s) cancelled & sent refund email with reschedule link!`
          : 'Blackout period added successfully with 0 booking conflicts.',
      });

      setBlackoutDialogOpen(false);
      setBlackoutStep('form');
      setConflictingBookings([]);
      setSelectedBookingIds([]);
      setBlackoutFormData({ reason: '', start_time: '', end_time: '' });
      fetchBlackouts();
    } catch (error: any) {
      console.error('Error saving blackout period:', error);
      toast({ title: 'Error', description: error.message || 'Failed to save blackout period', variant: 'destructive' });
    } finally {
      setSavingBlackout(false);
    }
  };

  const handleBlackoutDelete = async (id: string) => {
    try {
      await pb.collection('blackout_periods').delete(id);
      toast({ title: 'Success', description: 'Blackout period deleted' });
      fetchBlackouts();
    } catch (error) {
      console.error('Error deleting blackout period:', error);
      toast({ title: 'Error', description: 'Failed to delete blackout period', variant: 'destructive' });
    }
  };

  // --- STATION LOGIC ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStation) {
        await pb.collection('stations').update(editingStation.id, formData);
        toast({ title: 'Success', description: 'Station updated successfully' });
      } else {
        await pb.collection('stations').create({ ...formData, property_id: activeProperty?.id });
        toast({ title: 'Success', description: 'Station added successfully' });
      }
      setDialogOpen(false);
      resetForm();
      fetchStations(); // Refreshes current page and dashboard stats
    } catch (error) {
      console.error('Error saving station:', error);
      toast({ title: 'Error', description: 'Failed to save station', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('stations').delete(id);
      toast({ title: 'Success', description: 'Station deleted successfully' });
      // If we delete the last item on the page, bump them back one page to avoid an empty screen
      if (stations.length === 1 && page > 1) {
        setPage(p => p - 1);
      } else {
        fetchStations();
      }
    } catch (error) {
      console.error('Error deleting station:', error);
      toast({ title: 'Error', description: 'Failed to delete station', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      station_number: '',
      station_type: stationTypes.length > 0 ? stationTypes[0].name : '',
      status: 'available',
      price_per_hour: stationTypes.length > 0 ? stationTypes[0].base_price : 1500,
      max_players: stationTypes.length > 0 ? stationTypes[0].default_occupancy : 2,
      amenities: []
    });
    setEditingStation(null);
  };

  const openEditDialog = (station: Station) => {
    setEditingStation(station);
    setFormData({
      station_number: station.station_number,
      station_type: station.station_type,
      status: station.status,
      price_per_hour: station.price_per_hour,
      max_players: station.max_players,
      amenities: station.amenities || []
    });
    setDialogOpen(true);
  };

  // --- STATION TYPE LOGIC ---
  const handleTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', typeFormData.name);
      formData.append('base_price', typeFormData.base_price.toString());
      formData.append('default_occupancy', typeFormData.max_players.toString());
      formData.append('specs', typeFormData.specs);
      formData.append('is_popular', typeFormData.is_popular ? 'true' : 'false');
      formData.append('description', typeFormData.description);
      formData.append('features', JSON.stringify(typeFormData.features));
      formData.append('amenities', JSON.stringify(typeFormData.amenities));
      
      if (!editingType) {
        formData.append('property_id', activeProperty?.id as string);
      }
      if (typeFormData.imageFile) {
        formData.append('image', typeFormData.imageFile);
      }

      if (editingType) {
        await pb.collection('station_types').update(editingType.id, formData);
        toast({ title: 'Success', description: 'Station type updated successfully' });
      } else {
        await pb.collection('station_types').create(formData);
        toast({ title: 'Success', description: 'Station type added successfully' });
      }
      setTypeDialogOpen(false);
      resetTypeForm();
      fetchStationTypes();
    } catch (error: any) {
      console.error('Error saving station type:', error, error.data);
      toast({ title: 'Error', description: 'Failed to save station type. Check configuration.', variant: 'destructive' });
    }
  };

  const handleTypeDelete = async (id: string) => {
    try {
      await pb.collection('station_types').delete(id);
      toast({ title: 'Success', description: 'Station type deleted successfully' });
      fetchStationTypes();
    } catch (error) {
      console.error('Error deleting station type:', error);
      toast({ title: 'Error', description: 'Failed to delete station type', variant: 'destructive' });
    }
  };

  const resetTypeForm = () => {
    setTypeFormData({ 
      name: '', 
      base_price: 1500, 
      max_players: 2,
      specs: 'PS5 Console',
      features: ['Air Conditioning'],
      amenities: ['Wifi'],
      is_popular: false,
      imageFile: null,
      imagePreview: '',
      description: ''
    });
    setEditingType(null);
  };

  const openEditTypeDialog = (type: StationType) => {
    setEditingType(type);
    setTypeFormData({
      name: type.name,
      base_price: type.base_price,
      max_players: type.default_occupancy,
      specs: type.specs || 'PS5 Console',
      features: Array.isArray(type.features) ? type.features : ['Air Conditioning'],
      amenities: Array.isArray(type.amenities) ? type.amenities : ['Wifi'],
      is_popular: type.is_popular || false,
      imageFile: null,
      imagePreview: type.image ? pb.files.getUrl(type as any, type.image) : '',
      description: type.description || ''
    });
    setTypeDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
      case 'active':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 capitalize';
      case 'occupied':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 capitalize';
      case 'maintenance':
        return 'bg-destructive/10 text-destructive border border-destructive/20 capitalize';
      default:
        return 'bg-secondary text-secondary-foreground border border-border capitalize';
    }
  };

  // Dashboard counts rely on `allStations` so pagination doesn't break math!
  const getStationTypeSummary = () => {
    return stationTypes.map(type => {
      const typeStations = allStations.filter(r => r.station_type === type.name);
      return {
        type: type.name,
        base_price: type.base_price,
        total: typeStations.length,
        available: typeStations.filter(r => r.status === 'available' || r.status === 'active').length,
        occupied: typeStations.filter(r => r.status === 'occupied').length,
        maintenance: typeStations.filter(r => r.status === 'maintenance').length
      };
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Game Categories & Units
            </h1>
            <p className="text-muted-foreground mt-1">Manage your game categories, their pricing, and individual physical units.</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm w-full lg:w-auto">
            <h3 className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Overall Occupancy</h3>
            <div className="flex items-center gap-4 sm:gap-6 text-sm font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm bg-emerald-500"></div>
                Available <strong className="text-foreground ml-1">{allStations.filter(r => r.status === 'available' || r.status === 'active').length}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm bg-amber-500"></div>
                Occupied <strong className="text-foreground ml-1">{allStations.filter(r => r.status === 'occupied').length}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm bg-destructive"></div>
                Maintenance <strong className="text-foreground ml-1">{allStations.filter(r => r.status === 'maintenance').length}</strong>
              </span>
            </div>
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList ref={tabsListRef} className="bg-secondary/50 border border-border flex w-full overflow-x-auto whitespace-nowrap scrollbar-hide justify-start h-auto rounded-2xl p-1.5 scroll-smooth px-8 sm:px-1.5 gap-1">
            <TabsTrigger value="inventory" data-tab-value="inventory" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-xl py-2.5 px-5 shrink-0 transition-all">
              <ConsoleIcon className="w-4 h-4 mr-2" />
              Individual Units
            </TabsTrigger>
            <TabsTrigger value="types" data-tab-value="types" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-xl py-2.5 px-5 shrink-0 transition-all">
              <Settings2 className="w-4 h-4 mr-2" />
              Game Categories
            </TabsTrigger>
            <TabsTrigger value="blackouts" data-tab-value="blackouts" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-xl py-2.5 px-5 shrink-0 transition-all">
              <CalendarX className="w-4 h-4 mr-2" />
              Blackouts & Store Closures
            </TabsTrigger>
          </TabsList>

          {/* INVENTORY TAB */}
          <TabsContent value="inventory" className="outline-none space-y-6 animate-in fade-in duration-500 fill-mode-forwards">
  
            <div>
              <h2 className="text-xl font-bold mb-4 text-foreground">Category Inventory Summary</h2>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {getStationTypeSummary().map((summary, index) => {
                  return (
                    <div key={summary.type} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-border rounded-2xl bg-card shadow-sm hover:border-primary/50 transition-colors group gap-5 sm:gap-4">
                      {/* Name & Total Container (Side-by-side on mobile) */}
                      <div className="flex flex-row items-center justify-between flex-1 gap-4">
                        {/* Category Name & Price */}
                        <div className="flex-1 min-w-[120px]">
                          <h3 className="text-base font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">{summary.type}</h3>
                          <p className="text-xs font-medium text-muted-foreground mt-1">₹{summary.base_price} <span className="opacity-50">/ hour</span></p>
                        </div>
                        
                        {/* Total Units */}
                        <div className="flex flex-col items-center justify-center px-4 sm:border-l sm:border-r border-border/50">
                          <span className="text-xl font-bold tracking-tight text-foreground">
                            {summary.total}
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">Total</span>
                        </div>
                      </div>

                      {/* Progress Bar & Legend */}
                      <div className="flex-[2] min-w-[200px] flex flex-col justify-center">
                        {/* Progress Bar Container */}
                        <div className="flex w-full h-2 rounded-full overflow-hidden bg-secondary mb-2.5">
                          {summary.total > 0 ? (
                            <>
                              <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${(summary.available / summary.total) * 100}%` }}></div>
                              <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${(summary.occupied / summary.total) * 100}%` }}></div>
                              <div className="bg-destructive h-full transition-all duration-500" style={{ width: `${(summary.maintenance / summary.total) * 100}%` }}></div>
                            </>
                          ) : (
                             <div className="bg-secondary h-full w-full"></div>
                          )}
                        </div>
                        {/* Legend */}
                        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-sm bg-emerald-500"></div>
                            Available <strong className="text-foreground">{summary.available}</strong>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-sm bg-amber-500"></div>
                            Occupied <strong className="text-foreground">{summary.occupied}</strong>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-sm bg-destructive"></div>
                            Maintenance <strong className="text-foreground">{summary.maintenance}</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {stationTypes.length === 0 && !loadingTypes && (
                  <div className="col-span-full p-8 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-card">
                    No Game Categories Found. Please go to the "Game Categories" tab to set some up.
                  </div>
                )}
              </div>
            </div>


            <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-4 lg:p-8 shadow-sm w-full mx-auto overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">All Units</h2>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full mr-4 border border-border">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7 rounded-full hover:bg-background disabled:opacity-30 text-foreground"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-medium text-foreground px-2">
                        Page {page} of {totalPages}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon"
                         className="h-7 w-7 rounded-full hover:bg-background disabled:opacity-30 text-foreground"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  
                  <Dialog open={dialogOpen} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) resetForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button className="rounded-xl px-8 h-12 text-base font-bold w-full sm:w-auto shadow-md">
                        <Plus className="w-5 h-5 mr-2" />
                        Add Unit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] sm:max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl">
                      <DialogHeader className="mb-2">
                        <DialogTitle className="text-xl font-bold text-foreground text-center">{editingStation ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
                        <DialogDescription className="text-center text-muted-foreground">
                          {editingStation ? 'Update unit details' : 'Add a new unit to your inventory'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="bg-secondary/30 border border-border rounded-2xl p-5 shadow-sm">
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                          <Label htmlFor="station_number" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit Number / Name</Label>
                          <Input
                            id="station_number"
                            value={formData.station_number}
                            onChange={(e) => setFormData({ ...formData, station_number: e.target.value })}
                            placeholder="e.g., PS5-101"
                            required
                            className="rounded-xl border-border bg-secondary/50 focus-visible:bg-background h-12"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="station_type" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Game Category</Label>
                          <Select
                            value={formData.station_type}
                            onValueChange={(value) => {
                              const selectedType = stationTypes.find(t => t.name === value);
                              setFormData({
                                ...formData,
                                station_type: value,
                                price_per_hour: selectedType?.base_price || 1500,
                                max_players: selectedType?.default_occupancy || 2
                              });
                            }}
                          >
                            <SelectTrigger className="rounded-xl border-border bg-secondary/50 focus-visible:bg-background h-12">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border shadow-lg">
                              {stationTypes.map(type => (
                                <SelectItem key={type.name} value={type.name}>{type.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {stationTypes.length === 0 && (
                            <p className="text-xs text-destructive mt-1">Please add a Game Category in the other tab first!</p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="status" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</Label>
                          <Select
                            value={formData.status}
                            onValueChange={(value) => setFormData({ ...formData, status: value })}
                          >
                            <SelectTrigger className="rounded-xl border-border bg-secondary/50 focus-visible:bg-background h-12">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border shadow-lg">
                              {STATION_STATUS.map(status => (
                                <SelectItem key={status} value={status}>
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-border mt-2">
                          {editingStation ? (
                            <div className="md:hidden">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive h-10 w-10 rounded-xl">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-3xl border border-border bg-card">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-foreground">Delete Unit</AlertDialogTitle>
                                    <AlertDialogDescription className="text-muted-foreground">
                                      Are you sure you want to delete unit {editingStation.station_number}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl hover:bg-secondary border-border">Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => { handleDelete(editingStation.id); setDialogOpen(false); }}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          ) : <div />}
                          
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" className="rounded-xl border-border" onClick={() => setDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" className="rounded-xl font-semibold" disabled={stationTypes.length === 0}>
                              {editingStation ? 'Update' : 'Add'} Unit
                            </Button>
                          </div>
                        </div>
                      </form>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <div className="overflow-hidden bg-card rounded-2xl border border-border">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground animate-pulse">Loading...</div>
                ) : stations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <DoorOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{allStations.length > 0 ? 'No units on this page' : 'No units added yet'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <Table className="w-full min-w-max">
                    <TableHeader className="bg-secondary/50 border-b border-border">
                      <TableRow className="border-b-0 hover:bg-transparent">
                        <TableHead className="h-10 px-3 sm:px-4 md:px-6 text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap">Unit No.</TableHead>
                        <TableHead className="h-10 px-2 sm:px-3 md:px-6 text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap">Category</TableHead>
                        <TableHead className="h-10 px-2 sm:px-3 md:px-6 text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap">Status</TableHead>
                        <TableHead className="h-10 px-3 sm:px-4 md:px-6 text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap hidden md:table-cell">Price/Hour</TableHead>
                        <TableHead className="h-10 px-3 sm:px-4 md:px-6 text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap hidden md:table-cell">Players</TableHead>
                        <TableHead className="h-10 px-1 sm:px-4 md:px-6 text-xs sm:text-sm font-semibold text-muted-foreground text-right whitespace-nowrap">
                          <span className="md:hidden">Details</span>
                          <span className="hidden md:inline">Actions</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stations.map((station) => (
                        <TableRow key={station.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                          <TableCell className="p-3 sm:py-4 sm:px-6 align-middle font-bold text-foreground text-xs sm:text-sm whitespace-nowrap">{station.station_number}</TableCell>
                          <TableCell className="p-3 sm:py-4 sm:px-6 align-middle font-medium text-muted-foreground text-xs sm:text-sm">
                            <span className="inline-block px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-[10px] sm:text-[11px] font-semibold leading-tight text-center truncate max-w-[80px] sm:max-w-[120px] lg:max-w-none hover:whitespace-normal">
                              {station.station_type}
                            </span>
                          </TableCell>
                          <TableCell className="p-3 sm:py-4 sm:px-6 align-middle whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold ${getStatusColor(station.status)}`}>
                                {station.status}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="p-3 sm:py-4 sm:px-6 align-middle font-semibold text-foreground text-xs sm:text-sm whitespace-nowrap hidden md:table-cell">₹{station.price_per_hour}</TableCell>
                          <TableCell className="p-3 sm:py-4 sm:px-6 align-middle text-muted-foreground text-xs sm:text-sm whitespace-nowrap hidden md:table-cell">{station.max_players} guests</TableCell>
                          <TableCell className="p-2 py-4 pr-3 sm:px-6 align-middle text-right whitespace-nowrap">
                            <button 
                              onClick={() => openEditDialog(station)}
                              className="md:hidden p-1.5 hover:bg-accent bg-background shadow-sm border border-border rounded-full transition-colors active:scale-95 text-foreground inline-flex items-center justify-center"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                            <div className="hidden md:flex justify-end gap-1 sm:gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full hover:bg-secondary hover:text-foreground"
                                onClick={() => openEditDialog(station)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-3xl border border-border bg-card">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-foreground">Delete Unit</AlertDialogTitle>
                                    <AlertDialogDescription className="text-muted-foreground">
                                      Are you sure you want to delete unit {station.station_number}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl hover:bg-secondary border-border">Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => handleDelete(station.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* TYPES TAB */}
          <TabsContent value="types" className="outline-none space-y-6 animate-in fade-in duration-500 fill-mode-forwards">
             <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-4 lg:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Game Categories</h2>
                  <p className="text-sm text-muted-foreground mt-1">Configure your game categories, set their hourly rates, and define player limits.</p>
                </div>
                <Dialog open={typeDialogOpen} onOpenChange={(open) => {
                  setTypeDialogOpen(open);
                  if (!open) resetTypeForm();
                }}>
                  <DialogTrigger asChild>
                    <Button className="rounded-xl px-6 font-semibold">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Game Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-3xl p-6 shadow-2xl">
                    <DialogHeader className="mb-2">
                      <DialogTitle className="text-xl font-bold text-foreground text-center">{editingType ? 'Edit Game Category' : 'Add New Game Category'}</DialogTitle>
                      <DialogDescription className="text-center text-muted-foreground">
                        {editingType ? 'Update base pricing and capacity' : 'Create a new pricing category for physical units'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="bg-secondary/30 rounded-2xl p-5 border border-border">
                    <form onSubmit={handleTypeSubmit} className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <Label htmlFor="type_name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category Name</Label>
                          <Input
                            id="type_name"
                            value={typeFormData.name}
                            onChange={(e) => setTypeFormData({ ...typeFormData, name: e.target.value })}
                            placeholder="e.g. PS5 Lounge, 8 Balls Pool, Snooker"
                            required
                            className="rounded-xl border-border bg-secondary/50 focus-visible:bg-background h-12"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label htmlFor="base_price" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price per Hour (₹)</Label>
                            <Input
                              id="base_price"
                              type="number"
                              value={typeFormData.base_price || ''}
                              onChange={(e) => setTypeFormData({ ...typeFormData, base_price: parseInt(e.target.value) || 0 })}
                              required
                              className="rounded-xl border-border bg-secondary/50 focus-visible:bg-background h-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="default_occupancy" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Default Players</Label>
                            <Input
                              id="default_occupancy"
                              type="number"
                              value={typeFormData.max_players || ''}
                              onChange={(e) => setTypeFormData({ ...typeFormData, max_players: parseInt(e.target.value) || 0 })}
                              required
                              className="rounded-xl border-border bg-secondary/50 focus-visible:bg-background h-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-border">
                        {editingType ? (
                          <div className="md:hidden">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive h-10 w-10 rounded-xl">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-3xl border border-border bg-card">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-foreground">Delete Game Category</AlertDialogTitle>
                                  <AlertDialogDescription className="text-muted-foreground">
                                    Are you sure you want to delete the "{editingType.name}" category? Physical units assigned to this category will not be deleted, but it may cause display issues.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl hover:bg-secondary border-border">Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => { handleTypeDelete(editingType.id); setTypeDialogOpen(false); }}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ) : <div />}
                        
                        <div className="flex justify-end gap-2 ml-auto">
                          <Button type="button" variant="outline" className="rounded-xl border-border" onClick={() => setTypeDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" className="rounded-xl font-semibold">
                            {editingType ? 'Update' : 'Save'} Type
                          </Button>
                        </div>
                      </div>
                    </form>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="overflow-hidden bg-card rounded-2xl border border-border">
                {loadingTypes ? (
                  <div className="text-center py-8 text-muted-foreground animate-pulse">Loading Types...</div>
                ) : stationTypes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Settings2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No station types found.</p>
                    <p className="text-xs mt-2 text-primary">Note: Please ensure the 'station_types' collection is created in PocketBase.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <Table className="w-full min-w-max">
                    <TableHeader className="bg-secondary/50 border-b border-border">
                      <TableRow className="border-b-0 hover:bg-transparent">
                        <TableHead className="h-10 px-3 sm:px-4 md:px-6 text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap">Type Name</TableHead>
                        <TableHead className="h-10 px-3 sm:px-4 md:px-6 text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap">Price per Hour</TableHead>
                        <TableHead className="h-10 px-3 sm:px-4 md:px-6 text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap hidden md:table-cell">Max Players</TableHead>
                        <TableHead className="h-10 px-1 sm:px-4 md:px-6 text-xs sm:text-sm font-semibold text-muted-foreground text-right whitespace-nowrap">
                          <span className="md:hidden">Details</span>
                          <span className="hidden md:inline">Actions</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stationTypes.map((type) => (
                        <TableRow key={type.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                          <TableCell className="p-3 sm:py-4 sm:px-6 align-middle font-bold text-foreground text-xs sm:text-sm">
                            <div className="max-w-[150px] sm:max-w-none truncate" title={type.name}>
                              {type.name}
                            </div>
                          </TableCell>
                          <TableCell className="p-3 sm:py-4 sm:px-6 align-middle font-semibold text-foreground text-xs sm:text-sm whitespace-nowrap">₹{type.base_price}</TableCell>
                          <TableCell className="p-3 sm:py-4 sm:px-6 align-middle text-muted-foreground text-xs sm:text-sm whitespace-nowrap hidden md:table-cell">{type.default_occupancy} guests</TableCell>
                          <TableCell className="p-2 py-4 pr-3 sm:px-6 align-middle text-right whitespace-nowrap">
                            <button 
                              onClick={() => openEditTypeDialog(type)}
                              className="md:hidden p-1.5 hover:bg-accent bg-background shadow-sm border border-border rounded-full transition-colors active:scale-95 text-foreground inline-flex items-center justify-center"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                            <div className="hidden md:flex justify-end gap-1 sm:gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full hover:bg-secondary hover:text-foreground"
                                onClick={() => openEditTypeDialog(type)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-3xl border border-border bg-card">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-foreground">Delete Station Type</AlertDialogTitle>
                                    <AlertDialogDescription className="text-muted-foreground">
                                      Are you sure you want to delete the "{type.name}" type? Physical stations assigned to this type will not be deleted, but it may cause display issues.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl hover:bg-secondary border-border">Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => handleTypeDelete(type.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* BLACKOUTS TAB */}
          <TabsContent value="blackouts" className="outline-none space-y-6 animate-in fade-in duration-500 fill-mode-forwards">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Blackout Periods & Store Closures</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Block online customer bookings during eSports tournaments, maintenance, or holiday store closures.</p>
              </div>
              <Dialog open={blackoutDialogOpen} onOpenChange={setBlackoutDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl font-semibold gap-2 shadow-sm">
                    <Plus className="w-4 h-4" /> Add Blackout Period
                  </Button>
                </DialogTrigger>
                <DialogContent className={`rounded-2xl sm:rounded-3xl border border-border bg-card w-[95vw] max-w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6`}>
                  <DialogHeader>
                    <div className="flex items-center gap-2.5 pr-6">
                      <div className={`p-2 rounded-xl border shrink-0 ${blackoutStep === 'conflicts' ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' : 'bg-primary/10 text-primary border-primary/20'}`}>
                        {blackoutStep === 'conflicts' ? <AlertTriangle className="w-5 h-5" /> : <CalendarX className="w-5 h-5" />}
                      </div>
                      <div>
                        <DialogTitle className="text-foreground text-base sm:text-lg font-bold">
                          {blackoutStep === 'conflicts' ? 'Review Booking Conflicts' : 'Add Blackout Period'}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-xs mt-0.5">
                          {blackoutStep === 'conflicts'
                            ? 'Pre-booked paid sessions found during this blackout period. Review and contact customers before executing cancellations.'
                            : 'Prevent online and offline bookings during specified dates and times.'}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  {blackoutStep === 'form' ? (
                    <form onSubmit={handleBlackoutSubmit} className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="reason" className="text-xs font-bold text-muted-foreground">Reason / Event Name</Label>
                        <Input
                          id="reason"
                          placeholder="e.g. FIFA eSports Tournament, Deep Cleaning, Holiday Closure"
                          value={blackoutFormData.reason}
                          onChange={(e) => setBlackoutFormData({ ...blackoutFormData, reason: e.target.value })}
                          required
                          className="rounded-xl bg-secondary border-border"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="start_time" className="text-xs font-bold text-muted-foreground">Start Time</Label>
                          <Input
                            id="start_time"
                            type="datetime-local"
                            value={blackoutFormData.start_time}
                            onChange={(e) => setBlackoutFormData({ ...blackoutFormData, start_time: e.target.value })}
                            required
                            className="rounded-xl bg-secondary border-border text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="end_time" className="text-xs font-bold text-muted-foreground">End Time</Label>
                          <Input
                            id="end_time"
                            type="datetime-local"
                            value={blackoutFormData.end_time}
                            onChange={(e) => setBlackoutFormData({ ...blackoutFormData, end_time: e.target.value })}
                            required
                            className="rounded-xl bg-secondary border-border text-xs"
                          />
                        </div>
                      </div>
                      <div className="pt-4 flex flex-col sm:flex-row justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setBlackoutDialogOpen(false)} className="rounded-xl border-border w-full sm:w-auto">Cancel</Button>
                        <Button type="submit" disabled={checkingConflicts} className="rounded-xl font-semibold w-full sm:w-auto">
                          {checkingConflicts ? 'Checking Conflicts...' : 'Check Conflicts & Save Blackout'}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4 pt-2">
                      {/* Customer Relationship Phone Call Hint Banner */}
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 sm:p-4 text-xs space-y-1.5 text-amber-700 dark:text-amber-300">
                        <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-amber-600 dark:text-amber-400">
                          <Phone className="w-4 h-4 shrink-0 animate-bounce" />
                          Proactive Customer Relationship Tip
                        </div>
                        <p className="text-[11.5px] sm:text-[12px] leading-relaxed">
                          Please call or message the customer(s) below before cancelling! A quick 30-second phone call builds lounge loyalty and prevents negative feedback during emergency closures.
                        </p>
                      </div>

                      <div className="text-xs font-semibold text-muted-foreground flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                        <span>{conflictingBookings.length} Conflicting Paid Session(s) Found</span>
                        <span className="text-[11px] text-primary">Email with Refund Notice & Reschedule Link will be sent</span>
                      </div>

                      {/* MOBILE CARD VIEW (< sm) */}
                      <div className="space-y-3 sm:hidden max-h-60 overflow-y-auto pr-1">
                        {conflictingBookings.map((b) => {
                          const isChecked = selectedBookingIds.includes(b.id);
                          const cleanPhone = b.phone.replace(/[^0-9]/g, '');
                          return (
                            <div key={b.id} className={`p-3 rounded-2xl border ${isChecked ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-secondary/30'} space-y-2 text-xs`}>
                              <div className="flex items-start justify-between gap-2">
                                <label className="flex items-center gap-2 font-bold text-foreground cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) setSelectedBookingIds([...selectedBookingIds, b.id]);
                                      else setSelectedBookingIds(selectedBookingIds.filter(id => id !== b.id));
                                    }}
                                    className="rounded border-border"
                                  />
                                  <span>{b.name}</span>
                                </label>
                                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">₹{b.total_price}</span>
                              </div>
                              <div className="text-[11px] text-muted-foreground pl-6 space-y-0.5">
                                <div><span className="font-semibold text-primary">{b.station_name}</span></div>
                                <div>{new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              </div>
                              {b.phone && (
                                <div className="flex items-center gap-2 pt-1 pl-6">
                                  <a
                                    href={`tel:${b.phone}`}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 font-semibold active:scale-95 transition-transform"
                                  >
                                    <Phone className="w-3.5 h-3.5" /> Call
                                  </a>
                                  <a
                                    href={`https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(`Hi ${b.name}, this is GameZ Gaming Lounge regarding your ${b.station_name} booking. We have an urgent update regarding your reservation.`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-xl bg-green-500/10 text-green-600 font-semibold active:scale-95 transition-transform"
                                  >
                                    <WhatsAppIcon className="w-3.5 h-3.5" /> WhatsApp
                                  </a>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* DESKTOP TABLE VIEW (>= sm) */}
                      <div className="hidden sm:block border border-border rounded-xl overflow-hidden max-h-60 overflow-y-auto text-xs">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10">
                                <input
                                  type="checkbox"
                                  checked={selectedBookingIds.length === conflictingBookings.length}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedBookingIds(conflictingBookings.map(c => c.id));
                                    } else {
                                      setSelectedBookingIds([]);
                                    }
                                  }}
                                  className="rounded border-border"
                                />
                              </TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead>Station & Time</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead className="text-right">Reach Out</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {conflictingBookings.map((b) => {
                              const isChecked = selectedBookingIds.includes(b.id);
                              const cleanPhone = b.phone.replace(/[^0-9]/g, '');
                              return (
                                <TableRow key={b.id} className={isChecked ? 'bg-destructive/5' : ''}>
                                  <TableCell>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedBookingIds([...selectedBookingIds, b.id]);
                                        } else {
                                          setSelectedBookingIds(selectedBookingIds.filter(id => id !== b.id));
                                        }
                                      }}
                                      className="rounded border-border"
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    <div>{b.name}</div>
                                    <div className="text-[10px] text-muted-foreground">{b.phone || b.email}</div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="font-semibold text-primary">{b.station_name}</div>
                                    <div className="text-[10px] text-muted-foreground">
                                      {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                    ₹{b.total_price}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {b.phone && (
                                        <>
                                          <a
                                            href={`tel:${b.phone}`}
                                            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-semibold transition-colors"
                                            title="Call Customer"
                                          >
                                            <Phone className="w-3 h-3" /> Call
                                          </a>
                                          <a
                                            href={`https://wa.me/${cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone}?text=${encodeURIComponent(`Hi ${b.name}, this is GameZ Gaming Lounge regarding your ${b.station_name} booking. We have an urgent update regarding your reservation.`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 font-semibold transition-colors"
                                            title="WhatsApp Message"
                                          >
                                            <WhatsAppIcon className="w-3 h-3" /> WA
                                          </a>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="pt-3 flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setBlackoutStep('form')}
                          className="rounded-xl border-border text-xs w-full sm:w-auto"
                        >
                          Back to Dates
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={savingBlackout}
                          onClick={() => executeSaveBlackoutWithCancellations(selectedBookingIds)}
                          className="rounded-xl font-semibold text-xs w-full sm:w-auto"
                        >
                          {savingBlackout
                            ? 'Processing Cancellations...'
                            : `Cancel ${selectedBookingIds.length} Selected & Apply Blackout`}
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>

            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              {loadingBlackouts ? (
                <div className="py-12 text-center text-muted-foreground font-medium">Loading blackout periods...</div>
              ) : blackouts.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-2">
                  <CalendarX className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="font-semibold text-foreground">No active blackout periods</p>
                  <p className="text-xs max-w-sm mx-auto text-muted-foreground">All stations are open for online customer reservations according to standard operating hours.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/40 border-border hover:bg-secondary/40">
                        <TableHead className="font-bold text-foreground">Reason / Event</TableHead>
                        <TableHead className="font-bold text-foreground">Start Time</TableHead>
                        <TableHead className="font-bold text-foreground">End Time</TableHead>
                        <TableHead className="font-bold text-foreground">Status</TableHead>
                        <TableHead className="font-bold text-foreground text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blackouts.map((b) => {
                        const now = new Date();
                        const sTime = new Date(b.start_time);
                        const eTime = new Date(b.end_time);
                        const isActive = now >= sTime && now <= eTime;
                        const isUpcoming = now < sTime;

                        return (
                          <TableRow key={b.id} className="border-border">
                            <TableCell className="font-bold text-foreground">{b.reason}</TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {new Date(b.start_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {new Date(b.end_time).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                            </TableCell>
                            <TableCell>
                              {isActive ? (
                                <Badge variant="default" className="bg-rose-500/10 text-rose-600 border border-rose-500/20 gap-1 font-semibold">
                                  <AlertTriangle className="w-3 h-3" /> Active Now
                                </Badge>
                              ) : isUpcoming ? (
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border border-amber-500/20 gap-1 font-semibold">
                                  <Clock className="w-3 h-3" /> Scheduled
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground border-border capitalize">
                                  Passed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-3xl border border-border bg-card">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-foreground">Delete Blackout Period</AlertDialogTitle>
                                    <AlertDialogDescription className="text-muted-foreground">
                                      Are you sure you want to delete the blackout for "{b.reason}"? Online bookings will resume for this time window.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl border-border">Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => handleBlackoutDelete(b.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Stations;
