type MenuItem = {
  name: string;
  price: number;
  originalPrice?: number;
  promoPrice?: number;
  isOnPromo?: boolean;
  description?: string;
  badge?: string;
  image?: string;
};

type MenuSection = {
  category: string;
  items: MenuItem[];
};

export const menuData: MenuSection[] = [
  {
    category: "Promociones",
    items: [
      {
        name: "Pepperoni + Margarita + Bebida",
        description: "Pizza Pepperoni + Pizza Margarita + Bebida 1.5L",
        price: 18300,
        originalPrice: 20200,
        promoPrice: 18300,
        isOnPromo: true,
        badge: "Promo 🔥",
        image: "/images/peperoni+margarita.jpeg",
      },
      {
        name: "Pizza Dolce + Helado Il Maestrale",
        description: "Pizza Dolce + 1 Helado Il Maestrale",
        price: 8500,
        isOnPromo: true,
        badge: "Promo 🔥",
        image: "/images/dolce+helado.png",
      },
      {
        name: "Pizza Margarita + 2 Helados Il Maestrale",
        price: 12300,
        isOnPromo: true,
        badge: "Promo 🔥",
        image: "/images/margarita+helado.png",
      },
      {
        name: "Pizza Pepperoni + 2 Helados Il Maestrale",
        price: 13100,
        isOnPromo: true,
        badge: "Promo 🔥",
        image: "/images/peperonni+helado.png",
      },
    ],
  },
  {
    category: "Acompañamientos",
    items: [
      {
        name: "Paleti Napolitano",
        description:
          "Palitos con masa napolitana, aceite de ajo, queso mantecoso y toppings",
        price: 7300,
        isOnPromo: false,
        image: "/images/paleti.jpg",
      },
    ],
  },
  {
    category: "Pizzas",
    items: [
      {
        name: "Margarita",
        description:
          "Salsa Pomodoro San Marzano, Mozarella Fior di Latte, Aceite de Oliva, Albahaca y Queso Parmesano.",
        price: 9500,
        isOnPromo: false,
        image: "/images/margarita.jpg",
      },
      {
        name: "Pepperoni",
        description:
          "Salsa Pomodoro San Marzano, Mozzarella Fior di Latte y Pepperoni.",
        price: 10600,
        isOnPromo: false,
        image: "/images/peperonni.jpg",
      },
      {
        name: "Pesto di Sole",
        description:
          "Salsa Pomodoro San Marzano, Mozarella Fior di Latte, Tomate Cherry, Pesto a la Genovese y Queso Parmesano.",
        price: 11000,
        isOnPromo: false,
        image: "/images/pesto.jpg",
      },
      {
        name: "Vegetariana",
        description:
          "Salsa Pomodoro San Marzano, Mozarella Fior di Latte, Aceite de Oliva, Albahaca, Aceituna y Champiñón.",
        price: 11600,
        isOnPromo: false,
        image: "/images/vegetariana.jpg",
      },
      {
        name: "Quattro Formaggi",
        description:
          "Mozzarella Fior di Latte, Queso ricotta, Queso azul y Queso parmesano.",
        price: 12700,
        isOnPromo: false,
        image: "/images/4quesos.jpg",
      },
      {
        name: "Quattro Stagioni",
        description:
          "Salsa Pomodoro San Marzano, Mozarella Fior di Latte, Aceite de Oliva, Aceitunas, Champiñon, Alcachofa y Prossciutto.",
        price: 13200,
        isOnPromo: false,
        image: "/images/4estaciones.jpg",
      },
      {
        name: "Prosciutto",
        description:
          "Salsa Podomoro San Marzano, Mozzarella Fior di Latte, Prosciutto, Rúcula y Parmesano Reggiano.",
        price: 13200,
        isOnPromo: false,
        image: "/images/prossciutto.jpg",
      },
      {
        name: "Gamberetti Piccante",
        description:
          "Salsa Podomoro San Marzano, Mozzarella Fior di Latte, Camarón, Aceite al merkén y un toque de Albahaca.",
        price: 14300,
        isOnPromo: false,
        image: "/images/camaron.jpg",
      },
      {
        name: "Salmone di Mare",
        description:
          "Mozzarella Fior di Latte, Queso ricotta,Rucula, Salmón,ralladura de limón y un toque de aceite de oliva extra virgen.",
        price: 14900,
        isOnPromo: false,
        image: "/images/salmon.jpg",
      },
    ],
  },
  {
    category: "Postres",
    items: [
      {
        name: "Pizza Dolce",
        description: "Crema de Avellanas, Frutillas y Azúcar Glas.",
        price: 6900,
        isOnPromo: false,
        image: "/images/dolce.jpg",
      },
    ],
  },
  {
    category: "Gelato Il Maestrale",
    items: [
      {
        name: "Stracciatella",
        description:
          "Gelato cremoso de leche fresca con finas láminas de chocolate semiamargo que aportan un toque crujiente y clásico, fiel a la tradición italiana.",
        price: 2900,
        isOnPromo: false,
      },
      {
        name: "Chocolate Suizo",
        description:
          "Gelato cremoso de chocolate suizo elaborado con cacao de alta pureza, combinado con almendras tostadas trozadas que aportan un toque crujiente y aromático. Un sabor equilibrado, intenso y elegante.",
        price: 2900,
        isOnPromo: false,
      },
      {
        name: "Nocciola",
        description:
          "Gelato cremoso elaborado con auténtica avellana italiana, de sabor suave, tostado y naturalmente aromático.",
        price: 2900,
        isOnPromo: false,
      },
      {
        name: "Tiramisú",
        description:
          "Gelato inspirado en el clásico postre italiano, con crema mascarpone, café y un toque de cacao que aporta equilibrio y profundidad.",
        price: 2900,
        isOnPromo: false,
      },
      {
        name: "Amarena",
        description:
          "Crema de leche suave combinada con guinda ácida italiana, que aporta un contraste fresco, frutal y ligeramente ácido.",
        price: 2900,
        isOnPromo: false,
      },
      {
        name: "Pistacho",
        description:
          "Gelato elaborado con pistacho de alta calidad, de sabor intenso, natural y ligeramente tostado, con una textura cremosa y elegante.",
        price: 2900,
        isOnPromo: false,
      },
      {
        name: "Moka",
        description:
          "Gelato cremoso que fusiona café y chocolate, logrando un sabor equilibrado, aromático y ligeramente amargo.",
        price: 2900,
        isOnPromo: false,
      },
      {
        name: "Vainilla",
        description:
          "Gelato suave y aromático elaborado con esencia natural de vainilla, de sabor clásico, limpio y delicado.",
        price: 2900,
        isOnPromo: false,
      },
    ],
  },
  {
    category: "Bebidas",
    items: [
      {
        name: "San Pellegrino Aranciata Rossa 330ml",
        description:
          "Refresco italiano de naranjas rojas, sabor vibrante y refrescante. Perfecto para acompañar cualquiera de nuestras pizzas.",
        price: 2200,
        isOnPromo: false,
        image: "/images/aranciata.png",
      },
      {
        name: "Bebidas Botella 1.5L",
        price: 2800,
        isOnPromo: false,
      },
      {
        name: "Bebidas Lata 350ml",
        price: 1600,
        isOnPromo: false,
      },
      {
        name: "Néctar Andina 1.5L",
        price: 2500,
        isOnPromo: false,
      },
    ],
  },
];