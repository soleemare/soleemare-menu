import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { requireAdminUser } from "../../../../lib/adminGuard";

export async function POST(req: Request) {
  const auth = await requireAdminUser();
  if (!auth.ok) return auth.response;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = String(formData.get("folder") || "products");

    if (!file) {
      return NextResponse.json(
        { error: "No se recibió ningún archivo" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeName = file.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "")
      .toLowerCase();

    const safeFolder = folder
      .replace(/[^a-zA-Z0-9/_-]/g, "")
      .replace(/^\/+|\/+$/g, "") || "products";

    const filePath = `${safeFolder}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("product-images")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { data } = supabaseAdmin.storage
      .from("product-images")
      .getPublicUrl(filePath);

    return NextResponse.json({
      path: filePath,
      publicUrl: data.publicUrl,
    });
  } catch (error) {
    console.error("Error al subir imagen:", error);

    return NextResponse.json(
      { error: "Error al subir la imagen" },
      { status: 500 }
    );
  }
}
