export type BannerType = "hero" | "coupon";

export type BannerRecord = {
  id: string;
  type: BannerType;
  visual_variant: string;
  image_url: string;
  badge: string;
  title: string;
  description: string;
  primary_cta_label: string;
  primary_cta_href: string;
  code: string | null;
  price_text: string | null;
  old_price_text: string | null;
  is_active: boolean;
  sort_order: number;
};

type BaseSlide = {
  type: BannerType;
  image: string;
  badge: string;
  title: string;
  description: string;
  imageClassName?: string;
  overlayClassName?: string;
  primaryCta: {
    label: string;
    href: string;
  };
};

export type HeroBannerSlide = BaseSlide & {
  type: "hero";
  price?: string;
  oldPrice?: string;
};

export type CouponBannerSlide = BaseSlide & {
  type: "coupon";
  code: string;
};

export type BannerSlide = HeroBannerSlide | CouponBannerSlide;

const heroVisuals: Record<
  string,
  { imageClassName: string; overlayClassName: string }
> = {
  promo_combo: {
    imageClassName: "object-cover object-[64%_50%] scale-[1.16] sm:scale-100",
    overlayClassName:
      "bg-gradient-to-r from-black/78 via-black/42 to-black/10",
  },
  dark_closeup: {
    imageClassName:
      "object-cover object-[68%_52%] scale-[1.12] sm:scale-[1.08]",
    overlayClassName:
      "bg-gradient-to-r from-black/80 via-black/45 to-black/15",
  },
  default_dark: {
    imageClassName: "object-cover object-center",
    overlayClassName:
      "bg-gradient-to-r from-black/70 via-black/30 to-transparent",
  },
};

const couponVisuals: Record<string, { imageClassName: string }> = {
  coupon_light: {
    imageClassName: "object-cover object-center scale-[1.14] sm:scale-100",
  },
};

export const bannerVariantOptions = {
  hero: [
    { value: "promo_combo", label: "Promo combo" },
    { value: "dark_closeup", label: "Primer plano oscuro" },
    { value: "default_dark", label: "Oscuro estándar" },
  ],
  coupon: [{ value: "coupon_light", label: "Cupón claro" }],
};

export const recommendedBannerSpecs = {
  hero: "1600x900 px o más, horizontal, producto hacia la derecha y espacio libre para texto a la izquierda.",
  coupon:
    "1400x900 px o más, fondo limpio o gráfico, ideal para composiciones claras con código visible.",
};

export const defaultBannerSlides: BannerSlide[] = [
  {
    type: "hero",
    image: "/images/peperoni+margarita.jpeg",
    imageClassName: heroVisuals.promo_combo.imageClassName,
    overlayClassName: heroVisuals.promo_combo.overlayClassName,
    badge: "Especial del mes",
    title: "Pepperoni + Margarita +\nBebida",
    description:
      "Una promo perfecta para compartir, con dos pizzas clásicas y bebida 1,5 Litros incluida.",
    price: "$18.320",
    oldPrice: "$23.900",
    primaryCta: {
      label: "Ver promoción",
      href: "/menu#promociones",
    },
  },
  {
    type: "coupon",
    image: "/images/portada_descuento.png",
    imageClassName: couponVisuals.coupon_light.imageClassName,
    badge: "Cupón de bienvenida",
    title: "20% OFF en tu primer pedido",
    description: "Usa el código y obtén tu descuento.",
    code: "BIENVENIDA20",
    primaryCta: {
      label: "Usar cupón",
      href: "/menu?coupon=BIENVENIDA20",
    },
  },
  {
    type: "hero",
    image: "/images/peperonni.jpg",
    imageClassName: heroVisuals.dark_closeup.imageClassName,
    overlayClassName: heroVisuals.dark_closeup.overlayClassName,
    badge: "Estilo napolitano",
    title: "Hechas como en Italia",
    description:
      "Masa artesanal, ingredientes seleccionados y cocción a alta temperatura para un sabor auténtico.",
    primaryCta: {
      label: "Ver menú",
      href: "/menu",
    },
  },
];

export function mapBannerRecordToSlide(record: BannerRecord): BannerSlide {
  if (record.type === "coupon") {
    const visual = couponVisuals[record.visual_variant] || couponVisuals.coupon_light;

    return {
      type: "coupon",
      image: record.image_url,
      imageClassName: visual.imageClassName,
      badge: record.badge,
      title: record.title,
      description: record.description,
      code: record.code || "",
      primaryCta: {
        label: record.primary_cta_label,
        href: record.primary_cta_href,
      },
    };
  }

  const visual = heroVisuals[record.visual_variant] || heroVisuals.default_dark;

  return {
    type: "hero",
    image: record.image_url,
    imageClassName: visual.imageClassName,
    overlayClassName: visual.overlayClassName,
    badge: record.badge,
    title: record.title,
    description: record.description,
    price: record.price_text || undefined,
    oldPrice: record.old_price_text || undefined,
    primaryCta: {
      label: record.primary_cta_label,
      href: record.primary_cta_href,
    },
  };
}

export function mapBannerRecordsToSlides(records: BannerRecord[]): BannerSlide[] {
  return records.map(mapBannerRecordToSlide);
}
