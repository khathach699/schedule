import { useEffect, useState, lazy, Suspense, type FormEvent } from "react";
import { addDays, format, startOfWeek } from "date-fns";
import { vi } from "date-fns/locale";
import {
  LayoutDashboard,
  CalendarDays,
  Timer,
  ChartNoAxesCombined,
  Settings as SettingsIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Check,
  Flame,
  Clock3,
  CircleCheck,
  ListTodo,
  ArrowRight,
  Pencil,
  Trash2,
  Leaf,
  Sun,
  Moon,
  Coffee,
  SkipForward,
  TriangleAlert,
  Hourglass,
} from "lucide-react";
import { useStore } from "./stores/useStore";
import {
  actual,
  categories,
  dayKey,
  dateObject,
  duration,
  labels,
  minute,
  overlap,
  skills,
  streak,
  tasksFor,
  taskSchema,
  type Task,
  type Category,
} from "./model";
import { Settings } from "./Settings";
import { Button } from "./components/ui/button";
import { Dialog } from "./components/ui/dialog";
import { Focus } from "./Focus";
import { adjustScheduleCascade } from "./scheduleHelper";
import { isSupabaseConfigured } from "./services/supabase";
const Statistics = lazy(() =>
  import("./Statistics").then((m) => ({ default: m.Statistics })),
);
const nav = [
  { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { id: "schedule", label: "Lịch trình", icon: CalendarDays },
  { id: "focus", label: "Tập trung", icon: Timer },
  { id: "statistics", label: "Thống kê", icon: ChartNoAxesCombined },
  { id: "settings", label: "Cài đặt", icon: SettingsIcon },
];
const presets = [15, 30, 45, 60, 90, 120];
/** Format a number of minutes as a short Vietnamese duration, e.g. "1 giờ 30 phút". */
function fmtMinutes(n: number) {
  const m = Math.max(0, Math.round(n));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r} phút`;
  return r ? `${h} giờ ${r} phút` : `${h} giờ`;
}
/** Add minutes to an "HH:mm" string, wrapping around midnight. */
function addMinutes(time: string, n: number) {
  const total = (((minute(time) + n) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
export default function App() {
  const { data, error, cloudStatus, update, syncFromCloud } = useStore();
  const [page, setPage] = useState("dashboard");
  const [now, setNow] = useState(new Date());
  const today = dayKey(now, data.settings.timezone);
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState("week");
  const [editor, setEditor] = useState<Task | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [scope, setScope] = useState("day");
  const [conflict, setConflict] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState<"all" | "todo">("all");
  const [autoShift, setAutoShift] = useState(true);
  useEffect(() => {
    if (error) return;
    const snapshot = tasksFor(data, today);
    if (JSON.stringify(data.history[today]) !== JSON.stringify(snapshot))
      update((d) => ({ ...d, history: { ...d.history, [today]: snapshot } }));
  }, [data.templates, data.overrides, today]);
  useEffect(() => {
    syncFromCloud();
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
  }, [data.settings.theme]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  // Keyboard shortcut: "N" opens the "add activity" dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        e.key.toLowerCase() !== "n" ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        editor ||
        pendingDelete ||
        (target &&
          (["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) ||
            target.isContentEditable))
      )
        return;
      e.preventDefault();
      openEditor(undefined, page === "schedule" ? selected : today);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const tasks = tasksFor(data, today),
    completed = tasks.filter(
      (t) => data.completion[today]?.[t.id] === "completed",
    ).length,
    progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const localTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: data.settings.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const currentMinute = minute(localTime);
  const current = tasks.find(
    (t) =>
      duration(t) < 1440 &&
      currentMinute >= minute(t.start) &&
      currentMinute < minute(t.start) + duration(t) &&
      !data.completion[today]?.[t.id],
  );
  const next = tasks.find(
    (t) => minute(t.start) > currentMinute && !data.completion[today]?.[t.id],
  );
  const planned = tasks
    .filter((t) => skills.includes(t.category))
    .reduce((n, t) => n + duration(t), 0);
  const focusedToday = actual(data, today);
  const currentStreak = streak(data, today);
  function toggle(key: string, t: Task) {
    let nowDone = false;
    update((d) => {
      const completion = { ...d.completion, [key]: { ...d.completion[key] } };
      if (completion[key][t.id] === "completed") delete completion[key][t.id];
      else {
        completion[key][t.id] = "completed";
        nowDone = true;
      }
      return {
        ...d,
        completion,
        history: { ...d.history, [key]: tasksFor(d, key) },
      };
    });
    if (nowDone) setToast(`Đã hoàn thành “${t.title}”`);
  }
  function skip(key: string, t: Task, status?: string) {
    update((d) => {
      const completion = {
        ...d.completion,
        [key]: { ...d.completion[key] },
      };
      if (status === "skipped") delete completion[key][t.id];
      else completion[key][t.id] = "skipped";
      return { ...d, completion };
    });
  }
  function openEditor(t?: Task, key = selected) {
    setSelected(key);
    const start =
      key === today
        ? addMinutes(localTime, (15 - (currentMinute % 15)) % 15 || 0)
        : "09:00";
    setEditor(
      t
        ? { ...t }
        : {
            id: crypto.randomUUID(),
            title: "",
            start,
            end: addMinutes(start, 60),
            category: "Flutter",
          },
    );
    setIsNew(!t);
    setScope("day");
    setConflict("");
  }
  const editorCollisions = editor
    ? (scope === "day"
        ? tasksFor(data, selected)
        : (data.templates[String(dateObject(selected).getDay())] ?? [])
      ).filter(
        (t) =>
          t.id !== editor.id &&
          editor.start !== editor.end &&
          overlap(t, editor),
      )
    : [];
  function saveTask(e: FormEvent) {
    e.preventDefault();
    if (!editor) return;
    const parsed = taskSchema.safeParse({
      ...editor,
      title: editor.title.trim(),
    });
    if (!parsed.success || editor.start === editor.end) {
      setConflict(
        "Nhập tên và khung giờ hợp lệ; giờ bắt đầu và kết thúc phải khác nhau.",
      );
      return;
    }
    const task = parsed.data;
    const weekday = String(dateObject(selected).getDay());
    update((d) => {
      const source =
        scope === "day" ? tasksFor(d, selected) : d.templates[weekday];
      const changed = autoShift
        ? adjustScheduleCascade(source, task, "shift-overlapping")
        : [...source.filter((t) => t.id !== task.id), task];
      return scope === "day"
        ? { ...d, overrides: { ...d.overrides, [selected]: changed } }
        : { ...d, templates: { ...d.templates, [weekday]: changed } };
    });
    setEditor(null);
    setToast(
      isNew
        ? "Đã thêm hoạt động"
        : autoShift && editorCollisions.length > 0
          ? "Đã lưu và tự động dời các hoạt động trùng giờ"
          : "Đã lưu hoạt động",
    );
  }
  function removeTask() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    update((d) =>
      scope === "day"
        ? {
            ...d,
            overrides: {
              ...d.overrides,
              [selected]: tasksFor(d, selected).filter((t) => t.id !== id),
            },
          }
        : {
            ...d,
            templates: {
              ...d.templates,
              [dateObject(selected).getDay()]: d.templates[
                dateObject(selected).getDay()
              ].filter((t) => t.id !== id),
            },
          },
    );
    setPendingDelete(null);
    setToast("Đã xóa hoạt động");
  }
  const yesterday = format(addDays(dateObject(today), -1), "yyyy-MM-dd");
  const carry = tasksFor(data, yesterday).find(
    (t) =>
      minute(t.end) < minute(t.start) &&
      currentMinute < minute(t.end) &&
      !data.completion[yesterday]?.[t.id],
  );
  const weekStart = startOfWeek(dateObject(selected), { weekStartsOn: 1 });
  const week = Array.from({ length: 7 }, (_, i) =>
    format(addDays(weekStart, i), "yyyy-MM-dd"),
  );
  const isPast = (key: string, t: Task) =>
    key < today ||
    (key === today &&
      minute(t.end) > minute(t.start) &&
      minute(t.end) <= currentMinute);
  function timeline(key: string, hideFinished = false) {
    const all = tasksFor(data, key);
    const items = hideFinished
      ? all.filter((t) => !data.completion[key]?.[t.id] && !isPast(key, t))
      : all;
    const hidden = all.length - items.length;
    if (!all.length)
      return (
        <div className="empty">
          <Coffee size={32} />
          <h3>Một ngày thật thoáng</h3>
          <p>Thêm hoạt động đầu tiên cho ngày của bạn.</p>
          <Button onClick={() => openEditor(undefined, key)}>
            <Plus size={16} />
            Thêm hoạt động
          </Button>
        </div>
      );
    return (
      <>
        <div className="timeline">
          {items.map((t) => {
            const status = data.completion[key]?.[t.id];
            const active = key === today && current?.id === t.id;
            const past = !active && isPast(key, t);
            return (
              <div
                key={t.id}
                className={`timeline-row ${status === "completed" ? "done" : ""} ${status === "skipped" ? "skipped" : ""} ${active ? "active" : ""} ${past ? "past" : ""}`}
              >
                <div className="time">
                  <b>{t.start}</b>
                  <span>
                    {t.end}
                    {minute(t.end) <= minute(t.start) ? " +1" : ""}
                  </span>
                </div>
                <div className={`timeline-marker ${t.category}`} />
                <div className="task-body">
                  <div className="task-title">
                    <b>{t.title}</b>
                    {active && <span className="live">Đang diễn ra</span>}
                  </div>
                  <div className="task-meta">
                    <span className={`tag ${t.category}`}>
                      {labels[t.category]}
                    </span>
                    <span>{fmtMinutes(duration(t))}</span>
                    {status === "skipped" && (
                      <span className="status-chip">Đã bỏ qua</span>
                    )}
                  </div>
                </div>
                <div className="task-actions">
                  <button
                    className="icon-button"
                    title="Chỉnh sửa"
                    onClick={() => openEditor(t, key)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button skip-task"
                    title={
                      status === "skipped"
                        ? "Bỏ trạng thái bỏ qua"
                        : "Bỏ qua hoạt động"
                    }
                    onClick={() => skip(key, t, status)}
                  >
                    <SkipForward size={16} />
                  </button>
                  <button
                    className="icon-button delete-task"
                    title="Xóa hoạt động"
                    onClick={() => {
                      setSelected(key);
                      setScope("day");
                      setPendingDelete(t);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    className={`checkbox ${status === "completed" ? "checked" : ""}`}
                    aria-label={`Hoàn thành ${t.title}`}
                    title={
                      status === "completed"
                        ? "Bỏ đánh dấu hoàn thành"
                        : "Đánh dấu hoàn thành"
                    }
                    aria-pressed={status === "completed"}
                    onClick={() => toggle(key, t)}
                  >
                    {status === "completed" && (
                      <Check size={16} strokeWidth={3} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {hideFinished && hidden > 0 && (
          <div className="hidden-note">
            Đã ẩn {hidden} hoạt động đã xong hoặc đã qua.
            <button className="text-link" onClick={() => setFilter("all")}>
              Hiện tất cả
            </button>
          </div>
        )}
        {hideFinished && !items.length && (
          <div className="empty">
            <CircleCheck size={32} />
            <h3>Xong hết rồi!</h3>
            <p>Không còn hoạt động nào cho hôm nay. Nghỉ ngơi thôi.</p>
          </div>
        )}
      </>
    );
  }
  const currentElapsed = current
    ? (currentMinute - minute(current.start) + 1440) % 1440
    : 0;
  const currentPct = current
    ? Math.min(100, (currentElapsed / duration(current)) * 100)
    : 0;
  const nextIn = next ? minute(next.start) - currentMinute : 0;
  const shift = (days: number) =>
    setSelected(format(addDays(dateObject(selected), days), "yyyy-MM-dd"));
  return (
    <div className="app">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("dashboard");
          }}
        >
          <span className="brand-icon">
            <Leaf size={22} />
          </span>
          <span>
            focus<span className="brand-light">routine</span>
            <small>MỖI NGÀY TỐT HƠN</small>
          </span>
        </a>
        <div className="nav-label">KHÔNG GIAN CỦA BẠN</div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              aria-current={page === n.id ? "page" : undefined}
              className={page === n.id ? "nav-active" : ""}
              onClick={() => setPage(n.id)}
            >
              <n.icon size={20} />
              <span>{n.label}</span>
              {page === n.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="today-card">
            <div className="today-card-head">
              Hôm nay
              <b>
                {completed}/{tasks.length}
              </b>
            </div>
            <div className="progress">
              <i style={{ width: `${progress}%` }} />
            </div>
            <div className="today-card-foot">
              <Flame size={15} />
              <b>{currentStreak}</b> ngày duy trì
            </div>
          </div>
          <div className="profile">
            <span className="avatar">
              {(data.settings.name || "B").slice(0, 1).toUpperCase()}
            </span>
            <div>
              <b>{data.settings.name}</b>
              <small>Hành trình của riêng bạn</small>
            </div>
            <button aria-label="Cài đặt" onClick={() => setPage("settings")}>
              <SettingsIcon size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            <span className="crumb-root">Không gian cá nhân</span>
            <ChevronRight size={14} className="crumb-root" />
            <b>{nav.find((n) => n.id === page)?.label}</b>
          </span>
          <div>
            {isSupabaseConfigured() ? (
              <span
                className="local-badge"
                title={
                  cloudStatus === "syncing"
                    ? "Đang đồng bộ đám mây..."
                    : cloudStatus === "synced"
                      ? "Đã đồng bộ đám mây (Supabase)"
                      : cloudStatus === "error"
                        ? "Lỗi đồng bộ đám mây"
                        : "Đồng bộ đám mây sẵn sàng"
                }
              >
                <i
                  style={{
                    backgroundColor:
                      cloudStatus === "syncing"
                        ? "#f59e0b"
                        : cloudStatus === "error"
                          ? "#ef4444"
                          : "#10b981",
                  }}
                />
                <span>
                  {cloudStatus === "syncing"
                    ? "Đang đồng bộ..."
                    : cloudStatus === "synced"
                      ? "Đã đồng bộ Cloud"
                      : "Cloud sẵn sàng"}
                </span>
              </span>
            ) : (
              <span className="local-badge" title="Dữ liệu lưu trên thiết bị">
                <i />
                <span>Đã lưu trên thiết bị</span>
              </span>
            )}
            <span className="clock" aria-label="Giờ hiện tại">
              {localTime}
            </span>
            <button
              className="icon-button"
              aria-label="Đổi giao diện sáng tối"
              title="Đổi giao diện sáng / tối"
              onClick={() =>
                update((d) => ({
                  ...d,
                  settings: {
                    ...d.settings,
                    theme: d.settings.theme === "light" ? "dark" : "light",
                  },
                }))
              }
            >
              {data.settings.theme === "light" ? (
                <Moon size={18} />
              ) : (
                <Sun size={18} />
              )}
            </button>
          </div>
        </header>
        <main>
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          {page === "dashboard" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="date-label">
                    {format(dateObject(today), "EEEE, dd MMMM yyyy", {
                      locale: vi,
                    })}
                  </div>
                  <h1>
                    {currentMinute < 720
                      ? "Chào buổi sáng"
                      : currentMinute < 1080
                        ? "Chào buổi chiều"
                        : "Chào buổi tối"}
                    , {data.settings.name} 👋
                  </h1>
                  <p>Một ngày mới, một cơ hội để tiến gần hơn đến mục tiêu.</p>
                </div>
                <div className="heading-actions">
                  <Button
                    onClick={() => openEditor(undefined, today)}
                    title="Phím tắt: N"
                  >
                    <Plus size={18} />
                    Thêm hoạt động
                  </Button>
                </div>
              </div>
              {carry && (
                <div className="overnight-note">
                  <Moon size={16} />
                  <span>
                    Tiếp nối từ hôm qua: <b>{carry.title}</b> · đến {carry.end}
                  </span>
                  <button
                    className="text-link"
                    onClick={() => toggle(yesterday, carry)}
                  >
                    Hoàn thành <Check size={14} />
                  </button>
                </div>
              )}
              <section className="now-card">
                <div className="now-main">
                  <span className="now-label">
                    <span className={current ? "pulse" : "pulse idle"} />
                    {current ? "Đang diễn ra" : "Hiện tại"}
                  </span>
                  {current ? (
                    <>
                      <h2>{current.title}</h2>
                      <p>
                        {labels[current.category]} · {current.start} –{" "}
                        {current.end}
                      </p>
                      <div className="now-progress">
                        <i style={{ width: `${currentPct}%` }} />
                      </div>
                      <div className="now-meta">
                        <span>Đã qua {fmtMinutes(currentElapsed)}</span>
                        <span>
                          Còn {fmtMinutes(duration(current) - currentElapsed)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2>Khoảng thời gian trống</h2>
                      <p>
                        Không có hoạt động nào lúc này. Tranh thủ nghỉ ngơi
                        hoặc bắt đầu một phiên tập trung.
                      </p>
                    </>
                  )}
                  <div className="now-actions">
                    {current && (
                      <Button onClick={() => toggle(today, current)}>
                        <Check size={17} />
                        Đánh dấu xong
                      </Button>
                    )}
                    <Button
                      className={current ? "glass" : ""}
                      onClick={() => setPage("focus")}
                    >
                      <Timer size={17} />
                      Bắt đầu tập trung
                    </Button>
                  </div>
                </div>
                <div className="now-side">
                  <span className="now-side-label">Tiếp theo</span>
                  {next ? (
                    <div className={`next-item ${next.category}`}>
                      <span className="bar" />
                      <div>
                        <b>{next.title}</b>
                        <small>
                          {next.start} – {next.end} · {labels[next.category]}
                        </small>
                      </div>
                      <div className="next-in">
                        sau
                        <strong>
                          {nextIn >= 60
                            ? `${Math.floor(nextIn / 60)}h${String(nextIn % 60).padStart(2, "0")}`
                            : `${nextIn}p`}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-next">
                      Không còn hoạt động nào hôm nay. 🌙
                    </div>
                  )}
                  <div className="streak-row">
                    <span className="flame">
                      <Flame size={18} />
                    </span>
                    <div>
                      <b>{currentStreak} ngày</b> duy trì
                      <br />
                      <small>
                        Mục tiêu {data.settings.goal} phút tập trung / ngày
                      </small>
                    </div>
                  </div>
                </div>
              </section>
              <div className="metrics">
                <Metric
                  icon={<ListTodo />}
                  label="Hoạt động hôm nay"
                  value={String(tasks.length)}
                  note={`${tasks.length - completed} hoạt động còn lại`}
                />
                <Metric
                  icon={<CircleCheck />}
                  label="Đã hoàn thành"
                  value={`${completed}`}
                  suffix={`/ ${tasks.length}`}
                  note={`${progress}% kế hoạch hôm nay`}
                  tone="green"
                />
                <Metric
                  icon={<Clock3 />}
                  label="Thời gian tập trung"
                  value={`${Math.floor(focusedToday / 60)}h ${Math.round(focusedToday % 60)}p`}
                  note={`Kế hoạch học: ${fmtMinutes(planned)}`}
                  tone="purple"
                />
                <Metric
                  icon={<Hourglass />}
                  label="Mục tiêu ngày"
                  value={`${Math.min(100, Math.round((focusedToday / data.settings.goal) * 100))}%`}
                  note={`${Math.round(focusedToday)} / ${data.settings.goal} phút`}
                  tone="orange"
                />
              </div>
              <div className="dashboard-grid">
                <section className="panel schedule-panel">
                  <div className="section-heading">
                    <div>
                      <h2>
                        Lịch trình hôm nay{" "}
                        <span className="count">{tasks.length}</span>
                      </h2>
                      <p>Đánh dấu ✓ khi bạn hoàn thành mỗi hoạt động.</p>
                    </div>
                    <div className="panel-tools">
                      <div className="segmented" role="group">
                        <button
                          className={filter === "all" ? "selected" : ""}
                          onClick={() => setFilter("all")}
                        >
                          Tất cả
                        </button>
                        <button
                          className={filter === "todo" ? "selected" : ""}
                          onClick={() => setFilter("todo")}
                        >
                          Còn lại
                        </button>
                      </div>
                      <button
                        className="text-link"
                        onClick={() => {
                          setSelected(today);
                          setPage("schedule");
                        }}
                      >
                        Xem lịch <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                  {timeline(today, filter === "todo")}
                </section>
                <aside className="stack">
                  <section className="panel daily-progress">
                    <div className="section-heading">
                      <h2>Tiến độ hôm nay</h2>
                      <CircleCheck size={18} />
                    </div>
                    <div
                      className="progress-ring"
                      style={{
                        background: `conic-gradient(var(--primary) ${progress * 3.6}deg,var(--hover) 0deg)`,
                      }}
                    >
                      <div>
                        <strong>
                          {progress}
                          <span>%</span>
                        </strong>
                        <small>hoàn thành</small>
                      </div>
                    </div>
                    <p>
                      {completed
                        ? `Bạn đã hoàn thành ${completed} hoạt động. Tiếp tục nhé!`
                        : "Mỗi việc nhỏ đều là một bước tiến."}
                    </p>
                    <div className="progress-key">
                      <span>
                        <i />
                        Hoàn thành <b>{completed}</b>
                      </span>
                      <span>
                        <i />
                        Còn lại <b>{tasks.length - completed}</b>
                      </span>
                    </div>
                  </section>
                  <section className="panel">
                    <div className="section-heading">
                      <h2>Mục tiêu kỹ năng</h2>
                      <span className="muted">Hôm nay</span>
                    </div>
                    {skills.map((s) => {
                      const target = tasks
                        .filter((t) => t.category === s)
                        .reduce((n, t) => n + duration(t), 0);
                      const done = data.sessions
                        .filter((x) => x.date === today && x.skill === s)
                        .reduce((n, x) => n + x.minutes, 0);
                      return (
                        <div className={`skill-row ${s}`} key={s}>
                          <div>
                            <span className="dot" />
                            <b>{labels[s]}</b>
                            <span>
                              {Math.round(done)} / {target}p
                            </span>
                          </div>
                          <div className="progress">
                            <i
                              style={{
                                width: `${target ? Math.min(100, (done / target) * 100) : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <small className="muted">
                      Thời gian thực tế ghi nhận từ Focus Timer.
                    </small>
                  </section>
                  <section className="mindful">
                    <Coffee size={22} />
                    <div>
                      <h3>Đừng quên nghỉ ngơi</h3>
                      <p>
                        Uống nước, vươn vai và hít thở sâu giữa các phiên làm
                        việc nhé.
                      </p>
                    </div>
                  </section>
                </aside>
              </div>
            </>
          )}
          {page === "schedule" && (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    Dành thời gian cho điều quan trọng
                  </span>
                  <h1>Lịch trình của bạn</h1>
                  <p>Kế hoạch rõ ràng, tâm trí nhẹ nhàng.</p>
                </div>
                <div className="heading-actions">
                  <Button onClick={() => openEditor()} title="Phím tắt: N">
                    <Plus size={17} />
                    Thêm hoạt động
                  </Button>
                </div>
              </div>
              <section
                className={`panel ${view === "day" ? "schedule-day-panel" : ""}`}
              >
                <div className="schedule-toolbar">
                  <div className="date-controls">
                    <Button
                      variant="outline"
                      aria-label="Trước"
                      title={view === "week" ? "Tuần trước" : "Ngày trước"}
                      onClick={() => shift(view === "week" ? -7 : -1)}
                    >
                      <ChevronLeft size={17} />
                    </Button>
                    <Button
                      variant="outline"
                      aria-label="Sau"
                      title={view === "week" ? "Tuần sau" : "Ngày sau"}
                      onClick={() => shift(view === "week" ? 7 : 1)}
                    >
                      <ChevronRight size={17} />
                    </Button>
                    <Button
                      variant="outline"
                      disabled={selected === today}
                      onClick={() => setSelected(today)}
                    >
                      Hôm nay
                    </Button>
                    <input
                      aria-label="Chọn ngày"
                      type="date"
                      value={selected}
                      onChange={(e) =>
                        e.target.value && setSelected(e.target.value)
                      }
                    />
                    <span className="range-label">
                      {view === "week"
                        ? `${format(dateObject(week[0]), "dd/MM")} – ${format(dateObject(week[6]), "dd/MM/yyyy")}`
                        : format(dateObject(selected), "MMMM yyyy", {
                            locale: vi,
                          })}
                    </span>
                  </div>
                  <div className="segmented">
                    <button
                      className={view === "day" ? "selected" : ""}
                      onClick={() => setView("day")}
                    >
                      Ngày
                    </button>
                    <button
                      className={view === "week" ? "selected" : ""}
                      onClick={() => setView("week")}
                    >
                      Tuần
                    </button>
                  </div>
                </div>
                {view === "week" ? (
                  <>
                    <div className="week-grid">
                      {week.map((key) => {
                        const ts = tasksFor(data, key);
                        const mins = ts
                          .filter((t) => skills.includes(t.category))
                          .reduce((n, t) => n + duration(t), 0);
                        return (
                          <div
                            className={`week-day ${key === today ? "is-today" : ""}`}
                            key={key}
                          >
                            <button
                              className="day-header"
                              title="Xem chi tiết ngày"
                              onClick={() => {
                                setSelected(key);
                                setView("day");
                              }}
                            >
                              <span>
                                {format(dateObject(key), "EEEE", {
                                  locale: vi,
                                })}
                              </span>
                              <b>{format(dateObject(key), "dd")}</b>
                              <small>
                                {ts.length} hoạt động · {(mins / 60).toFixed(1)}
                                h học
                              </small>
                            </button>
                            <div className="day-tasks">
                              {ts.map((t) => (
                                <button
                                  className={`week-task ${t.category} ${data.completion[key]?.[t.id] === "completed" ? "done" : ""}`}
                                  key={t.id}
                                  onClick={() => openEditor(t, key)}
                                >
                                  <span>
                                    {t.start}–{t.end}
                                  </span>
                                  <b>{t.title}</b>
                                  {minute(t.end) <= minute(t.start) && (
                                    <small>Kết thúc ngày kế tiếp</small>
                                  )}
                                </button>
                              ))}
                              <button
                                className="add-day"
                                aria-label={`Thêm vào ngày ${format(dateObject(key), "dd/MM")}`}
                                onClick={() => openEditor(undefined, key)}
                              >
                                <Plus size={14} /> Thêm
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="muted schedule-help">
                      Nhấn vào ngày để xem chi tiết, hoặc vào hoạt động để
                      chỉnh sửa. Mặc định chỉ thay đổi ngày được chọn.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="day-strip">
                      {week.map((key) => (
                        <button
                          key={key}
                          className={`${key === selected ? "selected" : ""} ${key === today ? "today" : ""}`}
                          onClick={() => setSelected(key)}
                        >
                          {format(dateObject(key), "EEEEEE", { locale: vi })}
                          <b>{format(dateObject(key), "dd")}</b>
                        </button>
                      ))}
                    </div>
                    <div className="section-heading day-heading">
                      <div>
                        <h2>
                          {format(dateObject(selected), "EEEE, dd/MM/yyyy", {
                            locale: vi,
                          })}
                        </h2>
                        <p>
                          {data.overrides[selected]
                            ? "Lịch riêng cho ngày này"
                            : "Theo lịch lặp hằng tuần"}
                        </p>
                      </div>
                      {data.overrides[selected] && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            if (
                              confirm(
                                "Xóa lịch riêng của ngày này và sử dụng lại lịch lặp?",
                              )
                            )
                              update((d) => {
                                const overrides = { ...d.overrides };
                                delete overrides[selected];
                                return { ...d, overrides };
                              });
                          }}
                        >
                          Dùng lại lịch lặp
                        </Button>
                      )}
                    </div>
                    {timeline(selected)}
                  </>
                )}
              </section>
            </>
          )}
          <div hidden={page !== "focus"}>
            <Focus />
          </div>
          {page === "statistics" && (
            <Suspense
              fallback={
                <div className="panel" role="status">
                  Đang tải thống kê…
                </div>
              }
            >
              <Statistics today={today} />
            </Suspense>
          )}
          {page === "settings" && (
            <Settings
              onToast={setToast}
              onSchedule={() => {
                setPage("schedule");
                setView("week");
              }}
            />
          )}
          <footer>
            Focus Routine <span>Chậm mà chắc. Mỗi ngày một chút.</span>
            <span>
              Mẹo: nhấn <b>N</b> để thêm hoạt động nhanh · Dữ liệu lưu trên
              thiết bị của bạn.
            </span>
          </footer>
        </main>
      </div>
      <Dialog
        open={!!editor}
        onOpenChange={(v) => !v && setEditor(null)}
        title={isNew ? "Thêm hoạt động" : "Chỉnh sửa hoạt động"}
      >
        {editor && (
          <form onSubmit={saveTask} className="form-stack">
            <p className="muted" style={{ marginTop: -12 }}>
              {format(dateObject(selected), "EEEE, dd/MM/yyyy", { locale: vi })}
            </p>
            <label>
              Tên hoạt động
              <input
                autoFocus
                required
                maxLength={200}
                value={editor.title}
                onChange={(e) =>
                  setEditor({ ...editor, title: e.target.value })
                }
                placeholder="Bạn muốn dành thời gian cho điều gì?"
              />
            </label>
            <div>
              <span className="field-label" id="category-label">
                Danh mục
              </span>
              <div
                className="chip-grid"
                role="radiogroup"
                aria-labelledby="category-label"
              >
                {categories.map((c) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={editor.category === c}
                    key={c}
                    className={`chip ${c}`}
                    onClick={() =>
                      setEditor({ ...editor, category: c as Category })
                    }
                  >
                    <span className="dot" />
                    {labels[c]}
                  </button>
                ))}
              </div>
            </div>
            <div className="two-col">
              <label>
                Bắt đầu
                <input
                  type="time"
                  required
                  value={editor.start}
                  onChange={(e) =>
                    setEditor({ ...editor, start: e.target.value })
                  }
                />
              </label>
              <label>
                Kết thúc
                <input
                  type="time"
                  required
                  value={editor.end}
                  onChange={(e) =>
                    setEditor({ ...editor, end: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="presets">
              <span>Thời lượng nhanh:</span>
              {presets.map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() =>
                    setEditor({ ...editor, end: addMinutes(editor.start, n) })
                  }
                >
                  {n < 60 ? `${n}p` : `${n / 60}h`.replace(".5h", "h30")}
                </button>
              ))}
            </div>
            {editor.start !== editor.end && (
              <div className="duration-summary">
                <Clock3 size={15} />
                Thời lượng: <b>{fmtMinutes(duration(editor))}</b>
                {minute(editor.end) < minute(editor.start) &&
                  " · kết thúc vào ngày hôm sau"}
              </div>
            )}
            {editorCollisions.length > 0 && (
              <div className="warn-note" style={{ flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <TriangleAlert size={16} />
                  <span>
                    Trùng giờ với:{" "}
                    <b>{editorCollisions.map((t) => t.title).join(", ")}</b>.
                  </span>
                </div>
                <label
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    fontSize: 13,
                    color: "inherit",
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={autoShift}
                    onChange={(e) => setAutoShift(e.target.checked)}
                    style={{ width: 16, height: 16, minHeight: 16, cursor: "pointer" }}
                  />
                  Tự động dời giờ các hoạt động phía sau để khớp giờ
                </label>
              </div>
            )}
            <div>
              <span className="field-label">Áp dụng cho</span>
              <div className="scope-options">
                <button
                  type="button"
                  className={scope === "day" ? "selected" : ""}
                  onClick={() => setScope("day")}
                >
                  <b>Chỉ ngày này</b>
                  <small>{format(dateObject(selected), "dd/MM/yyyy")}</small>
                </button>
                <button
                  type="button"
                  className={scope === "template" ? "selected" : ""}
                  onClick={() => setScope("template")}
                >
                  <b>Lặp hằng tuần</b>
                  <small>
                    Mỗi {format(dateObject(selected), "EEEE", { locale: vi })}
                  </small>
                </button>
              </div>
            </div>
            {conflict && (
              <p role="alert" className="error-banner">
                {conflict}
              </p>
            )}
            <div className="dialog-actions">
              {!isNew && (
                <Button
                  type="button"
                  variant="ghost"
                  className="spacer danger-text"
                  onClick={() => {
                    setPendingDelete(editor);
                    setEditor(null);
                  }}
                >
                  <Trash2 size={15} />
                  Xóa
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditor(null)}
              >
                Hủy
              </Button>
              <Button type="submit">Lưu hoạt động</Button>
            </div>
          </form>
        )}
      </Dialog>
      <Dialog
        open={!!pendingDelete}
        onOpenChange={(v) => !v && setPendingDelete(null)}
        title="Xóa hoạt động?"
      >
        <p>“{pendingDelete?.title}” sẽ được xóa khỏi phạm vi bạn chọn.</p>
        <div className="scope-options">
          <button
            type="button"
            className={scope === "day" ? "selected" : ""}
            onClick={() => setScope("day")}
          >
            <b>Chỉ ngày này</b>
            <small>{format(dateObject(selected), "dd/MM/yyyy")}</small>
          </button>
          <button
            type="button"
            className={scope === "template" ? "selected" : ""}
            onClick={() => setScope("template")}
          >
            <b>Lịch lặp hằng tuần</b>
            <small>
              Mỗi {format(dateObject(selected), "EEEE", { locale: vi })}
            </small>
          </button>
        </div>
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setPendingDelete(null)}>
            Hủy
          </Button>
          <Button variant="destructive" onClick={removeTask}>
            Xóa hoạt động
          </Button>
        </div>
      </Dialog>
      {toast && (
        <div className="toast" role="status">
          <CircleCheck size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Metric({
  icon,
  label,
  value,
  suffix,
  note,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  note: string;
  tone?: "green" | "orange" | "purple";
}) {
  return (
    <section className="panel metric">
      <div className="metric-label">
        <span>{label}</span>
        <span className={`metric-icon ${tone ?? ""}`}>{icon}</span>
      </div>
      <strong>
        {value}
        {suffix && <small>{suffix}</small>}
      </strong>
      <p>{note}</p>
    </section>
  );
}
