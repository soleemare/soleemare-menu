import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseAdmin";

export async function GET() {
  const { data: products, error: productsError } = await supabaseServer
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (productsError) {
    console.error("Error cargando products:", productsError);
    return NextResponse.json(
      { error: "Error cargando productos" },
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
      { error: "Error cargando variantes" },
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
      { error: "Error cargando grupos de opciones" },
      { status: 500 }
    );
  }

  const variantsByProduct =
    variants?.reduce<Record<number, any[]>>((acc, variant) => {
      if (!acc[variant.product_id]) acc[variant.product_id] = [];
      acc[variant.product_id].push(variant);
      return acc;
    }, {}) ?? {};

  const optionGroupsByProduct =
    optionGroups?.reduce<Record<number, any[]>>((acc, group) => {
      if (!acc[group.product_id]) acc[group.product_id] = [];
      acc[group.product_id].push(group);
      return acc;
    }, {}) ?? {};

  const grouped: Record<string, any[]> = {};

  for (const product of products ?? []) {
    if (!grouped[product.category]) grouped[product.category] = [];

    const productVariants = variantsByProduct[product.id] ?? [];
    const productOptionGroups = optionGroupsByProduct[product.id] ?? [];

    const formattedOptionGroups = productOptionGroups.map((group) => {
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
    });

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
}