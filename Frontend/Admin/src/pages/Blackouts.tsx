import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import pb from '@/lib/pocketbase';
import { useProperty } from '@/contexts/PropertyContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CalendarX, Plus, AlertTriangle, Clock, Trash2, Lock, ShieldAlert } from 'lucide-react';

interface BlackoutPeriod {
  id: string;
  reason: string;
  start_time: string;
  end_time: string;
  property_id?: string;
  created: string;
}

interface ConflictingBooking {
  id: string;
  booking_reference: string;
  name: string;
  phone: string;
  email: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
}

const Blackouts = () => {
  const { activeProperty } = useProperty();
  const { userRole } = useAuth();
  const { toast } = useToast();

  const [blackouts, setBlackouts] = useState<BlackoutPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  // Blackout Creation & Conflict state
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

  const isAdminOrOwner = userRole === 'admin' || userRole === 'owner' || userRole === 'manager';

  useEffect(() => {
    if (activeProperty) {
      fetchBlackouts();
    }
  }, [activeProperty]);

  const fetchBlackouts = async () => {
    setLoading(true);
    try {
      const propertyFilter = activeProperty ? `property_id = "${activeProperty.id}"` : '';
      let data: any[] = [];
      try {
        data = await pb.collection('blackout_periods').getFullList({
          filter: propertyFilter,
          sort: '-start_time',
          requestKey: null
        });
      } catch (fErr) {
        // Fallback to fetch without filter if property_id is empty
        data = await pb.collection('blackout_periods').getFullList({
          requestKey: null
        });
      }
      setBlackouts(data as unknown as BlackoutPeriod[]);
    } catch (err) {
      console.error('Failed to fetch blackout periods:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlackoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blackoutFormData.reason || !blackoutFormData.start_time || !blackoutFormData.end_time) {
      toast({ title: 'Error', description: 'Please fill in all blackout period fields.', variant: 'destructive' });
      return;
    }

    const startTimeISO = new Date(blackoutFormData.start_time).toISOString();
    const endTimeISO = new Date(blackoutFormData.end_time).toISOString();

    if (new Date(endTimeISO) <= new Date(startTimeISO)) {
      toast({ title: 'Invalid Time Window', description: 'End time must be after start time.', variant: 'destructive' });
      return;
    }

    setCheckingConflicts(true);
    try {
      const propertyFilter = activeProperty ? `property_id = "${activeProperty.id}"` : '';
      const filterStr = propertyFilter
        ? `(${propertyFilter}) && status != "cancelled" && start_time < "${endTimeISO}" && end_time > "${startTimeISO}"`
        : `status != "cancelled" && start_time < "${endTimeISO}" && end_time > "${startTimeISO}"`;

      const conflicts = await pb.collection('bookings').getFullList({
        filter: filterStr,
        requestKey: null
      });

      if (conflicts && conflicts.length > 0) {
        const conflictData = conflicts as unknown as ConflictingBooking[];
        setConflictingBookings(conflictData);
        setSelectedBookingIds(conflictData.map(b => b.id));
        setBlackoutStep('conflicts');
      } else {
        await executeSaveBlackoutWithCancellations([]);
      }
    } catch (err: any) {
      console.error('Error checking conflicts:', err);
      toast({ title: 'Error', description: err?.message || 'Failed to check booking conflicts.', variant: 'destructive' });
    } finally {
      setCheckingConflicts(false);
    }
  };

  const executeSaveBlackoutWithCancellations = async (idsToCancel: string[]) => {
    try {
      setSavingBlackout(true);

      for (const bookingId of idsToCancel) {
        try {
          await pb.collection('bookings').update(bookingId, {
            status: 'cancelled',
            cancellation_reason: `Store Blackout / Closure: ${blackoutFormData.reason}`
          });
        } catch (err) {
          console.error(`Failed to cancel booking ${bookingId}:`, err);
        }
      }

      const generatedId = Array.from({ length: 15 }, () => Math.floor(Math.random() * 36).toString(36)).join('');

      await pb.collection('blackout_periods').create({
        id: generatedId,
        reason: blackoutFormData.reason,
        start_time: new Date(blackoutFormData.start_time).toISOString(),
        end_time: new Date(blackoutFormData.end_time).toISOString(),
        property_id: activeProperty?.id || ''
      });

      toast({
        title: 'Blackout Period Saved! 🚀',
        description: idsToCancel.length > 0
          ? `Blackout period created and ${idsToCancel.length} conflicting booking(s) cancelled with customer notifications.`
          : 'Blackout period added successfully with 0 booking conflicts.'
      });

      setBlackoutDialogOpen(false);
      setBlackoutStep('form');
      setBlackoutFormData({ reason: '', start_time: '', end_time: '' });
      fetchBlackouts();
    } catch (err: any) {
      console.error('Failed to save blackout period full error:', err, err?.data);
      const fieldErrors = err?.data ? Object.entries(err.data).map(([field, item]: [string, any]) => `${field}: ${item?.message || item}`).join(', ') : '';
      const errMsg = fieldErrors ? `Validation Error: ${fieldErrors}` : (err?.message || 'Failed to save blackout period.');
      toast({ title: 'Error', description: errMsg, variant: 'destructive' });
    } finally {
      setSavingBlackout(false);
    }
  };

  const handleBlackoutDelete = async (id: string) => {
    try {
      await pb.collection('blackout_periods').delete(id);
      toast({ title: 'Success', description: 'Blackout period deleted' });
      fetchBlackouts();
    } catch (err: any) {
      toast({ title: 'Error', description: err?.message || 'Failed to delete blackout period', variant: 'destructive' });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CalendarX className="w-8 h-8 text-primary" />
              Blackouts & Store Closures
            </h1>
            <p className="text-muted-foreground mt-1">
              Block online customer bookings during eSports tournaments, maintenance, or holiday store closures.
            </p>
          </div>

          {isAdminOrOwner ? (
            <Dialog open={blackoutDialogOpen} onOpenChange={setBlackoutDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl font-semibold gap-2 shadow-sm">
                  <Plus className="w-4 h-4" /> Add Blackout Period
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl sm:rounded-3xl border border-border bg-card w-[95vw] max-w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
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
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 sm:p-4 text-xs space-y-1.5 text-amber-700 dark:text-amber-300">
                      <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        {conflictingBookings.length} Active Booking Conflict(s) Identified
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        The following customers have confirmed reservations during this closure window. Executing this blackout will mark their status as cancelled and trigger automated WhatsApp & Email cancellation notifications.
                      </p>
                    </div>

                    <div className="border border-border rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                      <Table>
                        <TableHeader className="bg-secondary/40">
                          <TableRow>
                            <TableHead className="w-10 text-center">
                              <input
                                type="checkbox"
                                checked={selectedBookingIds.length === conflictingBookings.length}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedBookingIds(conflictingBookings.map(b => b.id));
                                  else setSelectedBookingIds([]);
                                }}
                                className="rounded border-border"
                              />
                            </TableHead>
                            <TableHead className="font-bold text-xs">Customer</TableHead>
                            <TableHead className="font-bold text-xs">Ref #</TableHead>
                            <TableHead className="font-bold text-xs">Time Window</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {conflictingBookings.map(b => (
                            <TableRow key={b.id} className="text-xs">
                              <TableCell className="text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedBookingIds.includes(b.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedBookingIds([...selectedBookingIds, b.id]);
                                    else setSelectedBookingIds(selectedBookingIds.filter(id => id !== b.id));
                                  }}
                                  className="rounded border-border"
                                />
                              </TableCell>
                              <TableCell className="font-bold text-foreground">
                                {b.name}
                              </TableCell>
                              <TableCell className="font-mono text-muted-foreground">{b.booking_reference}</TableCell>
                              <TableCell className="text-[11px] text-muted-foreground">
                                {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="pt-3 flex flex-col sm:flex-row justify-between items-center gap-2 border-t border-border">
                      <Button variant="ghost" size="sm" onClick={() => setBlackoutStep('form')} className="rounded-xl text-xs">
                        ← Back to Form
                      </Button>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button variant="outline" size="sm" onClick={() => setBlackoutDialogOpen(false)} className="rounded-xl text-xs w-full sm:w-auto">
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={savingBlackout}
                          onClick={() => executeSaveBlackoutWithCancellations(selectedBookingIds)}
                          className="rounded-xl font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs w-full sm:w-auto"
                        >
                          {savingBlackout
                            ? 'Applying Blackout & Notifying...'
                            : `Cancel ${selectedBookingIds.length} Selected & Apply Blackout`}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          ) : (
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3 border-amber-500/30 text-amber-500 bg-amber-500/10">
              <Lock className="w-4 h-4" /> Admin Permission Required to Create Blackouts
            </Badge>
          )}
        </div>

        <Card className="border-border shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
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
                            {isAdminOrOwner && (
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
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Blackouts;
