import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export function Layout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "18rem" } as React.CSSProperties}>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar role={user.role} />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-white/5 bg-background/80 backdrop-blur-xl px-4 sm:px-6">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium">{user.email}</span>
                <span className="text-xs text-muted-foreground">{user.role}</span>
              </div>
              <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                <span className="text-primary font-bold">{user.email[0].toUpperCase()}</span>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <div className="mx-auto max-w-6xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
