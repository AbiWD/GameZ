import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import pb from '@/lib/pocketbase';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronRight, ChevronLeft, AlertTriangle, XCircle, Copy } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
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
  station_type: string;
  start_time: string;
  end_time: string;
  price: number;
  guests: number;
  created: string;
  status: string;
  payment_status: string;
}

const Bookings = () => {
  const { activeProperty } = useProperty();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stationFilter, setStationFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Emergency actions states
  const [isEmergencyDialogOpen, setIsEmergencyDialogOpen] = useState(false);
  const [emergencyStartDate, setEmergencyStartDate] = useState('');
  const [emergencyEndDate, setEmergencyEndDate] = useState('');
  const [emergencyStationType, setEmergencyStationType] = useState('all');
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);
  const [cancelTargetBooking, setCancelTargetBooking] = useState<Booking | null>(null);
  const [isMassCancelConfirmOpen, setIsMassCancelConfirmOpen] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Available station types for filter
  const [availableStationTypes, setAvailableStationTypes] = useState<string[]>([]);

  // Debounce search term to protect database
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset page to 1 when filters logically change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stationFilter]);

  useEffect(() => {
    if (activeProperty) {
      fetchBookings();
    }
  }, [activeProperty, page, debouncedSearch, stationFilter]);

  // Fetch available station types for dropdown once when property loads
  useEffect(() => {
    if (activeProperty) {
      pb.collection('station_types').getFullList({
        filter: `property_id = "${activeProperty.id}"`,
        requestKey: null
      }).then(res => {
        setAvailableStationTypes(res.map(r => r.name));
      }).catch(console.error);
    }
  }, [activeProperty]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      let filterStr = `property_id = "${activeProperty?.id}"`;
      
      if (debouncedSearch) {
        // Sanitize search string to prevent PocketBase query injection crashes
        const safeSearch = debouncedSearch.replace(/"/g, '\\"').replace(/'/g, "\\'");
        filterStr += ` && (name ~ "${safeSearch}" || email ~ "${safeSearch}" || phone ~ "${safeSearch}")`;
      }
      
      if (stationFilter && stationFilter !== 'all') {
        const safeStation = stationFilter.replace(/"/g, '\\"');
        filterStr += ` && station_type = "${safeStation}"`;
      }

      const result = await pb.collection('bookings').getList(page, 10, {
        filter: filterStr,
        requestKey: null
      });
      
      setBookings(result.items as unknown as Booking[]);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalItems);
    } catch (error: any) {
      console.error('Error fetching bookings:', error);
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
      await pb.collection('bookings').update(cancelTargetBooking.id, {
        status: 'cancelled'
      });
      toast.success('Booking cancelled successfully');
      setSelectedBooking(null);
      fetchBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    } finally {
      setCancelTargetBooking(null);
    }
  };

  const handleMassCancel = () => {
    if (!emergencyStartDate || !emergencyEndDate) {
      toast.error("Please explicitly select both Start and End dates.");
      return;
    }
    setIsMassCancelConfirmOpen(true);
  };

  const executeMassCancel = async () => {
    setIsMassCancelConfirmOpen(false);
    setIsProcessingCancel(true);
    
    try {
      // Find all overlapping bookings that are not already cancelled
      let massFilter = `property_id = "${activeProperty?.id}" && status != 'cancelled' && start_time < "${emergencyEndDate} 00:00:00.000Z" && end_time > "${emergencyStartDate} 00:00:00.000Z"`;
      
      if (emergencyStationType !== 'all') {
        massFilter += ` && station_type = "${emergencyStationType}"`;
      }

      const overlappingBookings = await pb.collection('bookings').getFullList({
        filter: massFilter
      });

      if (overlappingBookings.length === 0) {
        toast.info("No active bookings found in this date range.");
        setIsProcessingCancel(false);
        return;
      }

      let successCount = 0;

      for (const b of overlappingBookings) {
        try {
          await pb.collection('bookings').update(b.id, {
            status: 'cancelled'
          });
          successCount++;
        } catch (err) {
          console.error("Failed to cancel booking", b.id, err);
        }
      }
      
      toast.success(`Successfully cancelled ${successCount} bookings!`);
      setIsEmergencyDialogOpen(false); // Auto close after success
      fetchBookings(); // refresh list
    } catch (error) {
       console.error("Error fetching overlapping bookings", error);
       toast.error("An error occurred trying to mass-cancel bookings.");
    } finally {
      setIsProcessingCancel(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">All Bookings</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">View and manage all reservations across your property</p>
          </div>
          <Button 
            onClick={() => setIsEmergencyDialogOpen(true)}
            variant="destructive"
            className="rounded-xl shadow-sm flex items-center gap-2 font-semibold"
          >
            <AlertTriangle className="w-4 h-4" />
            Emergency Tools
          </Button>
        </div>

        <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-4 sm:p-5 md:p-8 shadow-sm overflow-x-hidden w-full">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Search by name, email, or phone..."
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
          </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground animate-pulse">Loading bookings...</div>
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
                  <TableHead className="py-4 px-4 font-semibold text-muted-foreground hidden lg:table-cell">Guests</TableHead>
                  <TableHead className="py-4 px-1 md:px-6 font-semibold text-muted-foreground text-right lg:hidden text-xs sm:text-sm">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={loading ? 'opacity-50 pointer-events-none' : ''}>
                {bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      No bookings found
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((booking) => (
                    <TableRow key={booking.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold py-3 px-4 text-primary hidden lg:table-cell">{booking.booking_reference || '-'}</TableCell>
                      <TableCell className="font-bold py-3 px-2 sm:px-3 md:px-6 max-w-[80px] sm:max-w-[120px] lg:max-w-none truncate text-xs sm:text-sm text-foreground">{booking.name}</TableCell>
                      <TableCell className="py-3 px-4 text-muted-foreground hidden md:table-cell">{booking.phone}</TableCell>
                      <TableCell className="py-3 px-2 sm:px-3 md:px-6">
                        <span className="inline-block px-2 py-1 rounded-md border border-primary/20 text-[10px] sm:text-xs font-semibold bg-primary/5 text-primary leading-tight text-center truncate max-w-[70px] sm:max-w-[100px] lg:max-w-none hover:whitespace-normal">
                          {booking.station_type}
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
                      <TableCell className="py-3 px-4 font-semibold text-foreground hidden lg:table-cell">₹{booking.price}</TableCell>
                      <TableCell className="py-3 px-4 text-muted-foreground hidden lg:table-cell">{booking.guests}</TableCell>
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
                   <span className="font-bold text-foreground max-w-[150px] sm:max-w-[180px] text-right truncate">{selectedBooking.name}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-border pb-3">
                   <span className="text-sm font-medium text-muted-foreground">Reference #</span>
                   <span className="font-mono text-sm text-primary">{selectedBooking.booking_reference || '-'}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-border pb-3">
                   <span className="text-sm font-medium text-muted-foreground">Phone</span>
                   <span className="font-medium text-foreground">{selectedBooking.phone}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-border pb-3">
                   <span className="text-sm font-medium text-muted-foreground">Email</span>
                   <span className="font-medium text-foreground truncate max-w-[150px] sm:max-w-[180px] text-right">{selectedBooking.email}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-border pb-3">
                   <span className="text-sm font-medium text-muted-foreground">Station Type</span>
                   <span className="text-sm font-semibold text-primary bg-primary/10 border border-primary/20 xl:py-0.5 px-2 rounded-md">{selectedBooking.station_type}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-border pb-3">
                   <span className="text-sm font-medium text-muted-foreground">Start Time</span>
                   <span className="font-medium text-foreground">{safeFormatDate(selectedBooking.start_time, 'MMM dd, yyyy')}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-border pb-3">
                   <span className="text-sm font-medium text-muted-foreground">End Time</span>
                   <span className="font-medium text-foreground">{safeFormatDate(selectedBooking.end_time, 'MMM dd, yyyy')}</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-border pb-3">
                   <span className="text-sm font-medium text-muted-foreground">Guests</span>
                   <span className="font-medium text-foreground">{selectedBooking.guests}</span>
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
                 <div className="flex justify-between items-center pb-1 pt-1">
                   <span className="text-sm font-medium text-muted-foreground">Total Price</span>
                   <span className="font-bold text-lg text-foreground">₹{selectedBooking.price}</span>
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
      
      {/* Emergency Tools Dialog */}
      <Dialog open={isEmergencyDialogOpen} onOpenChange={setIsEmergencyDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-6 h-6" />
              Emergency Cancellation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This action will permanently block dates and set all overlapping bookings to <strong className="text-destructive font-bold">cancelled</strong>. Use this only for severe property emergencies.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emergency Start Date</label>
              <Input 
                type="date" 
                value={emergencyStartDate}
                onChange={(e) => setEmergencyStartDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-6 focus-visible:bg-background"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emergency End Date</label>
              <Input 
                type="date" 
                value={emergencyEndDate}
                onChange={(e) => setEmergencyEndDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-6 focus-visible:bg-background"
              />
            </div>
            <div className="space-y-2">
               <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target Stations</label>
               <Select value={emergencyStationType} onValueChange={setEmergencyStationType}>
                 <SelectTrigger className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-6 focus:bg-background">
                   <SelectValue placeholder="All Stations" />
                 </SelectTrigger>
                 <SelectContent className="rounded-xl border-border shadow-lg">
                   <SelectItem value="all">All Stations (Entire Resort)</SelectItem>
                   {availableStationTypes.map(type => (
                     <SelectItem key={type} value={type}>{type}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
            </div>
            
            <div className="pt-4">
              <Button 
                onClick={handleMassCancel} 
                disabled={isProcessingCancel || !emergencyStartDate || !emergencyEndDate}
                variant="destructive"
                className="w-full rounded-xl py-6 font-semibold"
              >
                {isProcessingCancel ? "Processing Cancellation..." : "Cancel Overlapping Bookings"}
              </Button>
            </div>
          </div>
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

      {/* Confirm Mass Cancel */}
      <AlertDialog open={isMassCancelConfirmOpen} onOpenChange={setIsMassCancelConfirmOpen}>
        <AlertDialogContent className="rounded-3xl border border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5"/>
              EMERGENCY ACTION
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to cancel ALL bookings from {emergencyStartDate} to {emergencyEndDate}? This action cannot be reversed automatically and will completely clear availability.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl hover:bg-secondary border-border">Nevermind</AlertDialogCancel>
            <AlertDialogAction onClick={executeMassCancel} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl">Yes, Cancel All Overlapping</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default Bookings;
