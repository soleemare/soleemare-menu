import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type ProductRow = {
  id: number;
  name: string;
  price: number;
  promo_price: number | null;
  is_on_promo: boolean | null;
  description: string | null;
  badge: string | null;
  image: string | null;
  category: string;
};

type VariantRow = {
  id: number;
  product_id: number;
  name: string;
  description: string | null;
  price_adjustment: number | null;
};

type OptionGroupRow = {
  id: number;
  product_id: number;
  source_product_id: number;
  title: string;
  min_select: number;
  max_select: number;
};

type MenuVariant = {
  id: number;
  label: string;
  description: string | null;
  priceAdjustment: number;
};

type MenuOptionGroup = {
  id: number;
  title: string;
  sourceProductId: number;
  minSelect: number;
  maxSelect: number;
  variants: MenuVariant[];
};

type MenuItem = {
  id: number;
  name: string;
  price: number;
  originalPrice: number;
  promoPrice: number | null;
  isOnPromo: boolean;
  description: string | null;
  badge: string | null;
  image: string | null;
  variants: MenuVariant[];
  optionGroups: MenuOptionGroup[];
};

export async function GET() {
  try {
    const { data: products, error: productsError } = await supabaseServer
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (productsError) {
      console.error("Error cargando products:", productsError);
      return NextResponse.json(
        { error: "Error cargando productos", detail: productsError.message },
        { status: 500 }
      );
    }

    const { data: variants, error: variantsError } = await supabaseServer
      .from("product_variants")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (variantsError) {
      console.error("Error cargando product_variants:", variantsError);
      return NextResponse.json(
        { error: "Error cargando variantes", detail: variantsError.message },
        { status: 500 }
      );
    }

    const { data: optionGroups, error: optionGroupsError } = await supabaseServer
      .from("product_option_groups")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (optionGroupsError) {
      console.error("Error cargando product_option_groups:", optionGroupsError);
      return NextResponse.json(
        {
          error: "Error cargando grupos de opciones",
          detail: optionGroupsError.message,
        },
        { status: 500 }
      );
    }

    const variantsByProduct =
      (variants as VariantRow[] | null)?.reduce<Record<number, VariantRow[]>>(
        (acc, variant) => {
          if (!acc[variant.product_id]) acc[variant.product_id] = [];
          acc[variant.product_id].push(variant);
          return acc;
        },
        {}
      ) ?? {};

    const optionGroupsByProduct =
      (optionGroups as OptionGroupRow[] | null)?.reduce<
        Record<number, OptionGroupRow[]>
      >((acc, group) => {
        if (!acc[group.product_id]) acc[group.product_id] = [];
        acc[group.product_id].push(group);
        return acc;
      }, {}) ?? {};

    const grouped: Record<string, MenuItem[]> = {};

    for (const product of (products as ProductRow[] | null) ?? []) {
      if (!grouped[product.category]) grouped[product.category] = [];

      const productVariants = variantsByProduct[product.id] ?? [];
      const productOptionGroups = optionGroupsByProduct[product.id] ?? [];

      const formattedOptionGroups: MenuOptionGroup[] = productOptionGroups.map(
        (group) => {
          const sourceVariants = variantsByProduct[group.source_product_id] ?? [];

          return {
            id: group.id,
            title: group.title,
            sourceProductId: group.source_product_id,
            minSelect: group.min_select,
            maxSelect: group.max_select,
            variants: sourceVariants.map((variant) => ({
              id: variant.id,
              label: variant.name,
              description: variant.description,
              priceAdjustment: variant.price_adjustment ?? 0,
            })),
          };
        }
      );

      grouped[product.category].push({
        id: product.id,
        name: product.name,
        price:
          product.is_on_promo && product.promo_price
            ? product.promo_price
            : product.price,
        originalPrice: product.price,
        promoPrice: product.promo_price,
        isOnPromo: product.is_on_promo ?? false,
        description: product.description,
        badge: product.badge,
        image: product.image,
        variants: productVariants.map((variant) => ({
          id: variant.id,
          label: variant.name,
          description: variant.description,
          priceAdjustment: variant.price_adjustment ?? 0,
        })),
        optionGroups: formattedOptionGroups,
      });
    }

    const categoryOrder = [
      "Promociones",
      "Acompañamientos",
      "Pizzas",
      "Postres",
      "Gelato Il Maestrale",
      "Bebidas",
    ];

    const menuData = categoryOrder
      .filter((category) => grouped[category]?.length)
      .map((category) => ({
        category,
        items: grouped[category],
      }));

    return NextResponse.json(menuData);
  } catch (error: unknown) {
    const detail =
      error instanceof Error ? error.message : "No se pudo cargar el menú.";

    return NextResponse.json(
      { error: "No se pudo cargar el menú.", detail },
      { status: 500 }
    );
  }
}
