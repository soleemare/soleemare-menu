import { NextResponse } from "next/server";
import { requireAdminUser } from "../../../../../lib/adminGuard";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { count, error } = await supabaseAdmin
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo cargar el conteo de pedidos pendientes.",
        detail: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    count: count || 0,
  });
}
