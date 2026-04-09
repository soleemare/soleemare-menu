"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isLoading) return;

    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        alert(error.message);
        setIsLoading(false);
        return;
      }

      if (!data.session) {
        alert("No se pudo iniciar sesión.");
        setIsLoading(false);
        return;
      }

      router.push("/admin");
    } catch (err) {
      console.error("Error en login:", err);
      alert("Ocurrió un error al iniciar sesión.");
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#c9dfc3]/20 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm space-y-4 rounded-3xl border border-[#c9dfc3] bg-white p-8 shadow-sm"
      >
        <div className="text-center">
          <div className="flex justify-center">
            <Image
              src="/images/Logo_oficial.png"
              alt="Sole e Mare"
              width={160}
              height={160}
              className="h-24 w-24 object-contain sm:h-28 sm:w-28"
              priority
            />
          </div>
          <p className="text-sm uppercase tracking-[0.3em] text-[#69adb6]">
            Sole e Mare
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#046703]">
            Admin Login
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Ingresa con tu cuenta para administrar la web.
          </p>
        </div>

        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl border border-[#c9dfc3] p-3 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-2xl border border-[#c9dfc3] p-3 outline-none transition focus:border-[#69adb6] focus:ring-2 focus:ring-[#69adb6]/20"
          required
        />

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full rounded-2xl p-3 font-medium text-white transition ${
            isLoading
              ? "cursor-not-allowed bg-neutral-400"
              : "bg-[#f6070b] hover:opacity-90"
          }`}
        >
          {isLoading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
