import { NextResponse } from "next/server";
import { requireAdminUser } from "../../../../lib/adminGuard";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      `
        *,
        customers(name, phone),
        order_items(product_name, quantity)
      `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "No se pudieron cargar los pedidos.",
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
