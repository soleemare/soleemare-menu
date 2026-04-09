"use client";

import { useEffect, useMemo, useState } from "react";
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
  created_at: string;
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

type SegmentFilter =
  | "all"
  | "top"
  | "recurrentes"
  | "ocasionales"
  | "sin_pedidos";

type CustomersResponse = {
  ok: boolean;
  customers?: CustomerRow[];
  orders?: OrderRow[];
};

export default function AdminCustomersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<SegmentFilter>("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/admin/login");
        return;
      }

      const res = await fetch("/api/admin/customers", { cache: "no-store" });
      const data = (await res.json()) as CustomersResponse;

      if (!res.ok || !data.ok) {
        console.error("Error customers:", data);
        setLoading(false);
        return;
      }

      setCustomers(data.customers || []);
      setOrders(data.orders || []);
      setLoading(false);
    };

    load();
  }, [router]);

  const customersStats = useMemo(() => {
    const ordersByCustomer = new Map<string, OrderRow[]>();

    for (const order of orders) {
      if (!order.customer_id) continue;
      if (!ordersByCustomer.has(order.customer_id)) {
        ordersByCustomer.set(order.customer_id, []);
      }
      ordersByCustomer.get(order.customer_id)!.push(order);
    }

    const result: CustomerStats[] = customers.map((customer) => {
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
        (o) => o.status === "delivered"
      ).length;
      const rechazados = customerOrders.filter(
        (o) => o.status === "rejected"
      ).length;
      const deliveryCount = customerOrders.filter(
        (o) => o.delivery_type === "Delivery"
      ).length;
      const pickupCount = customerOrders.filter(
        (o) => o.delivery_type !== "Delivery"
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

    return result.sort((a, b) => b.totalGastado - a.totalGastado);
  }, [customers, orders]);

  const filteredCustomers = useMemo(() => {
    let list = [...customersStats];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (customer) =>
          customer.name.toLowerCase().includes(q) ||
          customer.email.toLowerCase().includes(q) ||
          customer.phone.toLowerCase().includes(q)
      );
    }

    if (segment === "top") {
      list = list.filter((c) => c.totalGastado > 0).slice(0, 10);
    }

    if (segment === "recurrentes") {
      list = list.filter((c) => c.pedidos >= 3);
    }

    if (segment === "ocasionales") {
      list = list.filter((c) => c.pedidos > 0 && c.pedidos < 3);
    }

    if (segment === "sin_pedidos") {
      list = list.filter((c) => c.pedidos === 0);
    }

    return list;
  }, [customersStats, search, segment]);

  const selectedCustomer =
    filteredCustomers.find((c) => c.id === selectedCustomerId) ||
    filteredCustomers[0] ||
    null;

  const totalClientes = customersStats.length;
  const clientesConPedidos = customersStats.filter(
    (c) => c.pedidos > 0
  ).length;
  const clientesRecurrentes = customersStats.filter(
    (c) => c.pedidos >= 3
  ).length;
  const promedioCliente = customersStats.length
    ? customersStats.reduce((acc, c) => acc + c.totalGastado, 0) /
      customersStats.length
    : 0;

  const segmentButtonClass = (value: SegmentFilter) =>
    `rounded-2xl px-4 py-2 text-sm font-medium transition ${
      segment === value
        ? "bg-[#f6070b] text-white shadow-sm"
        : "bg-[#c9dfc3] text-[#046703] hover:bg-[#69adb6] hover:text-white"
    }`;

  if (loading) {
    return (
      <main className="rounded-3xl border border-[#c9dfc3] bg-white p-6 text-[#046703] shadow-sm">
        Cargando clientes...
      </main>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#69adb6]">
              Relación con clientes
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#046703]">
              Clientes
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              Revisa ranking, historial, frecuencia de compra y valor por
              cliente.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSegment("all")}
              className={segmentButtonClass("all")}
            >
              Todos
            </button>
            <button
              onClick={() => setSegment("top")}
              className={segmentButtonClass("top")}
            >
              Top 10
            </button>
            <button
              onClick={() => setSegment("recurrentes")}
              className={segmentButtonClass("recurrentes")}
            >
              Recurrentes
            </button>
            <button
              onClick={() => setSegment("ocasionales")}
              className={segmentButtonClass("ocasionales")}
            >
              Ocasionales
            </button>
            <button
              onClick={() => setSegment("sin_pedidos")}
              className={segmentButtonClass("sin_pedidos")}
            >
              Sin pedidos
            </button>
          </div>
        </div>

        <div className="mt-5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, correo o teléfono..."
            className="w-full rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/20 px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-[#69adb6] p-6 text-white shadow-sm">
          <p className="text-sm text-white/80">Clientes totales</p>
          <p className="mt-2 text-3xl font-bold">{totalClientes}</p>
        </div>

        <div className="rounded-3xl bg-[#046703] p-6 text-white shadow-sm">
          <p className="text-sm text-white/80">Con pedidos</p>
          <p className="mt-2 text-3xl font-bold">{clientesConPedidos}</p>
        </div>

        <div className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-500">Recurrentes</p>
          <p className="mt-2 text-3xl font-bold text-[#046703]">
            {clientesRecurrentes}
          </p>
        </div>

        <div className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-500">Promedio por cliente</p>
          <p className="mt-2 text-3xl font-bold text-[#f48e07]">
            ${Math.round(promedioCliente).toLocaleString("es-CL")}
          </p>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="self-start rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#046703]">
              Ranking de clientes
            </h2>
            <span className="text-sm text-neutral-500">
              {filteredCustomers.length} resultados
            </span>
          </div>

          <div className="space-y-3">
            {filteredCustomers.slice(0, 5).map((customer, index) => {
              const isSelected = customer.id === selectedCustomerId;

              return (
                <button
                  key={customer.id}
                  onClick={() => setSelectedCustomerId(customer.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-[#69adb6] bg-[#c9dfc3]/30 shadow-sm"
                      : "border-[#c9dfc3] bg-[#c9dfc3]/15 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-[#c9dfc3] bg-white px-3 py-1 text-xs font-semibold text-[#69adb6]">
                          #{index + 1}
                        </span>
                        <p className="truncate font-semibold text-[#046703]">
                          {customer.name}
                        </p>
                      </div>

                      <p className="mt-2 truncate text-xs text-neutral-500">
                        {customer.email}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {customer.phone}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-neutral-500">Total gastado</p>
                      <p className="mt-1 text-lg font-bold text-[#f6070b]">
                        ${customer.totalGastado.toLocaleString("es-CL")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-xl border border-[#c9dfc3] bg-white p-3">
                      <p className="text-neutral-500">Pedidos</p>
                      <p className="mt-1 font-bold text-[#046703]">
                        {customer.pedidos}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#c9dfc3] bg-white p-3">
                      <p className="text-neutral-500">Ticket</p>
                      <p className="mt-1 font-bold text-[#69adb6]">
                        $
                        {Math.round(customer.ticketPromedio).toLocaleString(
                          "es-CL"
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#c9dfc3] bg-white p-3">
                      <p className="text-neutral-500">Último</p>
                      <p className="mt-1 font-bold text-xs text-[#046703]">
                        {customer.ultimoPedido
                          ? new Date(customer.ultimoPedido).toLocaleDateString(
                              "es-CL"
                            )
                          : "-"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredCustomers.length > 5 && (
              <div className="rounded-2xl border border-dashed border-[#c9dfc3] bg-[#c9dfc3]/15 p-4 text-center">
                <p className="text-sm text-neutral-500">
                  Mostrando 5 de {filteredCustomers.length} clientes.
                </p>
              </div>
            )}

            {filteredCustomers.length === 0 && (
              <p className="text-sm text-neutral-500">
                No se encontraron clientes para este filtro.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#046703]">
                Detalle del cliente
              </h2>
              {selectedCustomer && (
                <span className="rounded-full border border-[#c9dfc3] bg-[#c9dfc3]/15 px-3 py-1 text-xs text-[#046703]">
                  {selectedCustomer.pedidos} pedidos
                </span>
              )}
            </div>

            {!selectedCustomer ? (
              <p className="text-sm text-neutral-500">
                Selecciona un cliente para ver el detalle.
              </p>
            ) : (
              <>
                <div className="rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/15 p-4">
                  <p className="font-semibold text-[#046703]">
                    {selectedCustomer.name}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {selectedCustomer.email}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {selectedCustomer.phone}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-[#c9dfc3] bg-[#c9dfc3]/15 p-4">
                    <p className="text-neutral-500">Total gastado</p>
                    <p className="mt-1 text-xl font-bold text-[#f6070b]">
                      ${selectedCustomer.totalGastado.toLocaleString("es-CL")}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#c9dfc3] bg-[#c9dfc3]/15 p-4">
                    <p className="text-neutral-500">Ticket promedio</p>
                    <p className="mt-1 text-xl font-bold text-[#69adb6]">
                      $
                      {Math.round(
                        selectedCustomer.ticketPromedio
                      ).toLocaleString("es-CL")}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#c9dfc3] bg-[#c9dfc3]/15 p-4">
                    <p className="text-neutral-500">Delivery</p>
                    <p className="mt-1 text-xl font-bold text-[#046703]">
                      {selectedCustomer.deliveryCount}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#c9dfc3] bg-[#c9dfc3]/15 p-4">
                    <p className="text-neutral-500">Retiro</p>
                    <p className="mt-1 text-xl font-bold text-[#046703]">
                      {selectedCustomer.pickupCount}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#c9dfc3] bg-[#c9dfc3]/15 p-4">
                    <p className="text-neutral-500">Entregados</p>
                    <p className="mt-1 text-xl font-bold text-[#046703]">
                      {selectedCustomer.entregados}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#c9dfc3] bg-[#c9dfc3]/15 p-4">
                    <p className="text-neutral-500">Rechazados</p>
                    <p className="mt-1 text-xl font-bold text-[#f6070b]">
                      {selectedCustomer.rechazados}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/15 p-4">
                  <p className="text-sm text-neutral-500">Primer pedido</p>
                  <p className="mt-1 font-medium text-[#046703]">
                    {selectedCustomer.firstOrderAt
                      ? new Date(
                          selectedCustomer.firstOrderAt
                        ).toLocaleString("es-CL")
                      : "-"}
                  </p>

                  <p className="mt-3 text-sm text-neutral-500">Último pedido</p>
                  <p className="mt-1 font-medium text-[#046703]">
                    {selectedCustomer.ultimoPedido
                      ? new Date(
                          selectedCustomer.ultimoPedido
                        ).toLocaleString("es-CL")
                      : "-"}
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#046703]">
                Últimos pedidos
              </h2>
              {selectedCustomer && (
                <span className="text-sm text-neutral-500">
                  {selectedCustomer.orders.length} registros
                </span>
              )}
            </div>

            {!selectedCustomer || selectedCustomer.orders.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Este cliente aún no tiene pedidos.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedCustomer.orders.slice(0, 3).map((order) => (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/15 p-4 transition hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#046703]">
                          {new Date(order.created_at).toLocaleString("es-CL")}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full border border-[#c9dfc3] bg-white px-3 py-1 text-xs text-[#046703]">
                            {order.delivery_type || "-"}
                          </span>
                          <span className="rounded-full border border-[#c9dfc3] bg-white px-3 py-1 text-xs text-[#046703]">
                            {order.payment_method || "-"}
                          </span>
                          <span className="rounded-full border border-[#c9dfc3] bg-white px-3 py-1 text-xs text-[#046703]">
                            {order.status || "-"}
                          </span>
                        </div>
                      </div>

                      <p className="shrink-0 text-lg font-bold text-[#f6070b]">
                        ${Number(order.total || 0).toLocaleString("es-CL")}
                      </p>
                    </div>
                  </div>
                ))}

                {selectedCustomer.orders.length > 3 && (
                  <div className="rounded-2xl border border-dashed border-[#c9dfc3] bg-[#c9dfc3]/15 p-4 text-center">
                    <p className="text-sm text-neutral-500">
                      Mostrando 3 de {selectedCustomer.orders.length} pedidos.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
