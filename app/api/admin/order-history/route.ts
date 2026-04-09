import { NextResponse } from "next/server";
import { requireAdminUser } from "../../../../lib/adminGuard";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      `
        id,
        total,
        status,
        tracking_code,
        created_at,
        delivered_at,
        rejected_at,
        estimated_minutes,
        delivery_type,
        payment_method,
        address,
        zone,
        other_zone,
        customers(name, phone),
        order_items(product_name, quantity)
      `
    )
    .in("status", ["delivered", "rejected"])
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo cargar el historial.",
        detail: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    orders: data || [],
  });
}
