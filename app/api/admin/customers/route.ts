import { NextResponse } from "next/server";
import { requireAdminUser } from "../../../../lib/adminGuard";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdminUser();
    if (!auth.ok) return auth.response;

    const [
      { data: customers, error: customersError },
      { data: orders, error: ordersError },
    ] = await Promise.all([
      supabaseAdmin
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    const error = customersError || ordersError;

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo cargar la vista de clientes.",
          detail: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        customers: customers || [],
        orders: orders || [],
      },
    );
  } catch (error: unknown) {
    const detail =
      error instanceof Error
        ? error.message
        : "No se pudo cargar la vista de clientes.";

    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo cargar la vista de clientes.",
        detail,
      },
      { status: 500 }
    );
  }
}
