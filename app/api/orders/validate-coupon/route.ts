import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      couponCode?: string;
      email?: string;
      phone?: string;
    };

    const couponCode = body.couponCode?.trim().toUpperCase();
    const email = body.email?.trim().toLowerCase() || "";
    const phone = body.phone?.trim() || "";

    if (!couponCode) {
      return NextResponse.json(
        { ok: false, error: "Ingresa un cupón." },
        { status: 400 }
      );
    }

    const { data: coupon, error: couponError } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .eq("code", couponCode)
      .maybeSingle();

    if (couponError) {
      return NextResponse.json(
        { ok: false, error: "No se pudo validar el cupón." },
        { status: 500 }
      );
    }

    if (!coupon) {
      return NextResponse.json(
        { ok: false, error: "Cupón no válido." },
        { status: 404 }
      );
    }

    if (!coupon.is_active) {
      return NextResponse.json(
        { ok: false, error: "Este cupón está desactivado." },
        { status: 400 }
      );
    }

    const now = new Date();

    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      return NextResponse.json(
        { ok: false, error: "Este cupón aún no está disponible." },
        { status: 400 }
      );
    }

    if (coupon.ends_at && new Date(coupon.ends_at) < now) {
      return NextResponse.json(
        { ok: false, error: "Este cupón ya venció." },
        { status: 400 }
      );
    }

    if (coupon.max_uses) {
      const { count, error: countError } = await supabaseAdmin
        .from("coupon_usages")
        .select("*", { count: "exact", head: true })
        .eq("coupon_code", couponCode);

      if (countError) {
        return NextResponse.json(
          { ok: false, error: "No se pudo validar el cupón." },
          { status: 500 }
        );
      }

      if ((count || 0) >= coupon.max_uses) {
        return NextResponse.json(
          { ok: false, error: "Este cupón alcanzó su máximo de usos." },
          { status: 400 }
        );
      }
    }

    if (coupon.usage_mode === "single_global") {
      const { data, error } = await supabaseAdmin
        .from("coupon_usages")
        .select("id")
        .eq("coupon_code", couponCode)
        .limit(1);

      if (error) {
        return NextResponse.json(
          { ok: false, error: "No se pudo validar el cupón." },
          { status: 500 }
        );
      }

      if (data && data.length > 0) {
        return NextResponse.json(
          { ok: false, error: "Este cupón ya fue utilizado." },
          { status: 400 }
        );
      }
    }

    if (coupon.usage_mode === "single_per_customer") {
      const { data, error } = await supabaseAdmin
        .from("coupon_usages")
        .select("id")
        .eq("coupon_code", couponCode)
        .or(`email.eq.${email},phone.eq.${phone}`)
        .limit(1);

      if (error) {
        return NextResponse.json(
          { ok: false, error: "No se pudo validar el cupón." },
          { status: 500 }
        );
      }

      if (data && data.length > 0) {
        return NextResponse.json(
          {
            ok: false,
            error: "Este cupón ya fue usado con este correo o teléfono.",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ ok: true, coupon });
  } catch {
    return NextResponse.json(
      { ok: false, error: "No se pudo validar el cupón." },
      { status: 500 }
    );
  }
}
