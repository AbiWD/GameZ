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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Trash2, UserPlus, Mail, KeyRound, ShieldAlert, CheckCircle2, Eye, EyeOff, User } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAuth } from '@/hooks/useAuth';
import { getErrorMessage } from '@/lib/utils';

interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'staff';
  created: string;
}

const StaffAccounts = () => {
  const { userRole } = useAuth();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', passwordConfirm: '', name: '', role: 'staff' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const roleFilter = (userRole === 'admin' || !userRole) ? '' : 'role = "staff"';
      const records = await pb.collection('staff_accounts').getFullList({
        filter: roleFilter ? roleFilter : undefined,
        requestKey: null
      });
      setUsers(records as unknown as StaffUser[]);
    } catch (error: any) {
      console.error('Error fetching staff accounts:', error);
      toast({
        title: 'Error fetching staff accounts',
        description: error.message || 'Something went wrong while processing your request.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDisplayName = (user: StaffUser) => {
    if (user.name && user.name.trim().length > 0) return user.name;
    if (user.email && user.email.includes('@')) {
      const prefix = user.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return '-';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password.length < 8) {
      toast({
        title: 'Invalid Password',
        description: 'Password must be at least 8 characters long.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match. Please re-enter.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      await pb.collection('staff_accounts').create({
        ...formData,
        status: 'active',
        emailVisibility: true,
      });

      toast({
        title: 'Success 👤',
        description: 'Staff account created successfully.',
      });

      setIsDialogOpen(false);
      setFormData({ email: '', password: '', passwordConfirm: '', name: '', role: 'staff' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating staff account:', error, error?.data);
      const detailMsg = getErrorMessage(error, 'Failed to create staff account');
      toast({
        title: 'Error Creating Account',
        description: detailMsg,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('staff_accounts').delete(id);
      toast({
        title: 'Success',
        description: 'Account deleted successfully',
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete account',
        variant: 'destructive',
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Staff Accounts</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage employee access and roles.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto gap-2 rounded-xl">
                <UserPlus className="w-4 h-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-full sm:max-w-[425px] rounded-2xl sm:rounded-3xl p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>Create New Account</DialogTitle>
                <DialogDescription className="text-xs">
                  Add a new staff or admin user. They can log in immediately.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name (Optional)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      className="pl-9 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="staff@gamez.in"
                      className="pl-9 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(val: 'admin' | 'manager' | 'staff') => setFormData({ ...formData, role: val })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="staff">Staff (Front Desk Access)</SelectItem>
                      <SelectItem value="manager">Manager (Branch Operations)</SelectItem>
                      <SelectItem value="admin">Admin (Full System Access)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <span className="text-[10px] text-muted-foreground">Min. 8 characters</span>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="At least 8 characters"
                      className="pl-9 pr-10 rounded-xl"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm">Confirm Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="passwordConfirm"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={formData.passwordConfirm}
                      onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                      placeholder="••••••••"
                      className="pl-9 pr-10 rounded-xl"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} className="rounded-xl">
                    {saving ? 'Creating...' : 'Create Account'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

      <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl font-bold">Active Users</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {userRole === 'manager' ? 'Staff accounts under your management.' : 'All accounts with access to the GameZ Admin Panel.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading accounts...</div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No accounts found.</div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/40 border-border">
                      <TableHead className="font-bold text-foreground">Email</TableHead>
                      <TableHead className="font-bold text-foreground">Name</TableHead>
                      <TableHead className="font-bold text-foreground">Role</TableHead>
                      <TableHead className="font-bold text-foreground">Created</TableHead>
                      <TableHead className="font-bold text-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="border-border">
                        <TableCell className="font-medium text-foreground">{user.email || '-'}</TableCell>
                        <TableCell className="text-foreground font-medium">{formatDisplayName(user)}</TableCell>
                        <TableCell>
                          {user.role === 'admin' || user.email === 'sysadmin@gamez.in' ? (
                            <Badge variant="default" className="bg-primary hover:bg-primary/90 gap-1">
                              <ShieldAlert className="w-3 h-3" /> Admin
                            </Badge>
                          ) : user.role === 'manager' ? (
                            <Badge variant="default" className="bg-purple-600 hover:bg-purple-700 gap-1">
                              <ShieldAlert className="w-3 h-3" /> Manager
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Staff
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs font-mono">
                          {user.created && !isNaN(new Date(user.created).getTime()) ? new Date(user.created).toLocaleDateString() : 'Active'}
                        </TableCell>
                        <TableCell className="text-right">
                          {pb.authStore.model?.id !== user.id ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Revoke Account Access" className="text-destructive hover:bg-destructive/10 h-8 w-8 rounded-full">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-3xl border border-border bg-card">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-foreground">Revoke Access</AlertDialogTitle>
                                  <AlertDialogDescription className="text-muted-foreground">
                                    Are you sure you want to delete the account for <strong>{user.email}</strong>? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl border-border">Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                                    onClick={() => handleDelete(user.id)}
                                  >
                                    Delete Account
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <span className="text-xs text-muted-foreground/60 italic pr-2">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="p-4 rounded-2xl border border-border bg-card/60 shadow-sm space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <p className="font-bold text-foreground text-sm truncate">{user.email || '-'}</p>
                        <p className="text-xs text-muted-foreground">{formatDisplayName(user)}</p>
                        <div className="pt-0.5">
                          {user.role === 'admin' || user.email === 'sysadmin@gamez.in' ? (
                            <Badge variant="default" className="bg-primary hover:bg-primary/90 gap-1 text-[11px] py-0.5">
                              <ShieldAlert className="w-3 h-3" /> Admin
                            </Badge>
                          ) : user.role === 'manager' ? (
                            <Badge variant="default" className="bg-purple-600 hover:bg-purple-700 gap-1 text-[11px] py-0.5">
                              <ShieldAlert className="w-3 h-3" /> Manager
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1 text-[11px] py-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Staff
                            </Badge>
                          )}
                        </div>
                      </div>

                      {pb.authStore.model?.id !== user.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 shrink-0 h-8 w-8 rounded-full">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="w-[95vw] max-w-lg rounded-3xl border border-border bg-card">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-foreground">Revoke Access</AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground">
                                Are you sure you want to delete the account for <strong>{user.email}</strong>? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                              <AlertDialogCancel className="rounded-xl border-border w-full sm:w-auto">Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl w-full sm:w-auto"
                                onClick={() => handleDelete(user.id)}
                              >
                                Delete Account
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground font-mono">
                      <span className="text-[10px] uppercase font-sans font-bold text-muted-foreground/70">Account Created</span>
                      <span className="font-semibold text-foreground text-[11px]">
                        {user.created && !isNaN(new Date(user.created).getTime()) ? new Date(user.created).toLocaleDateString() : 'Active'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  </AdminLayout>
  );
};

export default StaffAccounts;
