"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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
  scheduled_for: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

type FilterType = "today" | "weekly" | "monthly" | "custom";
type ChartPaymentFilter = "all" | string;

type DashboardResponse = {
  ok: boolean;
  orders?: OrderRow[];
  orderItems?: OrderItemRow[];
};

type ChartPoint = {
  label: string;
  value: number;
  fullLabel: string;
};

const CLP_FORMATTER = new Intl.NumberFormat("es-CL");
const HEATMAP_DAY_LABELS = ["Lun.", "Mar.", "Mié.", "Jue.", "Vie.", "Sáb.", "Dom."];
const HEATMAP_START_HOUR = 13;
const HEATMAP_END_HOUR = 23;

const LIVE_STATUSES = new Set([
  "pending",
  "accepted",
  "preparing",
  "ready_for_pickup",
  "delivering",
]);


function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function formatCurrency(value: number) {
  return `$${CLP_FORMATTER.format(Math.round(value || 0))}`;
}

function barColor(index: number) {
  const colors = ["#046703", "#69adb6", "#f48e07", "#f6070b", "#8fb996"];
  return colors[index % colors.length];
}

function heatmapColor(value: number, maxValue: number) {
  if (value <= 0 || maxValue <= 0) {
    return "#f2f5ef";
  }

  const ratio = value / maxValue;

  if (ratio >= 0.85) return "#046703";
  if (ratio >= 0.65) return "#2f8f39";
  if (ratio >= 0.45) return "#69adb6";
  if (ratio >= 0.25) return "#cfe8ca";
  return "#e7f2e4";
}

function heatmapTextColor(value: number, maxValue: number) {
  if (value <= 0 || maxValue <= 0) return "#8b948b";
  return value / maxValue >= 0.65 ? "#ffffff" : "#234022";
}

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);

  const [filterType, setFilterType] = useState<FilterType>("weekly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [chartPaymentFilter, setChartPaymentFilter] =
    useState<ChartPaymentFilter>("all");
  const [topProductsPage, setTopProductsPage] = useState(1);

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
        setOrderItems(data.orderItems || []);
      } catch (loadError: unknown) {
        console.error("Error dashboard:", loadError);
        setError("No se pudo cargar el dashboard en este momento.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const now = useMemo(() => new Date(), []);
  const todayStart = useMemo(() => startOfDay(now), [now]);
  const todayEnd = useMemo(() => endOfDay(now), [now]);

  const filterRange = useMemo(() => {
    if (filterType === "today") {
      return { start: todayStart, end: todayEnd };
    }

    if (filterType === "weekly") {
      const start = startOfDay(now);
      start.setDate(start.getDate() - 6);
      return { start, end: todayEnd };
    }

    if (filterType === "monthly") {
      const start = startOfDay(now);
      start.setDate(start.getDate() - 29);
      return { start, end: todayEnd };
    }

    if (startDate && endDate) {
      return {
        start: startOfDay(new Date(`${startDate}T00:00:00`)),
        end: endOfDay(new Date(`${endDate}T00:00:00`)),
      };
    }

    return null;
  }, [endDate, filterType, now, startDate, todayEnd, todayStart]);

  const filteredOrders = useMemo(() => {
    if (!filterRange) return orders;

    return orders.filter((order) => {
      const createdAt = new Date(order.created_at);
      return createdAt >= filterRange.start && createdAt <= filterRange.end;
    });
  }, [filterRange, orders]);

  const filteredOrderIds = useMemo(() => {
    return new Set(filteredOrders.map((order) => order.id));
  }, [filteredOrders]);

  const filteredOrderItems = useMemo(() => {
    return orderItems.filter((item) => filteredOrderIds.has(item.order_id));
  }, [filteredOrderIds, orderItems]);

  const availablePaymentMethods = useMemo(() => {
    return Array.from(
      new Set(
        filteredOrders
          .map((order) => order.payment_method?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [filteredOrders]);

  const chartOrders = useMemo(() => {
    if (chartPaymentFilter === "all") return filteredOrders;

    return filteredOrders.filter(
      (order) => (order.payment_method || "Sin definir") === chartPaymentFilter
    );
  }, [chartPaymentFilter, filteredOrders]);

  const salesToday = useMemo(() => {
    return orders
      .filter((order) => {
        const createdAt = new Date(order.created_at);
        return createdAt >= todayStart && createdAt <= todayEnd;
      })
      .reduce((sum, order) => sum + Number(order.total || 0), 0);
  }, [orders, todayEnd, todayStart]);

  const ordersToday = useMemo(() => {
    return orders.filter((order) => {
      const createdAt = new Date(order.created_at);
      return createdAt >= todayStart && createdAt <= todayEnd;
    }).length;
  }, [orders, todayEnd, todayStart]);

  const liveOrders = useMemo(() => {
    return orders.filter((order) => LIVE_STATUSES.has(order.status || ""));
  }, [orders]);

  const scheduledOrders = useMemo(() => {
    return orders.filter((order) => order.status === "scheduled");
  }, [orders]);

  const totalSales = useMemo(() => {
    return filteredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  }, [filteredOrders]);

  const totalOrders = filteredOrders.length;

  const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

  const deliveryCount = useMemo(() => {
    return filteredOrders.filter((order) => order.delivery_type === "delivery")
      .length;
  }, [filteredOrders]);

  const pickupCount = useMemo(() => {
    return filteredOrders.filter((order) => order.delivery_type === "pickup")
      .length;
  }, [filteredOrders]);

  const chartData = useMemo<ChartPoint[]>(() => {
    if (!filterRange) return [];

    const map = new Map<string, ChartPoint>();
    const cursor = new Date(filterRange.start);

    while (cursor <= filterRange.end) {
      const key = cursor.toISOString().slice(0, 10);
      map.set(key, {
        label: cursor.toLocaleDateString("es-CL", {
          day: "numeric",
          month: "short",
        }),
        value: 0,
        fullLabel: cursor.toLocaleDateString("es-CL", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    chartOrders.forEach((order) => {
      const date = new Date(order.created_at);
      const key = date.toISOString().slice(0, 10);
      const current = map.get(key);
      if (!current) return;
      current.value += Number(order.total || 0);
    });

    return Array.from(map.values());
  }, [chartOrders, filterRange]);

  const maxChartValue = useMemo(() => {
    return Math.max(...chartData.map((point) => point.value), 1);
  }, [chartData]);

  const topProducts = useMemo(() => {
    const grouped = new Map<
      string,
      { name: string; quantity: number; total: number }
    >();

    filteredOrderItems.forEach((item) => {
      const current = grouped.get(item.product_name) || {
        name: item.product_name,
        quantity: 0,
        total: 0,
      };

      current.quantity += Number(item.quantity || 0);
      current.total += Number(item.line_total || 0);
      grouped.set(item.product_name, current);
    });

    return Array.from(grouped.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredOrderItems]);

  const paymentSummary = useMemo(() => {
    const grouped = new Map<string, number>();

    filteredOrders.forEach((order) => {
      const key = order.payment_method || "Sin definir";
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });

    return Array.from(grouped.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [filteredOrders]);

  const chartFilteredSales = useMemo(() => {
    return chartOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  }, [chartOrders]);

  const chartFilteredOrdersCount = chartOrders.length;
  const topProductsTotalPages = Math.max(1, Math.ceil(topProducts.length / 3));
  const visibleTopProducts = useMemo(() => {
    const start = (topProductsPage - 1) * 3;
    return topProducts.slice(start, start + 3);
  }, [topProducts, topProductsPage]);

  const hourlyHeatmap = useMemo(() => {
    const cells = new Map<string, number>();

    chartOrders.forEach((order) => {
      const createdAt = new Date(order.created_at);
      const rawDay = createdAt.getDay();
      const dayIndex = rawDay === 0 ? 6 : rawDay - 1;
      const hour = createdAt.getHours();
      const key = `${dayIndex}-${hour}`;

      cells.set(key, (cells.get(key) || 0) + Number(order.total || 0));
    });

    return Array.from(
      { length: HEATMAP_END_HOUR - HEATMAP_START_HOUR + 1 },
      (_, index) => HEATMAP_START_HOUR + index
    ).map((hour) =>
      HEATMAP_DAY_LABELS.map((_, dayIndex) => ({
        dayIndex,
        hour,
        value: cells.get(`${dayIndex}-${hour}`) || 0,
      }))
    );
  }, [chartOrders]);

  const heatmapMaxValue = useMemo(() => {
    return Math.max(
      1,
      ...hourlyHeatmap.flatMap((row) => row.map((cell) => cell.value))
    );
  }, [hourlyHeatmap]);

  const heatmapLegendValues = useMemo(() => {
    return [
      0,
      Math.round(heatmapMaxValue * 0.25),
      Math.round(heatmapMaxValue * 0.5),
      Math.round(heatmapMaxValue * 0.75),
      heatmapMaxValue,
    ];
  }, [heatmapMaxValue]);

  const filterButtonClass = (type: FilterType) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition ${
      filterType === type
        ? "bg-[#046703] text-white shadow-sm"
        : "bg-white text-[#046703] hover:bg-[#eef8ec]"
    }`;

  useEffect(() => {
    setTopProductsPage(1);
  }, [filterType, startDate, endDate, chartPaymentFilter, topProducts.length]);

  useEffect(() => {
    if (topProductsPage > topProductsTotalPages) {
      setTopProductsPage(topProductsTotalPages);
    }
  }, [topProductsPage, topProductsTotalPages]);

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

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#dcebd7] bg-gradient-to-br from-white via-[#f7fbf6] to-[#edf8fa] p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.35em] text-[#69adb6]">
              Tablero
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#111111]">
              Dashboard
            </h1>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Un resumen rápido del negocio: ventas, pedidos en curso,
              programados y comportamiento diario para que veamos todo lo más
              importante en una sola pantalla.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-[#dcebd7] bg-white/90 p-3 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilterType("today")}
                className={filterButtonClass("today")}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setFilterType("weekly")}
                className={filterButtonClass("weekly")}
              >
                7 días
              </button>
              <button
                type="button"
                onClick={() => setFilterType("monthly")}
                className={filterButtonClass("monthly")}
              >
                30 días
              </button>
              <button
                type="button"
                onClick={() => setFilterType("custom")}
                className={filterButtonClass("custom")}
              >
                Personalizado
              </button>
            </div>

            {filterType === "custom" && (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3 text-sm text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[2rem] bg-[#046703] p-6 text-white shadow-sm">
          <p className="text-sm text-white/75">Ventas hoy</p>
          <p className="mt-3 text-4xl font-bold">{formatCurrency(salesToday)}</p>
          <p className="mt-2 text-sm text-white/75">
            {ordersToday} pedidos registrados hoy
          </p>
        </article>

        <article className="rounded-[2rem] border border-[#dcebd7] bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-500">Ventas del período</p>
          <p className="mt-3 text-4xl font-bold text-[#111111]">
            {formatCurrency(totalSales)}
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Ticket promedio {formatCurrency(averageTicket)}
          </p>
        </article>

        <article className="rounded-[2rem] border border-[#dcebd7] bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-500">Pedidos activos</p>
          <p className="mt-3 text-4xl font-bold text-[#046703]">
            {liveOrders.length}
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            En curso ahora mismo
          </p>
        </article>

        <article className="rounded-[2rem] border border-[#dcebd7] bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-500">Programados</p>
          <p className="mt-3 text-4xl font-bold text-[#f48e07]">
            {scheduledOrders.length}
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Pendientes para más tarde
          </p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <article className="rounded-[2rem] border border-[#dcebd7] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[#69adb6]">
                Ventas
              </p>
              <h2 className="mt-2 text-3xl font-bold text-[#111111]">
                Rendimiento diario
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                Visualiza cómo se va moviendo la venta dentro del período
                elegido.
              </p>
            </div>

            <div className="grid gap-3 lg:min-w-[420px] sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr]">
              <div className="rounded-2xl bg-[#f7fbf6] p-4">
                <label
                  htmlFor="chart-payment-filter"
                  className="text-xs uppercase tracking-[0.25em] text-neutral-400"
                >
                  Medio de pago
                </label>
                <select
                  id="chart-payment-filter"
                  value={chartPaymentFilter}
                  onChange={(event) => setChartPaymentFilter(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#dcebd7] bg-white px-3 py-2 text-sm font-semibold text-[#111111] outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                >
                  <option value="all">Todos</option>
                  <option value="Sin definir">Sin definir</option>
                  {availablePaymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl bg-[#f7fbf6] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-neutral-400">
                  Pedidos
                </p>
                <p className="mt-2 text-2xl font-bold text-[#111111]">
                  {chartFilteredOrdersCount}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {chartPaymentFilter === "all" ? "Todos" : chartPaymentFilter}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f7fbf6] p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-neutral-400">
                  Ventas
                </p>
                <p className="mt-2 text-2xl font-bold text-[#111111]">
                  {formatCurrency(chartFilteredSales)}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Solo del filtro seleccionado
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex h-[300px] items-end gap-3 overflow-x-auto rounded-[1.75rem] bg-[#fbf7ef] px-4 pb-6 pt-8">
              {chartData.map((point, index) => (
                <div
                  key={`${point.fullLabel}-${index}`}
                  className="flex min-w-[70px] flex-1 flex-col items-center justify-end gap-3"
                >
                  <span className="text-xs font-semibold text-neutral-500">
                    {point.value > 0 ? formatCurrency(point.value) : "$0"}
                  </span>
                  <div className="flex h-[190px] items-end">
                    <div
                      className="w-12 rounded-t-[1rem] transition-all"
                      style={{
                        height: `${Math.max(
                          (point.value / maxChartValue) * 180,
                          point.value > 0 ? 14 : 4
                        )}px`,
                        backgroundColor: barColor(index),
                      }}
                      title={`${point.fullLabel}: ${formatCurrency(point.value)}`}
                    />
                  </div>
                  <span className="text-center text-xs font-medium text-neutral-500">
                    {point.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-[1.75rem] border border-[#dcebd7] bg-[#fcfdfb] p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-[#69adb6]">
                  Ventas por hora
                </p>
                <h3 className="mt-2 text-2xl font-bold text-[#111111]">
                  Mapa semanal de actividad
                </h3>
                <p className="mt-2 text-sm text-neutral-500">
                  Mira rápido qué días y horarios concentran más ventas dentro
                  del filtro elegido.
                </p>
              </div>
              <div className="rounded-full border border-[#dcebd7] bg-white px-4 py-2 text-xs font-semibold text-neutral-500">
                {chartPaymentFilter === "all"
                  ? "Todos los medios de pago"
                  : `Filtro: ${chartPaymentFilter}`}
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <div className="min-w-[760px]">
                <div
                  className="grid gap-2"
                  style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}
                >
                  <div />
                  {HEATMAP_DAY_LABELS.map((day) => (
                    <div
                      key={day}
                      className="pb-2 text-center text-sm font-semibold text-neutral-500"
                    >
                      {day}
                    </div>
                  ))}

                  {hourlyHeatmap.map((row, rowIndex) => (
                    <Fragment key={`heatmap-row-${rowIndex}`}>
                      <div className="flex h-8 items-center text-sm font-medium text-neutral-500">
                        {String(row[0].hour).padStart(2, "0")}
                      </div>
                      {row.map((cell) => {
                        const cellColor = heatmapColor(
                          cell.value,
                          heatmapMaxValue
                        );
                        const textColor = heatmapTextColor(
                          cell.value,
                          heatmapMaxValue
                        );

                        return (
                          <div
                            key={`heatmap-${cell.dayIndex}-${cell.hour}`}
                            className="flex h-8 items-center justify-center rounded-lg border border-white/70 text-[11px] font-semibold transition-transform hover:scale-[1.02]"
                            style={{
                              backgroundColor: cellColor,
                              color: textColor,
                            }}
                            title={`${HEATMAP_DAY_LABELS[cell.dayIndex]} ${String(
                              cell.hour
                            ).padStart(2, "0")}:00 - ${formatCurrency(cell.value)}`}
                          >
                            {cell.value > 0 ? formatCurrency(cell.value) : "—"}
                          </div>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
              <span className="font-semibold text-neutral-600">Intensidad</span>
              {heatmapLegendValues.map((value, index) => (
                <div key={`legend-${index}`} className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-8 rounded-full"
                    style={{
                      backgroundColor: heatmapColor(value, heatmapMaxValue),
                    }}
                  />
                  <span>{formatCurrency(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </article>

        <div className="space-y-6">
          <article className="rounded-[2rem] border border-[#dcebd7] bg-white p-6 shadow-sm">
            <p className="text-sm uppercase tracking-[0.3em] text-[#69adb6]">
              Mix de venta
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#111111]">
              Cómo se está vendiendo
            </h2>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#dcebd7] p-4">
                <p className="text-sm text-neutral-500">Delivery</p>
                <p className="mt-2 text-3xl font-bold text-[#046703]">
                  {deliveryCount}
                </p>
              </div>
              <div className="rounded-2xl border border-[#dcebd7] p-4">
                <p className="text-sm text-neutral-500">Retiro</p>
                <p className="mt-2 text-3xl font-bold text-[#69adb6]">
                  {pickupCount}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {paymentSummary.map((payment) => (
                <div
                  key={payment.name}
                  className="flex items-center justify-between rounded-2xl bg-[#f7fbf6] px-4 py-3"
                >
                  <span className="text-sm font-medium text-[#111111]">
                    {payment.name}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#046703]">
                    {payment.count}
                  </span>
                </div>
              ))}

              {paymentSummary.length === 0 && (
                <p className="text-sm text-neutral-500">
                  Aún no hay medios de pago registrados en este período.
                </p>
              )}
            </div>
          </article>
          <article className="rounded-[2rem] border border-[#dcebd7] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-[#69adb6]">
                  Menú
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#111111]">
                  Top productos
                </h2>
              </div>
              <span className="rounded-full bg-[#fff4e5] px-3 py-1 text-sm font-semibold text-[#b86100]">
                {topProducts.length}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {visibleTopProducts.map((product, index) => (
                <div
                  key={`${product.name}-${topProductsPage}-${index}`}
                  className="rounded-2xl border border-[#dcebd7] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-semibold text-[#111111]">
                        {product.name}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {product.quantity} vendidos
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-[#eef8ec] px-3 py-1 text-xs font-semibold text-[#046703]">
                      #{(topProductsPage - 1) * 3 + index + 1}
                    </span>
                  </div>

                  <div className="mt-3 h-2 rounded-full bg-[#f1f5ef]">
                    <div
                      className="h-2 rounded-full bg-[#046703]"
                      style={{
                        width: `${
                          topProducts[0]?.quantity
                            ? (product.quantity / topProducts[0].quantity) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-sm font-semibold text-[#f6070b]">
                    {formatCurrency(product.total)}
                  </p>
                </div>
              ))}

              {topProducts.length === 0 && (
                <p className="text-sm text-neutral-500">
                  Todavía no hay productos vendidos en este período.
                </p>
              )}

              {topProducts.length > 3 && (
                <div className="flex flex-col gap-3 border-t border-[#eef1ea] pt-4">
                  <p className="text-sm text-neutral-500">
                    Página {topProductsPage} de {topProductsTotalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setTopProductsPage((current) => Math.max(1, current - 1))
                      }
                      disabled={topProductsPage === 1}
                      className="rounded-full border border-[#dcebd7] px-4 py-2 text-sm font-semibold text-[#046703] transition hover:bg-[#eef8ec] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTopProductsPage((current) =>
                          Math.min(topProductsTotalPages, current + 1)
                        )
                      }
                      disabled={topProductsPage === topProductsTotalPages}
                      className="rounded-full border border-[#dcebd7] px-4 py-2 text-sm font-semibold text-[#046703] transition hover:bg-[#eef8ec] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Página siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
