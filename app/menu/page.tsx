"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useCart } from "../../context/CartContext";
import Cart from "../../components/Cart";
import {
  getDateKeyFromIso,
  getSchedulableDays,
  formatScheduledDateTime,
  getScheduleSlotsForDay,
  getStoreStatus,
} from "../../lib/storeHours";

type Variant = {
  id: number;
  label: string;
  description?: string | null;
  priceAdjustment?: number;
};

type OptionGroup = {
  id: number;
  title: string;
  sourceProductId: number;
  minSelect: number;
  maxSelect: number;
  variants: Variant[];
};

type MenuItem = {
  id: number;
  name: string;
  price: number;
  originalPrice?: number | null;
  promoPrice?: number | null;
  isOnPromo?: boolean;
  description?: string | null;
  badge?: string | null;
  image?: string | null;
  variants?: Variant[];
  optionGroups?: OptionGroup[];
};

type MenuSection = {
  category: string;
  items: MenuItem[];
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function MenuPage() {
  const { addToCart, cart } = useCart();
  const hasCartItems = cart.length > 0;
  const storeStatus = getStoreStatus();
  const schedulableDays = useMemo(() => getSchedulableDays(), []);
  const schedulableDayOptions = useMemo(
    () =>
      schedulableDays.map((day) => ({
        ...day,
        slots: getScheduleSlotsForDay(day, 30, new Date()),
      })),
    [schedulableDays]
  );

  const [menuData, setMenuData] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scheduledOrderEnabled, setScheduledOrderEnabled] = useState(false);
  const [isScheduleConfiguratorOpen, setIsScheduleConfiguratorOpen] = useState(false);
  const [selectedScheduledDayKey, setSelectedScheduledDayKey] = useState("");
  const [selectedScheduledSlot, setSelectedScheduledSlot] = useState("");
  const [draftScheduledDayKey, setDraftScheduledDayKey] = useState("");
  const [draftScheduledSlot, setDraftScheduledSlot] = useState("");

  const [selectedVariants, setSelectedVariants] = useState<
    Record<number, number>
  >({});

  const [selectedOptionGroupVariants, setSelectedOptionGroupVariants] =
    useState<Record<string, number>>({});

  const draftScheduledDay =
    schedulableDayOptions.find((day) => day.key === draftScheduledDayKey) ||
    schedulableDayOptions[0] ||
    null;

  const draftSchedulableSlots = draftScheduledDay?.slots || [];

  useEffect(() => {
    const savedMode = localStorage.getItem("order_mode");
    const savedScheduledFor = localStorage.getItem("order_scheduled_for");
    const isScheduled = savedMode === "scheduled";

    if (schedulableDayOptions.length === 0) {
      setScheduledOrderEnabled(false);
      setSelectedScheduledDayKey("");
      setSelectedScheduledSlot("");
      return;
    }

    const defaultDay = schedulableDayOptions[0];
    const defaultSlot = defaultDay.slots[0]?.value || "";

    setSelectedScheduledDayKey(defaultDay.key);
    setSelectedScheduledSlot(defaultSlot);
    setDraftScheduledDayKey(defaultDay.key);
    setDraftScheduledSlot(defaultSlot);

    if (isScheduled && savedScheduledFor) {
      const savedDayKey = getDateKeyFromIso(savedScheduledFor);
      const matchingDay = schedulableDayOptions.find(
        (day) => day.key === savedDayKey
      );

      if (matchingDay) {
        const matchingSlot = matchingDay.slots.find(
          (slot) => slot.value === savedScheduledFor
        );

        if (matchingSlot) {
          setScheduledOrderEnabled(true);
          setSelectedScheduledDayKey(matchingDay.key);
          setSelectedScheduledSlot(matchingSlot.value);
          setDraftScheduledDayKey(matchingDay.key);
          setDraftScheduledSlot(matchingSlot.value);
          setIsScheduleConfiguratorOpen(false);
          return;
        }
      }
    }

    setScheduledOrderEnabled(false);
    setIsScheduleConfiguratorOpen(false);
  }, [schedulableDayOptions]);

  useEffect(() => {
    async function loadMenu() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/menu", { cache: "no-store" });
        const payload = await res.json();

        if (!res.ok) {
          throw new Error(
            payload?.detail || payload?.error || "No se pudo cargar el menú."
          );
        }

        const data = payload as MenuSection[];
        setMenuData(data);

        const initialVariants: Record<number, number> = {};
        const initialOptionGroupVariants: Record<string, number> = {};

        data.forEach((section) => {
          section.items.forEach((item) => {
            if (item.variants && item.variants.length > 0) {
              initialVariants[item.id] = item.variants[0].id;
            }

            if (item.optionGroups && item.optionGroups.length > 0) {
              item.optionGroups.forEach((group) => {
                if (group.variants.length > 0) {
                  initialOptionGroupVariants[`${item.id}-${group.id}`] =
                    group.variants[0].id;
                }
              });
            }
          });
        });

        setSelectedVariants(initialVariants);
        setSelectedOptionGroupVariants(initialOptionGroupVariants);
      } catch (error: unknown) {
        console.error("Error cargando menú:", error);
        setError(
          error instanceof Error ? error.message : "No se pudo cargar el menú."
        );
      } finally {
        setLoading(false);
      }
    }

    loadMenu();
  }, []);

  const openScheduleConfigurator = () => {
    if (schedulableDayOptions.length === 0) {
      toast.error("No encontramos horarios disponibles para programar.");
      return;
    }

    const activeDayKey =
      selectedScheduledDayKey || schedulableDayOptions[0]?.key || "";
    const activeDay =
      schedulableDayOptions.find((day) => day.key === activeDayKey) ||
      schedulableDayOptions[0];
    const activeSlot =
      selectedScheduledSlot ||
      activeDay?.slots[0]?.value ||
      "";

    setDraftScheduledDayKey(activeDay?.key || "");
    setDraftScheduledSlot(activeSlot);
    setIsScheduleConfiguratorOpen(true);
  };

  const activateScheduledOrder = () => {
    if (!draftScheduledSlot) {
      toast.error("No encontramos un horario disponible para programar.");
      return;
    }

    setSelectedScheduledDayKey(draftScheduledDayKey);
    setSelectedScheduledSlot(draftScheduledSlot);
    localStorage.setItem("order_mode", "scheduled");
    localStorage.setItem("order_scheduled_for", draftScheduledSlot);
    setScheduledOrderEnabled(true);
    setIsScheduleConfiguratorOpen(false);
    toast.success("Pedido programado guardado");
  };

  const clearScheduledOrder = () => {
    localStorage.removeItem("order_mode");
    localStorage.removeItem("order_scheduled_for");
    setScheduledOrderEnabled(false);
    setIsScheduleConfiguratorOpen(false);
    toast.success("Volviste al modo normal");
  };

  const cancelScheduleConfigurator = () => {
    setDraftScheduledDayKey(selectedScheduledDayKey);
    setDraftScheduledSlot(selectedScheduledSlot);
    setIsScheduleConfiguratorOpen(false);
  };

  const selectScheduledDay = (dayKey: string) => {
    const matchingDay = schedulableDayOptions.find((day) => day.key === dayKey);
    if (!matchingDay || matchingDay.slots.length === 0) return;

    const nextSlot = matchingDay.slots[0].value;
    setDraftScheduledDayKey(dayKey);
    setDraftScheduledSlot(nextSlot);
  };

  const selectScheduledSlot = (slotValue: string) => {
    setDraftScheduledSlot(slotValue);
  };

  return (
    <main className="min-h-screen bg-[#c9dfc3]/20 px-4 pb-28 pt-8 sm:px-6 md:pb-16">
      <div
        className={`mx-auto max-w-7xl transition-all duration-300 ${
          hasCartItems ? "md:pr-[430px]" : ""
        }`}
      >
        <div className="mb-8">
          <div className="flex justify-end">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-[#69adb6]/25 bg-white px-4 py-2 text-sm text-[#046703] shadow-sm transition hover:border-[#69adb6] hover:bg-[#69adb6]/10"
            >
              ← Volver al inicio
            </Link>
          </div>

          <div className="-mt-4 text-center sm:-mt-6">
            <div className="flex justify-center">
              <Image
                src="/images/Logo_oficial.png"
                alt="Sole e Mare"
                width={360}
                height={360}
                className="h-56 w-56 object-contain sm:h-64 sm:w-64 md:h-72 md:w-72"
                priority
              />
            </div>

            <p className="-mt-2 text-sm uppercase tracking-[0.35em] text-[#69adb6] sm:-mt-3">
              Sole e Mare
            </p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#046703] sm:text-5xl md:text-6xl">
              Nuestro menú
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg">
              Pizzas estilo napolitano, promociones, gelato, postres y bebidas.
              Elige tus favoritos y agrégalos a tu pedido en pocos pasos.
            </p>

            <div className="mx-auto mt-3 max-w-2xl">
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

            <div className="mx-auto mt-4 max-w-2xl rounded-[28px] border border-[#c9dfc3] bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#69adb6]">
                ¿Cómo quieres pedir?
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={clearScheduledOrder}
                  disabled={!storeStatus.isOpen}
                  className={`rounded-[24px] border px-5 py-4 text-left transition ${
                    !scheduledOrderEnabled
                      ? "border-[#046703]/20 bg-[#046703] text-white shadow-sm"
                      : "border-[#c9dfc3] bg-[#f8fbf7] text-neutral-700 hover:border-[#69adb6] hover:bg-[#69adb6]/10"
                  } ${
                    !storeStatus.isOpen
                      ? "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400 shadow-none hover:border-neutral-200 hover:bg-neutral-100"
                      : ""
                  }`}
                >
                  <div className="text-sm font-semibold">Pedir ahora</div>
                </button>

                <button
                  type="button"
                  onClick={openScheduleConfigurator}
                  disabled={schedulableDayOptions.length === 0}
                  className={`rounded-[24px] border px-5 py-4 text-left transition ${
                    scheduledOrderEnabled
                      ? "border-[#f48e07]/20 bg-[#fff3e4] text-[#046703] shadow-sm"
                      : "border-[#f48e07]/20 bg-white text-neutral-700 hover:border-[#f48e07] hover:bg-[#fff3e4]"
                  } ${
                    schedulableDayOptions.length === 0
                      ? "cursor-not-allowed opacity-60"
                      : ""
                  }`}
                >
                  <div className="text-sm font-semibold">Programar para más tarde</div>
                </button>
              </div>

              {schedulableDayOptions.length > 0 && isScheduleConfiguratorOpen && (
                <div className="mt-4 rounded-[24px] border border-[#f48e07]/20 bg-[#fffaf4] p-4 text-left">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f48e07]">
                          Fecha
                        </p>

                        {schedulableDayOptions.map((day) => {
                          const isActive = draftScheduledDay?.key === day.key;

                          return (
                            <button
                              key={day.key}
                              type="button"
                              onClick={() => selectScheduledDay(day.key)}
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

                      {draftScheduledDay && (
                        <p className="mt-3 text-sm text-neutral-600">
                          {draftScheduledDay.label}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f48e07]">
                        Hora
                      </label>
                      <select
                        value={draftScheduledSlot}
                        onChange={(e) => selectScheduledSlot(e.target.value)}
                        className="mt-2 w-full rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3 text-sm text-neutral-700 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                      >
                        {draftSchedulableSlots.map((slot) => (
                          <option key={slot.value} value={slot.value}>
                            {slot.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={activateScheduledOrder}
                      disabled={!draftScheduledSlot}
                      className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white transition ${
                        draftScheduledSlot
                          ? "bg-[#046703] hover:opacity-90"
                          : "cursor-not-allowed bg-neutral-300"
                      }`}
                    >
                      Confirmar
                    </button>
                  </div>

                  {draftScheduledSlot && (
                    <p className="mt-4 text-sm text-neutral-600">
                      Programado para{" "}
                      <strong className="text-[#046703]">
                        {formatScheduledDateTime(draftScheduledSlot)}
                      </strong>
                      .
                    </p>
                  )}

                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={cancelScheduleConfigurator}
                      className="text-sm font-medium text-neutral-500 underline hover:text-[#046703]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {scheduledOrderEnabled && selectedScheduledSlot && !isScheduleConfiguratorOpen && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#f48e07]/20 bg-[#fffaf4] px-4 py-3 text-left">
                  <p className="text-sm text-neutral-600">
                    Programado para{" "}
                    <strong className="text-[#046703]">
                      {formatScheduledDateTime(selectedScheduledSlot)}
                    </strong>
                    .
                  </p>

                  <button
                    type="button"
                    onClick={openScheduleConfigurator}
                    className="rounded-full border border-[#c9dfc3] bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:border-[#69adb6] hover:bg-[#69adb6]/10"
                  >
                    Cambiar horario
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading && (
          <div className="rounded-3xl border border-[#c9dfc3] bg-white p-8 text-center text-[#046703] shadow-sm">
            Cargando menú...
          </div>
        )}

        {error && !loading && (
          <div className="rounded-3xl border border-[#f6070b]/20 bg-[#f6070b]/10 p-8 text-center text-[#f6070b] shadow-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="sticky top-3 z-20 mb-10 overflow-x-auto rounded-2xl border border-[#c9dfc3] bg-white/95 p-3 shadow-sm backdrop-blur-md">
              <div className="flex min-w-max gap-3">
                {menuData.map((section) => (
                  <a
                    key={section.category}
                    href={`#${slugify(section.category)}`}
                    className="rounded-full border border-[#c9dfc3] bg-white px-4 py-2 text-sm font-medium text-[#046703] transition hover:border-[#69adb6] hover:bg-[#69adb6]/10"
                  >
                    {section.category}
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-12">
              {menuData.map((section) => {
                const sectionId = slugify(section.category);

                return (
                  <section
                    key={section.category}
                    id={sectionId}
                    className="scroll-mt-28"
                  >
                    <div className="mb-6 flex items-end justify-between gap-4 border-b border-[#c9dfc3] pb-3">
                      <h2 className="text-2xl font-semibold text-[#046703] sm:text-3xl">
                        {section.category}
                      </h2>

                      <span className="shrink-0 text-sm text-neutral-500">
                        {section.items.length} productos
                      </span>
                    </div>

                    <div className="grid gap-5">
                      {section.items.map((item) => {
                        const hasImage = Boolean(item.image);
                        const hasVariants = !!item.variants?.length;
                        const hasOptionGroups = !!item.optionGroups?.length;

                        const selectedVariant =
                          item.variants?.find(
                            (variant) => variant.id === selectedVariants[item.id]
                          ) ?? null;

                        const groupSelections =
                          item.optionGroups?.map((group) => {
                            const selectedId =
                              selectedOptionGroupVariants[`${item.id}-${group.id}`];
                            const selected =
                              group.variants.find((v) => v.id === selectedId) ??
                              group.variants[0] ??
                              null;

                            return {
                              group,
                              selected,
                            };
                          }) ?? [];

                        const optionGroupsPriceAdjustment = groupSelections.reduce(
                          (acc, entry) =>
                            acc + Number(entry.selected?.priceAdjustment ?? 0),
                          0
                        );

                        const finalPrice =
                          item.price +
                          (selectedVariant?.priceAdjustment ?? 0) +
                          optionGroupsPriceAdjustment;

                        const selectionLabels = [
                          ...(selectedVariant ? [selectedVariant.label] : []),
                          ...groupSelections
                            .filter((entry) => entry.selected)
                            .map((entry) => entry.selected!.label),
                        ];

                        const itemDisplayName =
                          selectionLabels.length > 0
                            ? `${item.name} - ${selectionLabels.join(" / ")}`
                            : item.name;

                        const isPromo = item.isOnPromo ?? false;
                        const baseOriginalPrice =
                          item.originalPrice ?? (isPromo ? item.price : null);

                        const originalPriceWithVariant =
                          baseOriginalPrice !== null &&
                          baseOriginalPrice !== undefined
                            ? baseOriginalPrice +
                              (selectedVariant?.priceAdjustment ?? 0) +
                              optionGroupsPriceAdjustment
                            : null;

                        const addItem = () => {
                          addToCart({
                            name: itemDisplayName,
                            price: finalPrice,
                            image: item.image ?? undefined,
                            isOnPromo: item.isOnPromo ?? false,
                            originalPrice:
                              originalPriceWithVariant ?? undefined,
                            promoPrice: isPromo ? finalPrice : undefined,
                          });
                        };

                        const content = (
                          <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-xl font-semibold text-[#046703]">
                                  {item.name}
                                </h3>

                                {(item.badge || isPromo) && (
                                  <span className="rounded-full bg-[#f48e07] px-3 py-1 text-xs font-medium text-white">
                                    {item.badge || "Promo 🔥"}
                                  </span>
                                )}
                              </div>

                              {item.description && (
                                <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600 sm:text-[15px]">
                                  {item.description}
                                </p>
                              )}

                              {hasVariants && (
                                <div className="mt-4">
                                  <label className="mb-2 block text-sm font-medium text-[#046703]">
                                    Elige una opción
                                  </label>

                                  <select
                                    value={
                                      selectedVariants[item.id] ??
                                      item.variants![0].id
                                    }
                                    onChange={(e) =>
                                      setSelectedVariants((prev) => ({
                                        ...prev,
                                        [item.id]: Number(e.target.value),
                                      }))
                                    }
                                    className="w-full max-w-xs rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3 text-sm text-neutral-800 shadow-sm outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                                  >
                                    {item.variants!.map((variant) => (
                                      <option key={variant.id} value={variant.id}>
                                        {variant.label}
                                      </option>
                                    ))}
                                  </select>

                                  {selectedVariant?.description && (
                                    <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
                                      {selectedVariant.description}
                                    </p>
                                  )}
                                </div>
                              )}

                              {hasOptionGroups && (
                                <div className="mt-4 space-y-4">
                                  {item.optionGroups!.map((group) => {
                                    const selectedId =
                                      selectedOptionGroupVariants[
                                        `${item.id}-${group.id}`
                                      ] ?? group.variants[0]?.id;

                                    const selected =
                                      group.variants.find(
                                        (v) => v.id === selectedId
                                      ) ?? group.variants[0];

                                    return (
                                      <div key={group.id}>
                                        <label className="mb-2 block text-sm font-medium text-[#046703]">
                                          {group.title}
                                        </label>

                                        <select
                                          value={selectedId}
                                          onChange={(e) =>
                                            setSelectedOptionGroupVariants(
                                              (prev) => ({
                                                ...prev,
                                                [`${item.id}-${group.id}`]:
                                                  Number(e.target.value),
                                              })
                                            )
                                          }
                                          className="w-full max-w-xs rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3 text-sm text-neutral-800 shadow-sm outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                                        >
                                          {group.variants.map((variant) => (
                                            <option
                                              key={variant.id}
                                              value={variant.id}
                                            >
                                              {variant.label}
                                            </option>
                                          ))}
                                        </select>

                                        {selected?.description && (
                                          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
                                            {selected.description}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            <div className="mt-5 flex items-center justify-between gap-4">
                              <div className="flex flex-col">
                                {isPromo &&
                                  originalPriceWithVariant &&
                                  originalPriceWithVariant > finalPrice && (
                                    <span className="text-sm text-neutral-400 line-through">
                                      $
                                      {originalPriceWithVariant.toLocaleString(
                                        "es-CL"
                                      )}
                                    </span>
                                  )}

                                <p className="text-2xl font-bold text-[#f6070b]">
                                  ${finalPrice.toLocaleString("es-CL")}
                                </p>
                              </div>

                              <button
                                onClick={addItem}
                                className="rounded-2xl bg-[#f6070b] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:scale-[1.02] hover:opacity-90"
                              >
                                + Agregar
                              </button>
                            </div>
                          </div>
                        );

                        return (
                          <article
                            key={item.id}
                            className="overflow-hidden rounded-3xl border border-[#c9dfc3] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                          >
                            {hasImage ? (
                              <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
                                <div className="mx-auto flex w-fit shrink-0 items-center justify-center rounded-3xl border border-[#c9dfc3]/70 bg-[#c9dfc3]/20 p-4 shadow-inner sm:mx-0 sm:w-[150px] sm:border-0">
                                  <Image
                                    src={item.image!}
                                    alt={item.name}
                                    width={320}
                                    height={320}
                                    className="h-52 w-52 rounded-2xl object-contain transition duration-300 hover:scale-105 sm:h-32 sm:w-32"
                                  />
                                </div>

                                <div className="min-w-0 flex-1">{content}</div>
                              </div>
                            ) : (
                              <div>{content}</div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Cart />
    </main>
  );
}
