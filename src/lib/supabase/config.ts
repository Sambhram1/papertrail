export const SUPABASE_ANALYSES_TABLE = "papertrail_analyses";
export const SUPABASE_UPLOADS_BUCKET = "papertrail-uploads";

export function getSupabaseBrowserConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  };
}

export function hasSupabaseBrowserConfig() {
  const config = getSupabaseBrowserConfig();
  return Boolean(config.url && config.anonKey);
}
