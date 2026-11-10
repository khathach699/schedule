import { getSupabaseClient, isSupabaseConfigured } from "./supabase";
import type { Data } from "../model";
import { dataSchema } from "../model";

const SYNC_ID_KEY = "focus-routine:sync-device-id";

export function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(SYNC_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SYNC_ID_KEY, id);
  }
  return id;
}

export const cloudSync = {
  /**
   * Đẩy dữ liệu lên bảng `user_schedules` trên Supabase
   */
  async push(data: Data): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: "Supabase chưa được cấu hình" };
    }

    try {
      const deviceId = getOrCreateDeviceId();
      const { error } = await supabase.from("user_schedules").upsert(
        {
          user_id: deviceId,
          data: data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.warn("Cloud push failed:", err);
      return { success: false, error: err.message || "Lỗi đồng bộ đám mây" };
    }
  },

  /**
   * Kéo dữ liệu mới nhất từ Supabase
   */
  async pull(): Promise<{ data: Data | null; error?: string }> {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return { data: null, error: "Supabase chưa được cấu hình" };
    }

    try {
      const deviceId = getOrCreateDeviceId();
      const { data: record, error } = await supabase
        .from("user_schedules")
        .select("data, updated_at")
        .eq("user_id", deviceId)
        .maybeSingle();

      if (error) throw error;
      if (!record || !record.data) return { data: null };

      const parsed = dataSchema.parse(record.data);
      return { data: parsed };
    } catch (err: any) {
      console.warn("Cloud pull failed:", err);
      return { data: null, error: err.message || "Lỗi tải dữ liệu đám mây" };
    }
  },
};
