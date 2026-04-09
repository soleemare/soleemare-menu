import { NextResponse } from "next/server";
import { requireAdminUser } from "../../../../lib/adminGuard";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

type BannerPayload = {
  id?: string;
  type: "hero" | "coupon";
  visual_variant: string;
  image_url: string;
  badge: string;
  title: string;
  description: string;
  primary_cta_label: string;
  primary_cta_href: string;
  code?: string | null;
  price_text?: string | null;
  old_price_text?: string | null;
  is_active: boolean;
  sort_order: number;
};

function normalizePayload(payload: BannerPayload) {
  return {
    type: payload.type,
    visual_variant: payload.visual_variant,
    image_url: payload.image_url,
    badge: payload.badge,
    title: payload.title,
    description: payload.description,
    primary_cta_label: payload.primary_cta_label,
    primary_cta_href: payload.primary_cta_href,
    code: payload.type === "coupon" ? payload.code || null : null,
    price_text: payload.type === "hero" ? payload.price_text || null : null,
    old_price_text: payload.type === "hero" ? payload.old_price_text || null : null,
    is_active: payload.is_active,
    sort_order: Number(payload.sort_order || 0),
  };
}

function validatePayload(payload: BannerPayload) {
  if (!payload.image_url.trim()) return "Sube una imagen para el banner.";
  if (!payload.badge.trim()) return "Ingresa el badge del banner.";
  if (!payload.title.trim()) return "Ingresa el título del banner.";
  if (!payload.description.trim()) return "Ingresa la descripción del banner.";
  if (!payload.primary_cta_label.trim()) return "Ingresa el texto del botón.";
  if (!payload.primary_cta_href.trim()) return "Ingresa el destino del botón.";
  if (payload.type === "coupon" && !payload.code?.trim()) {
    return "Ingresa el código del cupón.";
  }
  return null;
}

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { data, error } = await supabaseAdmin
    .from("banners")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "No se pudieron cargar los banners.", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, banners: data || [] });
}

export async function POST(req: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  try {
    const payload = (await req.json()) as BannerPayload;
    const validationError = validatePayload(payload);

    if (validationError) {
      return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("banners")
      .insert(normalizePayload(payload))
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: "No se pudo crear el banner.", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, banner: data });
  } catch (error: unknown) {
    const detail =
      error instanceof Error ? error.message : "No se pudo crear el banner.";

    return NextResponse.json(
      { ok: false, error: "No se pudo crear el banner.", detail },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  try {
    const payload = (await req.json()) as BannerPayload;

    if (!payload.id) {
      return NextResponse.json(
        { ok: false, error: "Falta el id del banner." },
        { status: 400 }
      );
    }

    const validationError = validatePayload(payload);

    if (validationError) {
      return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("banners")
      .update(normalizePayload(payload))
      .eq("id", payload.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: "No se pudo actualizar el banner.", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, banner: data });
  } catch (error: unknown) {
    const detail =
      error instanceof Error ? error.message : "No se pudo actualizar el banner.";

    return NextResponse.json(
      { ok: false, error: "No se pudo actualizar el banner.", detail },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  try {
    const { id } = (await req.json()) as { id?: string };

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "Falta el id del banner." },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin.from("banners").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: "No se pudo eliminar el banner.", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const detail =
      error instanceof Error ? error.message : "No se pudo eliminar el banner.";

    return NextResponse.json(
      { ok: false, error: "No se pudo eliminar el banner.", detail },
      { status: 500 }
    );
  }
}
