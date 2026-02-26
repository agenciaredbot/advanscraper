"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Search,
  Users,
  Star,
  ListFilter,
  Megaphone,
  Send,
  FileText,
  Video,
  Download,
  Settings,
  LogOut,
  Shield,
} from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Búsqueda", href: "/search", icon: Search },
  { name: "Resultados", href: "/results", icon: Users },
  { name: "Leads", href: "/leads", icon: Star },
  { name: "Listas", href: "/lists", icon: ListFilter },
  { name: "Campañas", href: "/campaigns", icon: Megaphone },
  { name: "Outreach", href: "/outreach", icon: Send },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Videos", href: "/videos", icon: Video },
  { name: "Exports", href: "/exports", icon: Download },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/settings/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.role === "superadmin") setIsAdmin(true);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const allNavigation = isAdmin
    ? [...navigation, { name: "Admin", href: "/admin", icon: Shield }]
    : navigation;

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Logo */}
      <div className="flex h-20 items-center justify-center border-b border-zinc-800 px-3">
        <Image
          src="/Logo_AdvanceScraper.png"
          alt="AdvanScraper"
          width={480}
          height={205}
          className="w-full max-w-[220px] h-auto"
          priority
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {allNavigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? item.name === "Admin"
                    ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-zinc-800 p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800/50 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
