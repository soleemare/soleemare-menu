"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  Polygon,
  Autocomplete,
} from "@react-google-maps/api";
import { useCart } from "../../context/CartContext";
import type { CartItem } from "../../context/CartContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  getDateKeyFromIso,
  getSchedulableDays,
  getScheduledSlotCounts,
  formatScheduledDateTime,
  filterAvailableScheduleSlots,
  getScheduleSlotsForDay,
  getStoreStatus,
} from "../../lib/storeHours";
import type { DeliveryZone } from "../../lib/deliveryZones";

const containerStyle = {
  width: "100%",
  height: "260px",
};

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

type FormErrors = {
  nombre?: string;
  telefono?: string;
  correo?: string;
  tipoEntrega?: string;
  direccion?: string;
  zona?: string;
  otraZona?: string;
  pago?: string;
};

type SaveOrderResult = {
  ok: boolean;
  trackingCode: string;
  message: string;
};

function findZoneForPoint(
  point: { lat: number; lng: number },
  zones: DeliveryZone[]
) {
  for (const zone of zones) {
    const polygon = new google.maps.Polygon({
      paths: zone.path,
    });

    const latLng = new google.maps.LatLng(point.lat, point.lng);
    const isInside = google.maps.geometry.poly.containsLocation(latLng, polygon);

    if (isInside) {
      return zone;
    }
  }

  return null;
}

export default function CheckoutPage() {
  const {
    cart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
    total,
  } = useCart();

  const router = useRouter();
  const storeStatus = getStoreStatus();
  const schedulableDays = useMemo(() => getSchedulableDays(), []);
  const [scheduledSlotValues, setScheduledSlotValues] = useState<string[]>([]);
  const scheduledSlotCounts = useMemo(
    () => getScheduledSlotCounts(scheduledSlotValues),
    [scheduledSlotValues]
  );
  const schedulableDayOptions = useMemo(
    () =>
      schedulableDays
        .map((day) => ({
          ...day,
          slots: filterAvailableScheduleSlots(
            getScheduleSlotsForDay(day, 30, new Date()),
            scheduledSlotCounts
          ),
        }))
        .filter((day) => day.slots.length > 0),
    [schedulableDays, scheduledSlotCounts]
  );

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [aceptaPromos, setAceptaPromos] = useState(false);

  const [tipoEntrega, setTipoEntrega] = useState("");
  const [direccion, setDireccion] = useState("");
  const [zona, setZona] = useState("");
  const [otraZona, setOtraZona] = useState("");
  const [pago, setPago] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponRow | null>(null);
  const [couponMessage, setCouponMessage] = useState("");

  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [detectedZonePrice, setDetectedZonePrice] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isScheduledOrder, setIsScheduledOrder] = useState(false);
  const [selectedScheduledDayKey, setSelectedScheduledDayKey] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");

  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);

  const selectedScheduledDay =
    schedulableDayOptions.find((day) => day.key === selectedScheduledDayKey) ||
    schedulableDayOptions[0] ||
    null;

  const schedulableSlots = selectedScheduledDay?.slots || [];

  useEffect(() => {
    let isMounted = true;

    const loadScheduledAvailability = async () => {
      try {
        const res = await fetch("/api/orders/scheduled-availability", {
          cache: "no-store",
        });
        const payload = await res.json();

        if (!res.ok || !payload.ok) {
          throw new Error(
            payload?.detail ||
              payload?.error ||
              "No se pudo cargar la disponibilidad programada."
          );
        }

        if (!isMounted) return;
        setScheduledSlotValues(payload.scheduledDates || []);
      } catch (error) {
        console.error("Error cargando disponibilidad programada:", error);
      }
    };

    loadScheduledAvailability();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("cliente");
    if (saved) {
      try {
        const cliente = JSON.parse(saved);
        setNombre(cliente.nombre || "");
        setTelefono(cliente.telefono || "");
        setCorreo(cliente.correo || "");
      } catch {}
    }
  }, []);

  useEffect(() => {
    const savedMode = localStorage.getItem("order_mode");
    const savedScheduledFor = localStorage.getItem("order_scheduled_for");

    if (schedulableDayOptions.length === 0) {
      setIsScheduledOrder(false);
      setSelectedScheduledDayKey("");
      setScheduledFor("");
      return;
    }

    const defaultDay = schedulableDayOptions[0];
    const defaultSlot = defaultDay.slots[0]?.value || "";

    setSelectedScheduledDayKey(defaultDay.key);
    setScheduledFor(defaultSlot);

    if (savedMode === "scheduled" && savedScheduledFor) {
      const savedDayKey = getDateKeyFromIso(savedScheduledFor);
      const matchingDay = schedulableDayOptions.find(
        (day) => day.key === savedDayKey
      );

      if (matchingDay) {
        const matchingSlot = matchingDay.slots.find(
          (slot) => slot.value === savedScheduledFor
        );

        if (matchingSlot) {
          setIsScheduledOrder(true);
          setSelectedScheduledDayKey(matchingDay.key);
          setScheduledFor(matchingSlot.value);
          return;
        }
      }
    }

    setIsScheduledOrder(false);
  }, [schedulableDayOptions]);

  useEffect(() => {
    if (!isScheduledOrder || schedulableDayOptions.length === 0) {
      return;
    }

    const fallbackDay = schedulableDayOptions[0];
    const activeDay =
      schedulableDayOptions.find((day) => day.key === selectedScheduledDayKey) ||
      fallbackDay;
    const activeSlot = activeDay.slots.find((slot) => slot.value === scheduledFor);

    if (activeDay.key !== selectedScheduledDayKey) {
      setSelectedScheduledDayKey(activeDay.key);
    }

    if (!activeSlot) {
      const nextSlot = activeDay.slots[0]?.value || "";
      setScheduledFor(nextSlot);
      localStorage.setItem("order_scheduled_for", nextSlot);
    }
  }, [isScheduledOrder, schedulableDayOptions, scheduledFor, selectedScheduledDayKey]);

  useEffect(() => {
    async function loadZones() {
      try {
        setZonesLoading(true);
        const res = await fetch("/api/delivery-zones", { cache: "no-store" });

        if (!res.ok) {
          throw new Error("No se pudieron cargar las zonas");
        }

        const data: DeliveryZone[] = await res.json();
        setDeliveryZones(data || []);
      } catch (error) {
        console.error("Error cargando zonas:", error);
        toast.error("No se pudieron cargar las zonas de delivery");
      } finally {
        setZonesLoading(false);
      }
    }

    loadZones();
  }, []);

  const onPlaceChanged = () => {
    if (!autocomplete) return;

    const place = autocomplete.getPlace();

    if (place?.geometry && place?.formatted_address) {
      const lat = place.geometry.location?.lat() ?? 0;
      const lng = place.geometry.location?.lng() ?? 0;
      const point = { lat, lng };

      setDireccion(place.formatted_address);
      setErrors((prev) => ({
        ...prev,
        direccion: undefined,
        zona: undefined,
        otraZona: undefined,
      }));
      setPosition(point);

      const detectedZone = findZoneForPoint(point, deliveryZones);

      if (detectedZone) {
        setZona(detectedZone.name);
        setOtraZona("");
        setDetectedZonePrice(detectedZone.price);
        toast.success(`Zona detectada: ${detectedZone.name}`);
      } else {
        setZona("Otra");
        setDetectedZonePrice(0);
        toast.error("Dirección fuera de cobertura automática");
      }
    }
  };

  const deliveryPrice =
    tipoEntrega === "Delivery" && zona && zona !== "Otra"
      ? detectedZonePrice
      : 0;

  const subtotal = total;

  const inputBaseClass =
    "w-full rounded-2xl border bg-white p-3.5 outline-none transition";

  const getInputClass = (hasError?: string) =>
    `${inputBaseClass} ${
      hasError
        ? "border-[#f6070b] focus:border-[#f6070b] focus:ring-2 focus:ring-[#f6070b]/20"
        : "border-[#c9dfc3] focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
    }`;

  const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());

  const isPromoItem = (item: CartItem) => Boolean(item.isOnPromo);

  const promoItemsTotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      if (isPromoItem(item)) {
        return acc + item.price * item.quantity;
      }
      return acc;
    }, 0);
  }, [cart]);

  const eligibleSubtotalForCoupon = useMemo(() => {
    return cart.reduce((acc, item) => {
      if (!isPromoItem(item)) {
        return acc + item.price * item.quantity;
      }
      return acc;
    }, 0);
  }, [cart]);

  const hasPromoItems = promoItemsTotal > 0;

  useEffect(() => {
    if (!appliedCoupon) return;

    if (eligibleSubtotalForCoupon <= 0) {
      setAppliedCoupon(null);
      setCouponMessage(
        "El cupón se eliminó porque tu carrito solo tiene productos en promoción."
      );
    }
  }, [appliedCoupon, eligibleSubtotalForCoupon]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (eligibleSubtotalForCoupon <= 0) return 0;

    if (appliedCoupon.discount_type === "percent") {
      return Math.round(
        (eligibleSubtotalForCoupon * Number(appliedCoupon.discount_value)) / 100
      );
    }

    return Math.min(
      Number(appliedCoupon.discount_value),
      eligibleSubtotalForCoupon
    );
  }, [appliedCoupon, eligibleSubtotalForCoupon]);

  const subtotalWithDiscount = Math.max(subtotal - discountAmount, 0);

  const totalFinal =
    tipoEntrega === "Delivery" && zona !== "Otra"
      ? subtotalWithDiscount + deliveryPrice
      : subtotalWithDiscount;

  const validarCuponDisponible = async (couponCode: string) => {
    try {
      const emailNormalizado = correo.trim().toLowerCase();
      const telefonoNormalizado = telefono.trim();
      const codigo = couponCode.trim().toUpperCase();

      const res = await fetch("/api/orders/validate-coupon", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          couponCode: codigo,
          email: emailNormalizado,
          phone: telefonoNormalizado,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        return { disponible: false, mensaje: data.error || "No se pudo validar el cupón." };
      }

      return { disponible: true, mensaje: "", coupon: data.coupon as CouponRow };
    } catch (error) {
      console.error("Error validando cupón:", error);
      return { disponible: false, mensaje: "No se pudo validar el cupón." };
    }
  };

  const aplicarCupon = async () => {
    const cleanCode = couponInput.trim().toUpperCase();

    if (!correo.trim() || !telefono.trim()) {
      setAppliedCoupon(null);
      setCouponMessage("Primero ingresa correo y teléfono para validar el cupón.");
      toast.error("Primero completa correo y teléfono");
      return;
    }

    if (!cleanCode) {
      setAppliedCoupon(null);
      setCouponMessage("Ingresa un cupón.");
      toast.error("Ingresa un cupón");
      return;
    }

    const validacion = await validarCuponDisponible(cleanCode);

    if (!validacion.disponible) {
      setAppliedCoupon(null);
      setCouponMessage(validacion.mensaje);
      toast.error(validacion.mensaje);
      return;
    }

    if (eligibleSubtotalForCoupon <= 0) {
      setAppliedCoupon(null);
      setCouponMessage(
        "El cupón fue validado, pero no aplica porque todos los productos del carrito están en promoción."
      );
      toast.error("Este cupón no aplica a productos en promoción");
      return;
    }

    setAppliedCoupon(validacion.coupon as CouponRow);

    if ((validacion.coupon as CouponRow).discount_type === "percent") {
      setCouponMessage(
        hasPromoItems
          ? `Cupón aplicado solo a productos sin promoción: ${(validacion.coupon as CouponRow).code} (${(validacion.coupon as CouponRow).discount_value}% dcto.)`
          : `Cupón aplicado: ${(validacion.coupon as CouponRow).code} (${(validacion.coupon as CouponRow).discount_value}% dcto.)`
      );
    } else {
      setCouponMessage(
        hasPromoItems
          ? `Cupón aplicado solo a productos sin promoción: ${(validacion.coupon as CouponRow).code} ($${Number(
              (validacion.coupon as CouponRow).discount_value
            ).toLocaleString("es-CL")} dcto.)`
          : `Cupón aplicado: ${(validacion.coupon as CouponRow).code} ($${Number(
              (validacion.coupon as CouponRow).discount_value
            ).toLocaleString("es-CL")} dcto.)`
      );
    }

    if (hasPromoItems) {
      toast.success("Cupón aplicado solo a productos sin promoción");
    } else {
      toast.success("Cupón aplicado correctamente");
    }
  };

  const limpiarCupon = () => {
    setCouponInput("");
    setAppliedCoupon(null);
    setCouponMessage("");
    toast.success("Cupón eliminado");
  };

  const guardarPedido = async (): Promise<SaveOrderResult> => {
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer: {
            nombre,
            telefono,
            correo,
            aceptaPromos,
          },
          order: {
            tipoEntrega,
            direccion,
            zona,
            otraZona,
            pago,
            deliveryPrice,
            couponCode: appliedCoupon?.code || null,
            isScheduled: isScheduledOrder,
            scheduledFor: isScheduledOrder ? scheduledFor : null,
          },
          cart,
        }),
      });

      const data = (await res.json()) as SaveOrderResult & { error?: string };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Error al guardar el pedido.");
      }

      localStorage.setItem(
        "cliente",
        JSON.stringify({
          nombre,
          telefono,
          correo,
        })
      );

      localStorage.removeItem("order_mode");
      localStorage.removeItem("order_scheduled_for");

      return {
        ok: true,
        trackingCode: data.trackingCode,
        message:
          data.message || "Pedido enviado. Te avisaremos cuando sea confirmado.",
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al guardar el pedido.";
      console.error("Error guardando pedido:", message, error);
      return {
        ok: false,
        trackingCode: "",
        message,
      };
    }
  };

  const validarAntesDeEnviar = () => {
    const newErrors: FormErrors = {};

    if (cart.length === 0) {
      toast.error("Tu carrito está vacío");
      return false;
    }

    if (!nombre.trim()) {
      newErrors.nombre = "Ingresa tu nombre";
    }

    if (!telefono.trim()) {
      newErrors.telefono = "Ingresa tu teléfono";
    }

    if (!correo.trim()) {
      newErrors.correo = "Ingresa tu correo electrónico";
    } else if (!correoValido) {
      newErrors.correo = "Ingresa un correo válido";
    }

    if (!tipoEntrega) {
      newErrors.tipoEntrega = "Selecciona el tipo de pedido";
    }

    if (tipoEntrega === "Delivery" && !direccion.trim()) {
      newErrors.direccion = "Ingresa tu dirección";
    }

    if (tipoEntrega === "Delivery" && !zona) {
      newErrors.zona = "No se pudo determinar tu zona";
    }

    if (tipoEntrega === "Delivery" && zona === "Otra" && !otraZona.trim()) {
      newErrors.otraZona = "Ingresa una referencia para revisar el delivery";
    }

    if (!pago) {
      newErrors.pago = "Selecciona la forma de pago";
    }

    if (isScheduledOrder && !scheduledFor) {
      toast.error("Selecciona un horario para programar el pedido");
      return false;
    }

    setErrors(newErrors);

    const firstError = Object.values(newErrors)[0];
    if (firstError) {
      toast.error(firstError);
      return false;
    }

    return true;
  };

  const handleEnviarPedido = async () => {
    if (isSaving) return;

    if (!storeStatus.isOpen && !isScheduledOrder) {
      toast.error("En este momento la tienda está cerrada");
      return;
    }

    const esValido = validarAntesDeEnviar();
    if (!esValido) return;

    setIsSaving(true);

    const result = await guardarPedido();

    setIsSaving(false);

    if (!result.ok) {
      toast.error(result.message || "Error al guardar el pedido. Intenta nuevamente.");
      return;
    }

    toast.success(result.message || "Pedido enviado. Te avisaremos cuando sea confirmado.");
    clearCart();
    router.push(`/track/${result.trackingCode}`);
  };

  const handleScheduledDayChange = (dayKey: string) => {
    const matchingDay = schedulableDayOptions.find((day) => day.key === dayKey);
    if (!matchingDay || matchingDay.slots.length === 0) return;

    const nextSlot = matchingDay.slots[0].value;
    setSelectedScheduledDayKey(dayKey);
    setScheduledFor(nextSlot);
    localStorage.setItem("order_scheduled_for", nextSlot);
  };

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-[#c9dfc3]/20 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-[#c9dfc3] bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-[#046703]">Checkout</h1>
          <p className="mt-4 text-neutral-600">Tu carrito está vacío.</p>
          <button
            onClick={() => router.push("/menu")}
            className="mt-6 rounded-2xl bg-[#f6070b] px-5 py-3 text-white transition hover:opacity-90"
          >
            Volver al menú
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#c9dfc3]/20 px-4 py-10">
      <div className="mx-auto mb-8 max-w-6xl">
        <div className="mb-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Image
              src="/images/Logo_oficial.png"
              alt="Sole e Mare"
              width={96}
              height={96}
              className="h-16 w-16 object-contain sm:h-20 sm:w-20"
              priority
            />

            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[#69adb6]">
                Sole e Mare
              </p>
              <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#046703]">
                Checkout
              </h1>
            </div>
          </div>

          <button
            onClick={() => router.push("/menu")}
            className="rounded-full border border-[#c9dfc3] bg-white px-4 py-2 text-sm font-medium text-[#046703] shadow-sm transition hover:border-[#69adb6] hover:bg-[#69adb6]/10"
          >
            ← Volver al menú
          </button>
        </div>

        <p className="text-neutral-600">
          Completa tus datos y envía tu pedido.
        </p>

        <div className="mt-4">
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
              storeStatus.isOpen
                ? "border-[#046703]/20 bg-[#046703]/10 text-[#046703]"
                : "border-[#f6070b]/20 bg-[#f6070b]/10 text-[#f6070b]"
            }`}
          >
            {storeStatus.message}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <div
            className={`rounded-full border px-4 py-2 text-sm font-medium ${
              isScheduledOrder
                ? "border-[#f48e07]/20 bg-[#fff3e4] text-[#046703]"
                : "border-[#046703]/20 bg-[#046703]/10 text-[#046703]"
            }`}
          >
            {isScheduledOrder ? "Modo: pedido programado" : "Modo: pedir ahora"}
          </div>

          {isScheduledOrder && scheduledFor && (
            <div className="rounded-full border border-[#c9dfc3] bg-white px-4 py-2 text-sm text-neutral-600">
              {formatScheduledDateTime(scheduledFor)}
            </div>
          )}
        </div>

      </div>

      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#046703]">Tu pedido</h2>
            <button
              onClick={() => {
                clearCart();
                toast.success("Carrito vaciado");
              }}
              className="text-sm font-medium text-neutral-500 underline hover:text-[#f6070b]"
            >
              Vaciar carrito
            </button>
          </div>

          <div className="space-y-4">
            {cart.map((item) => (
              <div
                key={item.name}
                className="rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/12 p-4"
              >
                <div className="flex gap-4">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-24 w-24 rounded-2xl object-cover"
                    />
                  )}

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#046703]">
                          {item.name}
                          {isPromoItem(item) && (
                            <span className="ml-2 rounded-full bg-[#f48e07]/15 px-2 py-1 text-xs font-medium text-[#f48e07]">
                              Promo
                            </span>
                          )}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {item.isOnPromo &&
                            item.originalPrice &&
                            item.originalPrice > item.price && (
                              <span className="text-sm text-neutral-400 line-through">
                                ${item.originalPrice.toLocaleString("es-CL")}
                              </span>
                            )}

                          <span className="text-sm text-neutral-500">
                            ${item.price.toLocaleString("es-CL")} c/u
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          removeFromCart(item.name);
                          toast.success("Producto eliminado");
                        }}
                        className="text-sm font-medium text-[#f6070b] hover:opacity-80"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => decreaseQuantity(item.name)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c9dfc3] bg-white text-sm text-[#046703]"
                        >
                          -
                        </button>

                        <span className="min-w-[24px] text-center font-medium text-[#046703]">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => increaseQuantity(item.name)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c9dfc3] bg-white text-sm text-[#046703]"
                        >
                          +
                        </button>
                      </div>

                      <p className="font-bold text-[#f6070b]">
                        ${(item.price * item.quantity).toLocaleString("es-CL")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-2xl font-bold text-[#046703]">
            Datos del pedido
          </h2>

          <div className="space-y-4">
            <div>
              <input
                placeholder="Nombre"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  setErrors((prev) => ({ ...prev, nombre: undefined }));
                }}
                className={getInputClass(errors.nombre)}
              />
              {errors.nombre && (
                <p className="mt-1 text-sm text-[#f6070b]">{errors.nombre}</p>
              )}
            </div>

            <div>
              <input
                placeholder="Teléfono"
                value={telefono}
                onChange={(e) => {
                  setTelefono(e.target.value);
                  setErrors((prev) => ({ ...prev, telefono: undefined }));
                }}
                className={getInputClass(errors.telefono)}
              />
              {errors.telefono && (
                <p className="mt-1 text-sm text-[#f6070b]">{errors.telefono}</p>
              )}
            </div>

            <div>
              <input
                placeholder="Correo electrónico"
                value={correo}
                onChange={(e) => {
                  setCorreo(e.target.value);
                  setErrors((prev) => ({ ...prev, correo: undefined }));
                }}
                className={getInputClass(
                  errors.correo || (correo && !correoValido ? "error" : "")
                )}
              />
              {(errors.correo || (correo && !correoValido)) && (
                <p className="mt-1 text-sm text-[#f6070b]">
                  {errors.correo || "Ingresa un correo válido."}
                </p>
              )}
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/20 p-4 text-sm">
              <input
                type="checkbox"
                checked={aceptaPromos}
                onChange={(e) => setAceptaPromos(e.target.checked)}
                className="mt-1"
              />
              <span className="text-neutral-700">
                Quiero recibir promociones y novedades de Sole e Mare por correo
                y WhatsApp.
              </span>
            </label>

            {isScheduledOrder && selectedScheduledDay && (
              <div className="rounded-2xl border border-[#f48e07]/20 bg-[#fff3e4] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f48e07]">
                  Pedido programado
                </p>

                <p className="mt-2 text-sm leading-6 text-neutral-700">
                  Tu pedido quedará agendado para{" "}
                  <strong className="text-[#046703]">
                    {selectedScheduledDay.label}
                  </strong>
                  .
                </p>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-[#046703]">
                    Día
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {schedulableDayOptions.map((day) => {
                      const isActive = day.key === selectedScheduledDayKey;

                      return (
                        <button
                          key={day.key}
                          type="button"
                          onClick={() => handleScheduledDayChange(day.key)}
                          className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                            isActive
                              ? "border-[#046703] bg-[#046703] text-white"
                              : "border-[#c9dfc3] bg-white text-neutral-700 hover:border-[#69adb6] hover:bg-[#69adb6]/10"
                          }`}
                        >
                          {day.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-[#046703]">
                    Hora deseada
                  </label>
                  <select
                    value={scheduledFor}
                    onChange={(e) => {
                      setScheduledFor(e.target.value);
                      localStorage.setItem("order_scheduled_for", e.target.value);
                    }}
                    className={getInputClass()}
                  >
                    {schedulableSlots.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>

                {scheduledFor && (
                  <p className="mt-3 text-sm text-neutral-600">
                    Programado para:{" "}
                    <strong className="text-[#046703]">
                      {formatScheduledDateTime(scheduledFor)}
                    </strong>
                  </p>
                )}
              </div>
            )}

            <div>
              <select
                value={tipoEntrega}
                onChange={(e) => {
                  const value = e.target.value;
                  setTipoEntrega(value);
                  setErrors((prev) => ({ ...prev, tipoEntrega: undefined }));

                  if (value !== "Delivery") {
                    setDireccion("");
                    setZona("");
                    setOtraZona("");
                    setPosition(null);
                    setDetectedZonePrice(0);
                    setErrors((prev) => ({
                      ...prev,
                      direccion: undefined,
                      zona: undefined,
                      otraZona: undefined,
                    }));
                  }
                }}
                className={getInputClass(errors.tipoEntrega)}
              >
                <option value="">Tipo de pedido</option>
                <option value="Retiro en local">Retiro en local</option>
                <option value="Delivery">Delivery</option>
              </select>
              {errors.tipoEntrega && (
                <p className="mt-1 text-sm text-[#f6070b]">
                  {errors.tipoEntrega}
                </p>
              )}
            </div>

            {tipoEntrega === "Delivery" && (
              <>
                <LoadScript
                  googleMapsApiKey={
                    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
                  }
                  libraries={["places", "geometry"]}
                >
                  <div>
                    <Autocomplete
                      onLoad={(auto) => setAutocomplete(auto)}
                      onPlaceChanged={onPlaceChanged}
                    >
                      <input
                        placeholder="Busca tu dirección"
                        value={direccion}
                        onChange={(e) => {
                          setDireccion(e.target.value);
                          setErrors((prev) => ({ ...prev, direccion: undefined }));
                        }}
                        className={getInputClass(errors.direccion)}
                      />
                    </Autocomplete>
                    {errors.direccion && (
                      <p className="mt-1 text-sm text-[#f6070b]">
                        {errors.direccion}
                      </p>
                    )}
                  </div>

                  {zonesLoading && (
                    <p className="text-sm text-neutral-500">
                      Cargando zonas de delivery...
                    </p>
                  )}

                  {position && (
                    <div className="overflow-hidden rounded-2xl border border-[#c9dfc3]">
                      <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={position}
                        zoom={13}
                      >
                        <Marker position={position} />

                        {deliveryZones.map((zone) => (
                          <Polygon
                            key={zone.id}
                            paths={zone.path}
                            options={{
                              fillColor: zona === zone.name ? "#f48e07" : "#69adb6",
                              fillOpacity: zona === zone.name ? 0.22 : 0.1,
                              strokeColor: zona === zone.name ? "#f48e07" : "#69adb6",
                              strokeOpacity: 0.9,
                              strokeWeight: zona === zone.name ? 3 : 2,
                            }}
                          />
                        ))}
                      </GoogleMap>
                    </div>
                  )}
                </LoadScript>

                <div className="rounded-3xl border border-[#c9dfc3] bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#69adb6]">
                        Zona de delivery
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-medium ${
                            zona && zona !== "Otra"
                              ? "bg-[#046703]/10 text-[#046703]"
                              : zona === "Otra"
                              ? "bg-[#f6070b]/10 text-[#f6070b]"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {zona || "Pendiente de detectar"}
                        </span>

                        {zona && zona !== "Otra" && (
                          <span className="rounded-full bg-[#f48e07]/10 px-3 py-1 text-sm font-medium text-[#f48e07]">
                            Delivery ${deliveryPrice.toLocaleString("es-CL")}
                          </span>
                        )}
                      </div>

                      {zona && zona !== "Otra" ? (
                        <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600">
                          Detectamos automáticamente tu sector y aplicamos el
                          valor de despacho correspondiente.
                        </p>
                      ) : zona === "Otra" ? (
                        <p className="mt-3 max-w-xl text-sm leading-6 text-[#f6070b]">
                          Tu dirección está fuera de las zonas automáticas.
                          Puedes dejar una referencia y el valor del delivery
                          quedará por confirmar.
                        </p>
                      ) : (
                        <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-500">
                          Selecciona una dirección desde el buscador para
                          detectar tu zona de reparto.
                        </p>
                      )}
                    </div>

                    <div
                      className={`min-w-[170px] rounded-2xl border px-4 py-3 text-center ${
                        zona && zona !== "Otra"
                          ? "border-[#046703]/15 bg-[#046703]/5"
                          : zona === "Otra"
                          ? "border-[#f6070b]/15 bg-[#f6070b]/5"
                          : "border-neutral-200 bg-neutral-50"
                      }`}
                    >
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        Estado delivery
                      </p>

                      <p
                        className={`mt-2 text-sm font-semibold ${
                          zona && zona !== "Otra"
                            ? "text-[#046703]"
                            : zona === "Otra"
                            ? "text-[#f6070b]"
                            : "text-neutral-500"
                        }`}
                      >
                        {zona && zona !== "Otra"
                          ? "Cobertura disponible"
                          : zona === "Otra"
                          ? "Fuera de cobertura automática"
                          : "Esperando dirección"}
                      </p>
                    </div>
                  </div>
                </div>

                {errors.zona && (
                  <p className="mt-1 text-sm text-[#f6070b]">{errors.zona}</p>
                )}

                {zona === "Otra" && (
                  <div>
                    <input
                      placeholder="Referencia o sector para revisar el delivery"
                      value={otraZona}
                      onChange={(e) => {
                        setOtraZona(e.target.value);
                        setErrors((prev) => ({ ...prev, otraZona: undefined }));
                      }}
                      className={getInputClass(errors.otraZona)}
                    />
                    {errors.otraZona && (
                      <p className="mt-1 text-sm text-[#f6070b]">
                        {errors.otraZona}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            <div>
              <select
                value={pago}
                onChange={(e) => {
                  setPago(e.target.value);
                  setErrors((prev) => ({ ...prev, pago: undefined }));
                }}
                className={getInputClass(errors.pago)}
              >
                <option value="">Forma de pago</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Débito">Débito</option>
                <option value="Crédito">Crédito</option>
              </select>
              {errors.pago && (
                <p className="mt-1 text-sm text-[#f6070b]">{errors.pago}</p>
              )}
            </div>

            <div className="rounded-2xl border border-[#f48e07]/25 bg-[#f48e07]/10 p-4">
              <p className="mb-3 font-semibold text-[#046703]">
                Cupón de descuento
              </p>

              <div className="flex gap-2">
                <input
                  placeholder="Ingresa tu cupón"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  className="flex-1 rounded-2xl border border-[#c9dfc3] bg-white p-3 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                />

                <button
                  type="button"
                  onClick={aplicarCupon}
                  className="rounded-2xl bg-[#046703] px-4 py-3 font-medium text-white transition hover:opacity-90"
                >
                  Aplicar
                </button>
              </div>

              {couponMessage && (
                <p
                  className={`mt-3 text-sm ${
                    appliedCoupon ? "text-[#046703]" : "text-[#f6070b]"
                  }`}
                >
                  {couponMessage}
                </p>
              )}

              {appliedCoupon && (
                <button
                  type="button"
                  onClick={limpiarCupon}
                  className="mt-2 text-sm text-neutral-500 underline hover:text-[#f6070b]"
                >
                  Quitar cupón
                </button>
              )}

              {hasPromoItems && (
                <p className="mt-3 text-xs text-neutral-600">
                  Los productos en promoción no reciben descuento adicional por
                  cupón.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/12 p-5">
            <div className="flex items-center justify-between">
              <span className="text-neutral-600">Subtotal</span>
              <span className="font-medium text-[#046703]">
                ${subtotal.toLocaleString("es-CL")}
              </span>
            </div>

            {hasPromoItems && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-neutral-600">Productos en promoción</span>
                <span className="font-medium text-[#046703]">
                  ${promoItemsTotal.toLocaleString("es-CL")}
                </span>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between">
              <span className="text-neutral-600">Base cupón aplicable</span>
              <span className="font-medium text-[#046703]">
                ${eligibleSubtotalForCoupon.toLocaleString("es-CL")}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-neutral-600">Descuento</span>
              <span className="font-medium text-[#046703]">
                - ${discountAmount.toLocaleString("es-CL")}
              </span>
            </div>

            {tipoEntrega === "Delivery" && zona && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-neutral-600">Zona detectada</span>
                <span
                  className={`font-medium ${
                    zona === "Otra" ? "text-[#f6070b]" : "text-[#046703]"
                  }`}
                >
                  {zona}
                </span>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between">
              <span className="text-neutral-600">Delivery</span>
              <span className="font-medium text-[#046703]">
                {tipoEntrega === "Delivery"
                  ? zona === "Otra"
                    ? "Por confirmar"
                    : zona
                    ? `$${deliveryPrice.toLocaleString("es-CL")}`
                    : "Pendiente"
                  : "$0"}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[#c9dfc3] pt-4 text-lg font-bold">
              <span className="text-[#046703]">Total</span>
              <span className="text-[#f6070b]">
                {tipoEntrega === "Delivery" && zona === "Otra"
                  ? `$${subtotalWithDiscount.toLocaleString("es-CL")} + delivery`
                  : `$${totalFinal.toLocaleString("es-CL")}`}
              </span>
            </div>
          </div>

          {!storeStatus.isOpen && !isScheduledOrder && (
            <div className="mt-4 rounded-2xl border border-[#f6070b]/20 bg-[#f6070b]/10 p-4 text-sm text-[#f6070b]">
              {storeStatus.message}
            </div>
          )}

          {isScheduledOrder && scheduledFor && (
            <div className="mt-4 rounded-2xl border border-[#046703]/15 bg-[#046703]/8 p-4 text-sm text-[#046703]">
              Este pedido se enviará como programado para{" "}
              <strong>{formatScheduledDateTime(scheduledFor)}</strong>.
            </div>
          )}

          <button
            onClick={handleEnviarPedido}
            disabled={isSaving || (!storeStatus.isOpen && !isScheduledOrder)}
            className={`mt-6 block w-full rounded-2xl py-4 text-center text-white transition ${
              isSaving || (!storeStatus.isOpen && !isScheduledOrder)
                ? "cursor-not-allowed bg-neutral-400"
                : "bg-[#f6070b] hover:opacity-90"
            }`}
          >
            {isSaving
              ? "Guardando pedido..."
              : isScheduledOrder
              ? "Programar pedido"
              : storeStatus.isOpen
              ? "Enviar pedido"
              : "Tienda cerrada"}
          </button>
        </section>
      </div>
    </main>
  );
}
