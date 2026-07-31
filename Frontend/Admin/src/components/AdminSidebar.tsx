import { LayoutDashboard, Calendar, PlusCircle, LogOut, Bed, UserCheck, Building2, Globe, Settings, BarChart2, Gamepad2, Contact, ChevronsUpDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
      { title: 'All Bookings', url: '/admin/bookings', icon: Calendar },
      { title: 'Customers', url: '/admin/customers', icon: Contact },
    ]
  },
  {
    label: 'Management',
    items: [
      { title: 'Stations', url: '/admin/stations', icon: Gamepad2 },
      { title: 'Branches', url: '/admin/properties', icon: Building2 },
      { title: 'Staff Accounts', url: '/admin/staff', icon: UserCheck },
      { title: 'WhatsApp', url: '/admin/whatsapp', icon: MessageSquare },
    ]
  },
  {
    label: 'Configuration',
    items: [

    ]
  }
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, userRole, user } = useAuth();
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
            {navigationSections.map((section, index) => {
              // Staff accounts can only see "Front Desk" and "Overview" -> Dashboard
              if (userRole === 'staff') {
                if (section.label !== 'Front Desk' && section.label !== 'Overview') return null;
              }

              // Filter out items within sections if needed
              const visibleItems = section.items.filter(item => {
                if (userRole === 'staff') {
                  if (item.title === 'Analytics') return false;
                  if (item.title === 'Staff Accounts') return false;
                  if (item.title === 'Stations') return false;
                  if (item.title === 'Branches') return false;
                }
                if (userRole === 'manager') {
                  if (item.title === 'Analytics') return false;
                  if (item.title === 'Branches') return false;
                }
                return true;
              });

              if (visibleItems.length === 0) return null;

              return (
              <SidebarGroup key={section.label} className={index > 0 ? "mt-4 pt-4 border-t border-border" : ""}>
                {state !== 'collapsed' && (
                  <SidebarGroupLabel className="px-3 text-[10px] font-bold tracking-wider uppercase text-muted-foreground/60 mb-2">
                    {section.label}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1">
                    {visibleItems.map((item) => (
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
              );
            })}
          </div>

        <div className={`mt-auto ${state === 'collapsed' ? 'p-1' : 'p-2'}`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-xl"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src="" alt={user?.name || "User"} />
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold">
                    {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {state !== 'collapsed' && (
                  <>
                    <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                      <span className="truncate font-semibold">{user?.name || "User"}</span>
                      <span className="truncate text-xs text-muted-foreground">{userRole === 'admin' ? 'Administrator' : userRole === 'manager' ? 'Manager' : 'Staff Member'}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                  </>
                )}
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl"
              side="top"
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src="" alt={user?.name || "User"} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold">
                      {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name || "User"}</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.email || ""}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem className="rounded-lg cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg cursor-pointer font-medium">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarContent>
      </div>
    </Sidebar>
  );
}
