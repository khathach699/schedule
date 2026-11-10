import { describe, it, expect } from "vitest";
import { adjustScheduleCascade } from "./scheduleHelper";
import type { Task } from "./model";

describe("adjustScheduleCascade", () => {
  it("shifts subsequent tasks forward when a task is lengthened or delayed into them", () => {
    const tasks: Task[] = [
      {
        id: "1",
        title: "Task 1",
        start: "07:30",
        end: "08:30",
        category: "Personal",
      },
      {
        id: "2",
        title: "Task 2",
        start: "08:30",
        end: "09:30",
        category: "Work",
      },
      {
        id: "3",
        title: "Task 3",
        start: "09:30",
        end: "10:30",
        category: "Work",
      },
    ];

    // Thay đổi Task 1 thành 07:30 - 09:00 (kéo dài thêm 30p, đè lên Task 2)
    const edited: Task = {
      id: "1",
      title: "Task 1",
      start: "07:30",
      end: "09:00",
      category: "Personal",
    };
    const result = adjustScheduleCascade(tasks, edited, "shift-overlapping");

    expect(result.find((t) => t.id === "1")?.start).toBe("07:30");
    expect(result.find((t) => t.id === "1")?.end).toBe("09:00");

    // Task 2 tự dời sang 09:00 - 10:00
    expect(result.find((t) => t.id === "2")?.start).toBe("09:00");
    expect(result.find((t) => t.id === "2")?.end).toBe("10:00");

    // Task 3 tự dời sang 10:00 - 11:00
    expect(result.find((t) => t.id === "3")?.start).toBe("10:00");
    expect(result.find((t) => t.id === "3")?.end).toBe("11:00");
  });
});
