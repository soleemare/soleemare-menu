import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { getScheduledSlotCounts } from "../../../../lib/storeHours";

export const dynamic = "force-dynamic";

type ScheduledOrderRow = {
  estimated_at: string | null;
};

export async function GET() {
  try {
    const nowIso = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("estimated_at")
      .eq("status", "scheduled")
      .not("estimated_at", "is", null)
      .gte("estimated_at", nowIso)
      .order("estimated_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo cargar la disponibilidad programada",
          detail: error.message,
        },
        { status: 500 }
      );
    }

    const scheduledDates = ((data as ScheduledOrderRow[] | null) ?? [])
      .map((row) => row.estimated_at)
      .filter((value): value is string => Boolean(value));

    const slotCounts = getScheduledSlotCounts(scheduledDates);

    return NextResponse.json({
      ok: true,
      scheduledDates,
      slotCounts: Array.from(slotCounts.entries()).map(([value, count]) => ({
        value,
        count,
      })),
    });
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : "No se pudo cargar la disponibilidad programada";

    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo cargar la disponibilidad programada",
        detail,
      },
      { status: 500 }
    );
  }
}
