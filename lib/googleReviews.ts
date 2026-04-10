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

export type GoogleReviewsData = {
  name: string;
  rating: number | null;
  userRatingCount: number | null;
  googleMapsUri: string | null;
  reviews: {
    author: string;
    authorUri: string | null;
    photoUri: string | null;
    rating: number | null;
    text: string;
    originalText: string;
    publishTime: string | null;
    relativePublishTimeDescription: string;
  }[];
};

const PLACE_ID = process.env.GOOGLE_PLACE_ID;
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function fetchGoogleReviews() {
  if (!PLACE_ID || !API_KEY) {
    throw new Error("Faltan GOOGLE_PLACE_ID o GOOGLE_MAPS_API_KEY");
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
    const detail = await res.text();
    throw new Error(detail || "No se pudo obtener reseñas");
  }

  const data = await res.json();

  return {
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
  } satisfies GoogleReviewsData;
}
