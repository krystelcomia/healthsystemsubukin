import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Stethoscope,
  Heart,
  Bug,
  Baby,
  Settings,
  Activity,
  LogOut,
  Shield,
  User,
} from "lucide-react";
import barangayLogo from "@/assets/barangay-logo.jpg";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// BHW user navigation
const bhwMainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Resident Records", url: "/residents", icon: Users },
];

const bhwFormItems = [
  { title: "Family Data", url: "/forms/family-data", icon: ClipboardList },
  { title: "Consultation", url: "/forms/consultation", icon: Stethoscope },
  { title: "PhilPen Health", url: "/forms/philpen-health", icon: Activity },
  { title: "Dengue Prevention", url: "/forms/dengue-prevention", icon: Bug },
  { title: "Maternal Care", url: "/forms/maternal-care", icon: Heart },
  { title: "Child Health", url: "/forms/child-health", icon: Baby },
  { title: "Family Planning", url: "/forms/family-planning", icon: Heart },
];

const bhwSystemItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

// Admin/Supervisor navigation
const adminMainItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Resident Records", url: "/admin/residents", icon: Users },
  { title: "BH Workers", url: "/admin/workers", icon: Shield },
];

const adminSystemItems = [
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

const adminFormItems = [
  { title: "Family Data", url: "/admin/forms/family-data", icon: ClipboardList },
  { title: "Consultation", url: "/admin/forms/consultation", icon: Stethoscope },
  { title: "PhilPen Health", url: "/admin/forms/philpen-health", icon: Activity },
  { title: "Dengue Prevention", url: "/admin/forms/dengue-prevention", icon: Bug },
  { title: "Maternal Care", url: "/admin/forms/maternal-care", icon: Heart },
  { title: "Child Health", url: "/admin/forms/child-health", icon: Baby },
  { title: "Family Planning", url: "/admin/forms/family-planning", icon: Heart },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, userRole, username, signOut } = useAuth();
  const [signOutOpen, setSignOutOpen] = useState(false);

  const isAdminRoute = location.pathname.startsWith("/admin");
  const isAdmin = userRole === "supervisor" && isAdminRoute;

  const mainItems = isAdmin ? adminMainItems : bhwMainItems;
  const formItems = isAdmin ? adminFormItems : bhwFormItems;

  const isActive = (path: string) => location.pathname === path || (path !== "/" && path !== "/admin" && location.pathname.startsWith(path));

  const renderItems = (items: typeof mainItems) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title + item.url}>
          <SidebarMenuButton asChild isActive={isActive(item.url)}>
            <NavLink
              to={item.url}
              end
              className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-sidebar-accent"
              activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.title}</span>
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={barangayLogo} alt="Barangay Subukin Logo" className="h-9 w-9 rounded-lg object-cover" />
          <div>
            <h2 className="font-heading text-sm font-bold text-sidebar-foreground">
              {isAdmin ? "Admin Panel" : "BHW System"}
            </h2>
            <p className="text-xs text-sidebar-foreground/60">
              {isAdmin ? "Supervisor" : "Health Records"}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider mb-1">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(mainItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider mb-1">
            Health Forms
          </SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(formItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider mb-1">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(isAdmin ? adminSystemItems : bhwSystemItems)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-3">
        <NavLink to="/profile" className="flex items-center gap-3 rounded-md p-1 -m-1 transition-colors hover:bg-sidebar-accent" activeClassName="">
          <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-xs font-semibold text-sidebar-accent-foreground">
              {isAdmin ? "SV" : "BH"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{username || user?.email || "User"}</p>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{userRole || "Worker"}</p>
          </div>
        </NavLink>
        <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground" onClick={() => setSignOutOpen(true)}>
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </SidebarFooter>

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to sign out? You will need to log in again to access the system.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={signOut}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
