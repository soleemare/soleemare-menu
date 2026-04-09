import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { requireAdminUser } from "../../../../lib/adminGuard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");

  if (!productId) {
    return NextResponse.json(
      { error: "Falta productId" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("product_variants")
    .select("*")
    .eq("product_id", Number(productId))
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "No se pudieron cargar las variantes", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from("product_variants")
    .insert([
      {
        product_id: body.product_id,
        name: body.name,
        description: body.description || null,
        price_adjustment: body.price_adjustment ?? 0,
        is_active: body.is_active ?? true,
        sort_order: body.sort_order ?? 0,
      },
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "No se pudo crear la variante", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { id, ...fields } = body;

  const { data, error } = await supabaseAdmin
    .from("product_variants")
    .update(fields)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "No se pudo actualizar la variante", detail: error.message },
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
    .from("product_variants")
    .delete()
    .eq("id", body.id);

  if (error) {
    return NextResponse.json(
      { error: "No se pudo eliminar la variante", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
