import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/AdminSidebar';
import { useProperty } from '@/contexts/PropertyContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, Building2 } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { user, loading, isAdmin, userRole } = useAuth();
  const { properties, activeProperty, setActivePropertyById } = useProperty();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user || !isAdmin) {
        navigate('/auth');
      } else if (userRole === 'staff') {
        const restrictedPaths = ['/admin/analytics', '/admin/stations', '/admin/properties', '/admin/staff'];
        if (restrictedPaths.some(p => window.location.pathname.endsWith(p))) {
          navigate('/admin');
        }
      } else if (userRole === 'manager') {
        const restrictedPaths = ['/admin/analytics', '/admin/properties'];
        if (restrictedPaths.some(p => window.location.pathname.endsWith(p))) {
          navigate('/admin');
        }
      }
    }
  }, [user, loading, isAdmin, userRole, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "18rem", "--sidebar-width-icon": "5rem" } as React.CSSProperties} className="selection:bg-primary/30">
      <AdminSidebar />
      <div className="flex-1 overflow-x-hidden overflow-y-auto flex flex-col h-screen bg-secondary">
        <header className="sticky top-0 z-10 flex shrink-0 h-16 md:h-20 items-center justify-between bg-background border-b border-border px-4 xl:px-10 transition-all">
          <div className="flex items-center gap-3 lg:gap-5">
            <SidebarTrigger className="h-10 w-10 md:h-11 md:w-11 rounded-[10px] md:rounded-xl bg-background border border-border shadow-sm hover:bg-accent text-foreground transition-all ml-0.5 md:ml-1" />
            <div className="flex flex-col">
              <h1 className="text-base md:text-xl font-bold tracking-tight text-foreground leading-tight truncate max-w-[140px] sm:max-w-none">GameZ Admin</h1>
              <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-widest mt-0.5">Admin Portal</p>
            </div>
          </div>
        </header>
        <main className="p-4 md:p-6 flex-1 w-full">{children}</main>
      </div>
    </SidebarProvider>
  );
};
