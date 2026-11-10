import { describe, it, expect } from "vitest";
import { defaultData } from "./data/defaultSchedule";
import {
  dataSchema,
  dayKey,
  duration,
  overlap,
  tasksFor,
  actual,
  type Task,
} from "./model";
import { splitIntervals } from "./focusTime";
const task = (start: string, end: string): Task => ({
  id: "x",
  title: "Test",
  category: "Sleep",
  start,
  end,
});
describe("schedule and storage contracts", () => {
  it("seeds all days with stable identifiers and correct evening split", () => {
    const a = defaultData(),
      b = defaultData();
    expect(a).toEqual(b);
    expect(dataSchema.safeParse(a).success).toBe(true);
    expect(Object.keys(a.templates)).toHaveLength(7);
    expect(a.templates[2].find((t) => t.start === "20:00")?.category).toBe(
      "Python",
    );
    expect(a.templates[1].find((t) => t.start === "21:30")?.end).toBe("22:15");
  });
  it("handles overnight duration and boundary collision", () => {
    expect(duration(task("23:05", "06:00"))).toBe(415);
    expect(overlap(task("23:05", "06:00"), task("05:30", "07:00"))).toBe(true);
    expect(overlap(task("23:05", "06:00"), task("06:00", "06:45"))).toBe(false);
  });
  it("isolates date overrides and completion", () => {
    const d = defaultData();
    const key = "2026-11-10";
    d.overrides[key] = [];
    d.completion[key] = { "default-2-0": "completed" };
    expect(tasksFor(d, key)).toHaveLength(0);
    expect(tasksFor(d, "2026-11-17").length).toBeGreaterThan(0);
    expect(d.completion["2026-11-17"]).toBeUndefined();
    expect(actual(d, key)).toBe(0);
  });
  it("keeps snapshotted historical schedules after template changes", () => {
    const d = defaultData();
    d.history["2020-11-10"] = tasksFor(d, "2020-11-10");
    d.templates[2] = [];
    expect(tasksFor(d, "2020-11-10").length).toBeGreaterThan(0);
  });
  it("rejects invalid imports and duplicate ids", () => {
    const d = defaultData();
    expect(dataSchema.safeParse({ ...d, version: 2 }).success).toBe(false);
    d.templates[1].push(d.templates[1][0]);
    expect(dataSchema.safeParse(d).success).toBe(false);
  });
  it("resolves date in selected timezone", () => {
    expect(dayKey(new Date("2026-11-10T18:00:00Z"), "Asia/Ho_Chi_Minh")).toBe(
      "2026-11-11",
    );
  });
  it("splits focus across local midnight and excludes pauses", () => {
    const result = splitIntervals(
      [
        {
          start: Date.parse("2026-11-10T16:50:00Z"),
          end: Date.parse("2026-11-10T17:10:00Z"),
        },
        {
          start: Date.parse("2026-11-10T17:20:00Z"),
          end: Date.parse("2026-11-10T17:25:00Z"),
        },
      ],
      "Asia/Ho_Chi_Minh",
      1500,
    );
    expect(result).toEqual({ "2026-11-10": 10, "2026-11-11": 15 });
  });
  it("caps resumed sessions at intended focus duration", () => {
    const result = splitIntervals([{ start: 0, end: 3600000 }], "UTC", 1500);
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBe(25);
  });
});
