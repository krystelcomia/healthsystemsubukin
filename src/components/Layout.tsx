import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NavLink } from "@/components/NavLink";
import { Home, Info, Calendar, Mail } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const headerLinks = [
  { label: "Home", to: "/", Icon: Home },
  { label: "About", to: "/about", Icon: Info },
  { label: "Calendar", to: "/calendar", Icon: Calendar },
  { label: "Contact", to: "/contact", Icon: Mail },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 h-14 flex items-center gap-4 border-b border-sidebar-border bg-sidebar text-sidebar-foreground px-6 shrink-0">
            <SidebarTrigger className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
            <TooltipProvider delayDuration={100}>
              <nav className="flex-1 flex items-center justify-between gap-2">
                {headerLinks.map(({ label, to, Icon }) => (
                  <Tooltip key={label}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={to}
                        end
                        className="flex-1 flex items-center justify-center px-3 py-1.5 rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-primary"
                      >
                        <Icon className="h-5 w-5" aria-label={label} />
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent>{label}</TooltipContent>
                  </Tooltip>
                ))}
              </nav>
            </TooltipProvider>
          </header>
          <div className="flex-1 p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
