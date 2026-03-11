import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  CalendarCheck, 
  UserCircle,
  FileText,
  LogOut,
  Bell
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";

interface AppSidebarProps {
  role: string;
}

export function AppSidebar({ role }: AppSidebarProps) {
  const [location] = useLocation();
  const { logout } = useAuth();

  const adminItems = [
    { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Candidates", url: "/admin/candidates", icon: Users },
    { title: "Tasks", url: "/admin/tasks", icon: CheckSquare },
    { title: "Attendance", url: "/admin/attendance", icon: CalendarCheck },
  ];

  const candidateItems = [
    { title: "My Profile", url: "/candidate/profile", icon: UserCircle },
    { title: "My Tasks", url: "/candidate/tasks", icon: CheckSquare },
    { title: "Attendance", url: "/candidate/attendance", icon: CalendarCheck },
    { title: "Progress", url: "/candidate/progress", icon: FileText },
  ];

  const items = role === 'ADMIN' ? adminItems : candidateItems;

  return (
    <Sidebar className="border-r border-white/5 bg-sidebar">
      <SidebarContent>
        <div className="p-6">
          <h2 className="text-2xl font-bold font-display text-gradient-primary tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-blue-400 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            FieldTrack
          </h2>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    className="data-[active=true]:bg-primary/10 data-[active=true]:text-primary transition-all duration-200"
                  >
                    <Link href={item.url}>
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
              <button onClick={() => logout()}>
                <LogOut className="w-5 h-5" />
                <span>Log out</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
