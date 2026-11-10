import { create } from "zustand";
import { storage } from "../services/storage";
import { cloudSync } from "../services/cloudSync";
import { isSupabaseConfigured } from "../services/supabase";
import type { Data } from "../model";

const initial = storage.load();

// Debounce push to Supabase cloud to avoid excessive requests
let syncTimeout: any = null;
function scheduleCloudSync(data: Data, setStatus: (status: "idle" | "syncing" | "synced" | "error") => void) {
  if (!isSupabaseConfigured) return;
  clearTimeout(syncTimeout);
  setStatus("syncing");
  syncTimeout = setTimeout(async () => {
    const res = await cloudSync.push(data);
    setStatus(res.success ? "synced" : "error");
  }, 1000);
}

export const useStore = create<{
  data: Data;
  error: string;
  cloudStatus: "idle" | "syncing" | "synced" | "error";
  update: (fn: (d: Data) => Data) => void;
  syncFromCloud: () => Promise<void>;
}>((set, get) => ({
  data: initial.data,
  error: initial.error,
  cloudStatus: "idle",
  update: (fn) =>
    set((s) => {
      const data = fn(s.data);
      try {
        storage.save(data);
        scheduleCloudSync(data, (status) => set({ cloudStatus: status }));
        return { data, error: "" };
      } catch {
        return {
          error: "Không thể lưu dữ liệu. Bộ nhớ trình duyệt có thể đã đầy.",
        };
      }
    }),
  syncFromCloud: async () => {
    if (!isSupabaseConfigured) return;
    set({ cloudStatus: "syncing" });
    const { data: cloudData, error } = await cloudSync.pull();
    if (cloudData) {
      storage.save(cloudData);
      set({ data: cloudData, cloudStatus: "synced", error: "" });
    } else if (error) {
      set({ cloudStatus: "error" });
    } else {
      // First time cloud sync: push local data to cloud
      const res = await cloudSync.push(get().data);
      set({ cloudStatus: res.success ? "synced" : "error" });
    }
  },
}));
