import { NextResponse } from "next/server";
import { requireAdminUser } from "../../../../lib/adminGuard";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const [
    { data: orders, error: ordersError },
    { data: customers, error: customersError },
    { data: orderItems, error: orderItemsError },
  ] = await Promise.all([
    supabaseAdmin.from("orders").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("customers").select("*"),
    supabaseAdmin.from("order_items").select("*"),
  ]);

  const error = ordersError || customersError || orderItemsError;

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo cargar el dashboard.",
        detail: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    orders: orders || [],
    customers: customers || [],
    orderItems: orderItems || [],
  });
}
