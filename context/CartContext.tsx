"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type CartItem = {
  name: string;
  price: number;
  quantity: number;
  image?: string;
  isOnPromo?: boolean;
  originalPrice?: number;
  promoPrice?: number;
};

type AddItemInput = {
  name: string;
  price: number;
  image?: string;
  isOnPromo?: boolean;
  originalPrice?: number;
  promoPrice?: number;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: AddItemInput) => void;
  increaseQuantity: (name: string) => void;
  decreaseQuantity: (name: string) => void;
  removeFromCart: (name: string) => void;
  clearCart: () => void;
  total: number;
  totalItems: number;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (item: AddItemInput) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.name === item.name);

      if (existing) {
        return prev.map((p) =>
          p.name === item.name
            ? { ...p, quantity: p.quantity + 1 }
            : p
        );
      }

      return [
        ...prev,
        {
          ...item,
          quantity: 1,
        },
      ];
    });
  };

  const increaseQuantity = (name: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.name === name ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const decreaseQuantity = (name: string) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.name === name ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (name: string) => {
    setCart((prev) => prev.filter((item) => item.name !== name));
  };

  const clearCart = () => {
    setCart([]);
  };

  const total = useMemo(
    () => cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [cart]
  );

  const totalItems = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart]
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        increaseQuantity,
        decreaseQuantity,
        removeFromCart,
        clearCart,
        total,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
}