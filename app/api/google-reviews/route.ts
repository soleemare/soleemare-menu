import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PLACE_ID = process.env.GOOGLE_PLACE_ID;
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

type GooglePlaceReview = {
  authorAttribution?: {
    displayName?: string;
    uri?: string;
    photoUri?: string;
  };
  rating?: number;
  text?: {
    text?: string;
  };
  originalText?: {
    text?: string;
  };
  publishTime?: string;
  relativePublishTimeDescription?: string;
};

export async function GET() {
  try {
    if (!PLACE_ID || !API_KEY) {
      return NextResponse.json(
        { error: "Faltan GOOGLE_PLACE_ID o GOOGLE_MAPS_API_KEY" },
        { status: 500 }
      );
    }

    const url = `https://places.googleapis.com/v1/places/${PLACE_ID}?languageCode=es`;

    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask":
          "displayName,rating,userRatingCount,reviews,googleMapsUri",
      },
      next: { revalidate: 900 },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "No se pudo obtener reseñas", detail: text },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      name: data.displayName?.text ?? "Sole e Mare",
      rating: data.rating ?? null,
      userRatingCount: data.userRatingCount ?? null,
      googleMapsUri: data.googleMapsUri ?? null,
      reviews: ((data.reviews ?? []) as GooglePlaceReview[]).map((review) => ({
        author: review.authorAttribution?.displayName ?? "Cliente Google",
        authorUri: review.authorAttribution?.uri ?? null,
        photoUri: review.authorAttribution?.photoUri ?? null,
        rating: review.rating ?? null,
        text: review.text?.text ?? "",
        originalText: review.originalText?.text ?? "",
        publishTime: review.publishTime ?? null,
        relativePublishTimeDescription:
          review.relativePublishTimeDescription ?? "",
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Error interno al cargar reseñas" },
      { status: 500 }
    );
  }
}
