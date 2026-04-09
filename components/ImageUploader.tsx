"use client";

import { useEffect, useState } from "react";

type Props = {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  helperText?: string;
  folder?: string;
};

export default function ImageUploader({
  value,
  onChange,
  label = "Imagen",
  helperText,
  folder = "products",
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);

  useEffect(() => {
    setPreview(value || null);
  }, [value]);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Error al subir imagen");
        return;
      }

      setPreview(data.publicUrl);
      onChange(data.publicUrl);
    } catch (error) {
      console.error(error);
      alert("Error al subir imagen");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange("");
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[#046703]">
        {label}
      </label>

      {helperText ? (
        <p className="text-xs leading-5 text-neutral-500">{helperText}</p>
      ) : null}

      {preview ? (
        <div className="space-y-3 rounded-2xl border border-[#c9dfc3] bg-white p-3">
          <img
            src={preview}
            alt="preview"
            className="h-40 w-full rounded-xl object-contain"
          />

          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-xl bg-[#69adb6] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
              Reemplazar imagen
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleRemove}
              className="rounded-xl bg-[#f6070b] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Quitar imagen
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="w-full rounded-xl border border-[#c9dfc3] p-2"
          />
        </div>
      )}

      {uploading && (
        <p className="text-sm text-[#69adb6]">Subiendo imagen...</p>
      )}
    </div>
  );
}
