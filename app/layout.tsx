import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { CartProvider } from "../context/CartContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sole e Mare",
  description: "Pizzas estilo napolitano 🍕 - Haz tu pedido online",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-neutral-50 text-neutral-900">
        <CartProvider>
          {children}
        </CartProvider>

        <Toaster
          position="top-center"
          toastOptions={{
            duration: 2500,
            style: {
              background: "#111",
              color: "#fff",
              borderRadius: "12px",
              padding: "12px 16px",
              fontSize: "14px",
            },
            success: {
              style: {
                background: "#16a34a",
              },
            },
            error: {
              style: {
                background: "#dc2626",
              },
            },
          }}
        />
      </body>
    </html>
  );
}