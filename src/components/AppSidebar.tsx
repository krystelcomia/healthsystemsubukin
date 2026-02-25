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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Resident Records", url: "/residents", icon: Users },
];

const formItems = [
  { title: "Family Data", url: "/forms/family-data", icon: ClipboardList },
  { title: "Consultation", url: "/forms/consultation", icon: Stethoscope },
  { title: "PhilPen Health", url: "/forms/philpen-health", icon: Activity },
  { title: "Dengue Prevention", url: "/forms/dengue-prevention", icon: Bug },
  { title: "Maternal Care", url: "/forms/maternal-care", icon: Heart },
  { title: "Child Health", url: "/forms/child-health", icon: Baby },
];

const systemItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

const adminItems = [
  { title: "Resident Records", url: "/admin/residents", icon: Users },
  { title: "BH Workers", url: "/admin/workers", icon: Shield },
  { title: "Health Records", url: "/admin/health", icon: Activity },
  { title: "Admin Settings", url: "/admin/settings", icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { user, userRole, signOut } = useAuth();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const isActive = (path: string) => location.pathname === path || (path !== "/" && location.pathname.startsWith(path));

  const renderItems = (items: typeof mainItems) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
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
          <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Heart className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h2 className="font-heading text-sm font-bold text-sidebar-foreground">BHW System</h2>
            <p className="text-xs text-sidebar-foreground/60">Health Records</p>
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

        {userRole === "supervisor" && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider mb-1">
              Admin
            </SidebarGroupLabel>
            <SidebarGroupContent>{renderItems(adminItems)}</SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider mb-1">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(systemItems)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-xs font-semibold text-sidebar-accent-foreground">
              {userRole === "supervisor" ? "SV" : "BH"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.email || "User"}</p>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{userRole || "Staff"}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground" onClick={() => setSignOutOpen(true)}>
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </SidebarFooter>

      {/* Sign Out Confirmation */}
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
