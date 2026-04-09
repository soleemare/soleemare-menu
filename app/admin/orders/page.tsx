"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

type Order = {
  id: string;
  total: number;
  status: string;
  tracking_code: string | null;
  created_at: string;
  accepted_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  delivering_at: string | null;
  delivered_at: string | null;
  rejected_at: string | null;
  estimated_minutes: number | null;
  estimated_at: string | null;
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

type ColumnKey =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "delivering";

type StatusUpdate = {
  status: string;
  accepted_at?: string | null;
  preparing_at?: string | null;
  ready_at?: string | null;
  delivering_at?: string | null;
  delivered_at?: string | null;
  rejected_at?: string | null;
  estimated_minutes?: number;
  estimated_at?: string | null;
};

type StatusUpdateResponse = {
  ok: boolean;
  notification?: {
    sent: boolean;
    reason?: string;
  };
  error?: string;
  detail?: string;
};

type OrdersResponse = {
  ok: boolean;
  orders?: Order[];
  error?: string;
  detail?: string;
};

export default function AdminOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [estimatedTimes, setEstimatedTimes] = useState<Record<string, number>>(
    {}
  );
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnKey | null>(null);

  const [ringingOrderIds, setRingingOrderIds] = useState<string[]>([]);

  const prevPendingIds = useRef<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);
  const initializedRef = useRef(false);

  const unlockAudio = async () => {
    if (!audioRef.current) return;

    try {
      audioRef.current.volume = 1;
      audioRef.current.muted = false;

      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      audioUnlockedRef.current = true;
      console.log("Audio desbloqueado");
      toast.success("Sonido activado");
    } catch (error) {
      console.warn("No se pudo desbloquear audio todavía:", error);
      toast.error("Tu navegador bloqueó el audio. Intenta tocar la página primero.");
    }
  };

  const startAlarm = async () => {
    if (!audioRef.current || !audioUnlockedRef.current) return;

    try {
      audioRef.current.loop = true;
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch (error) {
      console.warn("No se pudo iniciar la alarma:", error);
    }
  };

  const stopAlarm = () => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.loop = false;
  };

  const loadOrders = async () => {
    const res = await fetch("/api/admin/orders", { cache: "no-store" });
    const data = (await res.json()) as OrdersResponse;

    if (!res.ok || !data.ok) {
      console.error("Error cargando pedidos:", data);
      return;
    }

    const newOrders = data.orders || [];
    const currentPendingOrders = newOrders.filter(
      (order) => order.status === "pending"
    );
    const currentPendingIds = currentPendingOrders.map((order) => order.id);

    if (initializedRef.current) {
      const newPendingOrders = currentPendingOrders.filter(
        (order) => !prevPendingIds.current.includes(order.id)
      );

      if (newPendingOrders.length > 0) {
        setRingingOrderIds((prev) => {
          const next = [...new Set([...prev, ...newPendingOrders.map((o) => o.id)])];
          return next;
        });

        toast.success(
          newPendingOrders.length === 1
            ? "Entró un nuevo pedido"
            : `Entraron ${newPendingOrders.length} nuevos pedidos`
        );
      }
    }

    prevPendingIds.current = currentPendingIds;
    initializedRef.current = true;
    setOrders(newOrders);

    setEstimatedTimes((prev) => {
      const next = { ...prev };
      newOrders.forEach((order) => {
        if (next[order.id] == null) {
          next[order.id] = order.estimated_minutes ?? 20;
        }
      });
      return next;
    });

    setRingingOrderIds((prev) =>
      prev.filter((id) => currentPendingIds.includes(id))
    );
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    audioRef.current = new Audio("/sounds/sonido_pedido.mp3");
    audioRef.current.preload = "auto";
    audioRef.current.volume = 1;
    audioRef.current.muted = false;
    audioRef.current.loop = true;

    const handleFirstInteraction = () => {
      unlockAudio();
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };

    window.addEventListener("click", handleFirstInteraction);
    window.addEventListener("touchstart", handleFirstInteraction);
    window.addEventListener("keydown", handleFirstInteraction);

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

      intervalId = setInterval(() => {
        loadOrders();
      }, 5000);
    };

    init();

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      stopAlarm();
    };
  }, [router]);

  useEffect(() => {
    if (ringingOrderIds.length > 0) {
      startAlarm();
    } else {
      stopAlarm();
    }
  }, [ringingOrderIds]);

  const acknowledgeOrderAlarm = (orderId: string) => {
    setRingingOrderIds((prev) => prev.filter((id) => id !== orderId));
  };

  const increaseEstimate = (orderId: string) => {
    setEstimatedTimes((prev) => ({
      ...prev,
      [orderId]: (prev[orderId] ?? 20) + 5,
    }));
  };

  const decreaseEstimate = (orderId: string) => {
    setEstimatedTimes((prev) => ({
      ...prev,
      [orderId]: Math.max(5, (prev[orderId] ?? 20) - 5),
    }));
  };

  const updateOrder = async (orderId: string, payload: StatusUpdate) => {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: payload.status,
        estimatedMinutes: payload.estimated_minutes,
      }),
    });

    const data = (await res.json()) as StatusUpdateResponse;

    if (!res.ok || !data.ok) {
      console.error("Error actualizando pedido:", data);
      toast.error(data.error || "No se pudo actualizar el pedido.");
      return { ok: false, notificationSent: false };
    }

    return {
      ok: true,
      notificationSent: Boolean(data.notification?.sent),
      notificationReason: data.notification?.reason,
    };
  };

  const acceptOrder = async (order: Order) => {
    const now = new Date();
    const minutes = estimatedTimes[order.id] ?? 20;
    const estimatedAt = new Date(now.getTime() + minutes * 60000).toISOString();

    const result = await updateOrder(order.id, {
        status: "accepted",
        accepted_at: now.toISOString(),
        estimated_minutes: minutes,
        estimated_at: estimatedAt,
      });

    if (!result.ok) {
      return;
    }

    acknowledgeOrderAlarm(order.id);
    await loadOrders();

    if (result.notificationSent) {
      toast.success("Pedido aceptado y cliente notificado");
      return;
    }

    toast.error(
      result.notificationReason
        ? `Pedido aceptado, pero no se pudo notificar: ${result.notificationReason}`
        : "Pedido aceptado, pero no se pudo notificar al cliente."
    );
  };

  const buildStatusPayload = (status: string): StatusUpdate => {
    const now = new Date().toISOString();

    const payload: StatusUpdate = { status };
    if (status === "preparing") payload.preparing_at = now;
    if (status === "ready") payload.ready_at = now;
    if (status === "delivering") payload.delivering_at = now;
    if (status === "delivered") payload.delivered_at = now;
    if (status === "rejected") payload.rejected_at = now;

    return payload;
  };

  const updateStatus = async (id: string, status: string) => {
    const order = orders.find((item) => item.id === id);
    const result = await updateOrder(id, buildStatusPayload(status));

    if (!result.ok) {
      return;
    }

    if (status === "rejected") {
      acknowledgeOrderAlarm(id);
    }

    await loadOrders();

    if (status === "rejected") {
      if (result.notificationSent) {
        toast.success("Pedido rechazado y cliente notificado");
        return;
      }

      toast.error(
        result.notificationReason
          ? `Pedido rechazado, pero no se pudo notificar: ${result.notificationReason}`
          : "Pedido rechazado, pero no se pudo notificar al cliente."
      );
    }

    if (status === "delivering" && order?.delivery_type === "Delivery") {
      if (result.notificationSent) {
        toast.success("Cliente notificado: pedido en reparto");
        return;
      }

      toast.error(
        result.notificationReason
          ? `Pedido en reparto, pero no se pudo notificar: ${result.notificationReason}`
          : "Pedido en reparto, pero no se pudo notificar al cliente."
      );
    }
  };

  const markReady = async (order: Order) => {
    const result = await updateOrder(order.id, buildStatusPayload("ready"));

    if (!result.ok) {
      return;
    }

    await loadOrders();

    if (order.delivery_type === "Retiro en local") {
      if (result.notificationSent) {
        toast.success("Cliente notificado: pedido listo para retiro");
        return;
      }

      toast.error(
        result.notificationReason
          ? `Pedido listo, pero no se pudo notificar: ${result.notificationReason}`
          : "Pedido listo, pero no se pudo notificar al cliente."
      );
    }
  };

  const confirmDeliveredAndNotify = async (order: Order) => {
    const result = await updateOrder(order.id, buildStatusPayload("delivered"));

    if (!result.ok) {
      return;
    }

    await loadOrders();

    if (order.delivery_type !== "Delivery") {
      toast.success("Pedido completado");
      return;
    }

    if (result.notificationSent) {
      toast.success("Entrega confirmada y cliente notificado");
      return;
    }

    toast.error(
      result.notificationReason
        ? `Entrega confirmada, pero no se pudo notificar: ${result.notificationReason}`
        : "Entrega confirmada, pero no se pudo notificar al cliente."
    );
  };

  const handleDropToColumn = async (targetColumn: ColumnKey) => {
    if (!draggedOrderId) return;

    const order = orders.find((o) => o.id === draggedOrderId);
    if (!order) return;

    setDraggedOrderId(null);
    setDragOverColumn(null);

    if (order.status === targetColumn) return;

    if (targetColumn === "accepted") {
      await acceptOrder(order);
      return;
    }

    if (targetColumn === "preparing") {
      await updateStatus(order.id, "preparing");
      return;
    }

    if (targetColumn === "ready") {
      await markReady(order);
      return;
    }

    if (targetColumn === "delivering") {
      if (order.delivery_type !== "Delivery") return;
      await updateStatus(order.id, "delivering");
      return;
    }

    if (targetColumn === "pending") {
      return;
    }
  };

  const groupedOrders = useMemo(() => {
    return {
      pending: orders.filter((o) => o.status === "pending"),
      accepted: orders.filter((o) => o.status === "accepted"),
      preparing: orders.filter((o) => o.status === "preparing"),
      ready: orders.filter((o) => o.status === "ready"),
      delivering: orders.filter((o) => o.status === "delivering"),
    };
  }, [orders]);

  const totalActiveOrders =
    groupedOrders.pending.length +
    groupedOrders.accepted.length +
    groupedOrders.preparing.length +
    groupedOrders.ready.length +
    groupedOrders.delivering.length;

  const columns = [
    {
      key: "pending" as const,
      title: "Pendientes",
      headerClass: "bg-[#f48e07]/15 text-[#f48e07] border-[#f48e07]/30",
      dotClass: "bg-[#f48e07]",
      emptyText: "No hay pedidos pendientes.",
      emptyEmoji: "🕒",
    },
    {
      key: "accepted" as const,
      title: "Aceptados",
      headerClass: "bg-[#69adb6]/15 text-[#69adb6] border-[#69adb6]/30",
      dotClass: "bg-[#69adb6]",
      emptyText: "No hay pedidos aceptados.",
      emptyEmoji: "✅",
    },
    {
      key: "preparing" as const,
      title: "En preparación",
      headerClass: "bg-[#046703]/12 text-[#046703] border-[#046703]/25",
      dotClass: "bg-[#046703]",
      emptyText: "No hay pedidos en preparación.",
      emptyEmoji: "👨‍🍳",
    },
    {
      key: "ready" as const,
      title: "Listos",
      headerClass: "bg-[#c9dfc3]/50 text-[#046703] border-[#c9dfc3]",
      dotClass: "bg-[#046703]",
      emptyText: "No hay pedidos listos.",
      emptyEmoji: "🍕",
    },
    {
      key: "delivering" as const,
      title: "En reparto",
      headerClass: "bg-[#f6070b]/12 text-[#f6070b] border-[#f6070b]/20",
      dotClass: "bg-[#f6070b]",
      emptyText: "No hay pedidos en reparto.",
      emptyEmoji: "🛵",
    },
  ];

  const formatEstimatedHour = (isoDate: string | null) => {
    if (!isoDate) return null;
    return new Date(isoDate).toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <main className="rounded-3xl border border-[#c9dfc3] bg-white p-8 shadow-sm">
        Cargando pedidos...
      </main>
    );
  }

  return (
    <div className="mx-auto max-w-[1650px] space-y-6">
      <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#69adb6]">
              Panel operativo
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#046703]">Pedidos</h1>
            <p className="mt-2 text-sm text-neutral-500">
              Actualización automática cada 5 segundos
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/15 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-neutral-400">
                Activos
              </p>
              <p className="mt-1 text-2xl font-bold text-[#046703]">
                {totalActiveOrders}
              </p>
            </div>

            <div className="rounded-2xl border border-[#f48e07]/25 bg-[#f48e07]/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-[#f48e07]/80">
                Pendientes
              </p>
              <p className="mt-1 text-2xl font-bold text-[#f48e07]">
                {groupedOrders.pending.length}
              </p>
            </div>

            <div className="rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/15 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-neutral-400">
                Consejo
              </p>
              <p className="mt-1 text-sm font-medium text-[#046703]">
                Arrastra tarjetas entre columnas
              </p>
            </div>

            <div className="rounded-2xl border border-[#f6070b]/20 bg-[#f6070b]/10 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-[#f6070b]/80">
                Alarma activa
              </p>
              <p className="mt-1 text-sm font-medium text-[#f6070b]">
                {ringingOrderIds.length > 0
                  ? `${ringingOrderIds.length} pedido(s) sin revisar`
                  : "Sin alarmas"}
              </p>
            </div>

            <button
              onClick={unlockAudio}
              className="rounded-2xl border border-[#69adb6] bg-white px-5 py-3 text-sm font-medium text-[#69adb6] transition hover:bg-[#69adb6]/10"
            >
              Activar sonido
            </button>

            <button
              onClick={() => router.push("/admin")}
              className="rounded-2xl bg-[#69adb6] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Volver
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {columns.map((col) => (
          <section
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverColumn(col.key);
            }}
            onDragLeave={() => setDragOverColumn(null)}
            onDrop={() => handleDropToColumn(col.key)}
            className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition ${
              dragOverColumn === col.key
                ? "border-[#69adb6] ring-2 ring-[#69adb6]/15"
                : "border-[#c9dfc3]"
            }`}
          >
            <div className={`border-b px-4 py-4 ${col.headerClass}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`h-3 w-3 rounded-full ${col.dotClass} ${
                      col.key === "pending" && groupedOrders.pending.length > 0
                        ? "animate-pulse"
                        : ""
                    }`}
                  />
                  <h2 className="font-semibold">{col.title}</h2>
                </div>

                <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-bold">
                  {groupedOrders[col.key].length}
                </span>
              </div>
            </div>

            <div className="max-h-[72vh] space-y-3 overflow-y-auto p-4">
              {groupedOrders[col.key].length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#c9dfc3] bg-[#c9dfc3]/10 p-6 text-center">
                  <div className="text-2xl">{col.emptyEmoji}</div>
                  <p className="mt-3 text-sm font-medium text-[#046703]">
                    {col.emptyText}
                  </p>
                </div>
              )}

              {groupedOrders[col.key].map((order) => {
                const isDelivery = order.delivery_type === "Delivery";
                const isRinging = ringingOrderIds.includes(order.id);

                return (
                  <article
                    key={order.id}
                    draggable
                    onDragStart={() => setDraggedOrderId(order.id)}
                    onDragEnd={() => {
                      setDraggedOrderId(null);
                      setDragOverColumn(null);
                    }}
                    className={`cursor-grab rounded-2xl border bg-[#c9dfc3]/10 p-4 transition hover:shadow-sm active:cursor-grabbing ${
                      isRinging
                        ? "border-[#f6070b] ring-2 ring-[#f6070b]/20 animate-pulse"
                        : col.key === "pending"
                        ? "border-[#f48e07]/30 ring-2 ring-[#f48e07]/10"
                        : "border-[#c9dfc3]"
                    } ${
                      draggedOrderId === order.id ? "opacity-60" : ""
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#046703]">
                          {order.customers?.name || "Cliente"}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {order.customers?.phone || "-"}
                        </p>
                        <p className="mt-1 text-xs text-neutral-400">
                          {new Date(order.created_at).toLocaleString("es-CL")}
                        </p>

                        {order.tracking_code && (
                          <p className="mt-2 inline-flex rounded-full border border-[#c9dfc3] bg-white px-3 py-1 text-xs font-semibold text-[#69adb6]">
                            {order.tracking_code}
                          </p>
                        )}

                        {isRinging && (
                          <p className="mt-2 inline-flex rounded-full bg-[#f6070b] px-3 py-1 text-xs font-bold text-white">
                            NUEVO PEDIDO
                          </p>
                        )}
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                          isDelivery
                            ? "bg-[#046703]/12 text-[#046703]"
                            : "bg-[#69adb6]/15 text-[#69adb6]"
                        }`}
                      >
                        {isDelivery ? "DELIVERY" : "RETIRO"}
                      </span>
                    </div>

                    <div className="mb-4 rounded-2xl border border-[#c9dfc3] bg-white p-3">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">
                        Pedido
                      </p>
                      <div className="space-y-1.5">
                        {order.order_items?.map((item, i) => (
                          <p key={i} className="text-sm text-neutral-700">
                            • {item.product_name} x{item.quantity}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm text-neutral-700">
                      <p>
                        <strong>Tipo:</strong> {order.delivery_type || "-"}
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

                      <p>
                        <strong>Pago:</strong> {order.payment_method || "-"}
                      </p>

                      {order.estimated_minutes ? (
                        <p>
                          <strong>Estimado:</strong> {order.estimated_minutes} min
                          {order.estimated_at
                            ? ` • ${formatEstimatedHour(order.estimated_at)}`
                            : ""}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3">
                      <span className="text-sm font-medium text-neutral-500">
                        Total
                      </span>
                      <span className="text-lg font-bold text-[#f6070b]">
                        ${Number(order.total || 0).toLocaleString("es-CL")}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {col.key === "pending" && (
                        <>
                          <div className="flex items-center gap-2 rounded-xl border border-[#c9dfc3] bg-white px-2 py-1">
                            <button
                              onClick={() => decreaseEstimate(order.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c9dfc3] text-sm text-[#046703]"
                            >
                              -
                            </button>

                            <div className="min-w-[78px] text-center text-sm font-semibold text-[#046703]">
                              ⏱ {estimatedTimes[order.id] ?? 20} min
                            </div>

                            <button
                              onClick={() => increaseEstimate(order.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c9dfc3] text-sm text-[#046703]"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => acceptOrder(order)}
                            className="rounded-xl bg-[#69adb6] px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
                          >
                            Aceptar
                          </button>

                          <button
                            onClick={() => updateStatus(order.id, "rejected")}
                            className="rounded-xl bg-[#f6070b] px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
                          >
                            Rechazar
                          </button>
                        </>
                      )}

                      {col.key === "accepted" && (
                        <button
                          onClick={() => updateStatus(order.id, "preparing")}
                          className="rounded-xl bg-[#046703] px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
                        >
                          Empezar preparación
                        </button>
                      )}

                      {col.key === "preparing" && (
                        <button
                          onClick={() => markReady(order)}
                          className="rounded-xl bg-[#f48e07] px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
                        >
                          {isDelivery ? "Listo para despacho" : "Listo para retiro"}
                        </button>
                      )}

                      {col.key === "ready" && (
                        <>
                          {isDelivery ? (
                            <button
                              onClick={() => updateStatus(order.id, "delivering")}
                              className="rounded-xl bg-[#f6070b] px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
                            >
                              Iniciar reparto
                            </button>
                          ) : (
                            <button
                              onClick={() => updateStatus(order.id, "delivered")}
                              className="rounded-xl bg-[#046703] px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
                            >
                              Marcar retirado
                            </button>
                          )}
                        </>
                      )}

                      {col.key === "delivering" && (
                        <button
                          onClick={() => confirmDeliveredAndNotify(order)}
                          className="rounded-xl bg-[#046703] px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
                        >
                          Confirmar entrega
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
