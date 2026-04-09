import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { mapBannerRecordsToSlides, type BannerRecord } from "../../../lib/bannerSlides";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: "No se pudieron cargar los banners.", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      banners: mapBannerRecordsToSlides((data as BannerRecord[]) || []),
    });
  } catch (error: unknown) {
    const detail =
      error instanceof Error ? error.message : "No se pudieron cargar los banners.";

    return NextResponse.json(
      { ok: false, error: "No se pudieron cargar los banners.", detail },
      { status: 500 }
    );
  }
}
