import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NavLink } from "@/components/NavLink";

const headerLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Calendar", to: "/calendar" },
  { label: "Contact", to: "/contact" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 h-14 flex items-center gap-4 border-b border-sidebar-border bg-sidebar text-sidebar-foreground px-6 shrink-0">
            <SidebarTrigger className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
            <nav className="flex-1 flex items-center justify-between gap-2">
              {headerLinks.map((link) => (
                <NavLink
                  key={link.label}
                  to={link.to}
                  end
                  className="flex-1 text-center px-3 py-1.5 rounded-md text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </header>
          <div className="flex-1 p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
