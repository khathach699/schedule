import { z } from "zod";
export const categories = [
  "Work",
  "Commute",
  "Personal",
  "Flutter",
  "Python",
  "Native",
  "English",
  "Chinese",
  "Entertainment",
  "Sleep",
] as const;
export type Category = (typeof categories)[number];
export const skills: Category[] = [
  "Flutter",
  "Python",
  "Native",
  "English",
  "Chinese",
];
export const labels: Record<Category, string> = {
  Work: "Công việc",
  Commute: "Di chuyển",
  Personal: "Sinh hoạt",
  Flutter: "Flutter",
  Python: "Python",
  Native: "Kotlin",
  English: "Tiếng Anh",
  Chinese: "Tiếng Trung",
  Entertainment: "Giải trí",
  Sleep: "Giấc ngủ",
};
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const taskSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).max(200),
    category: z.enum(categories),
    start: time,
    end: time,
  })
  .refine((t) => t.start !== t.end, { message: "Khung giờ không hợp lệ" });
export type Task = z.infer<typeof taskSchema>;
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
  );
export const sessionSchema = z.object({
  id: z.string(),
  date,
  skill: z.enum(categories).refine((c) => skills.includes(c)),
  minutes: z.number().finite().min(0).max(1440),
  endedAt: z.string(),
});
export type Session = z.infer<typeof sessionSchema>;
export const dataSchema = z
  .object({
    version: z.literal(1),
    templates: z.record(z.string(), z.array(taskSchema)),
    overrides: z.record(date, z.array(taskSchema)),
    history: z.record(date, z.array(taskSchema)).default({}),
    completion: z.record(
      date,
      z.record(z.string(), z.enum(["completed", "skipped"])),
    ),
    sessions: z.array(sessionSchema),
    settings: z.object({
      name: z.string().max(80),
      theme: z.enum(["light", "dark"]),
      timezone: z.string().refine((v) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }),
      goal: z.number().min(1).max(1440),
    }),
  })
  .superRefine((d, ctx) => {
    if (Object.keys(d.templates).sort().join(",") !== "0,1,2,3,4,5,6")
      ctx.addIssue({ code: "custom", message: "Lịch phải có đủ 7 ngày" });
    for (const tasks of [
      ...Object.values(d.templates),
      ...Object.values(d.overrides),
    ])
      if (new Set(tasks.map((t) => t.id)).size !== tasks.length)
        ctx.addIssue({ code: "custom", message: "ID hoạt động bị trùng" });
    if (new Set(d.sessions.map((s) => s.id)).size !== d.sessions.length)
      ctx.addIssue({ code: "custom", message: "Phiên tập trung bị trùng" });
  });
export type Data = z.infer<typeof dataSchema>;
export const minute = (s: string) =>
  Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
export const duration = (t: Task) =>
  (minute(t.end) - minute(t.start) + 1440) % 1440 || 1440;
export function overlap(a: Task, b: Task) {
  const x = minute(a.start),
    y = minute(b.start);
  return [-1440, 0, 1440].some(
    (offset) => x < y + offset + duration(b) && y + offset < x + duration(a),
  );
}
export const dayKey = (d: Date, tz = "Asia/Ho_Chi_Minh") =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
export const dateObject = (key: string) => new Date(key + "T12:00:00");
export function tasksFor(d: Data, key: string) {
  return [
    ...(d.overrides[key] ??
      (key < dayKey(new Date(), d.settings.timezone)
        ? d.history[key]
        : undefined) ??
      d.templates[dateObject(key).getDay()] ??
      []),
  ].sort((a, b) => a.start.localeCompare(b.start));
}
export function actual(d: Data, key: string) {
  return d.sessions
    .filter((s) => s.date === key)
    .reduce((n, s) => n + s.minutes, 0);
}
export function streak(d: Data, today: string) {
  let key = today,
    n = 0;
  if (actual(d, key) < d.settings.goal) {
    const t = dateObject(key);
    t.setDate(t.getDate() - 1);
    key = dayKey(t, Intl.DateTimeFormat().resolvedOptions().timeZone);
  }
  for (let i = 0; i < 3660; i++) {
    if (actual(d, key) < d.settings.goal) break;
    n++;
    const t = dateObject(key);
    t.setDate(t.getDate() - 1);
    key = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }
  return n;
}
