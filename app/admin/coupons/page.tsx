"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";

type CouponRow = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  is_active: boolean;
  usage_mode: "single_per_customer" | "single_global" | "unlimited";
  max_uses: number | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

type CouponUsageRow = {
  id: string;
  coupon_code: string;
  email: string;
  phone: string;
  order_id: string | null;
  created_at: string;
};

type OrderRow = {
  id: string;
  total: number | null;
};

type CouponsResponse = {
  ok: boolean;
  coupons?: CouponRow[];
  couponUsages?: CouponUsageRow[];
  orders?: OrderRow[];
  error?: string;
};

export default function AdminCouponsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [couponUsages, setCouponUsages] = useState<CouponUsageRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [usageMode, setUsageMode] = useState<
    "single_per_customer" | "single_global" | "unlimited"
  >("single_per_customer");
  const [maxUses, setMaxUses] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadCoupons = async () => {
    const res = await fetch("/api/admin/coupons", { cache: "no-store" });
    const data = (await res.json()) as CouponsResponse;

    if (!res.ok || !data.ok) {
      console.error("Error coupons:", data);
      return;
    }

    setCoupons(data.coupons || []);
    setCouponUsages(data.couponUsages || []);
    setOrders(data.orders || []);
  };

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/admin/login");
        return;
      }

      await loadCoupons();
      setLoading(false);
    };

    load();
  }, [router]);

  const limpiarFormulario = () => {
    setCode("");
    setDiscountType("percent");
    setDiscountValue("");
    setIsActive(true);
    setUsageMode("single_per_customer");
    setMaxUses("");
    setStartsAt("");
    setEndsAt("");
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      alert("Debes ingresar un código.");
      return;
    }

    if (!discountValue || Number(discountValue) <= 0) {
      alert("Debes ingresar un valor válido.");
      return;
    }

    setIsSaving(true);

    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: code.trim().toUpperCase(),
        discount_type: discountType,
        discount_value: Number(discountValue),
        is_active: isActive,
        usage_mode: usageMode,
        max_uses: maxUses ? Number(maxUses) : null,
        starts_at: startsAt ? `${startsAt}T00:00:00` : null,
        ends_at: endsAt ? `${endsAt}T23:59:59` : null,
      }),
    });

    const data = (await res.json()) as { ok: boolean; error?: string };

    setIsSaving(false);

    if (!res.ok || !data.ok) {
      console.error(data);
      alert(data.error || "Error al crear el cupón.");
      return;
    }

    limpiarFormulario();
    await loadCoupons();
  };

  const toggleCouponStatus = async (coupon: CouponRow) => {
    const res = await fetch("/api/admin/coupons", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: coupon.id,
        is_active: !coupon.is_active,
      }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };

    if (!res.ok || !data.ok) {
      console.error(data);
      alert(data.error || "No se pudo actualizar el estado del cupón.");
      return;
    }

    await loadCoupons();
  };

  const couponStats = useMemo(() => {
    const orderMap = new Map(orders.map((o) => [o.id, Number(o.total || 0)]));

    const grouped = new Map<
      string,
      {
        usos: number;
        dineroGenerado: number;
      }
    >();

    couponUsages.forEach((usage) => {
      const key = usage.coupon_code.toUpperCase();
      const current = grouped.get(key) || {
        usos: 0,
        dineroGenerado: 0,
      };

      current.usos += 1;

      if (usage.order_id && orderMap.has(usage.order_id)) {
        current.dineroGenerado += orderMap.get(usage.order_id) || 0;
      }

      grouped.set(key, current);
    });

    return grouped;
  }, [couponUsages, orders]);

  const deleteCoupon = async (couponId: string, code: string) => {
    const usos = couponStats.get(code.toUpperCase())?.usos || 0;

    if (usos > 0) {
      alert("Este cupón ya fue utilizado y no puede eliminarse.");
      return;
    }

    const confirmar = window.confirm("¿Eliminar este cupón?");
    if (!confirmar) return;

    const res = await fetch(`/api/admin/coupons?id=${couponId}`, {
      method: "DELETE",
    });
    const data = (await res.json()) as { ok: boolean; error?: string };

    if (!res.ok || !data.ok) {
      console.error(data);
      alert(data.error || "No se pudo eliminar el cupón.");
      return;
    }

    await loadCoupons();
  };

  const getCouponEstado = (coupon: CouponRow) => {
    const now = new Date();

    if (!coupon.is_active) {
      return { label: "Inactivo", className: "bg-[#c9dfc3]/40 text-[#046703]" };
    }

    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      return { label: "Programado", className: "bg-[#69adb6]/20 text-[#69adb6]" };
    }

    if (coupon.ends_at && new Date(coupon.ends_at) < now) {
      return { label: "Vencido", className: "bg-[#f6070b]/15 text-[#f6070b]" };
    }

    return { label: "Vigente", className: "bg-[#046703]/15 text-[#046703]" };
  };

  const resumenGeneral = useMemo(() => {
    let totalUsos = 0;
    let totalGenerado = 0;

    couponStats.forEach((stat) => {
      totalUsos += stat.usos;
      totalGenerado += stat.dineroGenerado;
    });

    return {
      totalUsos,
      totalGenerado,
      promedioPorUso: totalUsos > 0 ? totalGenerado / totalUsos : 0,
    };
  }, [couponStats]);

  const topCupones = useMemo(() => {
    return coupons
      .map((coupon) => {
        const stat = couponStats.get(coupon.code.toUpperCase()) || {
          usos: 0,
          dineroGenerado: 0,
        };

        return {
          code: coupon.code,
          usos: stat.usos,
          dineroGenerado: stat.dineroGenerado,
          promedioPorUso: stat.usos > 0 ? stat.dineroGenerado / stat.usos : 0,
        };
      })
      .sort((a, b) => b.dineroGenerado - a.dineroGenerado)
      .slice(0, 5);
  }, [coupons, couponStats]);

  if (loading) {
    return (
      <main className="rounded-3xl border border-[#c9dfc3] bg-white p-6 text-[#046703] shadow-sm">
        Cargando cupones...
      </main>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#69adb6]">
              Promociones y descuentos
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#046703]">Cupones</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Crea, activa, desactiva y mide el rendimiento de tus cupones.
            </p>
          </div>

          <button
            onClick={() => router.push("/admin")}
            className="rounded-2xl bg-[#69adb6] px-4 py-2 text-white transition hover:opacity-90"
          >
            Volver al dashboard
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-[#69adb6] p-6 text-white shadow-sm">
            <p className="text-sm text-white/80">Usos totales</p>
            <p className="mt-2 text-3xl font-bold">{resumenGeneral.totalUsos}</p>
          </div>

          <div className="rounded-3xl bg-[#046703] p-6 text-white shadow-sm">
            <p className="text-sm text-white/80">Dinero generado</p>
            <p className="mt-2 text-3xl font-bold">
              ${resumenGeneral.totalGenerado.toLocaleString("es-CL")}
            </p>
          </div>

          <div className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
            <p className="text-sm text-neutral-500">Promedio por uso</p>
            <p className="mt-2 text-3xl font-bold text-[#f48e07]">
              ${Math.round(resumenGeneral.promedioPorUso).toLocaleString("es-CL")}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-2xl font-bold text-[#046703]">Crear cupón</h2>

        <form onSubmit={handleCreateCoupon} className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-neutral-600">Código</label>
            <input
              type="text"
              placeholder="Ej: BIENVENIDO10"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full rounded-xl border border-[#c9dfc3] bg-white p-3 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">
              Tipo de descuento
            </label>
            <select
              value={discountType}
              onChange={(e) =>
                setDiscountType(e.target.value as "percent" | "fixed")
              }
              className="w-full rounded-xl border border-[#c9dfc3] bg-white p-3 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
            >
              <option value="percent">Porcentaje</option>
              <option value="fixed">Monto fijo</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">Valor</label>
            <input
              type="number"
              min="1"
              placeholder={discountType === "percent" ? "10" : "5000"}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="w-full rounded-xl border border-[#c9dfc3] bg-white p-3 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">
              Modo de uso
            </label>
            <select
              value={usageMode}
              onChange={(e) =>
                setUsageMode(
                  e.target.value as
                    | "single_per_customer"
                    | "single_global"
                    | "unlimited"
                )
              }
              className="w-full rounded-xl border border-[#c9dfc3] bg-white p-3 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
            >
              <option value="single_per_customer">Una vez por cliente</option>
              <option value="single_global">Una sola vez global</option>
              <option value="unlimited">Ilimitado</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">
              Máximo de usos (opcional)
            </label>
            <input
              type="number"
              min="1"
              placeholder="Ej: 100"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="w-full rounded-xl border border-[#c9dfc3] bg-white p-3 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 rounded-xl border border-[#c9dfc3] bg-[#c9dfc3]/15 p-3 text-sm text-[#046703]">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Cupón activo
            </label>
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">
              Fecha inicio (opcional)
            </label>
            <input
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full rounded-xl border border-[#c9dfc3] bg-white p-3 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-600">
              Fecha fin (opcional)
            </label>
            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full rounded-xl border border-[#c9dfc3] bg-white p-3 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
            />
          </div>

          <div className="md:col-span-2 flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className={`rounded-2xl px-5 py-3 text-white transition ${
                isSaving
                  ? "cursor-not-allowed bg-neutral-400"
                  : "bg-[#f6070b] hover:opacity-90"
              }`}
            >
              {isSaving ? "Guardando..." : "Crear cupón"}
            </button>

            <button
              type="button"
              onClick={limpiarFormulario}
              className="rounded-2xl bg-[#c9dfc3] px-5 py-3 text-[#046703] transition hover:bg-[#69adb6] hover:text-white"
            >
              Limpiar
            </button>
          </div>
        </form>
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold text-[#046703]">
            Listado de cupones
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#c9dfc3] text-left text-neutral-500">
                  <th className="py-3">Código</th>
                  <th className="py-3">Estado</th>
                  <th className="py-3">Tipo</th>
                  <th className="py-3">Valor</th>
                  <th className="py-3">Usos</th>
                  <th className="py-3">Generado</th>
                  <th className="py-3">Promedio</th>
                  <th className="py-3">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {coupons.map((coupon) => {
                  const estado = getCouponEstado(coupon);
                  const stat = couponStats.get(coupon.code.toUpperCase()) || {
                    usos: 0,
                    dineroGenerado: 0,
                  };

                  const promedio =
                    stat.usos > 0 ? stat.dineroGenerado / stat.usos : 0;

                  return (
                    <tr
                      key={coupon.id}
                      className="border-b border-[#c9dfc3]/70 last:border-b-0"
                    >
                      <td className="py-3 font-medium text-[#046703]">
                        {coupon.code}
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${estado.className}`}
                        >
                          {estado.label}
                        </span>
                      </td>
                      <td className="py-3">
                        {coupon.discount_type === "percent"
                          ? "Porcentaje"
                          : "Monto fijo"}
                      </td>
                      <td className="py-3">
                        {coupon.discount_type === "percent"
                          ? `${coupon.discount_value}%`
                          : `$${Number(coupon.discount_value).toLocaleString("es-CL")}`}
                      </td>
                      <td className="py-3 font-medium text-[#046703]">
                        {stat.usos}
                      </td>
                      <td className="py-3 font-medium text-[#f6070b]">
                        ${stat.dineroGenerado.toLocaleString("es-CL")}
                      </td>
                      <td className="py-3 text-[#69adb6]">
                        ${Math.round(promedio).toLocaleString("es-CL")}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleCouponStatus(coupon)}
                            className="rounded-xl bg-[#c9dfc3] px-3 py-1 text-xs text-[#046703] transition hover:bg-[#69adb6] hover:text-white"
                          >
                            {coupon.is_active ? "Desactivar" : "Activar"}
                          </button>

                          <button
                            onClick={() => deleteCoupon(coupon.id, coupon.code)}
                            disabled={stat.usos > 0}
                            className={`rounded-xl px-3 py-1 text-xs transition ${
                              stat.usos > 0
                                ? "cursor-not-allowed bg-neutral-200 text-neutral-400"
                                : "bg-[#f6070b]/15 text-[#f6070b] hover:bg-[#f6070b] hover:text-white"
                            }`}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {coupons.length === 0 && (
            <p className="mt-4 text-sm text-neutral-500">
              Aún no hay cupones creados.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-2xl font-bold text-[#046703]">
            Top cupones
          </h2>

          <div className="space-y-3">
            {topCupones.map((coupon, index) => (
              <div
                key={`${coupon.code}-${index}`}
                className="rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/15 p-4"
              >
                <div className="font-medium text-[#046703]">{coupon.code}</div>
                <div className="mt-2 text-sm text-neutral-600">
                  Usos: {coupon.usos}
                </div>
                <div className="text-sm font-semibold text-[#f6070b]">
                  Generado: ${coupon.dineroGenerado.toLocaleString("es-CL")}
                </div>
                <div className="text-sm text-[#69adb6]">
                  Promedio por uso: $
                  {Math.round(coupon.promedioPorUso).toLocaleString("es-CL")}
                </div>
              </div>
            ))}

            {topCupones.length === 0 && (
              <p className="text-sm text-neutral-500">
                Aún no hay cupones con uso.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
