import Link from "next/link";
import Image from "next/image";
import HeroSlider from "@/components/HeroSlider";
import { fetchGoogleReviews } from "@/lib/googleReviews";
import { getStoreStatus, weeklySchedule } from "@/lib/storeHours";

export const revalidate = 900;

type GoogleReview = {
  author: string;
  authorUri?: string | null;
  photoUri?: string | null;
  rating?: number;
  text?: string;
  originalText?: string;
  publishTime?: string | null;
  relativePublishTimeDescription?: string;
};

function getReviewKey(review: GoogleReview) {
  return `${review.author}-${review.originalText || review.text}`;
}

function getReviewTimestamp(review: GoogleReview, fallbackIndex: number) {
  const parsedTime = review.publishTime ? new Date(review.publishTime).getTime() : 0;
  return Number.isFinite(parsedTime) && parsedTime > 0 ? parsedTime : -fallbackIndex;
}

function getWeekSeed(date: Date) {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const diffInDays = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  );

  return `${date.getFullYear()}-${Math.floor(diffInDays / 7)}`;
}

function hashString(value: string) {
  return value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function pickGoogleReviews(reviews: GoogleReview[], now: Date) {
  if (reviews.length === 0) {
    return {
      featuredReview: null,
      recentReviews: [] as GoogleReview[],
      rotatingReview: null,
    };
  }

  const sortedByRecent = [...reviews].sort(
    (a, b) =>
      getReviewTimestamp(b, reviews.indexOf(b)) -
      getReviewTimestamp(a, reviews.indexOf(a))
  );

  const recentReviews = sortedByRecent.slice(0, 2);
  const recentKeys = new Set(recentReviews.map(getReviewKey));

  const featuredPool = reviews.filter((review) => !recentKeys.has(getReviewKey(review)));
  const finalFeaturedPool = featuredPool.length > 0 ? featuredPool : reviews;
  const featuredIndex = hashString(getWeekSeed(now)) % finalFeaturedPool.length;
  const featuredReview = finalFeaturedPool[featuredIndex] ?? null;

  const rotatingPool = reviews.filter((review) => {
    const key = getReviewKey(review);
    return (
      !recentKeys.has(key) &&
      (!featuredReview || key !== getReviewKey(featuredReview))
    );
  });

  const finalRotatingPool = rotatingPool.length > 0 ? rotatingPool : reviews;
  const rotatingIndex =
    Math.floor(now.getTime() / (15 * 60 * 1000)) % finalRotatingPool.length;
  const rotatingReview = finalRotatingPool[rotatingIndex] ?? null;

  return { featuredReview, recentReviews, rotatingReview };
}

async function getGoogleReviews() {
  try {
    return await fetchGoogleReviews();
  } catch {
    return null;
  }
}

const recommended = [
  {
    name: "Margarita",
    description: "Salsa de tomate, mozzarella fior di latte y albahaca.",
    price: "$9.500",
    image: "/images/margarita.jpg",
    href: "/menu#pizzas",
    badge: "Clásica",
  },
  {
    name: "Pepperoni",
    description: "Salsa de tomate, mozzarella y pepperoni.",
    price: "$10.600",
    image: "/images/peperonni.jpg",
    href: "/menu#pizzas",
    badge: "Favorita",
  },
  {
    name: "Quattro Formaggi",
    description: "Mozzarella, queso azul, ricotta y parmesano.",
    price: "$12.700",
    image: "/images/4quesos.jpg",
    href: "/menu#pizzas",
    badge: "Premium",
  },
  {
    name: "Pizza Dolce + Helado",
    description: "Una promo dulce para cerrar perfecto.",
    price: "$8.500",
    image: "/images/dolce+helado.png",
    href: "/menu#promociones",
    badge: "Promo",
  },
];

export default async function HomePage() {
  const googleData = await getGoogleReviews();
  const reviews = (googleData?.reviews ?? []) as GoogleReview[];
  const { featuredReview, recentReviews, rotatingReview } = pickGoogleReviews(
    reviews,
    new Date()
  );
  const storeStatus = getStoreStatus();
  const days = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];

  return (
    <main className="min-h-screen bg-[#f8f5ef] text-neutral-900">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-black/5 bg-[#f8f5ef]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="hidden md:block" />

          <Link
            href="/"
            className="flex items-center gap-3 sm:gap-4 md:justify-self-center md:gap-5"
          >
            <Image
              src="/images/Logo_oficial.png"
              alt="Sole e Mare"
              width={360}
              height={360}
              className="h-[4.5rem] w-[4.5rem] object-contain sm:h-[5.25rem] sm:w-[5.25rem] md:h-32 md:w-32 lg:h-40 lg:w-40"
              priority
            />

            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-500 sm:text-xs sm:tracking-[0.32em] md:text-sm md:tracking-[0.4em]">
                Sole e Mare
              </p>
              <p className="text-sm font-medium text-neutral-700 sm:text-[15px] md:text-lg">
                Pizzas estilo napolitano
              </p>
            </div>
          </Link>

          <Link
            href="/menu"
            className="rounded-xl bg-[#f6070b] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#d40609] sm:px-4 sm:py-2.5 sm:text-sm md:justify-self-end md:px-5 md:py-3"
          >
            Pedir aquí
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <HeroSlider />
      </section>

      {/* VALUE STRIP */}
      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-white/40 bg-white/80 px-6 py-5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
            🚀 <span>Pide en menos de 1 minuto</span>
          </div>

          <div className="h-4 w-px bg-black/10" />

          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
            🍕 <span>Hechas como en Italia</span>
          </div>

          <div className="h-4 w-px bg-black/10" />

          <div className="flex items-center gap-2 text-sm font-semibold text-[#046703]">
            ⭐ <span>Clientes felices</span>
          </div>
        </div>
      </section>

      {/* RECOMENDADOS */}
      <section id="horarios" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="mb-6 text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
            Te recomendamos
          </p>
          <h2 className="mt-2 text-3xl font-black md:text-5xl">
            Nuestros favoritos
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {recommended.map((item) => (
            <article
              key={item.name}
              className="group overflow-hidden rounded-[1.75rem] border border-black/5 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="relative">
                <Image
                  src={item.image}
                  alt={item.name}
                  width={700}
                  height={700}
                  className="h-56 w-full object-cover"
                />
                <span className="absolute left-3 top-3 rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  {item.badge}
                </span>
              </div>

              <div className="p-5">
                <h3 className="text-xl font-bold text-neutral-900">
                  {item.name}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600">
                  {item.description}
                </p>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl font-black">{item.price}</span>
                  <span className="text-sm font-semibold text-[#046703]">
                    Disponible en menú
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* HORARIOS */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="grid gap-6 rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
              Horarios
            </p>
            <h2 className="mt-2 text-3xl font-black">Cuándo atendemos</h2>
            <p className="mt-4 text-sm leading-7 text-neutral-600">
              Pide para retiro o delivery dentro de nuestro horario de atención.
            </p>

            <div
              className={`mt-6 rounded-[1.5rem] border px-5 py-4 ${
                storeStatus.isOpen
                  ? "border-[#046703]/20 bg-[#046703]/10"
                  : "border-[#f6070b]/20 bg-[#f6070b]/10"
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  storeStatus.isOpen ? "text-[#046703]" : "text-[#f6070b]"
                }`}
              >
                {storeStatus.message}
              </p>
            </div>

            <div className="mt-6 rounded-[1.5rem] bg-[#fff8ef] p-5">
              <p className="text-sm font-semibold text-neutral-800">
                Santo Domingo, Chile
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Cocinamos pizzas estilo napolitano para disfrutar en casa o
                retirar en el local.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {days.map((day, index) => {
              const schedule = weeklySchedule[index];
              const isOpen = schedule?.isOpen && schedule.open && schedule.close;

              return (
                <div
                  key={day}
                  className="rounded-[1.5rem] border border-black/5 bg-neutral-50 p-5"
                >
                  <p className="font-semibold text-neutral-900">{day}</p>
                  {isOpen ? (
                    <p className="mt-2 text-sm text-neutral-600">
                      {schedule.open} a {schedule.close}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm font-medium text-[#f6070b]">
                      Cerrado
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* RESEÑAS GOOGLE */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start xl:grid-cols-[minmax(0,1fr)_380px]">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-neutral-500">
                Reseñas
              </p>
              <h2 className="mt-2 text-3xl font-black">Clientes felices</h2>

              {featuredReview ? (
                <div className="mt-6 flex h-full flex-col rounded-[1.5rem] bg-neutral-50 p-6 md:p-8">
                  <div className="text-3xl text-[#f48e07]">★★★★★</div>

                  <p className="mt-4 text-base leading-7 text-neutral-700 sm:text-lg sm:leading-8">
                    “{featuredReview.originalText || featuredReview.text}”
                  </p>

                  <div className="mt-6 flex flex-1 flex-col gap-4 sm:items-end sm:justify-between md:flex-row md:items-end">
                    <div className="flex items-center gap-3">
                      {featuredReview.photoUri ? (
                        <img
                          src={featuredReview.photoUri}
                          alt={featuredReview.author}
                          className="h-12 w-12 rounded-full object-cover ring-2 ring-white"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#046703]/10 text-sm font-bold text-[#046703] ring-2 ring-white">
                          {featuredReview.author.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <p className="font-semibold text-neutral-900">
                          {featuredReview.author}
                        </p>
                        {featuredReview.relativePublishTimeDescription ? (
                          <p className="text-sm text-neutral-500">
                            {featuredReview.relativePublishTimeDescription}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="pl-[60px] text-sm font-medium text-neutral-500 sm:pl-0">
                      Opinión destacada
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex h-full flex-col rounded-[1.5rem] bg-neutral-50 p-6 md:p-8">
                  <div className="text-3xl text-[#f48e07]">★★★★★</div>

                  <p className="mt-4 text-base leading-7 text-neutral-700 sm:text-lg sm:leading-8">
                    “Muy buena pizza, excelente atención y una experiencia que
                    vale la pena repetir.”
                  </p>

                  <div className="mt-6 flex flex-1 flex-col gap-4 sm:items-end sm:justify-between md:flex-row md:items-end">
                    <div>
                      <p className="font-semibold text-neutral-900">
                        Cliente Sole e Mare
                      </p>
                    </div>

                    <div className="text-sm font-medium text-neutral-500">
                      Opinión destacada
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex h-full items-start justify-center">
              <div className="flex h-full w-full flex-col rounded-[1.5rem] bg-[#fff8ef] p-6 lg:max-w-[360px]">
                <p className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                  Google
                </p>

                <div className="mt-3 text-2xl text-[#f48e07]">★★★★★</div>

                <p className="mt-2 text-4xl font-black">
                  {googleData?.rating ?? "5.0"}
                </p>

                <p className="mt-2 text-sm text-neutral-500">
                  Basado en {googleData?.userRatingCount ?? "muchas"} reseñas
                </p>

                <a
                  href="https://www.google.com/maps/search/?api=1&query=Sole+e+Mare+Santo+Domingo+Chile"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex w-fit rounded-xl bg-white px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm transition hover:bg-neutral-100"
                >
                  Ver en Google
                </a>
              </div>
            </div>
          </div>

          {(recentReviews.length > 0 || rotatingReview) && (
            <div className="mx-auto mt-8 grid max-w-6xl gap-4 md:grid-cols-2 xl:grid-cols-3">
              {recentReviews.map((review, index: number) => (
                <article
                  key={`${getReviewKey(review)}-${index}`}
                  className="rounded-[1.25rem] border border-black/5 bg-neutral-50 p-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                    Reseña reciente
                  </p>

                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {review.photoUri ? (
                        <img
                          src={review.photoUri}
                          alt={review.author}
                          className="h-11 w-11 rounded-full object-cover ring-2 ring-white"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#046703]/10 text-sm font-bold text-[#046703] ring-2 ring-white">
                          {review.author.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <p className="font-semibold text-neutral-900">
                          {review.author}
                        </p>
                        <div className="mt-1 text-sm text-[#f48e07]">
                          {"★".repeat(review.rating || 5)}
                        </div>
                      </div>
                    </div>

                    {review.relativePublishTimeDescription ? (
                      <span className="text-xs text-neutral-400">
                        {review.relativePublishTimeDescription}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 line-clamp-4 text-sm leading-6 text-neutral-600">
                    {review.originalText || review.text}
                  </p>
                </article>
              ))}

              {rotatingReview ? (
                <article className="rounded-[1.25rem] border border-black/5 bg-neutral-50 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {rotatingReview.photoUri ? (
                        <img
                          src={rotatingReview.photoUri}
                          alt={rotatingReview.author}
                          className="h-11 w-11 rounded-full object-cover ring-2 ring-white"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#046703]/10 text-sm font-bold text-[#046703] ring-2 ring-white">
                          {rotatingReview.author.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <p className="font-semibold text-neutral-900">
                          {rotatingReview.author}
                        </p>
                        <div className="mt-1 text-sm text-[#f48e07]">
                          {"★".repeat(rotatingReview.rating || 5)}
                        </div>
                      </div>
                    </div>

                    {rotatingReview.relativePublishTimeDescription ? (
                      <span className="text-xs text-neutral-400">
                        {rotatingReview.relativePublishTimeDescription}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 line-clamp-4 text-sm leading-6 text-neutral-600">
                    {rotatingReview.originalText || rotatingReview.text}
                  </p>
                </article>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t-4 border-[#69adb6]/35 bg-[linear-gradient(180deg,#f4e9da_0%,#f8f1e7_18%,#f8f1e7_100%)] text-[#17352b] shadow-[0_-18px_40px_rgba(23,53,43,0.05)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3 md:gap-12">
          <div>
            <div className="flex items-center gap-4">
              <Image
                src="/images/Logo_oficial.png"
                alt="Sole e Mare"
                width={72}
                height={72}
                className="h-16 w-16 object-contain"
              />

              <div>
                <p className="text-3xl font-black tracking-tight text-[#046703]">
                  Sole e Mare
                </p>
                <p className="text-sm uppercase tracking-[0.28em] text-[#69adb6]">
                  Pizzería
                </p>
              </div>
            </div>

            <p className="mt-6 text-lg leading-8 text-[#17352b]/88">
              Pizzas estilo napolitano hechas con masa artesanal, ingredientes
              seleccionados y una cocina pensada para compartir buenos momentos.
            </p>

            <p className="mt-6 max-w-md text-lg leading-8 text-[#17352b]/88">
              Atendemos pedidos para retiro y delivery en Santo Domingo, con una
              experiencia simple para pedir, seguir tu compra y volver por tus
              favoritas.
            </p>
          </div>

          <div>
            <p className="text-3xl font-black tracking-tight text-[#046703]">
              Encuéntranos
            </p>

            <div className="mt-6 space-y-6 text-lg leading-8 text-[#17352b]/88">
              <div>
                <p className="font-semibold text-[#17352b]">Santo Domingo, Chile</p>
                <p className="mt-1 text-[#17352b]/80">
                  Ignacio Carrera Pinto 17, Santo Domingo, Chile.
                </p>
              </div>

              <div>
                <p className="font-semibold text-[#17352b]">Horarios</p>
                <p className="mt-1 text-[#17352b]/80">
                  Lunes cerrado.
                </p>
                <p className="text-[#17352b]/80">
                  Martes a jueves de 13:00 a 22:00 hrs.
                </p>
                <p className="text-[#17352b]/80">
                  Viernes y sábado de 13:00 a 23:00 hrs.
                </p>
                <p className="text-[#17352b]/80">
                  Domingo de 13:00 a 20:00 hrs.
                </p>
              </div>

              <div>
                <p className="font-semibold text-[#17352b]">Contáctanos</p>
                <p className="mt-1 text-[#17352b]/80">WhatsApp: +56 9 9792 5852</p>
                <p className="text-[#17352b]/80">
                  Instagram: @pizzeriasoleemare
                </p>
                <p className="text-[#17352b]/80">
                  Correo: contacto@soleemare.cl
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-3xl font-black tracking-tight text-[#046703]">
              Ayuda
            </p>

            <div className="mt-6 flex flex-col items-start gap-4 text-lg">
              <Link
                href="/menu"
                className="underline decoration-[#69adb6]/45 underline-offset-8 hover:text-[#046703]"
              >
                Pedir aquí
              </Link>
              <Link
                href="/#horarios"
                className="underline decoration-[#69adb6]/45 underline-offset-8 hover:text-[#046703]"
              >
                Horarios de atención
              </Link>
              <a
                href="https://instagram.com/pizzeriasoleemare"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-[#69adb6]/45 underline-offset-8 hover:text-[#046703]"
              >
                Instagram
              </a>
              <a
                href="https://wa.me/56997925852"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-[#69adb6]/45 underline-offset-8 hover:text-[#046703]"
              >
                Escríbenos por WhatsApp
              </a>
              <a
                href="mailto:contacto@soleemare.cl?subject=Consulta%20por%20eventos%20-%20Sole%20e%20Mare"
                className="underline decoration-[#69adb6]/45 underline-offset-8 hover:text-[#046703]"
              >
                Cotizar evento
              </a>
            </div>

            <p className="mt-10 text-sm text-[#17352b]/60">
              © {new Date().getFullYear()} Sole e Mare
            </p>
          </div>
        </div>
      </footer>

      {/* BOTÓN WHATSAPP */}
      <a
        href="https://wa.me/56997925852"
        target="_blank"
        rel="noreferrer"
        aria-label="Escríbenos por WhatsApp"
        className="fixed bottom-5 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-[1.04] hover:bg-[#1ebe5d]"
      >
        <Image
          src="/icons/whatsapp.webp"
          alt=""
          aria-hidden="true"
          width={34}
          height={34}
          className="h-8 w-8"
        />
      </a>
    </main>
  );
}
