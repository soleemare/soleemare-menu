import { NextRequest, NextResponse } from "next/server";

// 🔹 Verificación inicial de Meta (MUY IMPORTANTE)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    console.log("✅ Webhook verificado correctamente");
    return new NextResponse(challenge || "", { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// 🔹 Recepción de eventos (mensajes, estados, etc.)
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    console.log(
      "📩 Webhook recibido:",
      JSON.stringify(payload, null, 2)
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("❌ Error webhook:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}