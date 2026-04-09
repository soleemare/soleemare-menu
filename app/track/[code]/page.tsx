"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type Order = {
  id: string;
  tracking_code: string;
  status: string;
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
  total: number;
  customers: {
    name: string;
  } | null;
  order_items: {
    product_name: string;
    quantity: number;
  }[];
};

type TimelineStep = {
  key: string;
  label: string;
  description: string;
  dateField:
    | "created_at"
    | "accepted_at"
    | "preparing_at"
    | "ready_at"
    | "delivering_at"
    | "delivered_at";
  icon: string;
};

const baseStepsDelivery: TimelineStep[] = [
  {
    key: "pending",
    label: "Solicitud recibida",
    description:
      "Recibimos tu solicitud de compra, pronto revisaremos tu pedido.",
    dateField: "created_at",
    icon: "📝",
  },
  {
    key: "accepted",
    label: "Pedido aceptado",
    description:
      "Tu pedido fue aceptado y comenzaremos con la preparación.",
    dateField: "accepted_at",
    icon: "✅",
  },
  {
    key: "preparing",
    label: "En preparación",
    description: "Ya estamos preparando tu pedido.",
    dateField: "preparing_at",
    icon: "🍕",
  },
  {
    key: "ready",
    label: "Listo para despacho",
    description: "Tu pedido está listo y pronto saldrá a reparto.",
    dateField: "ready_at",
    icon: "📦",
  },
  {
    key: "delivering",
    label: "En tránsito",
    description: "Tu pedido va en camino a tu dirección.",
    dateField: "delivering_at",
    icon: "🛵",
  },
  {
    key: "delivered",
    label: "Entregado",
    description: "Tu pedido fue entregado correctamente.",
    dateField: "delivered_at",
    icon: "🎉",
  },
];

const baseStepsPickup: TimelineStep[] = [
  {
    key: "pending",
    label: "Solicitud recibida",
    description:
      "Recibimos tu solicitud de compra, pronto revisaremos tu pedido.",
    dateField: "created_at",
    icon: "📝",
  },
  {
    key: "accepted",
    label: "Pedido aceptado",
    description:
      "Tu pedido fue aceptado y comenzaremos con la preparación.",
    dateField: "accepted_at",
    icon: "✅",
  },
  {
    key: "preparing",
    label: "En preparación",
    description: "Ya estamos preparando tu pedido.",
    dateField: "preparing_at",
    icon: "🍕",
  },
  {
    key: "ready",
    label: "Listo para retiro",
    description: "Tu pedido está listo para que lo retires.",
    dateField: "ready_at",
    icon: "📍",
  },
  {
    key: "delivered",
    label: "Retirado / Entregado",
    description: "El pedido fue entregado o retirado correctamente.",
    dateField: "delivered_at",
    icon: "🎉",
  },
];

const statusLabels: Record<string, string> = {
  pending: "Pendiente por aceptar",
  accepted: "Aceptado",
  preparing: "En preparación",
  ready: "Listo",
  delivering: "En reparto",
  delivered: "Entregado",
  rejected: "Rechazado",
};

const statusMessages: Record<string, string> = {
  pending: "Recibimos tu pedido y pronto lo revisaremos.",
  accepted: "Tu pedido fue confirmado y ya estamos avanzando con su preparación.",
  preparing: "Estamos preparando tu pedido en cocina.",
  ready: "Tu pedido está listo para el siguiente paso.",
  delivering: "Tu pedido va en camino hacia tu dirección.",
  delivered: "Tu pedido ya fue entregado correctamente.",
  rejected:
    "No pudimos aceptar este pedido en este momento. Si quieres, escríbenos para ayudarte con una alternativa.",
};

const statusBadgeClass: Record<string, string> = {
  pending: "bg-[#fff3e4] text-[#f48e07]",
  accepted: "bg-[#046703]/10 text-[#046703]",
  preparing: "bg-[#69adb6]/10 text-[#046703]",
  ready: "bg-[#69adb6]/10 text-[#046703]",
  delivering: "bg-[#fff3e4] text-[#f48e07]",
  delivered: "bg-[#046703]/10 text-[#046703]",
  rejected: "bg-[#f6070b]/10 text-[#f6070b]",
};

export default function TrackPage() {
  const params = useParams();
  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const hasValidCode = !!code && typeof code === "string";

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowTs, setNowTs] = useState(0);

  useEffect(() => {
    if (!hasValidCode) return;

    let cancelled = false;

    const load = async () => {
      const trackingCode = decodeURIComponent(code).trim();

      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(trackingCode)}/track`, {
          cache: "no-store",
        });

        const data = (await res.json()) as {
          ok: boolean;
          order?: Order;
          error?: string;
        };

        if (!res.ok || !data.ok) {
          if (!cancelled) {
            if (res.status !== 404) {
              console.error("Error buscando tracking:", data.error || res.statusText);
            }
            setOrder(null);
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setOrder(data.order || null);
          setLoading(false);
        }
      } catch (error: unknown) {
        if (!cancelled) {
          const detail =
            error instanceof Error ? error.message : "Error consultando el seguimiento.";
          console.error("Error buscando tracking:", detail);
          setOrder(null);
          setLoading(false);
        }
      }
    };

    load();

    const refreshInterval = setInterval(() => {
      load();
    }, 5000);

    const clockInterval = setInterval(() => {
      setNowTs(Date.now());
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(refreshInterval);
      clearInterval(clockInterval);
    };
  }, [code, hasValidCode]);

  const countdown = (() => {
    if (!order?.estimated_at) return null;

    const diffMs = new Date(order.estimated_at).getTime() - nowTs;
    const totalSec = Math.max(0, Math.floor(diffMs / 1000));
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;

    return {
      minutes,
      seconds,
      finished: totalSec <= 0,
    };
  })();

  if (!hasValidCode) {
    return (
      <main className="min-h-screen bg-[#f8f5ef] px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#f6070b]/20 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-medium text-[#f6070b]">
            Pedido no encontrado.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f5ef] px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#c9dfc3] bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-medium text-[#046703]">
            Cargando seguimiento...
          </p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-[#f8f5ef] px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#f6070b]/20 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-medium text-[#f6070b]">
            Pedido no encontrado.
          </p>
        </div>
      </main>
    );
  }

  const isDelivery = order.delivery_type === "Delivery";
  const isRejected = order.status === "rejected";
  const steps = isDelivery ? baseStepsDelivery : baseStepsPickup;
  const currentIndex = steps.findIndex((s) => s.key === order.status);

  const progressPercent =
    isRejected
      ? 100
      : currentIndex >= 0 && steps.length > 1
      ? Math.round((currentIndex / (steps.length - 1)) * 100)
      : 0;
  const progressBarClass = isRejected
    ? "bg-[#f6070b]"
    : "bg-gradient-to-r from-[#046703] via-[#69adb6] to-[#f6070b]";
  const statusMessage = statusMessages[order.status] || "Estamos actualizando el estado de tu pedido.";
  const badgeClass =
    statusBadgeClass[order.status] || "bg-[#f8f5ef] text-[#046703]";

  const formatStepDate = (dateValue: string | null) => {
    if (!dateValue) return null;

    const date = new Date(dateValue);

    return `${date.toLocaleDateString("es-CL")} • ${date.toLocaleTimeString(
      "es-CL",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    )}`;
  };

  const getStepStyle = (index: number, stepKey: string) => {
    if (isRejected) {
      return {
        dot: "bg-[#f6070b]",
        line: "bg-neutral-300",
        title: "text-neutral-500",
        desc: "text-neutral-400",
      };
    }

    const isDone = currentIndex >= 0 && index < currentIndex;
    const isCurrent = currentIndex === index;
    const isFinalDone = stepKey === "delivered" && currentIndex === index;

    if (isFinalDone) {
      return {
        dot: "bg-[#046703]",
        line: "bg-[#046703]",
        title: "text-[#046703]",
        desc: "text-neutral-700",
      };
    }

    if (isCurrent || isDone) {
      return {
        dot: "bg-[#f48e07]",
        line: isDone ? "bg-[#046703]" : "bg-[#f48e07]",
        title: "text-[#046703]",
        desc: "text-neutral-700",
      };
    }

    return {
      dot: "bg-[#c9dfc3]",
      line: "bg-[#c9dfc3]",
      title: "text-neutral-400",
      desc: "text-neutral-400",
    };
  };

  const formatEstimatedHour = (isoDate: string | null) => {
    if (!isoDate) return null;

    return new Date(isoDate).toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const countdownCardClass =
    order.status === "preparing"
      ? "bg-[#c9dfc3]/45 border border-[#046703]/10"
      : order.status === "ready"
      ? "bg-[#c9dfc3]/60 border border-[#046703]/10"
      : order.status === "delivering"
      ? "bg-[#fff3e4] border border-[#f48e07]/20"
      : "bg-[#fff3e4] border border-[#f48e07]/20";

  const countdownTextClass =
    order.status === "preparing"
      ? "text-[#046703]"
      : order.status === "ready"
      ? "text-[#046703]"
      : order.status === "delivering"
      ? "text-[#f48e07]"
      : "text-[#f48e07]";

  const showCountdown =
    !!countdown &&
    order.status !== "delivered" &&
    order.status !== "rejected" &&
    order.status !== "delivering";

  const showTransitMessage = order.status === "delivering" && isDelivery;

  return (
    <main className="min-h-screen bg-[#f8f5ef] px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[#69adb6]">
                Sole e Mare
              </p>
              <h1 className="mt-2 text-3xl font-bold text-[#046703]">
                Seguimiento de pedido
              </h1>
              <p className="mt-3 text-neutral-500">
                Código: <strong>{order.tracking_code}</strong>
              </p>
            </div>

            <div className={`rounded-2xl px-4 py-2 text-sm font-semibold ${badgeClass}`}>
              {statusLabels[order.status] || order.status}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[#c9dfc3] bg-[#f8f5ef] p-4">
            <p className="text-sm font-medium text-neutral-600">
              Estado actual
            </p>
            <p
              className={`mt-1 text-lg font-semibold ${
                isRejected ? "text-[#f6070b]" : "text-[#046703]"
              }`}
            >
              {statusLabels[order.status] || order.status}
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              {statusMessage}
            </p>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm text-neutral-500">
              <span>Progreso del pedido</span>
              <span>{progressPercent}%</span>
            </div>

            <div className="h-3 w-full overflow-hidden rounded-full bg-[#c9dfc3]/45">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressBarClass}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {order.estimated_minutes ? (
            <div className="mt-4 rounded-2xl border border-[#c9dfc3] bg-[#f8f5ef] p-4">
              <p className="font-medium text-[#046703]">
                {isDelivery
                  ? "Tiempo estimado de entrega"
                  : "Tiempo estimado para retiro"}
                : {order.estimated_minutes} min
              </p>

              {order.estimated_at && (
                <p className="mt-1 text-sm text-neutral-500">
                  Hora estimada: {formatEstimatedHour(order.estimated_at)}
                </p>
              )}

              {showCountdown && (
                <div className="mt-3">
                  <p className="text-sm text-neutral-500">
                    Tiempo restante estimado
                  </p>

                  {countdown.finished ? (
                    <div className={`mt-2 rounded-2xl p-4 ${countdownCardClass}`}>
                      <p className={`text-lg font-bold ${countdownTextClass}`}>
                        {isDelivery
                          ? "Tu pedido está en tramo final de entrega"
                          : "Tu pedido está en tramo final para retiro"}
                      </p>
                      <p className="mt-1 text-sm text-neutral-600">
                        Estamos finalizando los últimos detalles.
                      </p>
                    </div>
                  ) : (
                    <p className="text-4xl font-bold tabular-nums text-[#f6070b]">
                      {`${String(countdown.minutes).padStart(2, "0")}:${String(
                        countdown.seconds
                      ).padStart(2, "0")}`}
                    </p>
                  )}
                </div>
              )}

              {showTransitMessage && (
                <div className="mt-3 rounded-2xl border border-[#f48e07]/20 bg-[#fff3e4] p-4">
                  <p className="text-lg font-bold text-[#f48e07]">
                    🛵 Tu pedido ya va en camino
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    Nuestro repartidor está en ruta hacia tu dirección.
                  </p>
                </div>
              )}
            </div>
          ) : null}

          <p className="mt-3 text-sm text-neutral-500">
            Esta página se actualiza automáticamente.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/menu"
              className="rounded-2xl bg-[#046703] px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Volver al menú
            </Link>
            <a
              href="https://wa.me/56997925852"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3 text-sm font-medium text-[#046703] transition hover:border-[#69adb6] hover:bg-[#69adb6]/10"
            >
              Contactar por WhatsApp
            </a>
          </div>
        </section>

        <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-2xl font-bold text-[#046703]">
            Estado del pedido
          </h2>

          <div className="space-y-1">
            {steps.map((step, index) => {
              const style = getStepStyle(index, step.key);
              const isLast = index === steps.length - 1;
              const stepDate = formatStepDate(order[step.dateField]);

              return (
                <div key={step.key} className="flex gap-4">
                  <div className="flex w-8 flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${style.dot} text-white shadow-sm`}
                    >
                      {step.icon}
                    </div>
                    {!isLast && (
                      <div className={`mt-1 w-[3px] flex-1 ${style.line}`} />
                    )}
                  </div>

                  <div className="pb-8">
                    <h3 className={`text-xl font-bold ${style.title}`}>
                      {step.label}
                    </h3>
                    <p className={`mt-2 text-base ${style.desc}`}>
                      {step.description}
                    </p>

                    {stepDate && (
                      <p className="mt-2 text-sm text-neutral-500">
                        {stepDate}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {order.status === "rejected" && (
              <div className="mt-2 rounded-2xl border border-[#f6070b]/20 bg-red-50 p-4">
                <p className="font-semibold text-[#f6070b]">Pedido rechazado</p>
                <p className="mt-1 text-sm text-neutral-600">
                  Tu pedido no pudo ser procesado en este momento. Si quieres,
                  podemos ayudarte a generar una alternativa o revisar el pedido.
                </p>
                {order.rejected_at && (
                  <p className="mt-2 text-sm text-neutral-500">
                    {formatStepDate(order.rejected_at)}
                  </p>
                )}
                <a
                  href="https://wa.me/56997925852"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-2xl bg-[#f6070b] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Escribir a WhatsApp
                </a>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-[#046703]">Detalle</h2>

          <div className="grid gap-3 text-sm md:grid-cols-2 md:text-base">
            <div className="rounded-2xl bg-[#f8f5ef] p-4">
              <p className="text-neutral-500">Cliente</p>
              <p className="font-semibold text-[#046703]">
                {order.customers?.name || "Cliente"}
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8f5ef] p-4">
              <p className="text-neutral-500">Tipo</p>
              <p className="font-semibold text-[#046703]">
                {order.delivery_type}
              </p>
            </div>

            <div className="rounded-2xl bg-[#f8f5ef] p-4">
              <p className="text-neutral-500">Pago</p>
              <p className="font-semibold text-[#046703]">
                {order.payment_method}
              </p>
            </div>

            <div className="rounded-2xl bg-[#fff3e4] p-4">
              <p className="text-neutral-500">Total</p>
              <p className="font-semibold text-[#f6070b]">
                ${Number(order.total || 0).toLocaleString("es-CL")}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-3 font-semibold text-[#046703]">Productos</p>
            <div className="space-y-2">
              {order.order_items?.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-2xl border border-[#c9dfc3] bg-[#f8f5ef] px-4 py-3 text-neutral-700"
                >
                  <span>{item.product_name}</span>
                  <span className="rounded-full bg-[#69adb6]/10 px-3 py-1 text-sm font-medium text-[#69adb6]">
                    x{item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
