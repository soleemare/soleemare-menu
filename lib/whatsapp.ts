type WhatsAppTextMessageParams = {
  to: string;
  body: string;
};

type WhatsAppTemplateParameter = {
  type?: "text";
  text: string;
};

type WhatsAppTemplateMessageParams = {
  to: string;
  name: string;
  languageCode?: string;
  bodyParameters?: WhatsAppTemplateParameter[];
};

function normalizeWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("56")) return digits;
  if (digits.length === 9) return `56${digits}`;
  if (digits.length === 8) return `56${digits}`;
  return digits;
}

async function sendWhatsAppRequest(to: string, payload: Record<string, unknown>) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error("Faltan variables de entorno de WhatsApp.");
  }

  const normalizedTo = normalizeWhatsAppPhone(to);

  const response = await fetch(
    `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizedTo,
        ...payload,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `WhatsApp API error: ${response.status} ${JSON.stringify(data)}`
    );
  }

  return data;
}

export async function sendWhatsAppTextMessage({
  to,
  body,
}: WhatsAppTextMessageParams) {
  return sendWhatsAppRequest(to, {
    type: "text",
    text: {
      preview_url: false,
      body,
    },
  });
}

export async function sendWhatsAppTemplateMessage({
  to,
  name,
  languageCode = "es_CL",
  bodyParameters = [],
}: WhatsAppTemplateMessageParams) {
  const components =
    bodyParameters.length > 0
      ? [
          {
            type: "body",
            parameters: bodyParameters.map((parameter) => ({
              type: parameter.type || "text",
              text: parameter.text,
            })),
          },
        ]
      : undefined;

  return sendWhatsAppRequest(to, {
    type: "template",
    template: {
      name,
      language: {
        code: languageCode,
      },
      components,
    },
  });
}
