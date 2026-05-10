"use client";

import { createClient } from "@supabase/supabase-js";
import { getSupabaseBrowserConfig } from "./config";

let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseBrowserConfig();

  if (!url || !anonKey) {
    return null;
  }

  browserClient ??= createClient(url, anonKey);
  return browserClient;
}
