"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type OrderHistoryRow = {
  id: string;
  total: number;
  status: string;
  tracking_code: string | null;
  created_at: string;
  delivered_at: string | null;
  rejected_at: string | null;
  estimated_minutes: number | null;
  delivery_type: string;
  payment_method: string;
  address: string | null;
  zone: string | null;
  other_zone: string | null;
  customers: {
    name: string;
    phone: string;
  } | null;
  order_items: {
    product_name: string;
    quantity: number;
  }[];
};

type HistoryFilter = "all" | "delivered" | "rejected";
type DateFilter = "7d" | "30d" | "90d" | "all";
type DeliveryFilter = "all" | "delivery" | "pickup";
type PaymentFilter =
  | "all"
  | "Transferencia"
  | "Efectivo"
  | "Débito"
  | "Crédito";

const ITEMS_PER_PAGE = 12;

const statusLabel: Record<string, string> = {
  delivered: "Entregado",
  rejected: "Rechazado",
};

const statusClass: Record<string, string> = {
  delivered: "bg-[#046703]/10 text-[#046703]",
  rejected: "bg-[#f6070b]/10 text-[#f6070b]",
};

type OrderHistoryResponse = {
  ok: boolean;
  orders?: OrderHistoryRow[];
};

export default function AdminOrderHistoryPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderHistoryRow[]>([]);
  const [search, setSearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("30d");
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [page, setPage] = useState(1);

  const loadOrders = async () => {
    const res = await fetch("/api/admin/order-history", { cache: "no-store" });
    const data = (await res.json()) as OrderHistoryResponse;

    if (!res.ok || !data.ok) {
      console.error("Error cargando historial:", data);
      return;
    }

    setOrders(data.orders || []);
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/admin/login");
        return;
      }

      await loadOrders();
      setLoading(false);
    };

    init();
  }, [router]);

  const filteredOrders = useMemo(() => {
    const now = new Date();

    return orders.filter((order) => {
      if (historyFilter !== "all" && order.status !== historyFilter) {
        return false;
      }

      if (deliveryFilter !== "all") {
        const isDelivery = order.delivery_type === "Delivery";

        if (deliveryFilter === "delivery" && !isDelivery) {
          return false;
        }

        if (deliveryFilter === "pickup" && isDelivery) {
          return false;
        }
      }

      if (paymentFilter !== "all" && order.payment_method !== paymentFilter) {
        return false;
      }

      if (dateFilter !== "all") {
        const orderDate = new Date(order.created_at);
        const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90;
        const start = new Date();
        start.setDate(now.getDate() - days);

        if (orderDate < start) {
          return false;
        }
      }

      if (!search.trim()) {
        return true;
      }

      const query = search.toLowerCase();
      const customerName = order.customers?.name?.toLowerCase() || "";
      const customerPhone = order.customers?.phone?.toLowerCase() || "";
      const tracking = order.tracking_code?.toLowerCase() || "";

      return (
        customerName.includes(query) ||
        customerPhone.includes(query) ||
        tracking.includes(query)
      );
    });
  }, [orders, historyFilter, deliveryFilter, paymentFilter, dateFilter, search]);

  const deliveredOrders = filteredOrders.filter((order) => order.status === "delivered");
  const rejectedOrders = filteredOrders.filter((order) => order.status === "rejected");
  const deliveredSales = deliveredOrders.reduce(
    (acc, order) => acc + Number(order.total || 0),
    0
  );

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  const paginatedOrders = filteredOrders.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const exportCsv = () => {
    const rows = filteredOrders.map((order) => {
      const isDelivery = order.delivery_type === "Delivery";
      const closedAt =
        order.status === "delivered" ? order.delivered_at : order.rejected_at;

      return {
        tracking: order.tracking_code || "",
        estado: statusLabel[order.status] || order.status,
        cliente: order.customers?.name || "Cliente",
        telefono: order.customers?.phone || "",
        creado: new Date(order.created_at).toLocaleString("es-CL"),
        cierre: closedAt ? new Date(closedAt).toLocaleString("es-CL") : "",
        modalidad: isDelivery ? "Delivery" : "Retiro",
        pago: order.payment_method || "",
        direccion: order.address || "",
        zona:
          order.zone === "Otra" ? order.other_zone || "Otra" : order.zone || "",
        total: Number(order.total || 0),
        productos: (order.order_items || [])
          .map((item) => `${item.product_name} x${item.quantity}`)
          .join(" | "),
      };
    });

    const headers = [
      "tracking",
      "estado",
      "cliente",
      "telefono",
      "creado",
      "cierre",
      "modalidad",
      "pago",
      "direccion",
      "zona",
      "total",
      "productos",
    ];

    const escapeCsvValue = (value: string | number) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((header) => escapeCsvValue(row[header as keyof typeof row])).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historial-pedidos-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <main className="rounded-3xl border border-[#c9dfc3] bg-white p-6 text-[#046703] shadow-sm">
        Cargando historial...
      </main>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#69adb6]">
              Gestión histórica
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#046703]">
              Historial de pedidos
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Revisa pedidos entregados y rechazados con filtros rápidos y búsqueda.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => loadOrders()}
              className="rounded-2xl border border-[#69adb6] bg-white px-4 py-2 text-sm font-medium text-[#69adb6] transition hover:bg-[#69adb6]/10"
            >
              Actualizar
            </button>
            <button
              onClick={exportCsv}
              className="rounded-2xl border border-[#046703] bg-white px-4 py-2 text-sm font-medium text-[#046703] transition hover:bg-[#046703]/10"
            >
              Exportar CSV
            </button>
            <button
              onClick={() => router.push("/admin/orders")}
              className="rounded-2xl bg-[#69adb6] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Ir a pedidos activos
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por cliente, teléfono o tracking..."
            className="w-full rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/20 px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
          />

          <select
            value={historyFilter}
            onChange={(e) => {
              setHistoryFilter(e.target.value as HistoryFilter);
              setPage(1);
            }}
            className="rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/20 px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
          >
            <option value="all">Todos los estados</option>
            <option value="delivered">Entregados</option>
            <option value="rejected">Rechazados</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value as DateFilter);
              setPage(1);
            }}
            className="rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/20 px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
            <option value="all">Todo el historial</option>
          </select>

          <select
            value={deliveryFilter}
            onChange={(e) => {
              setDeliveryFilter(e.target.value as DeliveryFilter);
              setPage(1);
            }}
            className="rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/20 px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
          >
            <option value="all">Todas las modalidades</option>
            <option value="delivery">Solo delivery</option>
            <option value="pickup">Solo retiro</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value as PaymentFilter);
              setPage(1);
            }}
            className="rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/20 px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
          >
            <option value="all">Todos los pagos</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Débito">Débito</option>
            <option value="Crédito">Crédito</option>
          </select>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-[#69adb6] p-6 text-white shadow-sm">
          <p className="text-sm text-white/80">Pedidos en historial</p>
          <p className="mt-2 text-3xl font-bold">{filteredOrders.length}</p>
        </div>

        <div className="rounded-3xl bg-[#046703] p-6 text-white shadow-sm">
          <p className="text-sm text-white/80">Entregados</p>
          <p className="mt-2 text-3xl font-bold">{deliveredOrders.length}</p>
        </div>

        <div className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-500">Rechazados</p>
          <p className="mt-2 text-3xl font-bold text-[#f6070b]">
            {rejectedOrders.length}
          </p>
        </div>

        <div className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-500">Ventas entregadas</p>
          <p className="mt-2 text-3xl font-bold text-[#f48e07]">
            ${deliveredSales.toLocaleString("es-CL")}
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#046703]">Listado</h2>
          <span className="text-sm text-neutral-500">
            {filteredOrders.length} resultados
          </span>
        </div>

        <div className="space-y-4">
          {paginatedOrders.map((order) => {
            const isDelivery = order.delivery_type === "Delivery";
            const closedAt = order.status === "delivered" ? order.delivered_at : order.rejected_at;

            return (
              <article
                key={order.id}
                className="rounded-3xl border border-[#c9dfc3] bg-[#c9dfc3]/10 p-5"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-bold text-[#046703]">
                        {order.customers?.name || "Cliente"}
                      </p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          statusClass[order.status] || "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {statusLabel[order.status] || order.status}
                      </span>
                      {order.tracking_code && (
                        <span className="rounded-full border border-[#c9dfc3] bg-white px-3 py-1 text-xs font-semibold text-[#69adb6]">
                          {order.tracking_code}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-neutral-500">
                      {order.customers?.phone || "-"}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-neutral-600">
                      <span>
                        <strong>Creado:</strong>{" "}
                        {new Date(order.created_at).toLocaleString("es-CL")}
                      </span>
                      <span>
                        <strong>Cierre:</strong>{" "}
                        {closedAt ? new Date(closedAt).toLocaleString("es-CL") : "-"}
                      </span>
                      <span>
                        <strong>Tipo:</strong> {order.delivery_type}
                      </span>
                      <span>
                        <strong>Pago:</strong> {order.payment_method || "-"}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-wide text-neutral-500">
                      Total
                    </p>
                    <p className="mt-1 text-2xl font-bold text-[#f6070b]">
                      ${Number(order.total || 0).toLocaleString("es-CL")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-[#c9dfc3] bg-white p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-400">
                      Pedido
                    </p>
                    <div className="space-y-2">
                      {order.order_items?.map((item, index) => (
                        <div
                          key={`${order.id}-${index}`}
                          className="flex items-center justify-between rounded-2xl bg-[#f8f5ef] px-4 py-3 text-sm text-neutral-700"
                        >
                          <span>{item.product_name}</span>
                          <span className="rounded-full bg-[#69adb6]/10 px-3 py-1 text-xs font-semibold text-[#69adb6]">
                            x{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#c9dfc3] bg-white p-4 text-sm text-neutral-700">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-400">
                      Resumen
                    </p>
                    <div className="space-y-2">
                      <p>
                        <strong>Modalidad:</strong> {isDelivery ? "Delivery" : "Retiro"}
                      </p>
                      {isDelivery && (
                        <>
                          <p>
                            <strong>Dirección:</strong> {order.address || "-"}
                          </p>
                          <p>
                            <strong>Zona:</strong>{" "}
                            {order.zone === "Otra"
                              ? order.other_zone || "Otra"
                              : order.zone || "-"}
                          </p>
                        </>
                      )}
                      {order.estimated_minutes ? (
                        <p>
                          <strong>Estimado original:</strong> {order.estimated_minutes} min
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {paginatedOrders.length === 0 && (
            <div className="rounded-3xl border border-dashed border-[#c9dfc3] bg-[#c9dfc3]/10 p-8 text-center">
              <p className="text-lg font-semibold text-[#046703]">
                No hay pedidos para este filtro
              </p>
              <p className="mt-2 text-sm text-neutral-500">
                Prueba cambiando el rango de fechas, el estado o la búsqueda.
              </p>
            </div>
          )}
        </div>

        {filteredOrders.length > ITEMS_PER_PAGE && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#c9dfc3] pt-6">
            <p className="text-sm text-neutral-500">
              Página {page} de {totalPages}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="rounded-2xl border border-[#c9dfc3] bg-white px-4 py-2 text-sm font-medium text-[#046703] transition hover:bg-[#c9dfc3]/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="rounded-2xl border border-[#c9dfc3] bg-white px-4 py-2 text-sm font-medium text-[#046703] transition hover:bg-[#c9dfc3]/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
