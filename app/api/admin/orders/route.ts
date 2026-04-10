import { NextResponse } from "next/server";
import { requireAdminUser } from "../../../../lib/adminGuard";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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

    return NextResponse.json(
      {
        ok: true,
        orders: data || [],
      },
    );
  } catch (error: unknown) {
    const detail =
      error instanceof Error ? error.message : "No se pudieron cargar los pedidos.";

    return NextResponse.json(
      {
        ok: false,
        error: "No se pudieron cargar los pedidos.",
        detail,
      },
      { status: 500 }
    );
  }
}
