import { createClient } from "@supabase/supabase-js";
import { getSupabaseBrowserConfig } from "./config";

export function getSupabaseServerClient(accessToken?: string) {
  const { url, anonKey } = getSupabaseBrowserConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, serviceRoleKey || anonKey, {
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      : undefined,
    auth: {
      persistSession: false
    }
  });
}

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

export async function requireSupabaseUser(request: Request) {
  const token = getBearerToken(request);
  const supabase = getSupabaseServerClient(token ?? undefined);

  if (!supabase || !token) {
    return { supabase, user: null, token };
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { supabase, user: null, token };
  }

  return { supabase, user: data.user, token };
}
