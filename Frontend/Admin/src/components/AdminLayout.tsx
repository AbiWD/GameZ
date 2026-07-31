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

          {properties.length > 0 && activeProperty && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-2 bg-background px-3 md:px-5 py-2 md:py-2.5 rounded-full shadow-sm hover:shadow-md border border-border cursor-pointer hover:bg-accent transition-all select-none">
                  <Building2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-semibold text-xs md:text-sm max-w-[100px] sm:max-w-[180px] truncate">{activeProperty.name}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground md:ml-1 shrink-0" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[220px] rounded-xl border-border shadow-lg p-2">
                {properties.map(prop => (
                  <DropdownMenuItem 
                    key={prop.id} 
                    onClick={() => setActivePropertyById(prop.id)}
                    className={`cursor-pointer rounded-lg mb-1 p-3 transition-colors ${activeProperty.id === prop.id ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground/80 hover:text-foreground'}`}
                  >
                    {prop.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>
        <main className="p-4 md:p-6 flex-1 w-full">{children}</main>
      </div>
    </SidebarProvider>
  );
};
