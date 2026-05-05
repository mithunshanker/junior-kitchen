// lib/cart-context.tsx — in-memory cart state. Dish type mirrors the /menu Firestore schema.

import { createContext, useContext, useState, type ReactNode } from "react";

/** Mirrors /menu/{dishId} in Firestore */
export type Dish = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  availability: {
    breakfast: boolean;
    lunch: boolean;
    dinner: boolean;
  };
  isAvailable: boolean;
  imageUrl?: string;
};

export type CartItem = Dish & { quantity: number };

type CartCtx = {
  items: CartItem[];
  add: (d: Dish) => void;
  remove: (id: string) => void;
  inc: (id: string) => void;
  dec: (id: string) => void;
  clear: () => void;
  total: number;
  count: number;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = (d: Dish) =>
    setItems((p) => {
      const ex = p.find((i) => i.id === d.id);
      if (ex) return p.map((i) => (i.id === d.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...p, { ...d, quantity: 1 }];
    });

  const remove = (id: string) => setItems((p) => p.filter((i) => i.id !== id));

  const inc = (id: string) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i)));

  const dec = (id: string) =>
    setItems((p) =>
      p.flatMap((i) =>
        i.id === id ? (i.quantity > 1 ? [{ ...i, quantity: i.quantity - 1 }] : []) : [i]
      )
    );

  const clear = () => setItems([]);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <Ctx.Provider value={{ items, add, remove, inc, dec, clear, total, count }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
};
