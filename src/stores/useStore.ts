import { create } from "zustand";
import { storage } from "../services/storage";
import type { Data } from "../model";
const initial = storage.load();
export const useStore = create<{
  data: Data;
  error: string;
  update: (fn: (d: Data) => Data) => void;
}>((set) => ({
  data: initial.data,
  error: initial.error,
  update: (fn) =>
    set((s) => {
      const data = fn(s.data);
      try {
        storage.save(data);
        return { data, error: "" };
      } catch {
        return {
          error: "Không thể lưu dữ liệu. Bộ nhớ trình duyệt có thể đã đầy.",
        };
      }
    }),
}));
