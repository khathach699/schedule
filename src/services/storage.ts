import { dataSchema, type Data } from "../model";
import { defaultData } from "../data/defaultSchedule";
const key = "focus-routine:v1";
export const storage = {
  load(): { data: Data; error: string } {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { data: defaultData(), error: "" };
      const parsed = JSON.parse(raw);
      /* Version 1 is the initial schema. Future migrations belong here. */ return {
        data: dataSchema.parse(parsed),
        error: "",
      };
    } catch {
      return {
        data: defaultData(),
        error:
          "Không đọc được dữ liệu đã lưu. Bản gốc được giữ để phục hồi; hãy kiểm tra trước khi thêm dữ liệu mới.",
      };
    }
  },
  save(data: Data) {
    const previous = localStorage.getItem(key);
    if (previous) {
      try {
        dataSchema.parse(JSON.parse(previous));
      } catch {
        localStorage.setItem("focus-routine:recovery", previous);
      }
    }
    localStorage.setItem(key, JSON.stringify(data));
  },
  parse(text: string) {
    return dataSchema.parse(JSON.parse(text));
  },
};
