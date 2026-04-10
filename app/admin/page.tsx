"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

type OrderRow = {
  id: string;
  total: number;
  delivery_type: string | null;
  payment_method: string | null;
  created_at: string;
  customer_id: string | null;
  status: string | null;
};

type CustomerRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

type FilterType = "all" | "weekly" | "monthly" | "custom";

type DashboardResponse = {
  ok: boolean;
  orders?: OrderRow[];
  customers?: CustomerRow[];
  orderItems?: OrderItemRow[];
};

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);

  const [filterType, setFilterType] = useState<FilterType>("all");
  const [startDate, setStartDate] = useState("");
  const [startHour, setStartHour] = useState("00:00");
  const [endDate, setEndDate] = useState("");
  const [endHour, setEndHour] = useState("23:59");

  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/admin/login");
          return;
        }

        const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
        const data = (await res.json()) as DashboardResponse & {
          error?: string;
          detail?: string;
        };

        if (!res.ok || !data.ok) {
          console.error("Error dashboard:", data);
          setError(
            data.detail ||
              data.error ||
              "No se pudo cargar el dashboard en este momento."
          );
          return;
        }

        setOrders(data.orders || []);
        setCustomers(data.customers || []);
        setOrderItems(data.orderItems || []);
      } catch (error: unknown) {
        console.error("Error dashboard:", error);
        setError("No se pudo cargar el dashboard en este momento.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const customerMap = useMemo(() => {
    return new Map(customers.map((c) => [c.id, c]));
  }, [customers]);

  const filteredOrders = orders.filter((order) => {
    const now = new Date();
    const orderDate = new Date(order.created_at);

    if (filterType === "weekly") {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return orderDate >= weekAgo && orderDate <= now;
    }

    if (filterType === "monthly") {
      const monthAgo = new Date();
      monthAgo.setMonth(now.getMonth() - 1);
      return orderDate >= monthAgo && orderDate <= now;
    }

    if (filterType === "custom") {
      if (!startDate || !endDate) return true;

      const start = new Date(`${startDate}T${startHour || "00:00"}:00`);
      const end = new Date(`${endDate}T${endHour || "23:59"}:59`);

      return orderDate >= start && orderDate <= end;
    }

    return true;
  });

  const filteredOrderIds = useMemo(() => {
    return new Set(filteredOrders.map((o) => o.id));
  }, [filteredOrders]);

  const filteredOrderItems = useMemo(() => {
    return orderItems.filter((item) => filteredOrderIds.has(item.order_id));
  }, [orderItems, filteredOrderIds]);

  const totalVentas = useMemo(
    () => filteredOrders.reduce((acc, o) => acc + Number(o.total || 0), 0),
    [filteredOrders]
  );

  const totalPedidos = filteredOrders.length;

  const clientesUnicos = useMemo(() => {
    return new Set(filteredOrders.map((o) => o.customer_id).filter(Boolean))
      .size;
  }, [filteredOrders]);

  const ticketPromedio = totalPedidos > 0 ? totalVentas / totalPedidos : 0;

  const ventasHoy = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return orders
      .filter((o) => new Date(o.created_at) >= start)
      .reduce((acc, o) => acc + Number(o.total || 0), 0);
  }, [orders]);

  const pedidosHoy = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return orders.filter((o) => new Date(o.created_at) >= start).length;
  }, [orders]);

  const topClientes = useMemo(() => {
    const grouped = new Map<
      string,
      {
        name: string;
        email: string;
        phone: string;
        pedidos: number;
        total: number;
      }
    >();

    filteredOrders.forEach((order) => {
      if (!order.customer_id) return;
      const customer = customerMap.get(order.customer_id);
      if (!customer) return;

      const key = order.customer_id;
      const current = grouped.get(key) || {
        name: customer.name || "Sin nombre",
        email: customer.email || "-",
        phone: customer.phone || "-",
        pedidos: 0,
        total: 0,
      };

      current.pedidos += 1;
      current.total += Number(order.total || 0);
      grouped.set(key, current);
    });

    return Array.from(grouped.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredOrders, customerMap]);

  const topProductos = useMemo(() => {
    const grouped = new Map<
      string,
      { nombre: string; cantidad: number; total: number }
    >();

    filteredOrderItems.forEach((item) => {
      const current = grouped.get(item.product_name) || {
        nombre: item.product_name,
        cantidad: 0,
        total: 0,
      };

      current.cantidad += Number(item.quantity || 0);
      current.total += Number(item.line_total || 0);
      grouped.set(item.product_name, current);
    });

    return Array.from(grouped.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }, [filteredOrderItems]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredOrders.slice(start, end);
  }, [currentPage, filteredOrders]);

  if (loading) {
    return (
      <main className="rounded-3xl border border-[#c9dfc3] bg-white p-6 text-[#046703] shadow-sm">
        Cargando dashboard...
      </main>
    );
  }

  if (error) {
    return (
      <main className="rounded-3xl border border-[#f6070b]/20 bg-white p-6 shadow-sm">
        <p className="text-lg font-semibold text-[#f6070b]">
          No se pudo cargar el dashboard.
        </p>
        <p className="mt-2 text-sm text-neutral-600">{error}</p>
      </main>
    );
  }

  const filterButtonClass = (type: FilterType) =>
    `rounded-2xl px-4 py-2 text-sm font-medium transition ${
      filterType === type
        ? "bg-[#f6070b] text-white shadow-sm"
        : "bg-[#c9dfc3] text-[#046703] hover:bg-[#69adb6] hover:text-white"
    }`;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#69adb6]">
              Panel general
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#046703]">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Revisa ventas, productos, clientes y comportamiento del día.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setFilterType("all");
                setPage(1);
              }}
              className={filterButtonClass("all")}
            >
              Todo
            </button>
            <button
              onClick={() => {
                setFilterType("weekly");
                setPage(1);
              }}
              className={filterButtonClass("weekly")}
            >
              Semanal
            </button>
            <button
              onClick={() => {
                setFilterType("monthly");
                setPage(1);
              }}
              className={filterButtonClass("monthly")}
            >
              Mensual
            </button>
            <button
              onClick={() => {
                setFilterType("custom");
                setPage(1);
              }}
              className={filterButtonClass("custom")}
            >
              Personalizado
            </button>
          </div>
        </div>

        {filterType === "custom" && (
          <div className="grid gap-3 border-t border-[#c9dfc3] pt-4 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label className="mb-1 block text-sm text-neutral-600">
                Fecha inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-[#c9dfc3] bg-white p-3 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-neutral-600">
                Hora inicio
              </label>
              <input
                type="time"
                value={startHour}
                onChange={(e) => {
                  setStartHour(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-[#c9dfc3] bg-white p-3 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-neutral-600">
                Fecha fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-[#c9dfc3] bg-white p-3 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-neutral-600">
                Hora fin
              </label>
              <input
                type="time"
                value={endHour}
                onChange={(e) => {
                  setEndHour(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-[#c9dfc3] bg-white p-3 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setStartDate("");
                  setStartHour("00:00");
                  setEndDate("");
                  setEndHour("23:59");
                  setFilterType("all");
                  setPage(1);
                }}
                className="w-full rounded-xl bg-[#c9dfc3] px-4 py-3 text-sm font-medium text-[#046703] transition hover:bg-[#69adb6] hover:text-white"
              >
                Limpiar filtro
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-[#69adb6] p-6 text-white shadow-sm">
          <p className="text-sm text-white/80">Ventas hoy</p>
          <p className="mt-2 text-4xl font-bold">
            ${ventasHoy.toLocaleString("es-CL")}
          </p>
          <p className="mt-2 text-sm text-white/80">
            Movimiento del día actual
          </p>
        </div>

        <div className="rounded-3xl bg-[#f6070b] p-6 text-white shadow-sm">
          <p className="text-sm text-white/80">Pedidos hoy</p>
          <p className="mt-2 text-4xl font-bold">{pedidosHoy}</p>
          <p className="mt-2 text-sm text-white/80">Pedidos creados hoy</p>
        </div>

        <div className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-500">Ventas totales</p>
          <p className="mt-2 text-3xl font-bold text-[#046703]">
            ${totalVentas.toLocaleString("es-CL")}
          </p>
        </div>

        <div className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-500">Pedidos</p>
          <p className="mt-2 text-3xl font-bold text-[#69adb6]">
            {totalPedidos}
          </p>
        </div>

        <div className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-500">Clientes únicos</p>
          <p className="mt-2 text-3xl font-bold text-[#046703]">
            {clientesUnicos}
          </p>
        </div>

        <div className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-500">Ticket promedio</p>
          <p className="mt-2 text-3xl font-bold text-[#f48e07]">
            ${Math.round(ticketPromedio).toLocaleString("es-CL")}
          </p>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[1.8fr_1fr]">
        <section className="self-start rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#046703]">
                Últimos pedidos
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Mostrando {paginatedOrders.length} de {filteredOrders.length}
              </p>
            </div>

            {filteredOrders.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="rounded-xl border border-[#c9dfc3] px-4 py-2 text-sm font-medium text-[#046703] transition hover:bg-[#c9dfc3] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Anterior
                </button>

                <span className="text-sm text-neutral-500">
                    Página {currentPage} de {totalPages}
                </span>

                <button
                  onClick={() =>
                    setPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={page === totalPages}
                  className="rounded-xl border border-[#c9dfc3] px-4 py-2 text-sm font-medium text-[#046703] transition hover:bg-[#c9dfc3] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {paginatedOrders.map((order) => {
              const customer = order.customer_id
                ? customerMap.get(order.customer_id)
                : null;

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/20 p-4 transition hover:shadow-sm"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-900">
                        {customer?.name || "Sin nombre"}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {customer?.email || "-"} • {customer?.phone || "-"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full border border-[#c9dfc3] bg-white px-3 py-1 text-[#046703]">
                        {order.delivery_type || "-"}
                      </span>
                      <span className="rounded-full border border-[#c9dfc3] bg-white px-3 py-1 text-[#046703]">
                        {order.payment_method || "-"}
                      </span>
                      <span className="rounded-full border border-[#c9dfc3] bg-white px-3 py-1 text-[#046703]">
                        {order.status || "-"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-neutral-500">
                      {new Date(order.created_at).toLocaleString("es-CL")}
                    </p>
                    <p className="text-lg font-bold text-[#f6070b]">
                      ${Number(order.total || 0).toLocaleString("es-CL")}
                    </p>
                  </div>
                </div>
              );
            })}

            {filteredOrders.length === 0 && (
              <p className="text-sm text-neutral-500">
                No hay pedidos para este período.
              </p>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#046703]">
                Top 5 productos
              </h2>
              <span className="text-sm text-neutral-500">
                {topProductos.length} resultados
              </span>
            </div>

            <div className="space-y-3">
              {topProductos.map((producto, index) => (
                <div
                  key={`${producto.nombre}-${index}`}
                  className="rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-[#046703]">
                        {producto.nombre}
                      </div>
                      <div className="mt-1 text-sm text-neutral-600">
                        Vendidos: {producto.cantidad}
                      </div>
                    </div>
                    <span className="rounded-full border border-[#c9dfc3] bg-white px-3 py-1 text-xs font-semibold text-[#69adb6]">
                      #{index + 1}
                    </span>
                  </div>

                  <div className="mt-3 h-2 rounded-full bg-white">
                    <div
                      className="h-2 rounded-full bg-[#f6070b]"
                      style={{
                        width: `${
                          topProductos[0]?.cantidad
                            ? (producto.cantidad / topProductos[0].cantidad) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 text-sm font-semibold text-[#f6070b]">
                    ${producto.total.toLocaleString("es-CL")}
                  </div>
                </div>
              ))}

              {topProductos.length === 0 && (
                <p className="text-sm text-neutral-500">
                  Aún no hay productos vendidos.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#046703]">
                Top 5 clientes
              </h2>
              <span className="text-sm text-neutral-500">
                {topClientes.length} resultados
              </span>
            </div>

            <div className="space-y-3">
              {topClientes.map((cliente, index) => (
                <div
                  key={`${cliente.email}-${index}`}
                  className="rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-[#046703]">
                        {cliente.name}
                      </div>
                      <div className="truncate text-xs text-neutral-500">
                        {cliente.email}
                      </div>
                    </div>
                    <span className="rounded-full border border-[#c9dfc3] bg-white px-3 py-1 text-xs font-semibold text-[#69adb6]">
                      #{index + 1}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-[#c9dfc3] bg-white p-3">
                      <p className="text-neutral-500">Pedidos</p>
                      <p className="mt-1 font-bold text-[#69adb6]">
                        {cliente.pedidos}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#c9dfc3] bg-white p-3">
                      <p className="text-neutral-500">Total</p>
                      <p className="mt-1 font-bold text-[#f6070b]">
                        ${cliente.total.toLocaleString("es-CL")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {topClientes.length === 0 && (
                <p className="text-sm text-neutral-500">
                  Aún no hay clientes.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
