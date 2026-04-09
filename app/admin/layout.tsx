"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useEffect, useState } from "react";

import {
  type LucideIcon,
  LayoutDashboard,
  Pizza,
  ShoppingCart,
  Users,
  TicketPercent,
  History,
  Images,
  Menu as MenuIcon,
  X,
  Map, // 🔥 NUEVO
} from "lucide-react";

type MenuItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadPendingCount = async () => {
    const res = await fetch("/api/admin/orders/pending-count", {
      cache: "no-store",
    });
    const data = (await res.json()) as {
      ok: boolean;
      count?: number;
      error?: string;
    };

    if (!res.ok || !data.ok) {
      if (res.status === 401 || res.status === 403) {
        setPendingCount(0);
        return;
      }

      console.error("Error cargando pendientes:", data);
      return;
    }

    setPendingCount(data.count || 0);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/admin/login");
        return;
      }

      await loadPendingCount();
      interval = setInterval(loadPendingCount, 5000);
    };

    init();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [router]);

  const handleLogout = async () => {
    setPendingCount(0);
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  // 🔥 MENÚ ACTUALIZADO
  const menu: MenuItem[] = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Menú", href: "/admin/menu", icon: Pizza },

    // 🔥 NUEVO
    { name: "Zonas Delivery", href: "/admin/delivery-zones", icon: Map },

    {
      name: "Pedidos",
      href: "/admin/orders",
      icon: ShoppingCart,
      badge: pendingCount,
    },
    { name: "Banners", href: "/admin/banners", icon: Images },
    { name: "Historial", href: "/admin/order-history", icon: History },
    { name: "Clientes", href: "/admin/customers", icon: Users },
    { name: "Cupones", href: "/admin/coupons", icon: TicketPercent },
  ];

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#c9dfc3]/30 md:flex">

      {/* HEADER MÓVIL */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-3">
          <Image
            src="/images/Logo_oficial.png"
            alt="Sole e Mare"
            width={48}
            height={48}
            className="h-10 w-10 object-contain"
            priority
          />
          <p className="font-bold text-[#046703]">Sole e Mare</p>
        </div>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="rounded-xl border border-[#c9dfc3] p-2"
        >
          <MenuIcon size={20} />
        </button>
      </div>

      {/* OVERLAY */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR MÓVIL */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-white border-r border-[#c9dfc3] shadow-xl transition-transform duration-300 md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-[#c9dfc3] p-6">
          <div className="flex items-center gap-3">
            <Image
              src="/images/Logo_oficial.png"
              alt="Sole e Mare"
              width={56}
              height={56}
              className="h-12 w-12 object-contain"
              priority
            />
            <h1 className="text-xl font-bold text-[#046703]">Sole e Mare</h1>
          </div>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-xl border border-[#c9dfc3] p-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* MENU */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {menu.map((item) => {
            const Icon = item.icon;

            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm transition ${
                  isActive
                    ? "bg-[#69adb6] text-white"
                    : "text-[#046703] hover:bg-[#c9dfc3]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span>{item.name}</span>
                </div>

                {item.badge && item.badge > 0 && (
                  <span className="rounded-full bg-[#f6070b] px-2 py-0.5 text-xs text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* LOGOUT */}
          <div className="pt-3 mt-3 border-t border-[#c9dfc3]">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl bg-[#f6070b] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
            >
              🚪 Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-white border-r border-[#c9dfc3]">

        {/* HEADER */}
        <div className="p-6 border-b border-[#c9dfc3]">
          <div className="flex items-center gap-3">
            <Image
              src="/images/Logo_oficial.png"
              alt="Sole e Mare"
              width={64}
              height={64}
              className="h-14 w-14 object-contain"
              priority
            />
            <div>
              <h1 className="text-xl font-bold text-[#046703]">Sole e Mare</h1>
              <span className="block text-sm text-gray-500">Admin</span>
            </div>
          </div>
        </div>

        {/* MENU */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {menu.map((item) => {
            const Icon = item.icon;

            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm transition ${
                  isActive
                    ? "bg-[#69adb6] text-white"
                    : "text-[#046703] hover:bg-[#c9dfc3]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span>{item.name}</span>
                </div>

                {item.badge && item.badge > 0 && (
                  <span className="rounded-full bg-[#f6070b] px-2 py-0.5 text-xs text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* LOGOUT */}
          <div className="pt-3 mt-3 border-t border-[#c9dfc3]">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl bg-[#f6070b] px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENIDO */}
      <main className="flex-1 p-6 bg-white">
        {children}
      </main>
    </div>
  );
}
