"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ImageUploader from "../../../components/ImageUploader";
import {
  bannerVariantOptions,
  mapBannerRecordToSlide,
  recommendedBannerSpecs,
  type BannerSlide,
  type BannerRecord,
  type BannerType,
} from "../../../lib/bannerSlides";

type BannerForm = {
  type: BannerType;
  visual_variant: string;
  image_url: string;
  badge: string;
  title: string;
  description: string;
  primary_cta_label: string;
  primary_cta_href: string;
  code: string;
  price_text: string;
  old_price_text: string;
  is_active: boolean;
  sort_order: string;
};

const emptyForm: BannerForm = {
  type: "hero",
  visual_variant: "default_dark",
  image_url: "",
  badge: "",
  title: "",
  description: "",
  primary_cta_label: "",
  primary_cta_href: "/menu",
  code: "",
  price_text: "",
  old_price_text: "",
  is_active: true,
  sort_order: "0",
};

function buildDefaultForm(type: BannerType): BannerForm {
  return {
    ...emptyForm,
    type,
    visual_variant:
      type === "hero"
        ? bannerVariantOptions.hero[0].value
        : bannerVariantOptions.coupon[0].value,
    primary_cta_href: type === "coupon" ? "/menu?coupon=" : "/menu",
  };
}

function mapFormToBannerRecord(form: BannerForm): BannerRecord {
  return {
    id: "preview",
    type: form.type,
    visual_variant: form.visual_variant,
    image_url: form.image_url || "/images/portada_descuento.png",
    badge: form.badge || "Badge",
    title: form.title || "Título del banner",
    description: form.description || "Descripción del banner para vista previa.",
    primary_cta_label: form.primary_cta_label || "Ver más",
    primary_cta_href: form.primary_cta_href || "/menu",
    code: form.type === "coupon" ? form.code || "CODIGO20" : null,
    price_text: form.type === "hero" ? form.price_text || null : null,
    old_price_text: form.type === "hero" ? form.old_price_text || null : null,
    is_active: form.is_active,
    sort_order: Number(form.sort_order || 0),
  };
}

function BannerPreview({ slide }: { slide: BannerSlide }) {
  if (slide.type === "coupon") {
    return (
      <div className="overflow-hidden rounded-[2rem] border border-[#c9dfc3] bg-white shadow-sm">
        <div className="flex min-h-[340px] items-center justify-between gap-8 p-8">
          <div className="max-w-lg">
            <span className="rounded-full bg-[#c9dfc3] px-3 py-1 text-xs font-semibold uppercase text-[#046703]">
              {slide.badge}
            </span>

            <h3 className="mt-4 text-3xl font-bold text-neutral-900 md:text-5xl">
              {slide.title}
            </h3>

            <p className="mt-4 text-neutral-600">
              {slide.description}{" "}
              <span className="rounded bg-gray-100 px-2 py-1 font-semibold text-gray-900">
                {slide.code}
              </span>
            </p>

            <button
              type="button"
              className="mt-6 rounded-xl bg-[#f6070b] px-5 py-3 text-sm font-semibold text-white"
            >
              {slide.primaryCta.label}
            </button>
          </div>

          <div className="hidden md:flex md:w-[48%] md:justify-end">
            <div className="relative h-[260px] w-[320px] overflow-hidden rounded-[1.75rem] bg-[#f8f5ef] lg:h-[360px] lg:w-[460px]">
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                className={slide.imageClassName || "object-contain object-center"}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[340px] overflow-hidden rounded-[2rem] border border-[#c9dfc3] shadow-sm md:min-h-[500px]">
      <Image
        src={slide.image}
        alt={slide.title}
        fill
        className={slide.imageClassName || "object-cover object-center"}
      />

      <div
        className={`absolute inset-0 ${
          slide.overlayClassName ||
          "bg-gradient-to-r from-black/70 via-black/30 to-transparent"
        }`}
      />

      <div className="absolute inset-0 flex items-center">
        <div className="max-w-2xl px-6 text-white md:px-12">
          <span className="rounded-full bg-[#f48e07] px-4 py-1 text-xs font-bold uppercase">
            {slide.badge}
          </span>

          <h3 className="mt-5 whitespace-pre-line text-4xl font-black md:text-7xl">
            {slide.title}
          </h3>

          <p className="mt-4 text-white/90">{slide.description}</p>

          {slide.price && (
            <div className="mt-4 flex items-end gap-3">
              <span className="text-4xl font-bold">{slide.price}</span>
              {slide.oldPrice ? (
                <span className="text-white/60 line-through">{slide.oldPrice}</span>
              ) : null}
            </div>
          )}

          <button
            type="button"
            className="mt-6 rounded-xl bg-[#f6070b] px-6 py-3 font-semibold"
          >
            {slide.primaryCta.label}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBannersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banners, setBanners] = useState<BannerRecord[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newBanner, setNewBanner] = useState<BannerForm>(buildDefaultForm("hero"));
  const [editForm, setEditForm] = useState<BannerForm>(buildDefaultForm("hero"));

  const loadBanners = async () => {
    const res = await fetch("/api/admin/banners", { cache: "no-store" });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      toast.error(data.error || "No se pudieron cargar los banners");
      return;
    }

    setBanners(data.banners || []);
  };

  useEffect(() => {
    const init = async () => {
      await loadBanners();
      setLoading(false);
    };

    init();
  }, []);

  const setFormType = (
    setter: React.Dispatch<React.SetStateAction<BannerForm>>,
    type: BannerType
  ) => {
    setter((prev) => ({
      ...prev,
      type,
      visual_variant:
        type === "hero"
          ? bannerVariantOptions.hero[0].value
          : bannerVariantOptions.coupon[0].value,
      code: type === "coupon" ? prev.code : "",
      price_text: type === "hero" ? prev.price_text : "",
      old_price_text: type === "hero" ? prev.old_price_text : "",
      primary_cta_href: type === "coupon" ? "/menu?coupon=" : "/menu",
    }));
  };

  const createBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/admin/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newBanner,
        sort_order: Number(newBanner.sort_order),
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok || !data.ok) {
      toast.error(data.error || "No se pudo crear el banner");
      return;
    }

    toast.success("Banner creado");
    setCreating(false);
    setNewBanner(buildDefaultForm("hero"));
    await loadBanners();
  };

  const startEditing = (banner: BannerRecord) => {
    setEditingId(banner.id);
    setEditForm({
      type: banner.type,
      visual_variant: banner.visual_variant,
      image_url: banner.image_url,
      badge: banner.badge,
      title: banner.title,
      description: banner.description,
      primary_cta_label: banner.primary_cta_label,
      primary_cta_href: banner.primary_cta_href,
      code: banner.code || "",
      price_text: banner.price_text || "",
      old_price_text: banner.old_price_text || "",
      is_active: banner.is_active,
      sort_order: String(banner.sort_order),
    });
  };

  const saveEdit = async (id: string) => {
    setSaving(true);

    const res = await fetch("/api/admin/banners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        ...editForm,
        sort_order: Number(editForm.sort_order),
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok || !data.ok) {
      toast.error(data.error || "No se pudo actualizar el banner");
      return;
    }

    toast.success("Banner actualizado");
    setEditingId(null);
    await loadBanners();
  };

  const deleteBanner = async (id: string) => {
    const ok = window.confirm("¿Seguro que quieres eliminar este banner?");
    if (!ok) return;

    const res = await fetch("/api/admin/banners", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      toast.error(data.error || "No se pudo eliminar el banner");
      return;
    }

    toast.success("Banner eliminado");
    await loadBanners();
  };

  const newBannerPreview = mapBannerRecordToSlide(mapFormToBannerRecord(newBanner));
  const editBannerPreview = mapBannerRecordToSlide(mapFormToBannerRecord(editForm));

  const renderForm = (
    form: BannerForm,
    setForm: React.Dispatch<React.SetStateAction<BannerForm>>,
    preview: BannerSlide
  ) => {
    const variantOptions =
      form.type === "hero" ? bannerVariantOptions.hero : bannerVariantOptions.coupon;

    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#046703]">
                Tipo
              </label>
              <select
                value={form.type}
                onChange={(e) => setFormType(setForm, e.target.value as BannerType)}
                className="w-full rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
              >
                <option value="hero">Hero</option>
                <option value="coupon">Cupón</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#046703]">
                Variante visual
              </label>
              <select
                value={form.visual_variant}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, visual_variant: e.target.value }))
                }
                className="w-full rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
              >
                {variantOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ImageUploader
            value={form.image_url}
            onChange={(url) => setForm((prev) => ({ ...prev, image_url: url }))}
            label="Imagen del banner"
            helperText={
              form.type === "hero"
                ? recommendedBannerSpecs.hero
                : recommendedBannerSpecs.coupon
            }
            folder="banners"
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#046703]">
                Badge
              </label>
              <input
                value={form.badge}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, badge: e.target.value }))
                }
                className="w-full rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#046703]">
                Orden
              </label>
              <input
                value={form.sort_order}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sort_order: e.target.value }))
                }
                className="w-full rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#046703]">
              Título
            </label>
            <textarea
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              rows={2}
              className="w-full rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#046703]">
              Descripción
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
              className="w-full rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#046703]">
                Texto botón
              </label>
              <input
                value={form.primary_cta_label}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    primary_cta_label: e.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#046703]">
                Destino botón
              </label>
              <input
                value={form.primary_cta_href}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, primary_cta_href: e.target.value }))
                }
                className="w-full rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
              />
            </div>
          </div>

          <div>
            {form.type === "coupon" ? (
              <>
                <label className="mb-2 block text-sm font-medium text-[#046703]">
                  Código cupón
                </label>
                <input
                  value={form.code}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, code: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                />
              </>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#046703]">
                    Precio
                  </label>
                  <input
                    value={form.price_text}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, price_text: e.target.value }))
                    }
                    className="w-full rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#046703]">
                    Precio anterior
                  </label>
                  <input
                    value={form.old_price_text}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, old_price_text: e.target.value }))
                    }
                    className="w-full rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                  />
                </div>
              </div>
            )}
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/15 px-4 py-3 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, is_active: e.target.checked }))
              }
            />
            Banner activo
          </label>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-[#c9dfc3] bg-[#fff8ef] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f48e07]">
              Vista previa
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              Así se vería este banner dentro del hero de la home.
            </p>
          </div>

          <BannerPreview slide={preview} />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <main className="rounded-3xl border border-[#c9dfc3] bg-white p-6 text-[#046703] shadow-sm">
        Cargando banners...
      </main>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#69adb6]">
              Contenido visual
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#046703]">Banners</h1>
            <p className="mt-1 text-sm text-neutral-600">
              Administra las imágenes y textos del hero de la home con variantes visuales seguras.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCreating((prev) => !prev)}
              className="rounded-2xl bg-[#046703] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              {creating ? "Cerrar formulario" : "Nuevo banner"}
            </button>
            <button
              onClick={() => router.push("/admin")}
              className="rounded-2xl border border-[#c9dfc3] bg-white px-4 py-2 text-sm font-medium text-[#046703] transition hover:bg-[#c9dfc3]/15"
            >
              Volver al dashboard
            </button>
          </div>
        </div>
      </section>

      {creating && (
        <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#046703]">Crear banner</h2>
            <span className="rounded-full bg-[#fff8ef] px-3 py-1 text-xs font-semibold text-[#f48e07]">
              Hero o cupón
            </span>
          </div>

          <form
            onSubmit={createBanner}
            className="space-y-6"
          >
            {renderForm(newBanner, setNewBanner, newBannerPreview)}

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-[#f6070b] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar banner"}
            </button>
          </form>
        </section>
      )}

      <section className="space-y-4">
        {banners.map((banner) => {
          const isEditing = editingId === banner.id;

          return (
            <article
              key={banner.id}
              className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm"
            >
              <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#69adb6]/10 px-3 py-1 text-xs font-semibold text-[#69adb6]">
                      {banner.type === "hero" ? "Hero" : "Cupón"}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        banner.is_active
                          ? "bg-[#046703]/10 text-[#046703]"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {banner.is_active ? "Activo" : "Inactivo"}
                    </span>
                    <span className="rounded-full bg-[#fff8ef] px-3 py-1 text-xs font-semibold text-[#f48e07]">
                      Orden {banner.sort_order}
                    </span>
                  </div>

                  <h2 className="mt-3 text-2xl font-bold text-[#046703]">
                    {banner.title}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
                    {banner.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => startEditing(banner)}
                    className="rounded-2xl border border-[#69adb6] bg-white px-4 py-2 text-sm font-medium text-[#69adb6] transition hover:bg-[#69adb6]/10"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteBanner(banner.id)}
                    className="rounded-2xl bg-[#f6070b] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {!isEditing ? (
                <div className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
                  <div className="overflow-hidden rounded-3xl border border-[#c9dfc3] bg-[#f8f5ef]">
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="h-64 w-full object-cover"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-[#c9dfc3]/15 p-4">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        Badge
                      </p>
                      <p className="mt-2 font-semibold text-[#046703]">
                        {banner.badge}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#c9dfc3]/15 p-4">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        Variante
                      </p>
                      <p className="mt-2 font-semibold text-[#046703]">
                        {banner.visual_variant}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#c9dfc3]/15 p-4">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        CTA
                      </p>
                      <p className="mt-2 font-semibold text-[#046703]">
                        {banner.primary_cta_label}
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {banner.primary_cta_href}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#c9dfc3]/15 p-4">
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
                        Datos extra
                      </p>
                      <p className="mt-2 text-sm text-neutral-600">
                        {banner.type === "coupon"
                          ? `Código: ${banner.code || "-"}`
                          : `Precio: ${banner.price_text || "-"}${
                              banner.old_price_text
                                ? ` • Antes: ${banner.old_price_text}`
                                : ""
                            }`}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {renderForm(editForm, setEditForm, editBannerPreview)}

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => saveEdit(banner.id)}
                      disabled={saving}
                      className="rounded-2xl bg-[#046703] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-2xl border border-[#c9dfc3] bg-white px-5 py-3 text-sm font-medium text-[#046703] transition hover:bg-[#c9dfc3]/15"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {banners.length === 0 && (
          <section className="rounded-3xl border border-dashed border-[#c9dfc3] bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-[#046703]">
              Aún no hay banners cargados
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              Puedes crear tus primeros banners desde aquí y el hero usará esos datos automáticamente.
            </p>
          </section>
        )}
      </section>
    </div>
  );
}
