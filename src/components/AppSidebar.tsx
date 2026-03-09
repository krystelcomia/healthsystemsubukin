import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
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
import barangayLogo from "@/assets/barangay-logo.png";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function AppSidebar() {
  const location = useLocation();
  const { user, userRole, username, signOut } = useAuth();
  const { t } = useSettings();
  const [signOutOpen, setSignOutOpen] = useState(false);

  const isAdminRoute = location.pathname.startsWith("/admin");
  const isAdmin = userRole === "supervisor" && isAdminRoute;

  // BHW user navigation
  const bhwMainItems = [
    { title: t("nav.dashboard"), url: "/", icon: LayoutDashboard },
    { title: t("nav.residentRecords"), url: "/residents", icon: Users },
  ];

  const bhwFormItems = [
    { title: t("nav.familyData"), url: "/forms/family-data", icon: ClipboardList },
    { title: t("nav.consultation"), url: "/forms/consultation", icon: Stethoscope },
    { title: t("nav.philpenHealth"), url: "/forms/philpen-health", icon: Activity },
    { title: t("nav.denguePrevention"), url: "/forms/dengue-prevention", icon: Bug },
    { title: t("nav.maternalCare"), url: "/forms/maternal-care", icon: Heart },
    { title: t("nav.childHealth"), url: "/forms/child-health", icon: Baby },
    { title: t("nav.familyPlanning"), url: "/forms/family-planning", icon: Heart },
  ];

  const bhwSystemItems = [
    { title: t("nav.settings"), url: "/settings", icon: Settings },
  ];

  // Admin/Supervisor navigation
  const adminMainItems = [
    { title: t("nav.dashboard"), url: "/admin", icon: LayoutDashboard },
    { title: t("nav.residentRecords"), url: "/admin/residents", icon: Users },
    { title: t("nav.bhWorkers"), url: "/admin/workers", icon: Shield },
  ];

  const adminSystemItems = [
    { title: t("nav.settings"), url: "/admin/settings", icon: Settings },
  ];

  const adminFormItems = [
    { title: t("nav.familyData"), url: "/admin/forms/family-data", icon: ClipboardList },
    { title: t("nav.consultation"), url: "/admin/forms/consultation", icon: Stethoscope },
    { title: t("nav.philpenHealth"), url: "/admin/forms/philpen-health", icon: Activity },
    { title: t("nav.denguePrevention"), url: "/admin/forms/dengue-prevention", icon: Bug },
    { title: t("nav.maternalCare"), url: "/admin/forms/maternal-care", icon: Heart },
    { title: t("nav.childHealth"), url: "/admin/forms/child-health", icon: Baby },
    { title: t("nav.familyPlanning"), url: "/admin/forms/family-planning", icon: Heart },
  ];

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
          <img src={barangayLogo} alt="Barangay Subukin Logo" className="h-11 w-11 rounded-full object-cover" />
          <div>
            <h2 className="font-heading text-sm font-bold text-sidebar-foreground">
              {isAdmin ? t("sidebar.adminPanel") : t("sidebar.bhwSystem")}
            </h2>
            <p className="text-xs text-sidebar-foreground/60">
              {isAdmin ? t("sidebar.supervisor") : t("sidebar.healthRecords")}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider mb-1">
            {t("sidebar.overview")}
          </SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(mainItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider mb-1">
            {t("sidebar.healthForms")}
          </SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(formItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider mb-1">
            {t("sidebar.system")}
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
            <p className="text-xs text-sidebar-foreground/50 capitalize">{userRole || t("common.worker")}</p>
          </div>
        </NavLink>
        <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground" onClick={() => setSignOutOpen(true)}>
          <LogOut className="h-4 w-4 mr-2" /> {t("sidebar.signOut")}
        </Button>
      </SidebarFooter>

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sidebar.signOutTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("sidebar.signOutDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("sidebar.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={signOut}>{t("sidebar.signOut")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}