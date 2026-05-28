import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "../lib/utils";
import { Box, Play, List, Settings } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: Box },
  { href: "/workflows", label: "Workflows", icon: List },
  { href: "/workflows/new", label: "New Workflow", icon: Play },
  { href: "/tasks", label: "Tasks", icon: List },
];

export function DashboardLayout({ children }: { readonly children: ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-56 border-r bg-card shrink-0">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">BrowserMesh</h2>
        </div>
        <nav className="p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.href
              || (item.href !== "/" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm w-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
