"use client";

import { useEffect, useState } from "react";

type LatLng = {
  lat: number;
  lng: number;
};

type Zone = {
  id: number;
  name: string;
  price: number;
  path: LatLng[];
  is_active: boolean;
  sort_order: number;
};

export default function AdminDeliveryZonesPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  const [newZone, setNewZone] = useState({
    name: "",
    price: "",
    sort_order: "0",
    is_active: true,
    pathText: "[]",
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    price: "",
    sort_order: "0",
    is_active: true,
    pathText: "[]",
  });

  async function loadZones() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/delivery-zones", {
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok: boolean;
        zones?: Zone[];
        error?: string;
        detail?: string;
      };

      if (!res.ok || !data.ok) {
        throw new Error(
          data.detail || data.error || "No se pudieron cargar las zonas."
        );
      }

      setZones(data.zones || []);
      setError("");
    } catch (error: unknown) {
      console.error("Error cargando zonas:", error);
      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las zonas."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadZones();
  }, []);

  function validatePath(pathText: string) {
    try {
      const parsed = JSON.parse(pathText);
      if (!Array.isArray(parsed) || parsed.length < 3) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async function createZone(e: React.FormEvent) {
    e.preventDefault();

    const parsedPath = validatePath(newZone.pathText);
    if (!newZone.name.trim() || !newZone.price || !parsedPath) {
      alert("Completa nombre, precio y path válido.");
      return;
    }

    await fetch("/api/admin/delivery-zones", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: newZone.name,
        price: Number(newZone.price),
        sort_order: Number(newZone.sort_order),
        is_active: newZone.is_active,
        path: parsedPath,
      }),
    });

    setNewZone({
      name: "",
      price: "",
      sort_order: "0",
      is_active: true,
      pathText: "[]",
    });

    await loadZones();
  }

  function startEditing(zone: Zone) {
    setEditingId(zone.id);
    setEditForm({
      name: zone.name,
      price: String(zone.price),
      sort_order: String(zone.sort_order),
      is_active: zone.is_active,
      pathText: JSON.stringify(zone.path, null, 2),
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditForm({
      name: "",
      price: "",
      sort_order: "0",
      is_active: true,
      pathText: "[]",
    });
  }

  async function saveZone(id: number) {
    const parsedPath = validatePath(editForm.pathText);
    if (!editForm.name.trim() || !editForm.price || !parsedPath) {
      alert("Completa nombre, precio y path válido.");
      return;
    }

    setSavingId(id);

    await fetch("/api/admin/delivery-zones", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id,
        name: editForm.name,
        price: Number(editForm.price),
        sort_order: Number(editForm.sort_order),
        is_active: editForm.is_active,
        path: parsedPath,
      }),
    });

    setSavingId(null);
    cancelEditing();
    await loadZones();
  }

  async function deleteZone(id: number) {
    const ok = window.confirm("¿Seguro que quieres eliminar esta zona?");
    if (!ok) return;

    setSavingId(id);

    await fetch("/api/admin/delivery-zones", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    setSavingId(null);
    await loadZones();
  }

  async function toggleActive(zone: Zone) {
    setSavingId(zone.id);

    await fetch("/api/admin/delivery-zones", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: zone.id,
        is_active: !zone.is_active,
      }),
    });

    setSavingId(null);
    await loadZones();
  }

  return (
    <main className="min-h-screen bg-[#c9dfc3]/25 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.35em] text-[#69adb6]">
            Admin
          </p>
          <h1 className="mt-2 text-4xl font-bold text-[#046703]">
            Zonas de delivery
          </h1>
          <p className="mt-3 text-neutral-600">
            Administra nombre, precio y polígono de cada zona.
          </p>
        </div>

        <section className="mb-8 rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-[#046703]">Nueva zona</h2>

          <form onSubmit={createZone} className="mt-6 grid gap-4">
            <div className="grid gap-4 md:grid-cols-3">
              <input
                value={newZone.name}
                onChange={(e) =>
                  setNewZone((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Nombre"
                className="rounded-2xl border border-[#c9dfc3] px-4 py-3"
              />

              <input
                value={newZone.price}
                onChange={(e) =>
                  setNewZone((prev) => ({ ...prev, price: e.target.value }))
                }
                placeholder="Precio"
                type="number"
                className="rounded-2xl border border-[#c9dfc3] px-4 py-3"
              />

              <input
                value={newZone.sort_order}
                onChange={(e) =>
                  setNewZone((prev) => ({ ...prev, sort_order: e.target.value }))
                }
                placeholder="Orden"
                type="number"
                className="rounded-2xl border border-[#c9dfc3] px-4 py-3"
              />
            </div>

            <label className="flex items-center gap-3 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={newZone.is_active}
                onChange={(e) =>
                  setNewZone((prev) => ({
                    ...prev,
                    is_active: e.target.checked,
                  }))
                }
              />
              Zona activa
            </label>

            <textarea
              value={newZone.pathText}
              onChange={(e) =>
                setNewZone((prev) => ({ ...prev, pathText: e.target.value }))
              }
              rows={10}
              placeholder='[{"lat":-33.63,"lng":-71.61},{"lat":-33.64,"lng":-71.62},{"lat":-33.65,"lng":-71.60}]'
              className="rounded-2xl border border-[#c9dfc3] px-4 py-3 font-mono text-sm"
            />

            <button
              type="submit"
              className="rounded-2xl bg-[#046703] px-5 py-3 font-medium text-white"
            >
              Guardar zona
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-[#c9dfc3] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-[#046703]">
            Zonas existentes
          </h2>

          {loading ? (
            <p className="mt-4 text-neutral-500">Cargando zonas...</p>
          ) : error ? (
            <p className="mt-4 text-[#f6070b]">{error}</p>
          ) : zones.length === 0 ? (
            <p className="mt-4 text-neutral-500">No hay zonas creadas.</p>
          ) : (
            <div className="mt-6 space-y-4">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="rounded-2xl border border-[#c9dfc3] bg-[#c9dfc3]/12 p-4"
                >
                  {editingId === zone.id ? (
                    <div className="grid gap-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <input
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          className="rounded-xl border border-[#c9dfc3] px-3 py-2"
                        />

                        <input
                          value={editForm.price}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              price: e.target.value,
                            }))
                          }
                          type="number"
                          className="rounded-xl border border-[#c9dfc3] px-3 py-2"
                        />

                        <input
                          value={editForm.sort_order}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              sort_order: e.target.value,
                            }))
                          }
                          type="number"
                          className="rounded-xl border border-[#c9dfc3] px-3 py-2"
                        />
                      </div>

                      <label className="flex items-center gap-3 text-sm text-neutral-700">
                        <input
                          type="checkbox"
                          checked={editForm.is_active}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              is_active: e.target.checked,
                            }))
                          }
                        />
                        Zona activa
                      </label>

                      <textarea
                        value={editForm.pathText}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            pathText: e.target.value,
                          }))
                        }
                        rows={10}
                        className="rounded-xl border border-[#c9dfc3] px-3 py-2 font-mono text-sm"
                      />

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => saveZone(zone.id)}
                          disabled={savingId === zone.id}
                          className="rounded-xl bg-[#046703] px-4 py-2 text-sm font-medium text-white"
                        >
                          Guardar
                        </button>

                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="rounded-xl border border-[#c9dfc3] px-4 py-2 text-sm font-medium text-[#046703]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-[#046703]">
                            {zone.name}
                          </p>

                          {!zone.is_active && (
                            <span className="rounded-full bg-[#f6070b] px-3 py-1 text-xs text-white">
                              Inactiva
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-4 text-sm text-neutral-600">
                          <span>
                            Precio: ${zone.price.toLocaleString("es-CL")}
                          </span>
                          <span>Orden: {zone.sort_order}</span>
                          <span>Puntos: {zone.path?.length || 0}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => startEditing(zone)}
                          className="rounded-xl border border-[#c9dfc3] px-4 py-2 text-sm font-medium text-[#046703]"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => toggleActive(zone)}
                          disabled={savingId === zone.id}
                          className={`rounded-xl px-4 py-2 text-sm font-medium text-white ${
                            zone.is_active ? "bg-[#f6070b]" : "bg-[#046703]"
                          }`}
                        >
                          {zone.is_active ? "Desactivar" : "Activar"}
                        </button>

                        <button
                          onClick={() => deleteZone(zone.id)}
                          disabled={savingId === zone.id}
                          className="rounded-xl bg-[#69adb6] px-4 py-2 text-sm font-medium text-white"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
