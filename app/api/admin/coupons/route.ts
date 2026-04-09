import { NextResponse } from "next/server";
import { requireAdminUser } from "../../../../lib/adminGuard";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

type CouponPayload = {
  id?: string;
  code?: string;
  discount_type?: "percent" | "fixed";
  discount_value?: number;
  is_active?: boolean;
  usage_mode?: "single_per_customer" | "single_global" | "unlimited";
  max_uses?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const [
    { data: coupons, error: couponsError },
    { data: couponUsages, error: usagesError },
    { data: orders, error: ordersError },
  ] = await Promise.all([
    supabaseAdmin.from("coupons").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("coupon_usages").select("*"),
    supabaseAdmin.from("orders").select("id, total"),
  ]);

  const error = couponsError || usagesError || ordersError;

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "No se pudieron cargar los cupones.",
        detail: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    coupons: coupons || [],
    couponUsages: couponUsages || [],
    orders: orders || [],
  });
}

export async function POST(req: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const body = (await req.json()) as CouponPayload;

  const { error } = await supabaseAdmin.from("coupons").insert({
    code: body.code?.trim().toUpperCase(),
    discount_type: body.discount_type,
    discount_value: body.discount_value,
    is_active: body.is_active,
    usage_mode: body.usage_mode,
    max_uses: body.max_uses ?? null,
    starts_at: body.starts_at ?? null,
    ends_at: body.ends_at ?? null,
  });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo crear el cupón.",
        detail: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const body = (await req.json()) as CouponPayload;

  if (!body.id) {
    return NextResponse.json(
      { ok: false, error: "Falta el id del cupón." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from("coupons")
    .update({ is_active: body.is_active })
    .eq("id", body.id);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo actualizar el cupón.",
        detail: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Falta el id del cupón." },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from("coupons").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo eliminar el cupón.",
        detail: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
