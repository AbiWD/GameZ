import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import pb from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Building2, ChevronRight } from 'lucide-react';
import { useProperty } from '@/contexts/PropertyContext';

interface Property {
  id: string;
  name: string;
  slug?: string;
  address: string;
  email: string;
  phone: string;
  is_active: boolean;
}

const Properties = () => {
  const [propertiesList, setPropertiesList] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Property | null>(null);
  
  const { refreshProperties } = useProperty();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    email: '',
    phone: '',
    is_active: true
  });

  const fetchProps = async () => {
    setLoading(true);
    try {
      const records = await pb.collection('properties').getFullList({ sort: 'created', requestKey: 'properties_page_list' });
      setPropertiesList(records as unknown as Property[]);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({ title: 'Error', description: 'Failed to fetch properties. Make sure properties collection exists.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProps();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...formData };
      
      // Auto-generate URL slug from name
      const generatedSlug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      
      if (editingItem) {
        // If updating an existing item that might not have a slug yet, add one
        if (!editingItem.slug && !payload.slug) {
            payload.slug = generatedSlug;
        }
        await pb.collection('properties').update(editingItem.id, payload);
        toast({ title: 'Success', description: 'Property updated successfully' });
      } else {
        if (propertiesList.length >= 4) {
          toast({ title: 'Limit Reached', description: 'You can only add up to 4 properties currently.', variant: 'destructive' });
          return;
        }
        payload.slug = generatedSlug;
        await pb.collection('properties').create(payload);
        toast({ title: 'Success', description: 'Property added successfully' });
      }
      setDialogOpen(false);
      resetForm();
      fetchProps();
      refreshProperties(); // Update Global Context Dropdown instantly
    } catch (error: any) {
      console.error('Error saving property:', error, error?.response);
      const errMsg = error?.response?.message || error?.message || 'Failed to save property.';
      toast({ title: 'Error', description: errMsg, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('properties').delete(id);
      toast({ title: 'Success', description: 'Property deleted successfully' });
      fetchProps();
      refreshProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      toast({ title: 'Error', description: 'Failed to delete property. It may have linked active bookings.', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      email: '',
      phone: '',
      is_active: true
    });
    setEditingItem(null);
  };

  const openEditDialog = (prop: Property) => {
    setEditingItem(prop);
    setFormData({
      name: prop.name,
      address: prop.address || '',
      email: prop.email || '',
      phone: prop.phone || '',
      is_active: prop.is_active === undefined ? true : prop.is_active
    });
    setDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Properties Manager
            </h1>
            <p className="text-muted-foreground mt-1">Manage multiple resorts and their global settings</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl px-6 font-semibold" disabled={propertiesList.length >= 4}>
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl">
              <DialogHeader className="mb-2">
                <DialogTitle className="text-xl font-bold text-foreground text-center">{editingItem ? 'Edit Property' : 'Add New Property'}</DialogTitle>
                <DialogDescription className="text-center text-muted-foreground">
                  {editingItem ? 'Update property details below' : 'Add a new location to your portfolio (Max 4)'}
                </DialogDescription>
              </DialogHeader>
              <div className="bg-secondary/30 rounded-2xl p-5 border border-border">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property Name *</Label>
                  <Input id="name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Dreamhouse Goa" className="rounded-xl border-border bg-secondary/50 focus-visible:bg-background h-12" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="address" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Address</Label>
                  <Input id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="rounded-xl border-border bg-secondary/50 focus-visible:bg-background h-12" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="rounded-xl border-border bg-secondary/50 focus-visible:bg-background h-12" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</Label>
                    <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="rounded-xl border-border bg-secondary/50 focus-visible:bg-background h-12" />
                  </div>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch id="is_active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                  <Label htmlFor="is_active" className="text-sm font-medium">Active (Visible in Switcher)</Label>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-border mt-2">
                  {editingItem ? (
                    <div className="md:hidden">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive h-10 w-10 rounded-xl">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[95vw] max-w-sm rounded-3xl p-6 shadow-xl border border-border bg-card">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-bold text-center text-foreground">Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription className="text-center text-muted-foreground font-medium">
                              This action cannot be undone. This will permanently delete this property and remove all associated data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="flex flex-col gap-3 sm:flex-col sm:space-x-0 mt-6">
                            <AlertDialogAction className="w-full rounded-xl bg-destructive hover:bg-destructive/90 shadow-sm py-6 text-base font-bold text-destructive-foreground mb-0" onClick={() => { handleDelete(editingItem.id); setDialogOpen(false); }}>
                              Delete Property
                            </AlertDialogAction>
                            <AlertDialogCancel className="w-full mt-0 m-0 rounded-xl border border-border py-6 text-base font-bold text-foreground bg-secondary hover:bg-secondary/80 shadow-sm uppercase tracking-wide">
                              Cancel
                            </AlertDialogCancel>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : <div />}
                  <div className="flex justify-end gap-2 ml-auto">
                    <Button type="button" variant="outline" className="rounded-xl border-border" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="rounded-xl font-semibold">{editingItem ? 'Update' : 'Save'} Property</Button>
                  </div>
                </div>
              </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card border border-border rounded-2xl md:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm overflow-hidden w-full">
          {loading ? (
             <div className="text-center py-12 text-muted-foreground animate-pulse">Loading properties...</div>
          ) : propertiesList.length === 0 ? (
             <div className="text-center py-12 text-muted-foreground">
               <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
               <p>No properties found. Please click "Add Property" to create your first resort!</p>
             </div>
          ) : (
             <div className="overflow-x-auto w-full border border-border rounded-2xl">
               <Table className="w-full min-w-max">
                  <TableHeader className="bg-secondary/50 border-b border-border">
                    <TableRow className="border-b-0 hover:bg-transparent">
                      <TableHead className="h-10 px-3 sm:px-6 text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap">Name</TableHead>
                      <TableHead className="h-10 px-3 sm:px-6 text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap hidden lg:table-cell">Address</TableHead>
                      <TableHead className="h-10 px-3 sm:px-6 text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap hidden md:table-cell">Contact</TableHead>
                      <TableHead className="h-10 px-3 sm:px-4 md:px-6 text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap">Status</TableHead>
                      <TableHead className="h-10 px-1 sm:px-4 md:px-6 text-xs sm:text-sm font-semibold text-muted-foreground text-right whitespace-nowrap">
                        <span className="md:hidden">Details</span>
                        <span className="hidden md:inline">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {propertiesList.map(prop => (
                      <TableRow key={prop.id} className="border-b border-border hover:bg-accent/50 transition-colors">
                        <TableCell className="p-3 sm:py-4 sm:px-6 align-middle font-bold text-xs sm:text-sm">
                          <div className="max-w-[150px] sm:max-w-none truncate" title={prop.name}>
                            {prop.name}
                          </div>
                        </TableCell>
                        <TableCell className="p-3 sm:py-4 sm:px-6 align-middle text-muted-foreground text-xs sm:text-sm whitespace-nowrap hidden lg:table-cell">{prop.address || '-'}</TableCell>
                        <TableCell className="p-3 sm:py-4 sm:px-6 align-middle text-muted-foreground text-xs sm:text-sm hidden md:table-cell whitespace-nowrap">
                          {prop.phone || prop.email ? (
                            <>
                              <div>{prop.phone || '-'}</div>
                              <div className="text-[10px] opacity-70">{prop.email}</div>
                            </>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="p-3 sm:py-4 sm:px-6 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] sm:text-xs font-semibold border ${prop.is_active ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/10 border-destructive/20 text-destructive'}`}>
                              {prop.is_active ? 'Active' : 'Hidden'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="p-2 py-4 pr-3 sm:px-6 align-middle text-right whitespace-nowrap">
                           <button 
                             onClick={() => openEditDialog(prop)}
                             className="md:hidden p-1.5 hover:bg-accent bg-background shadow-sm border border-border rounded-full transition-colors active:scale-95 text-foreground inline-flex items-center justify-center"
                           >
                             <ChevronRight className="w-3 h-3" />
                           </button>
                           <div className="hidden md:flex justify-end gap-1 sm:gap-2">
                             <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-secondary hover:text-foreground" onClick={() => openEditDialog(prop)}>
                               <Edit className="w-4 h-4" />
                             </Button>
                             <AlertDialog>
                               <AlertDialogTrigger asChild>
                                 <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive">
                                   <Trash2 className="w-4 h-4" />
                                 </Button>
                               </AlertDialogTrigger>
                               <AlertDialogContent className="w-[95vw] max-w-sm rounded-3xl p-6 shadow-xl border-border bg-card">
                                 <AlertDialogHeader>
                                   <AlertDialogTitle className="text-xl font-bold text-center text-foreground">Are you absolutely sure?</AlertDialogTitle>
                                   <AlertDialogDescription className="text-center text-muted-foreground font-medium">
                                     This action cannot be undone. This will permanently delete <strong>{prop.name}</strong> and remove all associated data.
                                   </AlertDialogDescription>
                                 </AlertDialogHeader>
                                 <AlertDialogFooter className="flex flex-col gap-3 sm:flex-col sm:space-x-0 mt-6">
                                   <AlertDialogAction onClick={() => handleDelete(prop.id)} className="w-full rounded-xl bg-destructive hover:bg-destructive/90 shadow-sm py-6 text-base font-bold text-destructive-foreground mb-0">
                                     Delete Property
                                   </AlertDialogAction>
                                   <AlertDialogCancel className="w-full mt-0 m-0 rounded-xl border border-border py-6 text-base font-bold text-foreground bg-secondary hover:bg-secondary/80 shadow-sm uppercase tracking-wide">
                                     Cancel
                                   </AlertDialogCancel>
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
    </AdminLayout>
  );
};

export default Properties;
