import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { requireAdminUser } from "../../../../lib/adminGuard";

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "No se pudieron cargar los productos", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const body = await req.json();

  const payload = {
    name: body.name,
    price: body.price,
    promo_price: body.is_on_promo ? body.promo_price ?? null : null,
    is_on_promo: body.is_on_promo ?? false,
    description: body.description || null,
    badge: body.badge || null,
    image: body.image || null,
    category: body.category,
    is_active: body.is_active ?? true,
    sort_order: body.sort_order ?? 0,
    has_options: body.has_options ?? false,
    options_json: body.options_json ?? null,
  };

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert([payload])
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "No se pudo crear el producto", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!body.id) {
    return NextResponse.json(
      { error: "Falta el id del producto" },
      { status: 400 }
    );
  }

  const fields: Record<string, any> = {};

  if ("name" in body) fields.name = body.name;
  if ("price" in body) fields.price = body.price;
  if ("description" in body) fields.description = body.description || null;
  if ("badge" in body) fields.badge = body.badge || null;
  if ("image" in body) fields.image = body.image || null;
  if ("category" in body) fields.category = body.category;
  if ("is_active" in body) fields.is_active = body.is_active;
  if ("sort_order" in body) fields.sort_order = body.sort_order;
  if ("has_options" in body) fields.has_options = body.has_options;
  if ("options_json" in body) fields.options_json = body.options_json ?? null;

  if ("is_on_promo" in body) {
    fields.is_on_promo = body.is_on_promo ?? false;
    fields.promo_price = body.is_on_promo ? body.promo_price ?? null : null;
  } else if ("promo_price" in body) {
    fields.promo_price = body.promo_price ?? null;
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .update(fields)
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "No se pudo actualizar el producto", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const body = await req.json();

  const { error } = await supabaseAdmin
    .from("products")
    .delete()
    .eq("id", body.id);

  if (error) {
    return NextResponse.json(
      { error: "No se pudo eliminar el producto", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}