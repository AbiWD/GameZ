import { useState, useEffect } from 'react';
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

import { Plus, Edit, Trash2, Gamepad2 as ConsoleIcon, Settings2, ChevronLeft, ChevronRight, Sparkles, Image as ImageIcon, X } from 'lucide-react';

import { useProperty } from '@/contexts/PropertyContext';

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

const STATION_STATUS = ['available', 'occupied', 'maintenance'];
const AVAILABLE_ICONS = ['Gamepad2', 'Monitor', 'Headphones', 'Mouse', 'Keyboard', 'Tv', 'Sofa', 'Coffee', 'Wifi', 'Cpu', 'Speaker'];

const Stations = () => {
  const { activeProperty } = useProperty();
  // Inventory State
  const [stations, setStations] = useState<Station[]>([]);
  const [allStations, setAllStations] = useState<Station[]>([]); // Raw dashboard stats data
  const [stationTypes, setStationTypes] = useState<StationType[]>([]);
  
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
      const propertyFilter = `property_id = "${activeProperty?.id}"`;
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
        filter: `property_id = "${activeProperty?.id}"`
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

  // Re-fetch stations when the page number changes or property changes
  useEffect(() => {
    if (activeProperty) fetchStations();
  }, [page, activeProperty]);

  useEffect(() => {
    if (activeProperty) fetchStationTypes();
  }, [activeProperty]);

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
      case 'available': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'occupied': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'maintenance': return 'bg-destructive/10 text-destructive border border-destructive/20';
      default: return 'bg-secondary text-secondary-foreground border border-border';
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
        available: typeStations.filter(r => r.status === 'available').length,
        occupied: typeStations.filter(r => r.status === 'occupied').length,
        maintenance: typeStations.filter(r => r.status === 'maintenance').length
      };
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Stations & Property Manager
            </h1>
            <p className="text-muted-foreground mt-1">Manage physical station inventory and pricing tiers</p>
          </div>
        </div>

        <Tabs defaultValue="inventory" className="w-full space-y-6">
          <TabsList className="bg-secondary/50 border border-border flex w-full overflow-x-auto whitespace-nowrap scrollbar-hide justify-start h-auto rounded-2xl p-1">
            <TabsTrigger value="inventory" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-xl py-2 px-4">
              <ConsoleIcon className="w-4 h-4 mr-2" />
              Station Inventory
            </TabsTrigger>
            <TabsTrigger value="types" className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm rounded-xl py-2 px-4">
              <Settings2 className="w-4 h-4 mr-2" />
              Manage Station Types
            </TabsTrigger>
          </TabsList>

          {/* INVENTORY TAB */}
          <TabsContent value="inventory" className="outline-none space-y-6 animate-in fade-in duration-500 fill-mode-forwards">
             <div className="flex justify-end">
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl px-6 font-semibold">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Station
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] sm:max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl">
                  <DialogHeader className="mb-2">
                    <DialogTitle className="text-xl font-bold text-foreground text-center">{editingStation ? 'Edit Station' : 'Add New Station'}</DialogTitle>
                    <DialogDescription className="text-center text-muted-foreground">
                      {editingStation ? 'Update station details' : 'Add a new station to your inventory'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="bg-secondary/30 border border-border rounded-2xl p-5 shadow-sm">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="station_number" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Station Number</Label>
                      <Input
                        id="station_number"
                        value={formData.station_number}
                        onChange={(e) => setFormData({ ...formData, station_number: e.target.value })}
                        placeholder="e.g., 101"
                        required
                        className="rounded-xl border-border bg-secondary/50 focus-visible:bg-background h-12"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="station_type" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Station Type</Label>
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
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border shadow-lg">
                          {stationTypes.map(type => (
                            <SelectItem key={type.name} value={type.name}>{type.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {stationTypes.length === 0 && (
                        <p className="text-xs text-destructive mt-1">Please add a Station Type in the other tab first!</p>
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="price_per_hour" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price per Hour (₹)</Label>
                        <Input
                          id="price_per_hour"
                          type="number"
                          value={formData.price_per_hour}
                          onChange={(e) => setFormData({ ...formData, price_per_hour: parseInt(e.target.value) || 0 })}
                          required
                          className="rounded-xl border-border bg-secondary/50 focus-visible:bg-background h-12"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="max_players" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Players</Label>
                        <Input
                          id="max_players"
                          type="number"
                          value={formData.max_players}
                          onChange={(e) => setFormData({ ...formData, max_players: parseInt(e.target.value) || 0 })}
                          required
                          className="rounded-xl border-border bg-secondary/50 focus-visible:bg-background h-12"
                        />
                      </div>
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
                                <AlertDialogTitle className="text-foreground">Delete Station</AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground">
                                  Are you sure you want to delete station {editingStation.station_number}? This action cannot be undone.
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
                          {editingStation ? 'Update' : 'Add'} Station
                        </Button>
                      </div>
                    </div>
                  </form>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div>
              <h2 className="text-xl font-bold mb-4 text-foreground">Station Type Inventory</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {getStationTypeSummary().map((summary, index) => {
                  return (
                    <div key={summary.type} className={`rounded-2xl p-6 border border-border bg-card hover:-translate-y-1 transition-transform duration-300 shadow-sm relative overflow-hidden group`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <div className="mb-4">
                        <h3 className="text-base font-semibold text-foreground tracking-tight">{summary.type}</h3>
                        <p className="text-sm font-medium text-muted-foreground mt-1">₹{summary.base_price}/hour</p>
                      </div>
                      <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-foreground font-medium">Total Stations</span>
                          <span className="text-3xl font-bold tracking-tight text-foreground">
                            {summary.total}
                          </span>
                        </div>
                        <div className="pt-4 border-t border-border space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-muted-foreground font-medium">
                              <div className="w-2 h-2 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                              Available
                            </span>
                            <span className="font-bold text-foreground">{summary.available}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-muted-foreground font-medium">
                              <div className="w-2 h-2 rounded-full bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.4)]"></div>
                              Occupied
                            </span>
                            <span className="font-bold text-foreground">{summary.occupied}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {stationTypes.length === 0 && !loadingTypes && (
                  <div className="col-span-full p-8 border-2 border-dashed border-border rounded-2xl text-center text-muted-foreground">
                    No Station Types Found. Please go to the "Manage Station Types" tab to set some up.
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4 text-foreground mt-8">Overall Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {STATION_STATUS.map(status => {
                  const count = allStations.filter(r => r.status === status).length;
                  return (
                    <div key={status} className="bg-card border border-border rounded-2xl p-6 shadow-sm flex items-center justify-between">
                      <span className="text-sm tracking-wide uppercase font-semibold text-muted-foreground">{status}</span>
                      <span className="text-3xl font-bold text-foreground tracking-tight">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-4 lg:p-8 shadow-sm w-full mx-auto overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">All Stations</h2>
                <div className="flex items-center gap-4">
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
                  <p className="text-sm text-muted-foreground hidden md:block">Manage station inventory</p>
                </div>
              </div>
              
              <div className="overflow-hidden bg-card rounded-2xl border border-border">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground animate-pulse">Loading...</div>
                ) : stations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <DoorOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{allStations.length > 0 ? 'No stations on this page' : 'No stations added yet'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto w-full">
                    <Table className="w-full min-w-max">
                    <TableHeader className="bg-secondary/50 border-b border-border">
                      <TableRow className="border-b-0 hover:bg-transparent">
                        <TableHead className="h-10 px-3 sm:px-4 md:px-6 text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap">Station No.</TableHead>
                        <TableHead className="h-10 px-2 sm:px-3 md:px-6 text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap">Station Type</TableHead>
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
                                    <AlertDialogTitle className="text-foreground">Delete Station</AlertDialogTitle>
                                    <AlertDialogDescription className="text-muted-foreground">
                                      Are you sure you want to delete station {station.station_number}? This action cannot be undone.
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
                  <h2 className="text-2xl font-bold text-foreground">Station Categories</h2>
                  <p className="text-sm text-muted-foreground mt-1">Configure your station types, base pricing, and maximum occupancy limits</p>
                </div>
                <Dialog open={typeDialogOpen} onOpenChange={(open) => {
                  setTypeDialogOpen(open);
                  if (!open) resetTypeForm();
                }}>
                  <DialogTrigger asChild>
                    <Button className="rounded-xl px-6 font-semibold">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Station Type
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-3xl p-6 shadow-2xl">
                    <DialogHeader className="mb-2">
                      <DialogTitle className="text-xl font-bold text-foreground text-center">{editingType ? 'Edit Station Type' : 'Add New Station Type'}</DialogTitle>
                      <DialogDescription className="text-center text-muted-foreground">
                        {editingType ? 'Update base configuration' : 'Create a new category for physical stations'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="bg-secondary/30 rounded-2xl p-5 border border-border">
                    <form onSubmit={handleTypeSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <Label htmlFor="type_name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type Name</Label>
                            <Input
                              id="type_name"
                              value={typeFormData.name}
                              onChange={(e) => setTypeFormData({ ...typeFormData, name: e.target.value })}
                              placeholder="e.g. PS5 Console AC Station"
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
                                value={typeFormData.base_price}
                                onChange={(e) => setTypeFormData({ ...typeFormData, base_price: parseInt(e.target.value) || 0 })}
                                required
                                className="rounded-xl border-border bg-secondary/50 focus-visible:bg-background h-12"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="default_occupancy" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Default Players</Label>
                              <Input
                                id="default_occupancy"
                                type="number"
                                value={typeFormData.max_players}
                                onChange={(e) => setTypeFormData({ ...typeFormData, max_players: parseInt(e.target.value) || 0 })}
                                required
                                className="rounded-xl border-border bg-secondary/50 focus-visible:bg-background h-12"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="specs" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Equipment Specs</Label>
                            <Input
                              id="specs"
                              value={typeFormData.specs}
                              onChange={(e) => setTypeFormData({ ...typeFormData, specs: e.target.value })}
                              placeholder="e.g. Standard PC"
                              className="rounded-xl border-border bg-secondary/50 focus-visible:bg-background h-12"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Short Description</Label>
                            <textarea
                              id="description"
                              className="flex min-h-[80px] w-full rounded-xl border border-border bg-secondary/50 px-3 py-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-background disabled:cursor-not-allowed disabled:opacity-50 transition-all font-medium text-foreground"
                              value={typeFormData.description}
                              onChange={(e) => setTypeFormData({ ...typeFormData, description: e.target.value })}
                              placeholder="e.g. Cozy single station with natural ventilation and peaceful ambiance."
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-2">
                            <Switch id="is_popular" checked={typeFormData.is_popular} onCheckedChange={(c) => setTypeFormData({...typeFormData, is_popular: c})} />
                            <Label htmlFor="is_popular" className="cursor-pointer text-sm font-medium">Mark as "Popular" (Shows Badge)</Label>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Station Image</Label>
                            <div className="mt-2 flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-xl p-4 bg-secondary/30 relative overflow-hidden group">
                              {typeFormData.imagePreview && !typeFormData.imageFile ? (
                                <img src={typeFormData.imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-md" />
                              ) : (
                                <ImageIcon className="w-12 h-12 text-muted-foreground opacity-30 mt-2" />
                              )}
                              <Input 
                                type="file" 
                                accept="image/*" 
                                className="w-full text-xs absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) {
                                    setTypeFormData({ ...typeFormData, imageFile: e.target.files[0] });
                                  }
                                }}
                              />
                               <span className="text-xs font-semibold text-muted-foreground bg-background/80 px-2 py-1 rounded-md z-10 pointer-events-none group-hover:text-foreground transition-colors mt-2">{typeFormData.imageFile ? typeFormData.imageFile.name : 'Click or drop to upload'}</span>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-2 border-b border-border pb-2">
                              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Features</Label>
                              <Button type="button" variant="outline" size="sm" className="h-6 text-xs px-2 rounded-md" onClick={() => setTypeFormData({...typeFormData, features: [...typeFormData.features, 'New Feature']})}>
                                <Plus className="w-3 h-3 mr-1" /> Add
                              </Button>
                            </div>
                            <div className="space-y-2 max-h-28 overflow-y-auto pr-1">
                              {typeFormData.features.map((feat, idx) => (
                                <div key={idx} className="flex gap-2">
                                  <Input 
                                    value={feat}
                                    className="h-8 text-xs rounded-md border-border bg-secondary/50 focus-visible:bg-background"
                                    onChange={(e) => {
                                      const newF = [...typeFormData.features];
                                      newF[idx] = e.target.value;
                                      setTypeFormData({...typeFormData, features: newF});
                                    }}
                                  />
                                  <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => {
                                    const newF = [...typeFormData.features];
                                    newF.splice(idx, 1);
                                    setTypeFormData({...typeFormData, features: newF});
                                  }}>
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-2 border-b border-border pb-2">
                              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amenities (Icons)</Label>
                              <Button type="button" variant="outline" size="sm" className="h-6 text-xs px-2 rounded-md" onClick={() => setTypeFormData({...typeFormData, amenities: [...typeFormData.amenities, 'Wifi']})}>
                                <Plus className="w-3 h-3 mr-1" /> Add
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {typeFormData.amenities.map((amenity, idx) => {
                                const IconComp = (LucideIcons as any)[amenity] || LucideIcons.Star;
                                return (
                                  <div key={idx} className="flex items-center gap-1 bg-secondary border border-border px-2 py-1.5 rounded-full text-xs shadow-sm">
                                    <Select 
                                      value={amenity}
                                      onValueChange={(val) => {
                                        const newA = [...typeFormData.amenities];
                                        newA[idx] = val;
                                        setTypeFormData({...typeFormData, amenities: newA});
                                      }}
                                    >
                                      <SelectTrigger className="h-5 w-5 p-0 border-none bg-transparent shadow-none [&>svg]:hidden text-foreground">
                                        <SelectValue>
                                          <IconComp className="w-3.5 h-3.5" />
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent className="rounded-xl border-border shadow-lg min-w-[120px]">
                                        {AVAILABLE_ICONS.map(i => (
                                          <SelectItem key={i} value={i} className="text-xs">{i}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <button type="button" className="text-destructive opacity-70 hover:opacity-100 ml-1 transition-opacity" onClick={() => {
                                      const newA = [...typeFormData.amenities];
                                      newA.splice(idx, 1);
                                      setTypeFormData({...typeFormData, amenities: newA});
                                    }}>
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
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
                                  <AlertDialogTitle className="text-foreground">Delete Station Type</AlertDialogTitle>
                                  <AlertDialogDescription className="text-muted-foreground">
                                    Are you sure you want to delete the "{editingType.name}" type? Physical stations assigned to this type will not be deleted, but it may cause display issues.
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
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Stations;
