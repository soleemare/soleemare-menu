import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "./supabaseServer";

export async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "No autorizado" },
        { status: 401 }
      ),
    };
  }

  return {
    ok: true as const,
    user,
  };
}