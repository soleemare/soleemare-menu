import { NextRequest, NextResponse } from "next/server";
import {
  sendWhatsAppTemplateMessage,
  sendWhatsAppTextMessage,
} from "../../../../lib/whatsapp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, message, template } = body as {
      to?: string;
      message?: string;
      template?: {
        name?: string;
        languageCode?: string;
        bodyParameters?: Array<{
          type?: "text";
          text?: string;
        }>;
      };
    };

    if (!to || (!message && !template?.name)) {
      return NextResponse.json(
        { ok: false, error: "Faltan campos obligatorios." },
        { status: 400 }
      );
    }

    const result = template?.name
      ? await sendWhatsAppTemplateMessage({
          to,
          name: template.name,
          languageCode: template.languageCode,
          bodyParameters: (template.bodyParameters || []).flatMap((parameter) =>
            parameter.text ? [{ type: parameter.type, text: parameter.text }] : []
          ),
        })
      : await sendWhatsAppTextMessage({
          to,
          body: message || "",
        });

    return NextResponse.json({ ok: true, result });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error interno.";
    console.error("Error enviando WhatsApp:", error);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
