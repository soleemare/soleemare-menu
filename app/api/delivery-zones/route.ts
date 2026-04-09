import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("delivery_zones")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "No se pudieron cargar las zonas", detail: error.message },
      { status: 500 }
    );
  }

  const zones = (data || []).map((zone) => ({
    id: String(zone.id),
    name: zone.name,
    price: zone.price,
    path: zone.path,
  }));

  return NextResponse.json(zones);
}
