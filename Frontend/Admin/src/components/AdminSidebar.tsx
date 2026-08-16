import { LayoutDashboard, Calendar, PlusCircle, LogOut, Bed, UserCheck, Building2, Globe, Settings, BarChart2, Gamepad2, Contact, ChevronsUpDown, MessageSquare, CalendarX } from 'lucide-react';
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

const WhatsAppLogo = ({ className = "h-[18px] w-[18px]" }: { className?: string }) => (
  <svg className={`text-emerald-500 fill-current ${className}`} viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.05 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

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
      { title: 'Staff Accounts', url: '/admin/staff', icon: UserCheck },
    ]
  },
  {
    label: 'Messaging',
    items: [
      { title: 'WhatsApp', url: '/admin/whatsapp', icon: WhatsAppLogo },
    ]
  },
  {
    label: 'Store Operations',
    items: [
      { title: 'Blackouts', url: '/admin/blackouts', icon: CalendarX },
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
                }
                if (userRole === 'manager') {
                  if (item.title === 'Analytics') return false;
                }
                return true;
              });

              if (visibleItems.length === 0) return null;

              return (
              <SidebarGroup key={section.label} className={index > 0 ? "mt-4" : ""}>
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
