import { NextResponse } from "next/server";
import { fetchGoogleReviews } from "@/lib/googleReviews";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchGoogleReviews();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error interno al cargar reseñas",
        detail: error instanceof Error ? error.message : null,
      },
      { status: 500 }
    );
  }
}
