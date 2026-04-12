"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";

type CustomerRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at?: string | null;
};

type OrderRow = {
  id: string;
  customer_id: string | null;
  total: number;
  status: string | null;
  delivery_type: string | null;
  payment_method: string | null;
  tracking_code?: string | null;
  address?: string | null;
  zone?: string | null;
  other_zone?: string | null;
  estimated_at?: string | null;
  created_at: string;
  order_items?: {
    product_name: string;
    quantity: number;
  }[];
};

type CustomerStats = {
  id: string;
  name: string;
  email: string;
  phone: string;
  pedidos: number;
  totalGastado: number;
  ticketPromedio: number;
  ultimoPedido: string | null;
  entregados: number;
  rechazados: number;
  deliveryCount: number;
  pickupCount: number;
  firstOrderAt: string | null;
  orders: OrderRow[];
};

type CustomersResponse = {
  ok: boolean;
  customers?: CustomerRow[];
  orders?: OrderRow[];
};

type OrdersTab = "active" | "scheduled" | "history";
type DateFilter = "7d" | "30d" | "90d" | "all";
type DeliveryFilter = "all" | "delivery" | "pickup";
type PaymentFilter =
  | "all"
  | "Transferencia"
  | "Efectivo"
  | "Débito"
  | "Crédito";

type OrderTableRow = OrderRow & {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerStats: CustomerStats | null;
};

const ACTIVE_STATUSES = new Set([
  "pending",
  "accepted",
  "preparing",
  "ready_for_pickup",
  "delivering",
]);

const HISTORY_STATUSES = new Set(["delivered", "rejected", "cancelled"]);

function formatStatusLabel(status: string | null) {
  if (!status) return "Sin estado";

  const labels: Record<string, string> = {
    pending: "Pendiente",
    accepted: "Aceptado",
    preparing: "En preparación",
    ready_for_pickup: "Listo para retiro",
    delivering: "En reparto",
    delivered: "Entregado",
    rejected: "Rechazado",
    cancelled: "Cancelado",
    scheduled: "Programado",
  };

  return labels[status] || status;
}

function formatDeliveryLabel(deliveryType: string | null) {
  if (!deliveryType) return "Sin tipo";
  return deliveryType === "Delivery" ? "Delivery" : "Retiro";
}

function formatDate(date: string | null | undefined) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("es-CL");
}

function formatTime(date: string | null | undefined) {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusClasses(status: string | null) {
  if (status === "delivered") {
    return "border-[#c9dfc3] bg-[#c9dfc3]/20 text-[#046703]";
  }

  if (status === "rejected" || status === "cancelled") {
    return "border-[#f6070b]/20 bg-[#f6070b]/10 text-[#f6070b]";
  }

  if (status === "scheduled") {
    return "border-[#f48e07]/20 bg-[#f48e07]/10 text-[#b96a04]";
  }

  return "border-[#69adb6]/20 bg-[#69adb6]/10 text-[#2d7d86]";
}

function escapeCsvValue(value: string | number | null | undefined) {
  const text = String(value ?? "");

  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function buildTimeline(order: OrderRow) {
  const events = [
    {
      label: "Pedido recibido",
      date: order.created_at,
    },
  ];

  if (order.status === "scheduled" && order.estimated_at) {
    events.push({
      label: "Pedido agendado",
      date: order.estimated_at,
    });
  }

  if (order.status === "accepted" || order.status === "preparing") {
    events.push({
      label: "Pedido aceptado por el local",
      date: order.created_at,
    });
  }

  if (order.status === "ready_for_pickup") {
    events.push({
      label: "Listo para retiro",
      date: order.estimated_at || order.created_at,
    });
  }

  if (order.status === "delivering") {
    events.push({
      label: "Va en camino",
      date: order.estimated_at || order.created_at,
    });
  }

  if (order.status === "delivered") {
    events.push({
      label: "Pedido entregado",
      date: order.estimated_at || order.created_at,
    });
  }

  if (order.status === "rejected") {
    events.push({
      label: "Pedido rechazado",
      date: order.created_at,
    });
  }

  return events;
}

export default function AdminCustomersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<OrdersTab>("active");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>("30d");
  const [deliveryFilter, setDeliveryFilter] =
    useState<DeliveryFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");

  const loadOrders = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/admin/login");
        return;
      }

      const res = await fetch("/api/admin/customers", { cache: "no-store" });
      const data = (await res.json()) as CustomersResponse & {
        error?: string;
        detail?: string;
      };

      if (!res.ok || !data.ok) {
        console.error("Error customers:", data);
        setError(
          data.detail ||
            data.error ||
            "No se pudieron cargar las compras de clientes."
        );
        return;
      }

      setCustomers(data.customers || []);
      setOrders(data.orders || []);
      setError("");
    } catch (loadError: unknown) {
      console.error("Error customers:", loadError);
      setError("No se pudieron cargar las compras de clientes.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const customersStats = useMemo(() => {
    const ordersByCustomer = new Map<string, OrderRow[]>();

    for (const order of orders) {
      if (!order.customer_id) continue;
      if (!ordersByCustomer.has(order.customer_id)) {
        ordersByCustomer.set(order.customer_id, []);
      }
      ordersByCustomer.get(order.customer_id)!.push(order);
    }

    return customers.map((customer) => {
      const customerOrders = (ordersByCustomer.get(customer.id) || []).sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const pedidos = customerOrders.length;
      const totalGastado = customerOrders.reduce(
        (acc, order) => acc + Number(order.total || 0),
        0
      );
      const ticketPromedio = pedidos > 0 ? totalGastado / pedidos : 0;
      const ultimoPedido = customerOrders[0]?.created_at || null;
      const firstOrderAt = customerOrders[pedidos - 1]?.created_at || null;
      const entregados = customerOrders.filter(
        (order) => order.status === "delivered"
      ).length;
      const rechazados = customerOrders.filter(
        (order) => order.status === "rejected"
      ).length;
      const deliveryCount = customerOrders.filter(
        (order) => order.delivery_type === "Delivery"
      ).length;
      const pickupCount = customerOrders.filter(
        (order) => order.delivery_type !== "Delivery"
      ).length;

      return {
        id: customer.id,
        name: customer.name || "Sin nombre",
        email: customer.email || "-",
        phone: customer.phone || "-",
        pedidos,
        totalGastado,
        ticketPromedio,
        ultimoPedido,
        entregados,
        rechazados,
        deliveryCount,
        pickupCount,
        firstOrderAt,
        orders: customerOrders,
      };
    });
  }, [customers, orders]);

  const customersStatsMap = useMemo(
    () => new Map(customersStats.map((customer) => [customer.id, customer])),
    [customersStats]
  );

  const ordersWithCustomer = useMemo<OrderTableRow[]>(() => {
    const customersMap = new Map(customers.map((customer) => [customer.id, customer]));

    return orders.map((order) => {
      const customer = order.customer_id ? customersMap.get(order.customer_id) : null;
      const customerStats = order.customer_id
        ? customersStatsMap.get(order.customer_id) || null
        : null;

      return {
        ...order,
        customerName: customer?.name || "Cliente sin nombre",
        customerEmail: customer?.email || "-",
        customerPhone: customer?.phone || "-",
        customerStats,
      };
    });
  }, [customers, customersStatsMap, orders]);

  const filteredOrders = useMemo(() => {
    let list = [...ordersWithCustomer];
    const now = new Date();

    if (tab === "active") {
      list = list.filter((order) => ACTIVE_STATUSES.has(order.status || ""));
    }

    if (tab === "scheduled") {
      list = list.filter((order) => order.status === "scheduled");
    }

    if (tab === "history") {
      list = list.filter((order) => HISTORY_STATUSES.has(order.status || ""));

      if (deliveryFilter !== "all") {
        list = list.filter((order) => {
          const isDelivery = order.delivery_type === "Delivery";

          if (deliveryFilter === "delivery") return isDelivery;
          return !isDelivery;
        });
      }

      if (paymentFilter !== "all") {
        list = list.filter((order) => order.payment_method === paymentFilter);
      }

      if (dateFilter !== "all") {
        const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90;
        const start = new Date();
        start.setDate(now.getDate() - days);

        list = list.filter(
          (order) => new Date(order.created_at).getTime() >= start.getTime()
        );
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((order) => {
        const products = order.order_items?.map((item) => item.product_name).join(" ") || "";
        return (
          order.customerName.toLowerCase().includes(q) ||
          order.customerEmail.toLowerCase().includes(q) ||
          order.customerPhone.toLowerCase().includes(q) ||
          (order.tracking_code || "").toLowerCase().includes(q) ||
          products.toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [dateFilter, deliveryFilter, ordersWithCustomer, paymentFilter, search, tab]);

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedOrderId(null);
      return;
    }

    if (selectedOrderId === null) {
      return;
    }

    const exists = filteredOrders.some((order) => order.id === selectedOrderId);

    if (!exists) {
      setSelectedOrderId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedOrderId]);

  const selectedOrder =
    filteredOrders.find((order) => order.id === selectedOrderId) || null;

  const totalClientes = customersStats.length;
  const conPedidos = customersStats.filter((customer) => customer.pedidos > 0).length;
  const programados = orders.filter((order) => order.status === "scheduled").length;
  const promedioCliente = customersStats.length
    ? customersStats.reduce((acc, customer) => acc + customer.totalGastado, 0) /
      customersStats.length
    : 0;
  const deliveredOrders = filteredOrders.filter(
    (order) => order.status === "delivered"
  );
  const rejectedOrders = filteredOrders.filter(
    (order) => order.status === "rejected"
  );
  const deliveredSales = deliveredOrders.reduce(
    (acc, order) => acc + Number(order.total || 0),
    0
  );

  const selectedCustomerFavoriteProducts = useMemo(() => {
    if (!selectedOrder?.customerStats) return [];

    const counters = new Map<string, number>();

    selectedOrder.customerStats.orders.forEach((order) => {
      order.order_items?.forEach((item) => {
        counters.set(
          item.product_name,
          (counters.get(item.product_name) || 0) + Number(item.quantity || 0)
        );
      });
    });

    return [...counters.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [selectedOrder]);

  const tabClass = (value: OrdersTab) =>
    `border-b-2 px-1 pb-3 text-sm font-semibold transition ${
      tab === value
        ? "border-[#111111] text-[#111111]"
        : "border-transparent text-neutral-500 hover:text-[#111111]"
    }`;

  const handleExportCsv = () => {
    if (!filteredOrders.length) {
      return;
    }

    const headers = [
      "codigo",
      "cliente",
      "telefono",
      "email",
      "fecha",
      "hora",
      "estado",
      "tipo_entrega",
      "metodo_pago",
      "productos",
      "zona",
      "direccion",
      "total",
    ];

    const rows = filteredOrders.map((order) => [
      order.tracking_code || order.id.slice(0, 8),
      order.customerName,
      order.customerPhone,
      order.customerEmail,
      formatDate(order.created_at),
      formatTime(order.created_at),
      formatStatusLabel(order.status),
      formatDeliveryLabel(order.delivery_type),
      order.payment_method || "Sin pago",
      order.order_items?.length
        ? order.order_items
            .map((item) => `${item.product_name} x${item.quantity}`)
            .join(" | ")
        : "Sin detalle",
      order.zone === "Otra" ? order.other_zone || "-" : order.zone || "-",
      order.address || "-",
      Number(order.total || 0),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toLocaleDateString("sv-SE");

    link.href = url;
    link.download = `gestion-pedidos-${tab}-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <main className="rounded-3xl border border-[#c9dfc3] bg-white p-6 text-[#046703] shadow-sm">
        Cargando compras...
      </main>
    );
  }

  if (error) {
    return (
      <main className="rounded-3xl border border-[#f6070b]/20 bg-white p-6 shadow-sm">
        <p className="text-lg font-semibold text-[#f6070b]">
          No se pudieron cargar las compras.
        </p>
        <p className="mt-2 text-sm text-neutral-600">{error}</p>
      </main>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-[#69adb6]">
                Operación de pedidos
              </p>
              <h1 className="mt-2 text-3xl font-bold text-[#046703]">
                Gestión de pedidos
              </h1>
              <p className="mt-1 text-sm text-neutral-600">
                Revisa compras activas, programadas e historial. Al abrir una
                fila verás el detalle completo del cliente y su pedido.
              </p>
            </div>

            <div className="w-full xl:max-w-sm">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por cliente, teléfono, código o producto..."
                className="w-full rounded-2xl border border-[#c9dfc3] bg-[#f8fbf7] px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl bg-[#69adb6] p-6 text-white shadow-sm">
            <p className="text-sm text-white/80">Clientes registrados</p>
            <p className="mt-2 text-3xl font-bold">{totalClientes}</p>
          </div>

          <div className="rounded-3xl bg-[#046703] p-6 text-white shadow-sm">
            <p className="text-sm text-white/80">Clientes con compras</p>
            <p className="mt-2 text-3xl font-bold">{conPedidos}</p>
          </div>

          <div className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
            <p className="text-sm text-neutral-500">Pedidos programados</p>
            <p className="mt-2 text-3xl font-bold text-[#f48e07]">
              {programados}
            </p>
          </div>

          <div className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
            <p className="text-sm text-neutral-500">Promedio por cliente</p>
            <p className="mt-2 text-3xl font-bold text-[#f6070b]">
              ${Math.round(promedioCliente).toLocaleString("es-CL")}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-6 border-b border-[#c9dfc3]">
            <button onClick={() => setTab("active")} className={tabClass("active")}>
              Activo
            </button>
            <button
              onClick={() => setTab("scheduled")}
              className={tabClass("scheduled")}
            >
              Programado
            </button>
            <button onClick={() => setTab("history")} className={tabClass("history")}>
              Historial
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-neutral-500">
              {tab === "active" &&
                "Pedidos en curso o listos para seguir gestionando."}
              {tab === "scheduled" &&
                "Pedidos agendados para más tarde o para el próximo turno."}
              {tab === "history" &&
                "Pedidos cerrados: entregados, rechazados o cancelados."}
            </p>
            <div className="flex items-center gap-3 self-start md:self-auto">
              <p className="text-sm text-neutral-500">
                {filteredOrders.length} resultados
              </p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  loadOrders();
                }}
                className="rounded-full border border-[#69adb6] bg-white px-4 py-2 text-sm font-semibold text-[#69adb6] transition hover:bg-[#69adb6]/10"
              >
                Actualizar
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={!filteredOrders.length}
                className="rounded-full border border-[#c9dfc3] bg-white px-4 py-2 text-sm font-semibold text-[#046703] transition hover:bg-[#f8fbf7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Exportar CSV
              </button>
            </div>
          </div>

          {tab === "history" && (
            <>
              <div className="mt-5 grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr]">
                <select
                  value={dateFilter}
                  onChange={(event) =>
                    setDateFilter(event.target.value as DateFilter)
                  }
                  className="rounded-2xl border border-[#c9dfc3] bg-[#f8fbf7] px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                >
                  <option value="7d">Últimos 7 días</option>
                  <option value="30d">Últimos 30 días</option>
                  <option value="90d">Últimos 90 días</option>
                  <option value="all">Todo el historial</option>
                </select>

                <select
                  value={deliveryFilter}
                  onChange={(event) =>
                    setDeliveryFilter(event.target.value as DeliveryFilter)
                  }
                  className="rounded-2xl border border-[#c9dfc3] bg-[#f8fbf7] px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                >
                  <option value="all">Todas las modalidades</option>
                  <option value="delivery">Solo delivery</option>
                  <option value="pickup">Solo retiro</option>
                </select>

                <select
                  value={paymentFilter}
                  onChange={(event) =>
                    setPaymentFilter(event.target.value as PaymentFilter)
                  }
                  className="rounded-2xl border border-[#c9dfc3] bg-[#f8fbf7] px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                >
                  <option value="all">Todos los pagos</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Débito">Débito</option>
                  <option value="Crédito">Crédito</option>
                </select>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl bg-[#046703] p-5 text-white shadow-sm">
                  <p className="text-sm text-white/80">Entregados</p>
                  <p className="mt-2 text-3xl font-bold">
                    {deliveredOrders.length}
                  </p>
                </div>

                <div className="rounded-3xl border border-[#c9dfc3] bg-white p-5 shadow-sm">
                  <p className="text-sm text-neutral-500">Rechazados</p>
                  <p className="mt-2 text-3xl font-bold text-[#f6070b]">
                    {rejectedOrders.length}
                  </p>
                </div>

                <div className="rounded-3xl border border-[#c9dfc3] bg-white p-5 shadow-sm">
                  <p className="text-sm text-neutral-500">Ventas entregadas</p>
                  <p className="mt-2 text-3xl font-bold text-[#f48e07]">
                    ${deliveredSales.toLocaleString("es-CL")}
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="mt-6 overflow-hidden rounded-3xl border border-[#c9dfc3]">
            <div className="hidden grid-cols-[1fr_1.25fr_0.75fr_0.7fr_0.8fr_1.3fr_0.8fr] gap-4 bg-[#f8fbf7] px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 lg:grid">
              <span>Código</span>
              <span>Cliente</span>
              <span>Fecha</span>
              <span>Hora</span>
              <span>Estado</span>
              <span>Productos</span>
              <span className="text-right">Total</span>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-neutral-500">
                No hay pedidos para este filtro.
              </div>
            ) : (
              <div className="divide-y divide-[#c9dfc3]">
                {filteredOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`grid w-full gap-4 px-5 py-4 text-left transition hover:bg-[#f8fbf7] lg:grid-cols-[1fr_1.25fr_0.75fr_0.7fr_0.8fr_1.3fr_0.8fr] ${
                      selectedOrder?.id === order.id ? "bg-[#f8fbf7]" : "bg-white"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold text-[#046703]">
                        {order.tracking_code || order.id.slice(0, 8)}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {formatDeliveryLabel(order.delivery_type)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-[#111111]">
                        {order.customerName}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {order.customerPhone}
                      </p>
                    </div>

                    <div className="text-sm text-neutral-700">
                      {formatDate(order.created_at)}
                    </div>

                    <div className="text-sm text-neutral-700">
                      {formatTime(order.created_at)}
                    </div>

                    <div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          order.status
                        )}`}
                      >
                        {formatStatusLabel(order.status)}
                      </span>
                    </div>

                    <div className="text-sm text-neutral-700">
                      <p className="line-clamp-2">
                        {order.order_items?.length
                          ? order.order_items
                              .map((item) => `${item.product_name} x${item.quantity}`)
                              .join(", ")
                          : "Sin detalle"}
                      </p>
                    </div>

                    <div className="text-right text-sm font-bold text-[#f6070b]">
                      ${Number(order.total || 0).toLocaleString("es-CL")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/35">
          <button
            aria-label="Cerrar detalle"
            className="h-full flex-1 cursor-default"
            onClick={() => setSelectedOrderId(null)}
          />

          <aside className="relative h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#c9dfc3] bg-white px-6 py-5">
              <div>
                <p className="text-sm text-neutral-500">
                  {selectedOrder.customerName}
                </p>
                <h2 className="mt-2 text-4xl font-bold text-[#111111]">
                  Pedido {selectedOrder.tracking_code || selectedOrder.id.slice(0, 8)}
                </h2>
                <p className="mt-1 text-lg text-neutral-600">
                  {formatDate(selectedOrder.created_at)}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrderId(null)}
                className="rounded-full border border-[#c9dfc3] px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-[#f8fbf7]"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-6 px-6 py-6">
              <section className="rounded-3xl border border-[#c9dfc3] bg-[#f8fbf7] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-neutral-500">Cliente</p>
                    <p className="mt-1 text-2xl font-bold text-[#111111]">
                      {selectedOrder.customerName}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {selectedOrder.customerEmail}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {selectedOrder.customerPhone}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                        selectedOrder.status
                      )}`}
                    >
                      {formatStatusLabel(selectedOrder.status)}
                    </span>
                    <span className="rounded-full border border-[#c9dfc3] bg-white px-3 py-1 text-xs font-semibold text-[#046703]">
                      {formatDeliveryLabel(selectedOrder.delivery_type)}
                    </span>
                    <span className="rounded-full border border-[#c9dfc3] bg-white px-3 py-1 text-xs font-semibold text-[#69adb6]">
                      {selectedOrder.payment_method || "Sin pago"}
                    </span>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-[#c9dfc3] bg-white p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-xl font-bold text-[#111111]">
                    Detalles del pedido
                  </h3>
                  <p className="text-lg font-bold text-[#f6070b]">
                    ${Number(selectedOrder.total || 0).toLocaleString("es-CL")}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#c9dfc3] bg-[#f8fbf7] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      Código
                    </p>
                    <p className="mt-2 font-semibold text-[#046703]">
                      {selectedOrder.tracking_code || "Sin código"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#c9dfc3] bg-[#f8fbf7] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      Hora del pedido
                    </p>
                    <p className="mt-2 font-semibold text-[#046703]">
                      {formatTime(selectedOrder.created_at)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#c9dfc3] bg-[#f8fbf7] p-4 sm:col-span-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      Dirección o zona
                    </p>
                    <p className="mt-2 font-semibold text-[#046703]">
                      {selectedOrder.zone === "Otra"
                        ? selectedOrder.other_zone || selectedOrder.address || "-"
                        : selectedOrder.zone || selectedOrder.address || "-"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-[#c9dfc3] bg-white p-5">
                <h3 className="text-xl font-bold text-[#111111]">
                  Seguimiento del pedido
                </h3>

                <div className="mt-5 space-y-4">
                  {buildTimeline(selectedOrder).map((event, index) => (
                    <div key={`${event.label}-${index}`} className="flex gap-4">
                      <div className="flex w-5 flex-col items-center">
                        <span className="mt-1 h-3 w-3 rounded-full bg-[#111111]" />
                        {index !== buildTimeline(selectedOrder).length - 1 && (
                          <span className="mt-1 h-full w-px bg-[#111111]" />
                        )}
                      </div>

                      <div className="pb-2">
                        <p className="text-sm font-semibold text-[#111111]">
                          {formatTime(event.date)}
                        </p>
                        <p className="text-sm text-neutral-700">{event.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-[#c9dfc3] bg-white p-5">
                <h3 className="text-xl font-bold text-[#111111]">Productos</h3>

                <div className="mt-4 space-y-3">
                  {selectedOrder.order_items?.length ? (
                    selectedOrder.order_items.map((item, index) => (
                      <div
                        key={`${selectedOrder.id}-${item.product_name}-${index}`}
                        className="flex items-center justify-between rounded-2xl border border-[#c9dfc3] bg-[#f8fbf7] px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-neutral-700">
                            {item.quantity}
                          </span>
                          <p className="font-semibold text-[#111111]">
                            {item.product_name}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-neutral-500">
                      No hay detalle de productos en este pedido.
                    </p>
                  )}
                </div>
              </section>

              {selectedOrder.customerStats && (
                <section className="rounded-3xl border border-[#c9dfc3] bg-white p-5">
                  <h3 className="text-xl font-bold text-[#111111]">
                    Resumen del cliente
                  </h3>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#c9dfc3] bg-[#f8fbf7] p-4">
                      <p className="text-sm text-neutral-500">Compras totales</p>
                      <p className="mt-2 text-2xl font-bold text-[#046703]">
                        {selectedOrder.customerStats.pedidos}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#c9dfc3] bg-[#f8fbf7] p-4">
                      <p className="text-sm text-neutral-500">Gastado total</p>
                      <p className="mt-2 text-2xl font-bold text-[#f6070b]">
                        $
                        {selectedOrder.customerStats.totalGastado.toLocaleString(
                          "es-CL"
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#c9dfc3] bg-[#f8fbf7] p-4">
                      <p className="text-sm text-neutral-500">Ticket promedio</p>
                      <p className="mt-2 text-2xl font-bold text-[#69adb6]">
                        $
                        {Math.round(
                          selectedOrder.customerStats.ticketPromedio
                        ).toLocaleString("es-CL")}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#c9dfc3] bg-[#f8fbf7] p-4">
                      <p className="text-sm text-neutral-500">Última compra</p>
                      <p className="mt-2 text-2xl font-bold text-[#046703]">
                        {formatDate(selectedOrder.customerStats.ultimoPedido)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm font-semibold text-[#046703]">
                      Lo que más compra
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedCustomerFavoriteProducts.length ? (
                        selectedCustomerFavoriteProducts.map(([productName, quantity]) => (
                          <span
                            key={productName}
                            className="rounded-full border border-[#c9dfc3] bg-[#f8fbf7] px-3 py-2 text-sm text-neutral-700"
                          >
                            {productName} x{quantity}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-neutral-500">
                          Aún no hay suficientes compras para detectar favoritos.
                        </span>
                      )}
                    </div>
                  </div>
                </section>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
