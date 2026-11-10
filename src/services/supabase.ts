import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const envUrl = import.meta.env.VITE_SUPABASE_URL || "";
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const LOCAL_STORAGE_URL_KEY = "focus-routine:supabase-url";
const LOCAL_STORAGE_ANON_KEY = "focus-routine:supabase-anon-key";

export function getSupabaseCredentials() {
  const localUrl = localStorage.getItem(LOCAL_STORAGE_URL_KEY);
  const localKey = localStorage.getItem(LOCAL_STORAGE_ANON_KEY);

  const url = (localUrl || envUrl || "").trim();
  const anonKey = (localKey || envKey || "").trim();

  const isValid = Boolean(
    url &&
      anonKey &&
      url.startsWith("http") &&
      anonKey.length > 20
  );

  return { url, anonKey, isValid };
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (url) localStorage.setItem(LOCAL_STORAGE_URL_KEY, url.trim());
  else localStorage.removeItem(LOCAL_STORAGE_URL_KEY);

  if (anonKey) localStorage.setItem(LOCAL_STORAGE_ANON_KEY, anonKey.trim());
  else localStorage.removeItem(LOCAL_STORAGE_ANON_KEY);

  // Khởi tạo lại client
  cachedClient = null;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const { url, anonKey, isValid } = getSupabaseCredentials();
  if (!isValid) return null;

  try {
    cachedClient = createClient(url, anonKey);
    return cachedClient;
  } catch (err) {
    console.error("Lỗi khởi tạo Supabase Client:", err);
    return null;
  }
}

export const isSupabaseConfigured = () => getSupabaseCredentials().isValid;
