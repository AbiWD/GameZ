import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { TableSkeleton } from '@/components/TableSkeleton';
import pb from '@/lib/pocketbase';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronRight, ChevronLeft, AlertTriangle, XCircle, Copy, ArrowUpDown, Banknote, CheckCircle2, Clock } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { escapePbFilterValue } from '@/lib/utils';
import { useProperty } from '@/contexts/PropertyContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const safeFormatDate = (dateString: string | null | undefined, formatStr: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return formatInTimeZone(date, 'Asia/Kolkata', formatStr);
};

interface Booking {
  id: string;
  booking_reference?: string;
  name: string;
  email: string;
  phone: string;
  station_type?: string;
  customer_id?: string;
  expand?: {
    assigned_station_id?: {
      station_type: string;
      station_number?: string;
      name: string;
    };
    customer_id?: {
      name: string;
      email?: string;
      phone?: string;
    };
  };
  start_time: string;
  end_time: string;
  total_price: number;
  guests: number;
  created: string;
  status: string;
  payment_status: string;
  payment_mode?: string;
  payment_method?: string;
}

export const getBookingStationCategory = (booking: Booking): string => {
  const assigned = booking.expand?.assigned_station_id;
  const rawType = (booking.station_type || (booking as any).station_type_id || '').toLowerCase();
  const assignedType = (assigned?.station_type || '').toLowerCase();
  const assignedName = (assigned?.name || assigned?.station_number || '').toLowerCase();

  const combined = `${rawType} ${assignedType} ${assignedName}`.replace(/[^a-z0-9]/g, '');

  if (
    combined.includes('ps5') ||
    combined.includes('playstation') ||
    combined.includes('ps0') ||
    combined.includes('ps1') ||
    combined.includes('ps2') ||
    combined.includes('ps3') ||
    combined.includes('ps4') ||
    rawType === '' ||
    combined.includes('gaminglounge')
  ) {
    return 'PlayStation 5 Lounge';
  }

  if (combined.includes('8ball') || combined.includes('pool') || combined.includes('pol') || combined.includes('8bl')) {
    return '8 Balls Pool';
  }

  if (combined.includes('snooker') || combined.includes('snk')) {
    return 'Snooker';
  }

  if (combined.includes('carrom') || combined.includes('car')) {
    return 'Carrom Arena';
  }

  if (combined.includes('vr')) {
    return 'VR Games';
  }

  return booking.station_type || assigned?.station_type || assigned?.name || 'Gaming Lounge';
};

const Bookings = () => {
  const { activeProperty } = useProperty();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stationFilter, setStationFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [cancelTargetBooking, setCancelTargetBooking] = useState<Booking | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Available station types for filter
  const [availableStationTypes, setAvailableStationTypes] = useState<string[]>([]);

  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('-created');

  const [userMap, setUserMap] = useState<Record<string, string>>({});

  // Debounce search term to protect database
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset page to 1 when filters logically change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stationFilter, statusFilter, sortOrder]);

  // Fetch bookings when page or active filters change
  useEffect(() => {
    fetchBookings();
  }, [page, debouncedSearch, stationFilter, statusFilter, sortOrder, activeProperty]);

  // Load available station types for dropdown filter
  useEffect(() => {
    const loadStationTypes = async () => {
      try {
        let types: any[] = [];
        try {
          types = await pb.collection('station_types').getFullList({ requestKey: null });
        } catch (err) {
          types = await pb.collection('station_types').getFullList({ requestKey: null });
        }
        setAvailableStationTypes(types.map(r => r.name));
      } catch (e) {
        console.error(e);
      }
    };
    loadStationTypes();
  }, [activeProperty]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const filters: string[] = [];

      if (activeProperty?.id) {
        const safeProp = escapePbFilterValue(activeProperty.id);
        filters.push(`(property_id = "${safeProp}" || property_id = "" || property_id = null || property_id = "20fml0zc3egjxy4")`);
      }

      if (statusFilter && statusFilter !== 'all') {
        const safeStatus = escapePbFilterValue(statusFilter);
        filters.push(`status = "${safeStatus}"`);
      }

      const filterStr = filters.length > 0 ? filters.join(' && ') : undefined;

      let result;
      try {
        result = await pb.collection('bookings').getList(1, 200, {
          filter: filterStr,
          sort: sortOrder,
          expand: 'assigned_station_id,customer_id',
          requestKey: null
        });
      } catch (filterErr) {
        console.warn('PocketBase server filter fallback triggered:', filterErr);
        result = await pb.collection('bookings').getList(1, 200, {
          sort: sortOrder,
          expand: 'assigned_station_id,customer_id',
          requestKey: null
        });
      }

      // Safeguard: If strict filter returned zero items, perform fallback fetch without property constraint
      if (result.totalItems === 0) {
        try {
          const fallbackRes = await pb.collection('bookings').getList(1, 200, {
            sort: sortOrder,
            expand: 'assigned_station_id,customer_id',
            requestKey: null
          });
          if (fallbackRes.totalItems > 0) {
            result = fallbackRes;
          }
        } catch (e) {}
      }

      let fetchedItems = result.items as unknown as Booking[];

      // Helper function to match station filter against booking record (handles slugs, full names, and relation names)
      const isStationTypeMatch = (booking: Booking, filter: string): boolean => {
        if (!filter || filter === 'all') return true;
        
        const category = getBookingStationCategory(booking);
        const normCategory = category.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normFilter = filter.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (normCategory === normFilter || normCategory.includes(normFilter) || normFilter.includes(normCategory)) {
          return true;
        }

        // Equivalent keyword matching for PS5 / PlayStation
        if ((normFilter.includes('ps5') || normFilter.includes('playstation')) &&
            (normCategory.includes('ps5') || normCategory.includes('playstation'))) {
          return true;
        }

        // Equivalent keyword matching for Pool / 8ball
        if ((normFilter.includes('pool') || normFilter.includes('8ball')) &&
            (normCategory.includes('pool') || normCategory.includes('8ball'))) {
          return true;
        }

        return false;
      };

      // 1. Station Dropdown Filter
      if (stationFilter && stationFilter !== 'all') {
        fetchedItems = fetchedItems.filter(b => isStationTypeMatch(b, stationFilter));
      }

      // 2. Status Dropdown Filter
      if (statusFilter && statusFilter !== 'all') {
        fetchedItems = fetchedItems.filter(b => (b.status || 'pending').toLowerCase() === statusFilter.toLowerCase());
      }

      // 3. Search Box Filter (Matches Name, Phone, Ref #, Email, Station, or Status)
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase().trim();
        fetchedItems = fetchedItems.filter(b => {
          const ref = (b.booking_reference || (b as any).bookingReference || '').toLowerCase();
          const name = ((b as any).customer_name || b.name || (b as any).customerName || '').toLowerCase();
          const email = (b.email || (b as any).customerEmail || '').toLowerCase();
          const phone = (b.phone || (b as any).customerPhone || '').toLowerCase();
          const status = (b.status || '').toLowerCase();
          const assigned = b.expand?.assigned_station_id;
          const station = (b.station_type || assigned?.name || assigned?.station_type || '').toLowerCase();

          return (
            ref.includes(query) ||
            name.includes(query) ||
            email.includes(query) ||
            phone.includes(query) ||
            status.includes(query) ||
            station.includes(query) ||
            isStationTypeMatch(b, query)
          );
        });
      }

      setBookings(fetchedItems);
      setTotalPages(result.totalPages);
      setTotalItems(fetchedItems.length);

      // Perform batch lookup on portal_users collection for player names
      const phones = Array.from(new Set(fetchedItems.map(b => b.phone).filter(Boolean)));
      const customerIds = Array.from(new Set(fetchedItems.map(b => b.customer_id).filter(Boolean)));

      if (phones.length > 0 || customerIds.length > 0) {
        try {
          const filterParts: string[] = [];
          if (phones.length > 0) {
            filterParts.push(`(${phones.map(p => `phone = "${escapePbFilterValue(p)}"`).join(' || ')})`);
          }
          if (customerIds.length > 0) {
            filterParts.push(`(${customerIds.map(id => `id = "${escapePbFilterValue(id)}"`).join(' || ')})`);
          }
          const userRecords = await pb.collection('portal_users').getFullList({
            filter: filterParts.join(' || '),
            requestKey: null
          });
          const newMap: Record<string, string> = {};
          for (const u of userRecords) {
            if (u.name && u.name.trim() !== '') {
              if (u.phone) newMap[u.phone] = u.name;
              if (u.id) newMap[u.id] = u.name;
            }
          }
          setUserMap(prev => ({ ...prev, ...newMap }));
        } catch (userErr) {
          console.warn('Failed to fetch user profiles from portal_users:', userErr);
        }
      }
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = (booking: Booking) => {
    setCancelTargetBooking(booking);
  };

  const executeSingleCancel = async () => {
    if (!cancelTargetBooking) return;
    try {
      await pb.collection('bookings').update(cancelTargetBooking.id, { status: 'cancelled' });
      toast.success(`Booking ${cancelTargetBooking.booking_reference || cancelTargetBooking.id} has been cancelled.`);
      setCancelTargetBooking(null);
      setSelectedBooking(null);
      fetchBookings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel booking');
    }
  };

  return (
    <AdminLayout>
      <div className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">All Bookings</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">View and manage all reservations across your property</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-8 shadow-sm overflow-x-hidden w-full">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Search by name, phone, or ref #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:max-w-sm rounded-xl border border-border bg-secondary/50 px-4 py-6 shadow-sm focus-visible:ring-1 focus-visible:bg-background transition-all"
            />

            <Select value={stationFilter} onValueChange={setStationFilter}>
              <SelectTrigger className="w-full sm:w-[200px] rounded-xl border border-border bg-secondary/50 px-4 py-6 shadow-sm focus:bg-background transition-all">
                <SelectValue placeholder="Filter by station type" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border shadow-lg">
                <SelectItem value="all">All Stations</SelectItem>
                {availableStationTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] rounded-xl border border-border bg-secondary/50 px-4 py-6 shadow-sm focus:bg-background transition-all">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border shadow-lg">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === '-created' ? '+created' : '-created')}
              className="w-full sm:w-auto rounded-xl border border-border bg-secondary/50 px-4 py-6 shadow-sm hover:bg-background transition-all flex items-center justify-center gap-2 font-medium"
            >
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              {sortOrder === '-created' ? 'Newest First' : 'Oldest First'}
            </Button>
          </div>

        {loading ? (
          <div className="mt-2">
            <TableSkeleton columns={8} rows={7} />
          </div>
        ) : (
          <div className="overflow-hidden bg-card border border-border rounded-2xl mt-2 pb-0.5">
            <Table>
              <TableHeader className="bg-secondary/50 border-b border-border">
                <TableRow className="border-b-0 hover:bg-transparent">
                  <TableHead className="py-4 px-4 font-semibold text-muted-foreground hidden lg:table-cell">Ref #</TableHead>
                  <TableHead className="py-4 px-2 sm:px-3 md:px-6 font-semibold text-muted-foreground text-xs sm:text-sm">Player</TableHead>
                  <TableHead className="py-4 px-4 font-semibold text-muted-foreground hidden md:table-cell">Phone</TableHead>
                  <TableHead className="py-4 px-2 sm:px-3 md:px-6 font-semibold text-muted-foreground text-xs sm:text-sm">Station</TableHead>
                  <TableHead className="py-4 px-2 sm:px-3 md:px-6 font-semibold text-muted-foreground text-xs sm:text-sm">Start Time</TableHead>
                  <TableHead className="py-4 px-4 font-semibold text-muted-foreground hidden md:table-cell">End Time</TableHead>
                  <TableHead className="py-4 px-4 font-semibold text-muted-foreground hidden lg:table-cell">Status</TableHead>
                  <TableHead className="py-4 px-4 font-semibold text-muted-foreground hidden lg:table-cell">Price</TableHead>
                  <TableHead className="py-4 px-1 md:px-6 font-semibold text-muted-foreground text-right lg:hidden text-xs sm:text-sm">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      No bookings found
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((booking) => (
                    <TableRow 
                      key={booking.id} 
                      className="border-b border-border hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <TableCell className="font-mono text-xs font-semibold py-3 px-4 text-primary hidden lg:table-cell">{booking.booking_reference || '-'}</TableCell>
                      <TableCell className="font-bold py-3 px-2 sm:px-3 md:px-6 max-w-[80px] sm:max-w-[120px] lg:max-w-none truncate text-xs sm:text-sm text-foreground">
                        {(() => {
                          if (booking.customer_id && userMap[booking.customer_id]) {
                            return userMap[booking.customer_id];
                          }
                          if (booking.phone && userMap[booking.phone]) {
                            return userMap[booking.phone];
                          }
                          const expandedCustomerName = booking.expand?.customer_id?.name;
                          if (expandedCustomerName && expandedCustomerName.trim() !== '' && !expandedCustomerName.toLowerCase().startsWith('guest')) {
                            return expandedCustomerName;
                          }
                          if (booking.name && booking.name.trim() !== '' && !booking.name.toLowerCase().startsWith('guest') && booking.name !== 'Gamer Guest' && booking.name !== 'Walk-in Guest') {
                            return booking.name;
                          }
                          if (expandedCustomerName && expandedCustomerName.trim() !== '') {
                            return expandedCustomerName;
                          }
                          return booking.phone ? `Guest (${booking.phone})` : 'Gamer Guest';
                        })()}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-muted-foreground hidden md:table-cell">{booking.phone}</TableCell>
                      <TableCell className="py-3 px-2 sm:px-3 md:px-6">
                        <span className="inline-block px-2.5 py-1 rounded-md border border-primary/20 text-[10px] sm:text-xs font-semibold bg-primary/5 text-primary leading-tight text-center truncate max-w-[120px] sm:max-w-[160px] lg:max-w-none hover:whitespace-normal">
                          {(() => {
                            const typeName = getBookingStationCategory(booking);
                            const assigned = booking.expand?.assigned_station_id;
                            const stationNum = assigned?.station_number || assigned?.name;

                            if (stationNum && !stationNum.toLowerCase().includes(typeName.toLowerCase())) {
                              return `${typeName} (${stationNum})`;
                            }
                            return typeName;
                          })()}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-2 sm:px-3 md:px-6 text-muted-foreground text-[10px] sm:text-sm">
                        <span className="sm:hidden">{safeFormatDate(booking.start_time, 'MMM dd')}</span>
                        <span className="hidden sm:inline">{safeFormatDate(booking.start_time, 'MMM dd, h:mm a')}</span>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-muted-foreground hidden md:table-cell">{safeFormatDate(booking.end_time, 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="py-3 px-4 hidden lg:table-cell">
                        {booking.status === 'cancelled' ? (
                          <span className="inline-block px-2.5 py-1 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-xs font-semibold">Cancelled</span>
                        ) : booking.status === 'confirmed' ? (
                          <span className="inline-block px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md text-xs font-semibold">Confirmed</span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 bg-secondary border border-border text-secondary-foreground rounded-md text-xs font-semibold capitalize">{booking.status || 'Pending'}</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 font-semibold text-foreground hidden lg:table-cell">₹{booking.total_price}</TableCell>
                      <TableCell className="py-3 px-1 md:px-6 text-right lg:hidden">
                        <button 
                          onClick={() => setSelectedBooking(booking)}
                          className="p-1.5 sm:p-2 hover:bg-accent bg-background border border-border shadow-sm rounded-full transition-colors active:scale-95 text-foreground"
                        >
                          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* Pagination Controls */}
            {totalPages > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border p-4 sm:px-6 gap-4 bg-card">
                <span className="text-sm text-foreground font-medium">
                  {totalItems} bookings <span className="mx-2 text-muted-foreground/40">•</span> Page {page} of {totalPages}
                </span>
                
                <div className="flex gap-2 items-center">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="p-2 border border-border rounded-full text-sm font-medium hover:bg-secondary disabled:opacity-50 disabled:pointer-events-none transition-colors text-foreground"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                    className="p-2 border border-border rounded-full text-sm font-medium hover:bg-secondary disabled:opacity-50 disabled:pointer-events-none transition-colors text-foreground"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
      
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="w-[95vw] sm:max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-bold text-foreground">Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="bg-secondary/30 border border-border rounded-2xl p-5 shadow-sm space-y-3">
                 <div className="flex justify-between items-center border-b border-border pb-3">
                   <span className="text-sm font-medium text-muted-foreground">Player Name</span>
                   <span className="font-bold text-foreground text-right truncate max-w-[180px]">
                     {(() => {
                       if (selectedBooking.customer_id && userMap[selectedBooking.customer_id]) {
                         return userMap[selectedBooking.customer_id];
                       }
                       if (selectedBooking.phone && userMap[selectedBooking.phone]) {
                         return userMap[selectedBooking.phone];
                       }
                       const expandedCustomerName = selectedBooking.expand?.customer_id?.name;
                       if (expandedCustomerName && expandedCustomerName.trim() !== '' && !expandedCustomerName.toLowerCase().startsWith('guest')) {
                         return expandedCustomerName;
                       }
                       if (selectedBooking.name && selectedBooking.name.trim() !== '' && !selectedBooking.name.toLowerCase().startsWith('guest') && selectedBooking.name !== 'Gamer Guest' && selectedBooking.name !== 'Walk-in Guest') {
                         return selectedBooking.name;
                       }
                       if (expandedCustomerName && expandedCustomerName.trim() !== '') {
                         return expandedCustomerName;
                       }
                       return selectedBooking.phone ? `Guest (${selectedBooking.phone})` : 'Gamer Guest';
                     })()}
                   </span>
                 </div>
                 <div className="flex justify-between items-center border-b border-border pb-3">
                   <span className="text-sm font-medium text-muted-foreground">Reference #</span>
                   <span className="font-mono text-sm text-primary font-bold">{selectedBooking.booking_reference || '-'}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-border pb-3">
                   <span className="text-sm font-medium text-muted-foreground">Phone</span>
                   <span className="font-medium text-foreground">{selectedBooking.phone}</span>
                 </div>
                 {selectedBooking.email && !selectedBooking.email.endsWith('@guest.gamez.in') && !selectedBooking.email.startsWith('walkin') && !selectedBooking.email.startsWith('guest') && (
                    <div className="flex justify-between items-center border-b border-border pb-3">
                      <span className="text-sm font-medium text-muted-foreground">Email</span>
                      <span className="font-medium text-foreground truncate max-w-[180px] text-right">{selectedBooking.email}</span>
                    </div>
                  )}
                 <div className="flex justify-between items-center border-b border-border pb-3">
                   <span className="text-sm font-medium text-muted-foreground">Station</span>
                   <span className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 py-0.5 px-2.5 rounded-md">
                     {(() => {
                       const assigned = selectedBooking.expand?.assigned_station_id;
                       const typeName = selectedBooking.station_type || assigned?.station_type;
                       const stationNum = assigned?.station_number || assigned?.name;
                       if (typeName && stationNum) return `${typeName} (${stationNum})`;
                       return typeName || stationNum || 'Gaming Lounge';
                     })()}
                   </span>
                 </div>
                 <div className="flex justify-between items-center border-b border-border pb-3">
                   <span className="text-sm font-medium text-muted-foreground">Start Time</span>
                   <span className="font-medium text-foreground">{safeFormatDate(selectedBooking.start_time, 'MMM dd, yyyy • hh:mm a')}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-border pb-3">
                   <span className="text-sm font-medium text-muted-foreground">End Time</span>
                   <span className="font-medium text-foreground">{safeFormatDate(selectedBooking.end_time, 'MMM dd, yyyy • hh:mm a')}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-border pb-3">
                   <span className="text-sm font-medium text-muted-foreground">Status</span>
                   <span>
                     {selectedBooking.status === 'cancelled' ? (
                       <span className="inline-block px-2.5 py-1 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-xs font-semibold">Cancelled</span>
                     ) : selectedBooking.status === 'confirmed' ? (
                       <span className="inline-block px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md text-xs font-semibold">Confirmed</span>
                     ) : (
                       <span className="inline-block px-2.5 py-1 bg-secondary border border-border text-secondary-foreground rounded-md text-xs font-semibold capitalize">{selectedBooking.status || 'Pending'}</span>
                     )}
                   </span>
                 </div>
                 <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="text-sm font-medium text-muted-foreground">Payment Status</span>
                    <span>
                      {(() => {
                        const isPaid = selectedBooking.payment_status === 'paid' || selectedBooking.status === 'completed';
                        const isCancelled = selectedBooking.status === 'cancelled';
                        const mode = (selectedBooking.payment_mode || selectedBooking.payment_method || '').toLowerCase();

                        if (isCancelled) {
                          return (
                            <span className="text-muted-foreground bg-secondary border-border border px-2.5 py-1 rounded-md text-xs font-semibold">
                              Cancelled (No Payment)
                            </span>
                          );
                        }

                        if (isPaid) {
                          let label = 'Paid';
                          if (mode === 'cash') label = 'Cash Collected';
                          else if (mode === 'upi') label = 'Paid via UPI';
                          else if (mode === 'card') label = 'Paid via Card';

                          return (
                            <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 border px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {label}
                            </span>
                          );
                        }

                        // Future / Pending check-in session
                        return (
                          <span className="text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20 border px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 animate-pulse" />
                            Pay at Front Desk
                          </span>
                        );
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-1 pt-1">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-muted-foreground">Total Price</span>
                      <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        {selectedBooking.payment_status === 'paid' || selectedBooking.status === 'completed' 
                          ? 'Settlement Complete' 
                          : 'Due at Front Desk upon Arrival'}
                      </span>
                    </div>
                   <span className="font-bold text-lg text-foreground">₹{selectedBooking.total_price}</span>
                 </div>
              </div>
              {selectedBooking.status !== 'cancelled' && (
                <div className="pt-2">
                  <Button 
                    variant="destructive" 
                    className="w-full rounded-xl py-6 font-semibold text-base flex items-center justify-center gap-2"
                    onClick={() => handleCancelBooking(selectedBooking)}
                  >
                    <XCircle className="w-5 h-5" />
                    Cancel Booking
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Single Cancel */}
      <AlertDialog open={!!cancelTargetBooking} onOpenChange={(open) => !open && setCancelTargetBooking(null)}>
        <AlertDialogContent className="rounded-3xl border border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will instantly cancel booking {cancelTargetBooking?.booking_reference} and free up station availability. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl hover:bg-secondary border-border">Nevermind</AlertDialogCancel>
            <AlertDialogAction onClick={executeSingleCancel} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl">Yes, Cancel Booking</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


    </AdminLayout>
  );
};

export default Bookings;
