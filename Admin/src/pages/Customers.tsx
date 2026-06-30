import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { TableSkeleton } from '@/components/TableSkeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import pb from '@/lib/pocketbase';
import { useAuth } from '@/hooks/useAuth';
import { Search, Users, Phone, Mail, Award, Clock, IndianRupee, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  total_visits: number;
  total_spent: number;
  status: string;
  notes: string;
  created: string;
}

interface Booking {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  amount_paid: number;
  assigned_station_id: string;
  expand?: {
    assigned_station_id?: {
      station_number: string;
      station_type: string;
    }
  }
}

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const { userRole } = useAuth();

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const records = await pb.collection('customers').getFullList();
      setCustomers(records as unknown as Customer[]);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setNotes(customer.notes || '');
    setLoadingBookings(true);
    try {
      const records = await pb.collection('bookings').getFullList({
        filter: `customer_id = "${customer.id}"`,
        sort: '-start_time',
        expand: 'assigned_station_id'
      });
      setCustomerBookings(records as unknown as Booking[]);
    } catch (err) {
      console.error("Failed to fetch customer bookings:", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedCustomer) return;
    setSavingNotes(true);
    try {
      await pb.collection('customers').update(selectedCustomer.id, {
        notes: notes
      });
      setCustomers(customers.map(c => c.id === selectedCustomer.id ? { ...c, notes } : c));
      setSelectedCustomer({ ...selectedCustomer, notes });
    } catch (err) {
      console.error("Failed to save notes", err);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedCustomer) return;
    try {
      await pb.collection('customers').update(selectedCustomer.id, {
        status: status
      });
      setCustomers(customers.map(c => c.id === selectedCustomer.id ? { ...c, status } : c));
      setSelectedCustomer({ ...selectedCustomer, status });
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone?.includes(searchQuery) || 
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="w-8 h-8 text-primary" />
              Customer Directory
            </h1>
            <p className="text-muted-foreground mt-1">Manage all registered gamers, view their history, and update VIP statuses.</p>
          </div>
        </div>

        <Card className="border-border shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border bg-secondary/30 flex justify-between items-center">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-xl bg-background border-border"
                />
              </div>
              <div className="text-sm font-medium text-muted-foreground">
                Total: {filteredCustomers.length}
              </div>
            </div>

            {loading ? (
              <div className="mt-4">
                <TableSkeleton columns={5} rows={7} />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                No customers found matching your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/20">
                    <TableRow>
                      <TableHead className="font-bold">Name</TableHead>
                      <TableHead className="font-bold">Contact</TableHead>
                      {userRole !== 'staff' && <TableHead className="font-bold text-right">Lifetime Value</TableHead>}
                      <TableHead className="font-bold text-center">Visits</TableHead>
                      <TableHead className="font-bold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow 
                        key={customer.id} 
                        className="cursor-pointer hover:bg-secondary/40 transition-colors"
                        onClick={() => handleRowClick(customer)}
                      >
                        <TableCell className="font-semibold text-foreground">
                          {customer.name || 'Unnamed Guest'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {customer.phone && (
                              <span className="flex items-center text-sm gap-1.5 text-muted-foreground">
                                <Phone className="w-3.5 h-3.5" />
                                {customer.phone}
                              </span>
                            )}
                            {customer.email && (
                              <span className="flex items-center text-sm gap-1.5 text-muted-foreground">
                                <Mail className="w-3.5 h-3.5" />
                                {customer.email}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        {userRole !== 'staff' && (
                          <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{(customer.total_spent || 0).toLocaleString()}
                          </TableCell>
                        )}
                        <TableCell className="text-center font-medium">
                          {customer.total_visits || 0}
                        </TableCell>
                        <TableCell>
                          {customer.status === 'vip' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                              <Award className="w-3 h-3 mr-1" /> VIP
                            </span>
                          ) : customer.status === 'banned' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              Banned
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
                              Regular
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer Profile Sheet */}
      <Sheet open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <SheetContent className="sm:max-w-md w-full bg-card border-border p-0 flex flex-col h-full overflow-hidden">
          {selectedCustomer && (
            <>
              <SheetHeader className="p-6 bg-secondary/30 border-b border-border">
                <SheetTitle className="text-2xl font-bold flex items-center justify-between">
                  {selectedCustomer.name || 'Unnamed Guest'}
                  {selectedCustomer.status === 'vip' && <Award className="w-6 h-6 text-amber-500" />}
                </SheetTitle>
                <SheetDescription className="text-base text-foreground font-medium flex gap-4 mt-2">
                  <span className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-muted-foreground"/> {selectedCustomer.phone}</span>
                  {selectedCustomer.email && <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-muted-foreground"/> {selectedCustomer.email}</span>}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Stats */}
                <div className={`grid gap-4 ${userRole !== 'staff' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {userRole !== 'staff' && (
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex flex-col justify-center">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider mb-1 flex items-center gap-1.5"><IndianRupee className="w-3.5 h-3.5"/> Lifetime Value</span>
                      <span className="text-3xl font-black text-foreground">₹{(selectedCustomer.total_spent || 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="bg-secondary/50 border border-border rounded-2xl p-4 flex flex-col justify-center">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Total Visits</span>
                    <span className="text-3xl font-black text-foreground">{selectedCustomer.total_visits || 0}</span>
                  </div>
                </div>

                {/* Status Toggle */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Account Status</h3>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant={selectedCustomer.status === 'regular' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange('regular')}
                      className="rounded-xl flex-1"
                    >
                      Regular
                    </Button>
                    <Button 
                      size="sm" 
                      variant={selectedCustomer.status === 'vip' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange('vip')}
                      className={`rounded-xl flex-1 ${selectedCustomer.status === 'vip' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'hover:text-amber-500'}`}
                    >
                      VIP
                    </Button>
                    <Button 
                      size="sm" 
                      variant={selectedCustomer.status === 'banned' ? 'destructive' : 'outline'}
                      onClick={() => handleStatusChange('banned')}
                      className="rounded-xl flex-1"
                    >
                      Banned
                    </Button>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Internal Notes</h3>
                  <div className="relative">
                    <Textarea 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this customer..."
                      className="rounded-xl resize-none min-h-[100px] bg-secondary/30"
                    />
                    {notes !== (selectedCustomer.notes || '') && (
                      <Button 
                        size="sm" 
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="absolute bottom-2 right-2 rounded-lg h-8"
                      >
                        {savingNotes ? 'Saving...' : 'Save'}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Booking History */}
                <div className="space-y-3 pb-8">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Recent Sessions</h3>
                  {loadingBookings ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : customerBookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center p-4 bg-secondary/30 rounded-xl">No sessions found.</p>
                  ) : (
                    <div className="space-y-2">
                      {customerBookings.map(booking => (
                        <div key={booking.id} className="flex justify-between items-center p-3 rounded-xl border border-border bg-secondary/20">
                          <div>
                            <p className="font-bold text-sm text-foreground">
                              {booking.expand?.assigned_station_id?.station_number || 'Unknown Station'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(booking.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm text-primary">₹{booking.amount_paid || 0}</p>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">{booking.status}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
};

export default Customers;
