import { NextResponse } from "next/server";
import { requireAdminUser } from "../../../../../../lib/adminGuard";
import { supabaseAdmin } from "../../../../../../lib/supabaseAdmin";
import {
  sendWhatsAppTemplateMessage,
  sendWhatsAppTextMessage,
} from "../../../../../../lib/whatsapp";

type OrderRow = {
  id: string;
  status: string;
  tracking_code: string | null;
  created_at: string;
  accepted_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  delivering_at: string | null;
  delivered_at: string | null;
  rejected_at: string | null;
  estimated_minutes: number | null;
  estimated_at: string | null;
  delivery_type: string;
  customers:
    | {
        name: string;
        phone: string;
      }
    | {
        name: string;
        phone: string;
      }[]
    | null;
};

type StatusUpdatePayload = {
  status?: string;
  estimatedMinutes?: number;
};

type OrderUpdateFields = {
  status: string;
  accepted_at?: string | null;
  preparing_at?: string | null;
  ready_at?: string | null;
  delivering_at?: string | null;
  delivered_at?: string | null;
  rejected_at?: string | null;
  estimated_minutes?: number;
  estimated_at?: string | null;
};

const acceptedTemplateName =
  process.env.NEXT_PUBLIC_WHATSAPP_TEMPLATE_ORDER_ACCEPTED || "";
const rejectedTemplateName =
  process.env.NEXT_PUBLIC_WHATSAPP_TEMPLATE_ORDER_REJECTED || "";
const readyPickupTemplateName =
  process.env.NEXT_PUBLIC_WHATSAPP_TEMPLATE_ORDER_READY_PICKUP || "";
const outForDeliveryTemplateName =
  process.env.NEXT_PUBLIC_WHATSAPP_TEMPLATE_ORDER_OUT_FOR_DELIVERY || "";
const deliveredTemplateName =
  process.env.NEXT_PUBLIC_WHATSAPP_TEMPLATE_ORDER_DELIVERED || "";
const whatsappTemplateLanguage =
  process.env.NEXT_PUBLIC_WHATSAPP_TEMPLATE_LANGUAGE || "es_CL";

function getTrackingUrl(trackingCode: string | null) {
  if (!trackingCode) return "";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/track/${trackingCode}`;
}

async function sendOrderWhatsApp(order: OrderRow, status: string) {
  const customer = Array.isArray(order.customers)
    ? order.customers[0] || null
    : order.customers;
  const phone = customer?.phone;
  if (!phone) {
    return { sent: false, reason: "missing_phone" as const };
  }

  const trackingUrl = getTrackingUrl(order.tracking_code);

  if (status === "accepted") {
    if (acceptedTemplateName) {
      await sendWhatsAppTemplateMessage({
        to: phone,
        name: acceptedTemplateName,
        languageCode: whatsappTemplateLanguage,
        bodyParameters: [
          { text: customer?.name || "cliente" },
          { text: order.tracking_code || "-" },
          { text: String(order.estimated_minutes ?? 20) },
          { text: trackingUrl },
        ],
      });
    } else {
      await sendWhatsAppTextMessage({
        to: phone,
        body: `Hola ${customer?.name || ""} 👋

Tu pedido ${order.tracking_code || ""} fue aceptado 🍕
Tiempo estimado: ${order.estimated_minutes ?? 20} minutos.

Puedes seguir su estado aquí:
${trackingUrl}`,
      });
    }
  }

  if (status === "rejected") {
    if (rejectedTemplateName) {
      await sendWhatsAppTemplateMessage({
        to: phone,
        name: rejectedTemplateName,
        languageCode: whatsappTemplateLanguage,
        bodyParameters: [
          { text: customer?.name || "cliente" },
          { text: order.tracking_code || "-" },
        ],
      });
    } else {
      await sendWhatsAppTextMessage({
        to: phone,
        body: `Hola ${customer?.name || ""} 👋

Tu pedido ${order.tracking_code || ""} no pudo ser aceptado en este momento.
Si quieres, puedes escribirnos para ayudarte con una alternativa.
Gracias por preferir Sole e Mare.`,
      });
    }
  }

  if (status === "ready" && order.delivery_type === "Retiro en local") {
    if (readyPickupTemplateName) {
      await sendWhatsAppTemplateMessage({
        to: phone,
        name: readyPickupTemplateName,
        languageCode: whatsappTemplateLanguage,
        bodyParameters: [
          { text: customer?.name || "cliente" },
          { text: order.tracking_code || "-" },
        ],
      });
    } else {
      await sendWhatsAppTextMessage({
        to: phone,
        body: `Hola ${customer?.name || ""}.

Tu pedido ${order.tracking_code || ""} está listo para retiro.`,
      });
    }
  }

  if (status === "delivering" && order.delivery_type === "Delivery") {
    if (outForDeliveryTemplateName) {
      await sendWhatsAppTemplateMessage({
        to: phone,
        name: outForDeliveryTemplateName,
        languageCode: whatsappTemplateLanguage,
        bodyParameters: [
          { text: customer?.name || "cliente" },
          { text: order.tracking_code || "-" },
        ],
      });
    } else {
      await sendWhatsAppTextMessage({
        to: phone,
        body: `Hola ${customer?.name || ""}.

Tu pedido ${order.tracking_code || ""} está en reparto.`,
      });
    }
  }

  if (status === "delivered" && order.delivery_type === "Delivery") {
    if (deliveredTemplateName) {
      await sendWhatsAppTemplateMessage({
        to: phone,
        name: deliveredTemplateName,
        languageCode: whatsappTemplateLanguage,
        bodyParameters: [
          { text: customer?.name || "cliente" },
          { text: order.tracking_code || "-" },
        ],
      });
    } else {
      await sendWhatsAppTextMessage({
        to: phone,
        body: `Hola ${customer?.name || ""}.

Tu pedido ${order.tracking_code || ""} fue entregado.`,
      });
    }
  }

  return { sent: true };
}

function buildUpdateFields(status: string, estimatedMinutes?: number): OrderUpdateFields {
  const now = new Date();
  const nowIso = now.toISOString();

  if (status === "accepted") {
    const minutes = estimatedMinutes ?? 20;
    return {
      status,
      accepted_at: nowIso,
      estimated_minutes: minutes,
      estimated_at: new Date(now.getTime() + minutes * 60000).toISOString(),
    };
  }

  const fields: OrderUpdateFields = { status };
  if (status === "preparing") fields.preparing_at = nowIso;
  if (status === "ready") fields.ready_at = nowIso;
  if (status === "delivering") fields.delivering_at = nowIso;
  if (status === "delivered") fields.delivered_at = nowIso;
  if (status === "rejected") fields.rejected_at = nowIso;
  return fields;
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const body = (await req.json()) as StatusUpdatePayload;
  const status = body.status;

  if (!id || !status) {
    return NextResponse.json(
      { ok: false, error: "Faltan datos para actualizar el pedido." },
      { status: 400 }
    );
  }

  const fields = buildUpdateFields(status, body.estimatedMinutes);

  const { data: updatedOrder, error: updateError } = await supabaseAdmin
    .from("orders")
    .update(fields)
    .eq("id", id)
    .select(
      `
      id,
      status,
      tracking_code,
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
      customers(name, phone)
    `
    )
    .single();

  if (updateError) {
    return NextResponse.json(
      { ok: false, error: "No se pudo actualizar el pedido.", detail: updateError.message },
      { status: 500 }
    );
  }

  try {
    const notification = await sendOrderWhatsApp(updatedOrder as unknown as OrderRow, status);

    return NextResponse.json({
      ok: true,
      order: updatedOrder,
      notification,
    });
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : "Error enviando WhatsApp.";

    return NextResponse.json({
      ok: true,
      order: updatedOrder,
      notification: {
        sent: false,
        reason: detail,
      },
    });
  }
}
