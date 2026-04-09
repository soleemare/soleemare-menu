"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const {
    cart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
    total,
    totalItems,
  } = useCart();

  const router = useRouter();
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  if (cart.length === 0) return null;

  const handleRemoveItem = (name: string) => {
    removeFromCart(name);
    toast.success("Producto eliminado del carrito");
  };

  const handleClearCart = () => {
    clearCart();
    toast.success("Carrito vaciado");
  };

  const handleGoToCheckout = () => {
    if (cart.length === 0) {
      toast.error("Tu carrito está vacío 🍕");
      return;
    }

    toast.success("Continuando al checkout");
    router.push("/checkout");
  };

  return (
    <>
      {/* MOBILE: barra compacta */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white/95 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur-md md:hidden">
        <button
          onClick={() => setIsOpenMobile((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3 text-left"
        >
          <div>
            <p className="text-sm text-neutral-500">Tu pedido</p>
            <p className="text-lg font-bold">
              {totalItems} producto{totalItems !== 1 ? "s" : ""} · $
              {total.toLocaleString("es-CL")}
            </p>
          </div>

          <span className="text-sm font-medium text-neutral-700">
            {isOpenMobile ? "Cerrar" : "Ver pedido"}
          </span>
        </button>

        {isOpenMobile && (
          <div className="mt-4 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">🛒 Tu pedido ({totalItems})</h3>

              <button
                onClick={handleClearCart}
                className="text-sm text-neutral-500 transition hover:text-neutral-900"
              >
                Vaciar
              </button>
            </div>

            <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.name}
                  className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        ${item.price.toLocaleString("es-CL")} c/u
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(item.name)}
                      className="text-sm text-red-500 transition hover:text-red-700"
                      aria-label={`Eliminar ${item.name}`}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => decreaseQuantity(item.name)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white text-base transition hover:border-neutral-900"
                      >
                        −
                      </button>

                      <span className="min-w-[28px] text-center text-sm font-semibold">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => increaseQuantity(item.name)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white text-base transition hover:border-neutral-900"
                      >
                        +
                      </button>
                    </div>

                    <p className="text-sm font-bold text-neutral-900">
                      ${(item.price * item.quantity).toLocaleString("es-CL")}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
              <div className="flex items-center justify-between text-sm text-neutral-500">
                <span>Subtotal</span>
                <span>{totalItems} producto{totalItems !== 1 ? "s" : ""}</span>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold">
                  ${total.toLocaleString("es-CL")}
                </span>
              </div>
            </div>

            <button
              onClick={handleGoToCheckout}
              className="mt-4 block w-full rounded-2xl bg-green-600 py-3.5 text-center text-base font-semibold text-white transition hover:opacity-90"
            >
              Continuar pedido
            </button>
          </div>
        )}
      </div>

      {/* DESKTOP: panel flotante */}
      <aside className="fixed bottom-6 right-6 z-50 hidden w-[400px] max-w-[calc(100vw-3rem)] rounded-3xl border border-neutral-200 bg-white/95 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.12)] backdrop-blur-md md:block">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">🛒 Tu pedido ({totalItems})</h3>

          <button
            onClick={handleClearCart}
            className="text-sm text-neutral-500 transition hover:text-neutral-900"
          >
            Vaciar
          </button>
        </div>

        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {cart.map((item) => (
            <div
              key={item.name}
              className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-neutral-900">
                    {item.name}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    ${item.price.toLocaleString("es-CL")} c/u
                  </p>
                </div>

                <button
                  onClick={() => handleRemoveItem(item.name)}
                  className="text-base text-red-500 transition hover:text-red-700"
                  aria-label={`Eliminar ${item.name}`}
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => decreaseQuantity(item.name)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-base transition hover:border-neutral-900"
                  >
                    −
                  </button>

                  <span className="min-w-[28px] text-center text-base font-semibold">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() => increaseQuantity(item.name)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-base transition hover:border-neutral-900"
                  >
                    +
                  </button>
                </div>

                <p className="text-base font-bold text-neutral-900">
                  ${(item.price * item.quantity).toLocaleString("es-CL")}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
          <div className="flex items-center justify-between text-sm text-neutral-500">
            <span>Subtotal</span>
            <span>{totalItems} producto{totalItems !== 1 ? "s" : ""}</span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-3xl font-bold">
              ${total.toLocaleString("es-CL")}
            </span>
          </div>
        </div>

        <button
          onClick={handleGoToCheckout}
          className="mt-5 block w-full rounded-2xl bg-green-600 py-3.5 text-center text-base font-semibold text-white transition hover:opacity-90"
        >
          Continuar pedido
        </button>
      </aside>
    </>
  );
}