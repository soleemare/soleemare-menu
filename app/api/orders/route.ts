import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import {
  sendWhatsAppTemplateMessage,
  sendWhatsAppTextMessage,
} from "../../../lib/whatsapp";

export const dynamic = "force-dynamic";

type CartItemPayload = {
  name: string;
  price: number;
  quantity: number;
  isOnPromo?: boolean;
};

type CreateOrderRequest = {
  customer: {
    nombre: string;
    telefono: string;
    correo: string;
    aceptaPromos: boolean;
  };
  order: {
    tipoEntrega: string;
    direccion: string;
    zona: string;
    otraZona: string;
    pago: string;
    deliveryPrice: number;
    couponCode: string | null;
    isScheduled?: boolean;
    scheduledFor?: string | null;
  };
  cart: CartItemPayload[];
};

const scheduledTemplateName =
  process.env.NEXT_PUBLIC_WHATSAPP_TEMPLATE_ORDER_SCHEDULED ||
  "pedido_programado";
const whatsappTemplateLanguage =
  process.env.NEXT_PUBLIC_WHATSAPP_TEMPLATE_LANGUAGE || "es_CL";

function generateTrackingCode() {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SM-${rand}`;
}

async function generateUniqueTrackingCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateTrackingCode();
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("tracking_code", code)
      .limit(1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return code;
    }
  }

  throw new Error("No se pudo generar un código de seguimiento único.");
}

async function validarCuponDisponible({
  couponCode,
  email,
  phone,
}: {
  couponCode: string;
  email: string;
  phone: string;
}) {
  const codigo = couponCode.trim().toUpperCase();

  const { data: coupon, error: couponError } = await supabaseAdmin
    .from("coupons")
    .select("*")
    .eq("code", codigo)
    .maybeSingle();

  if (couponError) {
    throw new Error("No se pudo validar el cupón.");
  }

  if (!coupon) {
    throw new Error("Cupón no válido.");
  }

  if (!coupon.is_active) {
    throw new Error("Este cupón está desactivado.");
  }

  const now = new Date();

  if (coupon.starts_at && new Date(coupon.starts_at) > now) {
    throw new Error("Este cupón aún no está disponible.");
  }

  if (coupon.ends_at && new Date(coupon.ends_at) < now) {
    throw new Error("Este cupón ya venció.");
  }

  if (coupon.max_uses) {
    const { count, error: countError } = await supabaseAdmin
      .from("coupon_usages")
      .select("*", { count: "exact", head: true })
      .eq("coupon_code", codigo);

    if (countError) {
      throw new Error("No se pudo validar el cupón.");
    }

    if ((count || 0) >= coupon.max_uses) {
      throw new Error("Este cupón alcanzó su máximo de usos.");
    }
  }

  if (coupon.usage_mode === "single_global") {
    const { data, error } = await supabaseAdmin
      .from("coupon_usages")
      .select("id")
      .eq("coupon_code", codigo)
      .limit(1);

    if (error) {
      throw new Error("No se pudo validar el cupón.");
    }

    if (data && data.length > 0) {
      throw new Error("Este cupón ya fue utilizado.");
    }
  }

  if (coupon.usage_mode === "single_per_customer") {
    const { data, error } = await supabaseAdmin
      .from("coupon_usages")
      .select("id")
      .eq("coupon_code", codigo)
      .or(`email.eq.${email},phone.eq.${phone}`)
      .limit(1);

    if (error) {
      throw new Error("No se pudo validar el cupón.");
    }

    if (data && data.length > 0) {
      throw new Error("Este cupón ya fue usado con este correo o teléfono.");
    }
  }

  return coupon;
}

function formatScheduledForWhatsApp(dateIso: string) {
  return new Date(dateIso).toLocaleString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function sendScheduledOrderWhatsApp({
  customerName,
  customerPhone,
  trackingCode,
  scheduledForIso,
}: {
  customerName: string;
  customerPhone: string;
  trackingCode: string;
  scheduledForIso: string;
}) {
  const formattedDate = formatScheduledForWhatsApp(scheduledForIso);

  if (scheduledTemplateName) {
    await sendWhatsAppTemplateMessage({
      to: customerPhone,
      name: scheduledTemplateName,
      languageCode: whatsappTemplateLanguage,
      bodyParameters: [
        { text: customerName || "cliente" },
        { text: trackingCode },
        { text: formattedDate },
      ],
    });

    return;
  }

  await sendWhatsAppTextMessage({
    to: customerPhone,
    body: `Hola, ${customerName || "cliente"}.

Tu pedido con codigo ${trackingCode} quedo programado correctamente.
Lo dejaremos agendado para ${formattedDate}.

Cuando comencemos a prepararlo, te avisaremos por este medio.
Gracias por preferir Sole e Mare.`,
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreateOrderRequest;
    const { customer, order, cart } = body;

    if (!customer || !order || !cart?.length) {
      return NextResponse.json(
        { ok: false, error: "Faltan datos para crear el pedido." },
        { status: 400 }
      );
    }

    const emailNormalizado = customer.correo.trim().toLowerCase();
    const telefonoNormalizado = customer.telefono.trim();

    let customerId: string | null = null;

    const { data: customerByEmail, error: emailSearchError } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("email", emailNormalizado)
      .maybeSingle();

    if (emailSearchError) throw emailSearchError;

    if (customerByEmail) {
      customerId = customerByEmail.id;

      const { error: updateByEmailError } = await supabaseAdmin
        .from("customers")
        .update({
          name: customer.nombre,
          phone: telefonoNormalizado,
          accepts_promos: customer.aceptaPromos,
        })
        .eq("id", customerId);

      if (updateByEmailError) throw updateByEmailError;
    } else {
      const { data: customerByPhone, error: phoneSearchError } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("phone", telefonoNormalizado)
        .maybeSingle();

      if (phoneSearchError) throw phoneSearchError;

      if (customerByPhone) {
        customerId = customerByPhone.id;

        const { error: updateByPhoneError } = await supabaseAdmin
          .from("customers")
          .update({
            name: customer.nombre,
            email: emailNormalizado,
            accepts_promos: customer.aceptaPromos,
          })
          .eq("id", customerId);

        if (updateByPhoneError) throw updateByPhoneError;
      } else {
        const { data: newCustomer, error: customerError } = await supabaseAdmin
          .from("customers")
          .insert({
            name: customer.nombre,
            email: emailNormalizado,
            phone: telefonoNormalizado,
            accepts_promos: customer.aceptaPromos,
          })
          .select("id")
          .single();

        if (customerError) throw customerError;

        customerId = newCustomer.id;
      }
    }

    const subtotal = cart.reduce(
      (acc, item) => acc + Number(item.price) * Number(item.quantity),
      0
    );
    const eligibleSubtotalForCoupon = cart.reduce((acc, item) => {
      if (!item.isOnPromo) {
        return acc + Number(item.price) * Number(item.quantity);
      }
      return acc;
    }, 0);

    const appliedCouponCode: string | null =
      order.couponCode?.trim().toUpperCase() || null;
    let discountAmount = 0;

    if (appliedCouponCode) {
      if (eligibleSubtotalForCoupon <= 0) {
        throw new Error(
          "El cupón no aplica porque todos los productos del carrito están en promoción."
        );
      }

      const coupon = await validarCuponDisponible({
        couponCode: appliedCouponCode,
        email: emailNormalizado,
        phone: telefonoNormalizado,
      });

      discountAmount =
        coupon.discount_type === "percent"
          ? Math.round((eligibleSubtotalForCoupon * Number(coupon.discount_value)) / 100)
          : Math.min(Number(coupon.discount_value), eligibleSubtotalForCoupon);
    }

    const subtotalWithDiscount = Math.max(subtotal - discountAmount, 0);
    const deliveryAmount =
      order.tipoEntrega === "Delivery" && order.zona !== "Otra"
        ? Number(order.deliveryPrice || 0)
        : 0;
    const total =
      order.tipoEntrega === "Delivery" && order.zona !== "Otra"
        ? subtotalWithDiscount + deliveryAmount
        : subtotalWithDiscount;

    const trackingCode = await generateUniqueTrackingCode();
    const isScheduled = Boolean(order.isScheduled);
    let scheduledForIso: string | null = null;

    if (isScheduled) {
      if (!order.scheduledFor) {
        throw new Error("Debes seleccionar un horario para programar el pedido.");
      }

      const scheduledDate = new Date(order.scheduledFor);

      if (Number.isNaN(scheduledDate.getTime())) {
        throw new Error("La fecha programada no es válida.");
      }

      scheduledForIso = scheduledDate.toISOString();
    }

    const { data: createdOrder, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_id: customerId,
        tracking_code: trackingCode,
        status: isScheduled ? "scheduled" : "pending",
        delivery_type: order.tipoEntrega,
        address: order.tipoEntrega === "Delivery" ? order.direccion : null,
        zone: order.tipoEntrega === "Delivery" ? order.zona : null,
        other_zone:
          order.tipoEntrega === "Delivery" && order.zona === "Otra"
            ? order.otraZona
            : null,
        payment_method: order.pago,
        estimated_at: scheduledForIso,
        subtotal,
        discount_amount: discountAmount,
        delivery_amount: deliveryAmount,
        total,
        coupon_code: appliedCouponCode,
      })
      .select("id, tracking_code")
      .single();

    if (orderError) throw orderError;

    const items = cart.map((item) => ({
      order_id: createdOrder.id,
      product_name: item.name,
      unit_price: Number(item.price),
      quantity: Number(item.quantity),
      line_total: Number(item.price) * Number(item.quantity),
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(items);

    if (itemsError) throw itemsError;

    if (appliedCouponCode) {
      const { error: couponError } = await supabaseAdmin
        .from("coupon_usages")
        .insert({
          coupon_code: appliedCouponCode,
          email: emailNormalizado,
          phone: telefonoNormalizado,
          order_id: createdOrder.id,
        });

      if (couponError) {
        const duplicateCouponUsage =
          couponError.code === "23505" ||
          couponError.message?.toLowerCase().includes("duplicate key");

        if (!duplicateCouponUsage) {
          throw couponError;
        }
      }
    }

    if (isScheduled && scheduledForIso) {
      try {
        await sendScheduledOrderWhatsApp({
          customerName: customer.nombre,
          customerPhone: telefonoNormalizado,
          trackingCode: createdOrder.tracking_code,
          scheduledForIso,
        });
      } catch (whatsAppError) {
        console.error(
          "No se pudo enviar WhatsApp de pedido programado:",
          whatsAppError
        );
      }
    }

    return NextResponse.json({
      ok: true,
      trackingCode: createdOrder.tracking_code,
      message: isScheduled
        ? `Pedido programado para ${new Date(
            scheduledForIso as string
          ).toLocaleString("es-CL", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          })}.`
        : "Pedido enviado. Te avisaremos cuando sea confirmado.",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al guardar el pedido.";

    return NextResponse.json(
      { ok: false, error: message, trackingCode: "" },
      { status: 500 }
    );
  }
}
