import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

type RouteContext = {
  params: Promise<{
    code: string;
  }>;
};

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const trackingCode = decodeURIComponent(code).trim();

    if (!trackingCode) {
      return NextResponse.json(
        { ok: false, error: "Código de seguimiento inválido." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        `
        id,
        tracking_code,
        status,
        created_at,
        accepted_at,
        preparing_at,
        ready_at,
        delivering_at,
        delivered_at,
        rejected_at,
        estimated_minutes,
        estimated_at,
        delivery_type,
        payment_method,
        total,
        customers(name),
        order_items(product_name, quantity)
      `
      )
      .eq("tracking_code", trackingCode)
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: "No se pudo consultar el seguimiento.", detail: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "Pedido no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      order: data,
    });
  } catch (error: unknown) {
    const detail =
      error instanceof Error ? error.message : "Error consultando el seguimiento.";

    return NextResponse.json(
      { ok: false, error: "No se pudo consultar el seguimiento.", detail },
      { status: 500 }
    );
  }
}
