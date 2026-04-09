import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { requireAdminUser } from "../../../../lib/adminGuard";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseAdmin
    .from("delivery_zones")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "No se pudieron cargar las zonas", detail: error.message },
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
    price: Number(body.price ?? 0),
    path: body.path,
    is_active: body.is_active ?? true,
    sort_order: Number(body.sort_order ?? 0),
  };

  const { data, error } = await supabaseAdmin
    .from("delivery_zones")
    .insert([payload])
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "No se pudo crear la zona", detail: error.message },
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
    return NextResponse.json({ error: "Falta el id" }, { status: 400 });
  }

  const fields: Record<string, unknown> = {};

  if ("name" in body) fields.name = body.name;
  if ("price" in body) fields.price = Number(body.price ?? 0);
  if ("path" in body) fields.path = body.path;
  if ("is_active" in body) fields.is_active = body.is_active;
  if ("sort_order" in body) fields.sort_order = Number(body.sort_order ?? 0);

  const { data, error } = await supabaseAdmin
    .from("delivery_zones")
    .update(fields)
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "No se pudo actualizar la zona", detail: error.message },
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
    .from("delivery_zones")
    .delete()
    .eq("id", body.id);

  if (error) {
    return NextResponse.json(
      { error: "No se pudo eliminar la zona", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
