import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NavLink } from "@/components/NavLink";
import { Home, Info, Calendar, Mail } from "lucide-react";

const headerLinks = [
  { label: "Home", to: "/", icon: Home },
  { label: "About", to: "/about", icon: Info },
  { label: "Calendar", to: "/calendar", icon: Calendar },
  { label: "Contact", to: "/contact", icon: Mail },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 h-14 flex items-center gap-4 border-b border-sidebar-border bg-sidebar text-sidebar-foreground px-6 shrink-0">
            <SidebarTrigger className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
            <nav className="flex-1 flex items-center justify-end gap-1 sm:gap-2">
              {headerLinks.map((link) => (
                <NavLink
                  key={link.label}
                  to={link.to}
                  end
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                >
                  <link.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{link.label}</span>
                </NavLink>
              ))}
            </nav>
          </header>
          <div className="flex-1 p-6 overflow-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
