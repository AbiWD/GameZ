import { LayoutDashboard, Calendar, PlusCircle, LogOut, Bed, UserCheck, Building2, Globe, Settings, BarChart2, Gamepad2 } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const navigationSections = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
      { title: 'Analytics', url: '/admin/analytics', icon: BarChart2 },
    ]
  },
  {
    label: 'Front Desk',
    items: [
      { title: 'Create Booking', url: '/admin/create-booking', icon: PlusCircle },
      { title: 'Session Management', url: '/admin/session-management', icon: UserCheck },
      { title: 'All Bookings', url: '/admin/bookings', icon: Calendar },
    ]
  },
  {
    label: 'Management',
    items: [
      { title: 'Stations', url: '/admin/stations', icon: Gamepad2 },
      { title: 'Branches', url: '/admin/properties', icon: Building2 },
    ]
  },
  {
    label: 'Configuration',
    items: [
      { title: 'Brand Settings', url: '/admin/brand-settings', icon: Settings },
      { title: 'Website Content', url: '/admin/website-content', icon: Globe },
    ]
  }
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Logged out successfully',
      });
      navigate('/auth');
    }
  };

  return (
    <Sidebar className="z-20 border-r border-border [&>[data-sidebar=sidebar]]:bg-transparent" collapsible="icon">
      <div className="bg-sidebar flex-1 flex flex-col h-full">
        <SidebarContent className="p-2 md:p-3">
          <div className="flex-1 overflow-y-auto mt-2 custom-scrollbar">
            {navigationSections.map((section, index) => (
              <SidebarGroup key={section.label} className={index > 0 ? "mt-4 pt-4 border-t border-border" : ""}>
                {state !== 'collapsed' && (
                  <SidebarGroupLabel className="px-3 text-[10px] font-bold tracking-wider uppercase text-muted-foreground/60 mb-2">
                    {section.label}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild tooltip={item.title}>
                          <NavLink
                            to={item.url}
                            end={item.url === '/admin'}
                            className={`flex items-center gap-3 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all ${state === 'collapsed' ? 'justify-center w-10 h-10 mx-auto' : 'w-full px-3 py-2.5'}`}
                            activeClassName="bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                          >
                            <item.icon className="h-[18px] w-[18px]" />
                            {state !== 'collapsed' && <span className="text-sm">{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </div>

        <div className={`mt-auto ${state === 'collapsed' ? 'p-1 flex justify-center' : 'p-2'}`}>
          <Button
            variant="ghost"
            className={`hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all rounded-xl ${state === 'collapsed' ? 'justify-center w-10 h-10' : 'justify-start w-full px-3 py-5'}`}
            onClick={handleLogout}
          >
            <LogOut className="h-[18px] w-[18px]" />
            {state !== 'collapsed' && <span className="ml-2 text-sm">Logout</span>}
          </Button>
        </div>
      </SidebarContent>
      </div>
    </Sidebar>
  );
}
