"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  defaultBannerSlides,
  type BannerSlide,
} from "@/lib/bannerSlides";

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [slides, setSlides] = useState<BannerSlide[]>(defaultBannerSlides);

  const goToPrevious = () => {
    setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    const loadBanners = async () => {
      try {
        const res = await fetch("/api/banners", { cache: "no-store" });
        const data = (await res.json()) as {
          ok: boolean;
          banners?: BannerSlide[];
        };

        if (!res.ok || !data.ok || !data.banners?.length) {
          return;
        }

        setSlides(data.banners);
        setCurrent(0);
      } catch (error) {
        console.error("No se pudieron cargar los banners:", error);
      }
    };

    loadBanners();
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;

    const interval = setInterval(() => {
      setCurrent((prev) =>
        prev === slides.length - 1 ? 0 : prev + 1
      );
    }, 10000);

    return () => clearInterval(interval);
  }, [slides]);

  return (
    <div className="relative overflow-hidden rounded-[2rem]">
      <div className="relative min-h-[340px] md:min-h-[500px]">
        {slides.map((slide, index) => {
          const isActive = index === current;

          if (slide.type === "coupon") {
            return (
              <div
                key={index}
                className={`absolute inset-0 transition-all duration-700 ${
                  isActive ? "z-10 opacity-100" : "z-0 opacity-0"
                }`}
              >
                <Image
                  src={slide.image}
                  alt="slide"
                  fill
                  className={slide.imageClassName || "object-cover object-center"}
                />

                <div className="absolute inset-0 bg-gradient-to-r from-black/72 via-black/34 to-transparent" />

                <div className="absolute inset-0 flex items-center">
                  <div className="max-w-2xl px-6 text-white md:px-12">
                    <span className="rounded-full bg-[#c9dfc3] px-4 py-1 text-xs font-semibold uppercase text-[#046703]">
                      {slide.badge}
                    </span>

                    <h1 className="mt-5 whitespace-pre-line text-[2.8rem] font-black leading-[0.92] sm:text-4xl md:text-7xl">
                      {slide.title}
                    </h1>

                    <p className="mt-4 max-w-xl text-sm leading-6 text-white/90 sm:text-base">
                      {slide.description}
                    </p>

                    <div className="mt-4">
                      <span className="inline-flex rounded-xl bg-white/92 px-3 py-1.5 text-sm font-bold tracking-[0.18em] text-[#046703] shadow-sm">
                        {slide.code}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={index}
              className={`absolute inset-0 transition-all duration-700 ${
                isActive ? "z-10 opacity-100" : "z-0 opacity-0"
              }`}
            >
              <Image
                src={slide.image}
                alt="slide"
                fill
                className={slide.imageClassName || "object-cover object-center"}
              />

              <div
                className={`absolute inset-0 ${
                  slide.overlayClassName ||
                  "bg-gradient-to-r from-black/70 via-black/30 to-transparent"
                }`}
              />

              <div className="absolute inset-0 flex items-center">
                <div className="max-w-2xl px-6 text-white md:px-12">
                  <span className="rounded-full bg-[#f48e07] px-4 py-1 text-xs font-bold uppercase">
                    {slide.badge}
                  </span>

                  <h1 className="mt-5 whitespace-pre-line text-[2.8rem] font-black leading-[0.92] sm:text-4xl md:text-7xl">
                    {slide.title}
                  </h1>

                  <p className="mt-4 max-w-xl text-sm leading-6 text-white/90 sm:text-base">
                    {slide.description}
                  </p>

                  {slide.price && (
                    <div className="mt-4 flex items-end gap-3">
                      <span className="text-4xl font-bold">{slide.price}</span>
                      <span className="line-through text-white/60">
                        {slide.oldPrice}
                      </span>
                    </div>
                  )}

                </div>
              </div>
            </div>
          );
        })}

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              aria-label="Banner anterior"
              className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#046703] shadow-md transition hover:bg-white md:left-5 md:h-12 md:w-12"
            >
              <span className="text-xl leading-none md:text-2xl">‹</span>
            </button>

            <button
              type="button"
              onClick={goToNext}
              aria-label="Banner siguiente"
              className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#046703] shadow-md transition hover:bg-white md:right-5 md:h-12 md:w-12"
            >
              <span className="text-xl leading-none md:text-2xl">›</span>
            </button>
          </>
        )}

        {/* DOTS */}
        <div className="absolute bottom-4 left-5 z-20 flex gap-2 sm:bottom-5 sm:left-6">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full ${
                current === i ? "w-8 bg-white" : "w-2 bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
