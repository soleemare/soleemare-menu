"use client";

import { useEffect, useMemo, useState } from "react";
import ImageUploader from "../../../components/ImageUploader";

type Product = {
  id: number;
  name: string;
  price: number;
  promo_price: number | null;
  is_on_promo: boolean;
  description: string | null;
  badge: string | null;
  image: string | null;
  category: string;
  is_active: boolean;
  sort_order: number;
  has_options: boolean;
  options_json: string[] | null;
};

type Variant = {
  id: number;
  product_id: number;
  name: string;
  description: string | null;
  price_adjustment: number;
  is_active: boolean;
  sort_order: number;
};

const categories = [
  "Promociones",
  "Acompañamientos",
  "Pizzas",
  "Postres",
  "Gelato Il Maestrale",
  "Bebidas",
];

export default function AdminMenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [variantsByProduct, setVariantsByProduct] = useState<Record<number, Variant[]>>({});
  const [expandedVariants, setExpandedVariants] = useState<Record<number, boolean>>({});
  const [editingVariantId, setEditingVariantId] = useState<number | null>(null);

  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    promo_price: "",
    is_on_promo: false,
    description: "",
    badge: "",
    image: "",
    category: "",
    is_active: true,
    sort_order: "0",
    has_options: false,
    options_text: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    price: "",
    promo_price: "",
    is_on_promo: false,
    description: "",
    badge: "",
    image: "",
    category: "",
    sort_order: "0",
    has_options: false,
    options_text: "",
  });

  const [newVariant, setNewVariant] = useState<Record<number, {
    name: string;
    description: string;
    price_adjustment: string;
    sort_order: string;
  }>>({});

  const [editVariantForm, setEditVariantForm] = useState({
    name: "",
    description: "",
    price_adjustment: "0",
    sort_order: "0",
  });

  async function loadProducts() {
    setLoading(true);
    const res = await fetch("/api/admin/products", { cache: "no-store" });
    const data = await res.json();
    setProducts(data);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return products.filter((product) => product.category === selectedCategory);
  }, [products, selectedCategory]);

  async function loadVariants(productId: number) {
    const res = await fetch(`/api/admin/variants?productId=${productId}`, {
      cache: "no-store",
    });
    const data = await res.json();
    setVariantsByProduct((prev) => ({ ...prev, [productId]: data }));
  }

  async function toggleVariants(productId: number) {
    const next = !expandedVariants[productId];
    setExpandedVariants((prev) => ({ ...prev, [productId]: next }));
    if (next && !variantsByProduct[productId]) {
      await loadVariants(productId);
    }
  }

  async function toggleActive(product: Product) {
    setSavingId(product.id);

    await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: product.id,
        is_active: !product.is_active,
      }),
    });

    await loadProducts();
    setSavingId(null);
  }

  async function deleteProduct(id: number) {
    const ok = window.confirm("¿Seguro que quieres eliminar este producto?");
    if (!ok) return;

    setSavingId(id);

    await fetch("/api/admin/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    await loadProducts();
    setSavingId(null);
  }

  function startEditing(product: Product) {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      price: String(product.price),
      promo_price: product.promo_price ? String(product.promo_price) : "",
      is_on_promo: product.is_on_promo ?? false,
      description: product.description || "",
      badge: product.badge || "",
      image: product.image || "",
      category: product.category,
      sort_order: String(product.sort_order),
      has_options: product.has_options,
      options_text: product.options_json?.join(", ") || "",
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditForm({
      name: "",
      price: "",
      promo_price: "",
      is_on_promo: false,
      description: "",
      badge: "",
      image: "",
      category: "",
      sort_order: "0",
      has_options: false,
      options_text: "",
    });
  }

  function validateProductForm(data: {
    name: string;
    price: string;
    promo_price: string;
    is_on_promo: boolean;
  }) {
    if (!data.name.trim()) {
      alert("Ingresa el nombre del producto.");
      return false;
    }

    if (!data.price || Number(data.price) <= 0) {
      alert("Ingresa un precio válido.");
      return false;
    }

    if (data.is_on_promo) {
      if (!data.promo_price || Number(data.promo_price) <= 0) {
        alert("Ingresa un precio promoción válido.");
        return false;
      }

      if (Number(data.promo_price) >= Number(data.price)) {
        alert("El precio promoción debe ser menor al precio normal.");
        return false;
      }
    }

    return true;
  }

  async function saveEdit(id: number) {
    if (!validateProductForm(editForm)) return;

    setSavingId(id);

    await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: editForm.name,
        price: Number(editForm.price),
        promo_price: editForm.is_on_promo ? Number(editForm.promo_price) : null,
        is_on_promo: editForm.is_on_promo,
        description: editForm.description || null,
        badge: editForm.badge || null,
        image: editForm.image || null,
        category: editForm.category,
        sort_order: Number(editForm.sort_order),
      }),
    });

    await loadProducts();
    setSavingId(null);
    cancelEditing();
  }

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCategory) return;
    if (!validateProductForm(newProduct)) return;

    await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newProduct.name,
        price: Number(newProduct.price),
        promo_price: newProduct.is_on_promo ? Number(newProduct.promo_price) : null,
        is_on_promo: newProduct.is_on_promo,
        description: newProduct.description || null,
        badge: newProduct.badge || null,
        image: newProduct.image || null,
        category: selectedCategory,
        is_active: newProduct.is_active,
        sort_order: Number(newProduct.sort_order),
        has_options: false,
        options_json: null,
      }),
    });

    setNewProduct({
      name: "",
      price: "",
      promo_price: "",
      is_on_promo: false,
      description: "",
      badge: "",
      image: "",
      category: selectedCategory,
      is_active: true,
      sort_order: "0",
      has_options: false,
      options_text: "",
    });

    setShowCreateForm(false);
    await loadProducts();
  }

  function handleCategoryChange(value: string) {
    setSelectedCategory(value);
    setShowCreateForm(false);
    setNewProduct((prev) => ({
      ...prev,
      category: value,
    }));
  }

  async function createVariant(productId: number) {
    const form = newVariant[productId];
    if (!form?.name) return;

    await fetch("/api/admin/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        name: form.name,
        description: form.description || null,
        price_adjustment: Number(form.price_adjustment || 0),
        sort_order: Number(form.sort_order || 0),
        is_active: true,
      }),
    });

    setNewVariant((prev) => ({
      ...prev,
      [productId]: {
        name: "",
        description: "",
        price_adjustment: "0",
        sort_order: "0",
      },
    }));

    await loadVariants(productId);
  }

  async function toggleVariantActive(variant: Variant) {
    setSavingId(variant.id);

    await fetch("/api/admin/variants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: variant.id,
        is_active: !variant.is_active,
      }),
    });

    await loadVariants(variant.product_id);
    setSavingId(null);
  }

  async function deleteVariant(variant: Variant) {
    const ok = window.confirm("¿Seguro que quieres eliminar esta variante?");
    if (!ok) return;

    setSavingId(variant.id);

    await fetch("/api/admin/variants", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: variant.id }),
    });

    await loadVariants(variant.product_id);
    setSavingId(null);
  }

  function startEditingVariant(variant: Variant) {
    setEditingVariantId(variant.id);
    setEditVariantForm({
      name: variant.name,
      description: variant.description || "",
      price_adjustment: String(variant.price_adjustment ?? 0),
      sort_order: String(variant.sort_order ?? 0),
    });
  }

  function cancelEditingVariant() {
    setEditingVariantId(null);
    setEditVariantForm({
      name: "",
      description: "",
      price_adjustment: "0",
      sort_order: "0",
    });
  }

  async function saveVariant(variant: Variant) {
    setSavingId(variant.id);

    await fetch("/api/admin/variants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: variant.id,
        name: editVariantForm.name,
        description: editVariantForm.description || null,
        price_adjustment: Number(editVariantForm.price_adjustment || 0),
        sort_order: Number(editVariantForm.sort_order || 0),
      }),
    });

    await loadVariants(variant.product_id);
    setSavingId(null);
    cancelEditingVariant();
  }

  return (
    <main className="min-h-screen bg-[#c9dfc3]/25 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="text-sm uppercase tracking-[0.35em] text-[#69adb6]">
            Admin
          </p>
          <h1 className="mt-2 text-4xl font-bold text-[#046703]">
            Gestión de menú
          </h1>
          <p className="mt-3 text-neutral-600">
            Selecciona una categoría y administra sus productos y variantes.
          </p>
        </div>

        <section className="mb-8 rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-[#046703]">
                Seleccionar categoría
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                Primero elige la categoría que quieres administrar.
              </p>
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="rounded-2xl border border-[#c9dfc3] bg-white px-4 py-3 text-[#046703] outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
            >
              <option value="">Selecciona una categoría</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </section>

        {!selectedCategory ? (
          <section className="rounded-3xl border border-dashed border-[#c9dfc3] bg-white/80 p-10 text-center shadow-sm">
            <p className="text-lg font-medium text-[#046703]">
              Selecciona una categoría para comenzar
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              Luego podrás ver sus productos y agregar uno nuevo.
            </p>
          </section>
        ) : (
          <>
            <section className="mb-8 rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-[#046703]">
                    {selectedCategory}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    {filteredProducts.length} producto
                    {filteredProducts.length !== 1 ? "s" : ""} en esta categoría
                  </p>
                </div>

                <button
                  onClick={() => setShowCreateForm((prev) => !prev)}
                  className="rounded-2xl bg-[#f6070b] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {showCreateForm ? "Cerrar formulario" : "Agregar producto"}
                </button>
              </div>

              {showCreateForm && (
                <form
                  onSubmit={createProduct}
                  className="mt-6 grid gap-4 border-t border-[#c9dfc3] pt-6 md:grid-cols-2"
                >
                  <input
                    value={newProduct.name}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, name: e.target.value })
                    }
                    placeholder="Nombre"
                    className="rounded-2xl border border-[#c9dfc3] px-4 py-3 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                    required
                  />

                  <input
                    value={newProduct.price}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, price: e.target.value })
                    }
                    placeholder="Precio normal"
                    type="number"
                    className="rounded-2xl border border-[#c9dfc3] px-4 py-3 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                    required
                  />

                  <div className="md:col-span-2">
                    <ImageUploader
                      value={newProduct.image}
                      onChange={(url) =>
                        setNewProduct((prev) => ({ ...prev, image: url }))
                      }
                    />
                  </div>

                  <input
                    value={newProduct.badge}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, badge: e.target.value })
                    }
                    placeholder="Badge"
                    className="rounded-2xl border border-[#c9dfc3] px-4 py-3 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                  />

                  <input
                    value={newProduct.sort_order}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        sort_order: e.target.value,
                      })
                    }
                    placeholder="Orden"
                    type="number"
                    className="rounded-2xl border border-[#c9dfc3] px-4 py-3 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                  />

                  <div className="md:col-span-2 rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/10 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-[#046703]">
                          Producto en promoción
                        </p>
                        <p className="text-sm text-neutral-500">
                          Si activas esto, el producto no recibirá descuento adicional por cupón.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setNewProduct((prev) => ({
                            ...prev,
                            is_on_promo: !prev.is_on_promo,
                            promo_price: prev.is_on_promo ? "" : prev.promo_price,
                            badge:
                              !prev.is_on_promo && !prev.badge
                                ? "Promo 🔥"
                                : prev.badge,
                          }))
                        }
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                          newProduct.is_on_promo ? "bg-[#f48e07]" : "bg-neutral-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                            newProduct.is_on_promo
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {newProduct.is_on_promo && (
                      <div className="mt-4">
                        <input
                          value={newProduct.promo_price}
                          onChange={(e) =>
                            setNewProduct({
                              ...newProduct,
                              promo_price: e.target.value,
                            })
                          }
                          placeholder="Precio promoción"
                          type="number"
                          className="w-full rounded-2xl border border-[#c9dfc3] px-4 py-3 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                        />
                      </div>
                    )}
                  </div>

                  <textarea
                    value={newProduct.description}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        description: e.target.value,
                      })
                    }
                    placeholder="Descripción"
                    className="rounded-2xl border border-[#c9dfc3] px-4 py-3 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20 md:col-span-2"
                    rows={3}
                  />

                  <button
                    type="submit"
                    className="rounded-2xl bg-[#046703] px-5 py-3 font-medium text-white transition hover:opacity-90 md:col-span-2"
                  >
                    Guardar producto
                  </button>
                </form>
              )}
            </section>

            <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
              {loading ? (
                <p className="text-neutral-500">Cargando productos...</p>
              ) : filteredProducts.length === 0 ? (
                <p className="text-neutral-500">
                  No hay productos en esta categoría.
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredProducts.map((product) => {
                    const variants = variantsByProduct[product.id] || [];
                    const showVariants = expandedVariants[product.id];

                    return (
                      <div
                        key={product.id}
                        className="rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/12 p-4"
                      >
                        {editingId === product.id ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            <input
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm({ ...editForm, name: e.target.value })
                              }
                              placeholder="Nombre"
                              className="rounded-xl border border-[#c9dfc3] px-3 py-2 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                            />

                            <input
                              value={editForm.price}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  price: e.target.value,
                                })
                              }
                              placeholder="Precio normal"
                              type="number"
                              className="rounded-xl border border-[#c9dfc3] px-3 py-2 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                            />

                            <div className="md:col-span-2">
                              <ImageUploader
                                value={editForm.image}
                                onChange={(url) =>
                                  setEditForm((prev) => ({ ...prev, image: url }))
                                }
                              />
                            </div>

                            <input
                              value={editForm.badge}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  badge: e.target.value,
                                })
                              }
                              placeholder="Badge"
                              className="rounded-xl border border-[#c9dfc3] px-3 py-2 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                            />

                            <select
                              value={editForm.category}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  category: e.target.value,
                                })
                              }
                              className="rounded-xl border border-[#c9dfc3] px-3 py-2 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>

                            <input
                              value={editForm.sort_order}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  sort_order: e.target.value,
                                })
                              }
                              placeholder="Orden"
                              type="number"
                              className="rounded-xl border border-[#c9dfc3] px-3 py-2 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                            />

                            <div className="md:col-span-2 rounded-2xl border border-[#c9dfc3] bg-white p-4">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="font-medium text-[#046703]">
                                    Producto en promoción
                                  </p>
                                  <p className="text-sm text-neutral-500">
                                    Si activas esto, el producto no recibirá descuento adicional por cupón.
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditForm((prev) => ({
                                      ...prev,
                                      is_on_promo: !prev.is_on_promo,
                                      promo_price: prev.is_on_promo ? "" : prev.promo_price,
                                      badge:
                                        !prev.is_on_promo && !prev.badge
                                          ? "Promo 🔥"
                                          : prev.badge,
                                    }))
                                  }
                                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                                    editForm.is_on_promo ? "bg-[#f48e07]" : "bg-neutral-300"
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                                      editForm.is_on_promo
                                        ? "translate-x-6"
                                        : "translate-x-1"
                                    }`}
                                  />
                                </button>
                              </div>

                              {editForm.is_on_promo && (
                                <div className="mt-4">
                                  <input
                                    value={editForm.promo_price}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        promo_price: e.target.value,
                                      })
                                    }
                                    placeholder="Precio promoción"
                                    type="number"
                                    className="w-full rounded-2xl border border-[#c9dfc3] px-4 py-3 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                                  />
                                </div>
                              )}
                            </div>

                            <textarea
                              value={editForm.description}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  description: e.target.value,
                                })
                              }
                              placeholder="Descripción"
                              className="rounded-xl border border-[#c9dfc3] px-3 py-2 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20 md:col-span-2"
                              rows={3}
                            />

                            <div className="flex flex-wrap gap-3 md:col-span-2">
                              <button
                                onClick={() => saveEdit(product.id)}
                                disabled={savingId === product.id}
                                type="button"
                                className="rounded-xl bg-[#046703] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                              >
                                Guardar cambios
                              </button>

                              <button
                                onClick={cancelEditing}
                                type="button"
                                className="rounded-xl border border-[#c9dfc3] px-4 py-2 text-sm font-medium text-[#046703] transition hover:bg-[#c9dfc3]/25"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div className="flex gap-4">
                                <div className="shrink-0">
                                  {product.image ? (
                                    <img
                                      src={product.image}
                                      alt={product.name}
                                      className="h-20 w-20 rounded-2xl border border-[#c9dfc3] object-cover bg-white"
                                    />
                                  ) : (
                                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-[#c9dfc3] bg-white text-xs text-neutral-400">
                                      Sin imagen
                                    </div>
                                  )}
                                </div>

                                <div className="max-w-3xl">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-lg font-semibold text-[#046703]">
                                      {product.name}
                                    </p>

                                    {!product.is_active && (
                                      <span className="rounded-full bg-[#f6070b] px-3 py-1 text-xs text-white">
                                        Inactivo
                                      </span>
                                    )}

                                    {product.is_on_promo && (
                                      <span className="rounded-full bg-[#f48e07] px-3 py-1 text-xs text-white">
                                        Promoción
                                      </span>
                                    )}

                                    {product.badge && (
                                      <span className="rounded-full bg-[#69adb6]/15 px-3 py-1 text-xs font-medium text-[#69adb6]">
                                        {product.badge}
                                      </span>
                                    )}
                                  </div>

                                  {product.description && (
                                    <p className="mt-2 text-sm text-neutral-600">
                                      {product.description}
                                    </p>
                                  )}

                                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-500">
                                    <span>
                                      Precio normal: $
                                      {product.price.toLocaleString("es-CL")}
                                    </span>

                                    {product.is_on_promo && product.promo_price && (
                                      <span>
                                        Precio promo: $
                                        {product.promo_price.toLocaleString("es-CL")}
                                      </span>
                                    )}

                                    <span>Orden: {product.sort_order}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-3">
                                <button
                                  onClick={() => startEditing(product)}
                                  className="rounded-xl border border-[#c9dfc3] px-4 py-2 text-sm font-medium text-[#046703] transition hover:bg-[#c9dfc3]/25"
                                >
                                  Editar
                                </button>

                                <button
                                  onClick={() => toggleActive(product)}
                                  disabled={savingId === product.id}
                                  className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 ${
                                    product.is_active
                                      ? "bg-[#f6070b]"
                                      : "bg-[#046703]"
                                  }`}
                                >
                                  {product.is_active ? "Desactivar" : "Activar"}
                                </button>

                                <button
                                  onClick={() => toggleVariants(product.id)}
                                  className="rounded-xl border border-[#c9dfc3] px-4 py-2 text-sm font-medium text-[#046703] transition hover:bg-[#c9dfc3]/25"
                                >
                                  {showVariants ? "Ocultar variantes" : "Ver variantes"}
                                </button>

                                <button
                                  onClick={() => deleteProduct(product.id)}
                                  disabled={savingId === product.id}
                                  className="rounded-xl bg-[#69adb6] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </div>

                            {showVariants && (
                              <div className="mt-5 border-t border-[#c9dfc3] pt-5">
                                <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#69adb6]">
                                  Variantes / sabores
                                </h4>

                                <div className="space-y-3">
                                  {variants.map((variant) => (
                                    <div
                                      key={variant.id}
                                      className="rounded-xl border border-[#c9dfc3] bg-white p-4"
                                    >
                                      {editingVariantId === variant.id ? (
                                        <div className="grid gap-3 md:grid-cols-2">
                                          <input
                                            value={editVariantForm.name}
                                            onChange={(e) =>
                                              setEditVariantForm({
                                                ...editVariantForm,
                                                name: e.target.value,
                                              })
                                            }
                                            placeholder="Nombre"
                                            className="rounded-xl border border-[#c9dfc3] px-3 py-2 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                                          />

                                          <input
                                            value={editVariantForm.price_adjustment}
                                            onChange={(e) =>
                                              setEditVariantForm({
                                                ...editVariantForm,
                                                price_adjustment: e.target.value,
                                              })
                                            }
                                            placeholder="Ajuste de precio"
                                            type="number"
                                            className="rounded-xl border border-[#c9dfc3] px-3 py-2 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                                          />

                                          <input
                                            value={editVariantForm.sort_order}
                                            onChange={(e) =>
                                              setEditVariantForm({
                                                ...editVariantForm,
                                                sort_order: e.target.value,
                                              })
                                            }
                                            placeholder="Orden"
                                            type="number"
                                            className="rounded-xl border border-[#c9dfc3] px-3 py-2 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                                          />

                                          <textarea
                                            value={editVariantForm.description}
                                            onChange={(e) =>
                                              setEditVariantForm({
                                                ...editVariantForm,
                                                description: e.target.value,
                                              })
                                            }
                                            placeholder="Descripción"
                                            rows={3}
                                            className="rounded-xl border border-[#c9dfc3] px-3 py-2 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20 md:col-span-2"
                                          />

                                          <div className="flex flex-wrap gap-3 md:col-span-2">
                                            <button
                                              onClick={() => saveVariant(variant)}
                                              disabled={savingId === variant.id}
                                              type="button"
                                              className="rounded-xl bg-[#046703] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                                            >
                                              Guardar variante
                                            </button>

                                            <button
                                              type="button"
                                              onClick={cancelEditingVariant}
                                              className="rounded-xl border border-[#c9dfc3] px-4 py-2 text-sm font-medium text-[#046703] transition hover:bg-[#c9dfc3]/25"
                                            >
                                              Cancelar
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                          <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                              <p className="font-semibold text-[#046703]">
                                                {variant.name}
                                              </p>

                                              {!variant.is_active && (
                                                <span className="rounded-full bg-[#f6070b] px-3 py-1 text-xs text-white">
                                                  Inactivo
                                                </span>
                                              )}
                                            </div>

                                            {variant.description && (
                                              <p className="mt-2 text-sm text-neutral-600">
                                                {variant.description}
                                              </p>
                                            )}

                                            <div className="mt-2 flex flex-wrap gap-4 text-xs text-neutral-500">
                                              <span>
                                                Ajuste: ${variant.price_adjustment}
                                              </span>
                                              <span>Orden: {variant.sort_order}</span>
                                            </div>
                                          </div>

                                          <div className="flex flex-wrap gap-3">
                                            <button
                                              onClick={() => startEditingVariant(variant)}
                                              className="rounded-xl border border-[#c9dfc3] px-4 py-2 text-sm font-medium text-[#046703] transition hover:bg-[#c9dfc3]/25"
                                            >
                                              Editar
                                            </button>

                                            <button
                                              onClick={() => toggleVariantActive(variant)}
                                              disabled={savingId === variant.id}
                                              className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 ${
                                                variant.is_active
                                                  ? "bg-[#f6070b]"
                                                  : "bg-[#046703]"
                                              }`}
                                            >
                                              {variant.is_active ? "Desactivar" : "Activar"}
                                            </button>

                                            <button
                                              onClick={() => deleteVariant(variant)}
                                              disabled={savingId === variant.id}
                                              className="rounded-xl bg-[#69adb6] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                                            >
                                              Eliminar
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}

                                  <div className="rounded-xl border border-dashed border-[#c9dfc3] bg-white p-4">
                                    <h5 className="mb-3 font-medium text-[#046703]">
                                      Agregar variante
                                    </h5>

                                    <div className="grid gap-3 md:grid-cols-2">
                                      <input
                                        value={newVariant[product.id]?.name || ""}
                                        onChange={(e) =>
                                          setNewVariant((prev) => ({
                                            ...prev,
                                            [product.id]: {
                                              name: e.target.value,
                                              description:
                                                prev[product.id]?.description || "",
                                              price_adjustment:
                                                prev[product.id]?.price_adjustment || "0",
                                              sort_order:
                                                prev[product.id]?.sort_order || "0",
                                            },
                                          }))
                                        }
                                        placeholder="Nombre"
                                        className="rounded-xl border border-[#c9dfc3] px-3 py-2 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                                      />

                                      <input
                                        value={
                                          newVariant[product.id]?.price_adjustment || "0"
                                        }
                                        onChange={(e) =>
                                          setNewVariant((prev) => ({
                                            ...prev,
                                            [product.id]: {
                                              name: prev[product.id]?.name || "",
                                              description:
                                                prev[product.id]?.description || "",
                                              price_adjustment: e.target.value,
                                              sort_order:
                                                prev[product.id]?.sort_order || "0",
                                            },
                                          }))
                                        }
                                        placeholder="Ajuste de precio"
                                        type="number"
                                        className="rounded-xl border border-[#c9dfc3] px-3 py-2 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                                      />

                                      <input
                                        value={newVariant[product.id]?.sort_order || "0"}
                                        onChange={(e) =>
                                          setNewVariant((prev) => ({
                                            ...prev,
                                            [product.id]: {
                                              name: prev[product.id]?.name || "",
                                              description:
                                                prev[product.id]?.description || "",
                                              price_adjustment:
                                                prev[product.id]?.price_adjustment || "0",
                                              sort_order: e.target.value,
                                            },
                                          }))
                                        }
                                        placeholder="Orden"
                                        type="number"
                                        className="rounded-xl border border-[#c9dfc3] px-3 py-2 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
                                      />

                                      <textarea
                                        value={newVariant[product.id]?.description || ""}
                                        onChange={(e) =>
                                          setNewVariant((prev) => ({
                                            ...prev,
                                            [product.id]: {
                                              name: prev[product.id]?.name || "",
                                              description: e.target.value,
                                              price_adjustment:
                                                prev[product.id]?.price_adjustment || "0",
                                              sort_order:
                                                prev[product.id]?.sort_order || "0",
                                            },
                                          }))
                                        }
                                        placeholder="Descripción"
                                        rows={3}
                                        className="rounded-xl border border-[#c9dfc3] px-3 py-2 text-neutral-800 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20 md:col-span-2"
                                      />

                                      <div className="md:col-span-2">
                                        <button
                                          onClick={() => createVariant(product.id)}
                                          type="button"
                                          className="rounded-xl bg-[#046703] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                                        >
                                          Guardar variante
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}