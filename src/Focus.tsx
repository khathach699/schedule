import { useEffect, useState } from "react";
import { Play, Pause, RotateCcw, Square } from "lucide-react";
import { skills, labels, type Category, type Session } from "./model";
import { useStore } from "./stores/useStore";
import { splitIntervals, type Interval } from "./focusTime";
import { Button } from "./components/ui/button";
type Timer = {
  id: string;
  skill: Category;
  total: number;
  remaining: number;
  deadline: number | null;
  startedAt: string;
  phase: "focus" | "break";
  breakMinutes: number;
  intervals: Interval[];
  activeSince: number | null;
};
function restore(): Timer | null {
  try {
    const t = JSON.parse(localStorage.getItem("focus-timer") || "null");
    return t &&
      typeof t.id === "string" &&
      skills.includes(t.skill) &&
      Number.isFinite(t.total) &&
      t.total > 0 &&
      Number.isFinite(t.remaining) &&
      (t.deadline === null || Number.isFinite(t.deadline)) &&
      ["focus", "break"].includes(t.phase)
      ? {
          ...t,
          intervals: t.intervals || [],
          activeSince:
            t.activeSince ??
            (t.deadline ? t.deadline - t.remaining * 1000 : null),
        }
      : null;
  } catch {
    return null;
  }
}
export function Focus() {
  const { data, update } = useStore();
  const [timer, setTimer] = useState<Timer | null>(restore);
  const [mode, setMode] = useState(25);
  const [custom, setCustom] = useState(45);
  const [skill, setSkill] = useState<Category>("Flutter");
  const [clock, setClock] = useState(Date.now());
  const [away, setAway] = useState(document.hidden);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const reset = () => setTimer(null);
    window.addEventListener("focus-reset", reset);
    return () => window.removeEventListener("focus-reset", reset);
  }, []);
  useEffect(() => {
    const i = setInterval(() => setClock(Date.now()), 250);
    const visibility = () => setAway(document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      clearInterval(i);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    try {
      if (timer) localStorage.setItem("focus-timer", JSON.stringify(timer));
      else localStorage.removeItem("focus-timer");
    } catch {
      setNotice("Không lưu được trạng thái bộ đếm.");
    }
  }, [timer]);
  const remaining = timer
    ? Math.max(
        0,
        timer.deadline ? (timer.deadline - clock) / 1000 : timer.remaining,
      )
    : (mode || custom) * 60;
  function record(t: Timer, seconds: number) {
    if (t.phase === "break" || seconds < 1) return;
    const intervals = [...t.intervals];
    if (t.activeSince)
      intervals.push({
        start: t.activeSince,
        end: Math.min(Date.now(), t.deadline || Date.now()),
      });
    const split = splitIntervals(
      intervals,
      data.settings.timezone,
      Math.min(t.total, seconds),
    );
    const sessions: Session[] = Object.entries(split).map(
      ([date, minutes]) => ({
        id: `${t.id}:${date}`,
        date,
        skill: t.skill,
        minutes,
        endedAt: new Date().toISOString(),
      }),
    );
    update((d) => ({
      ...d,
      sessions: [
        ...d.sessions,
        ...sessions.filter((s) => !d.sessions.some((old) => old.id === s.id)),
      ],
    }));
  }
  useEffect(() => {
    if (!timer?.deadline || remaining > 0) return;
    record(timer, timer.total);
    setNotice(
      timer.phase === "focus"
        ? "Hoàn thành phiên tập trung. Bạn đã làm rất tốt!"
        : "Hết giờ nghỉ. Sẵn sàng cho phiên tiếp theo?",
    );
    try {
      if ("Notification" in window && Notification.permission === "granted")
        new Notification("Focus Routine", {
          body:
            timer.phase === "focus"
              ? "Phiên tập trung đã hoàn thành!"
              : "Đã hết giờ nghỉ.",
        });
    } catch {
      /* Browser notification support varies. */
    }
    setTimer(
      timer.phase === "focus" && timer.breakMinutes
        ? {
            ...timer,
            id: crypto.randomUUID(),
            phase: "break",
            total: timer.breakMinutes * 60,
            remaining: timer.breakMinutes * 60,
            deadline: null,
            intervals: [],
            activeSince: null,
          }
        : null,
    );
  }, [clock, timer]);
  function start() {
    const seconds = (mode || custom) * 60;
    if (seconds < 60 || seconds > 10800) return;
    const started = Date.now();
    setTimer({
      id: crypto.randomUUID(),
      skill,
      total: seconds,
      remaining: seconds,
      deadline: started + seconds * 1000,
      startedAt: new Date().toISOString(),
      phase: "focus",
      breakMinutes: mode === 25 ? 5 : mode === 50 ? 10 : 0,
      intervals: [],
      activeSince: started,
    });
    setNotice("");
  }
  function togglePause() {
    const stamp = Date.now();
    setTimer((t) => {
      if (!t) return null;
      const left = t.deadline
        ? Math.max(0, (t.deadline - stamp) / 1000)
        : t.remaining;
      return {
        ...t,
        remaining: left,
        deadline: t.deadline ? null : stamp + left * 1000,
        intervals:
          t.deadline && t.activeSince
            ? [
                ...t.intervals,
                { start: t.activeSince, end: Math.min(stamp, t.deadline) },
              ]
            : t.intervals,
        activeSince: t.deadline ? null : stamp,
      };
    });
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MỘT VIỆC TẠI MỘT THỜI ĐIỂM</span>
          <h1>Không gian tập trung</h1>
          <p>Dành trọn sự chú ý cho điều quan trọng.</p>
        </div>
      </div>
      <div className="focus-layout">
        <section className="panel timer-panel">
          <div className="segmented">
            {[
              [25, "Pomodoro"],
              [50, "Deep Work"],
              [90, "90 phút"],
              [0, "Tùy chỉnh"],
            ].map(([n, label]) => (
              <button
                disabled={!!timer}
                className={mode === n ? "selected" : ""}
                onClick={() => setMode(Number(n))}
                key={n}
              >
                {label}
              </button>
            ))}
          </div>
          <p
            className={`phase-label ${timer?.phase === "break" ? "break" : ""}`}
          >
            {timer?.phase === "break" ? "Thời gian nghỉ" : "Phiên tập trung"}
          </p>
          <div
            className="timer-circle"
            style={{
              background: `conic-gradient(${timer?.phase === "break" ? "var(--success)" : "var(--primary)"} ${(1 - remaining / (timer?.total || remaining)) * 360}deg, var(--hover) 0deg)`,
            }}
          >
            <div>
              {timer && (
                <span className={`timer-skill ${timer.skill}`}>
                  <span className="dot" />
                  {labels[timer.skill]}
                </span>
              )}
              <strong>
                {String(Math.floor(Math.ceil(remaining) / 60)).padStart(2, "0")}
                <span>:</span>
                {String(Math.ceil(remaining) % 60).padStart(2, "0")}
              </strong>
              <small>
                {timer?.deadline
                  ? "Hít thở sâu. Tiếp tục nhé."
                  : timer
                    ? "Đã tạm dừng"
                    : "Sẵn sàng khi bạn sẵn sàng"}
              </small>
            </div>
          </div>
          {!timer && (
            <div className="skill-picker">
              <span className="field-label" id="skill-label">
                Bạn muốn tập trung vào kỹ năng nào?
              </span>
              <div
                className="chip-grid"
                role="radiogroup"
                aria-labelledby="skill-label"
              >
                {skills.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={skill === s}
                    className={`chip ${s}`}
                    onClick={() => setSkill(s as Category)}
                  >
                    <span className="dot" />
                    {labels[s]}
                  </button>
                ))}
              </div>
            </div>
          )}
          {mode === 0 && !timer && (
            <label className="custom-minutes">
              Thời lượng (1–180 phút)
              <input
                type="number"
                min={1}
                max={180}
                value={custom}
                onChange={(e) => setCustom(Number(e.target.value))}
              />
            </label>
          )}
          <div className="timer-actions">
            {!timer ? (
              <Button onClick={start}>
                <Play size={18} />
                Bắt đầu tập trung
              </Button>
            ) : (
              <>
                <Button onClick={togglePause}>
                  {timer.deadline ? <Pause size={18} /> : <Play size={18} />}{" "}
                  {timer.deadline ? "Tạm dừng" : "Tiếp tục"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (
                      confirm("Kết thúc phiên và lưu thời gian đã tập trung?")
                    ) {
                      record(
                        timer,
                        timer.total -
                          (timer.deadline
                            ? Math.max(0, (timer.deadline - Date.now()) / 1000)
                            : timer.remaining),
                      );
                      setTimer(null);
                    }
                  }}
                >
                  <Square size={16} />
                  Kết thúc
                </Button>
                <Button
                  variant="ghost"
                  title="Hủy phiên"
                  onClick={() => {
                    if (confirm("Hủy phiên này mà không lưu?")) setTimer(null);
                  }}
                >
                  <RotateCcw size={18} />
                </Button>
              </>
            )}
          </div>
          <p className="muted">
            {away
              ? "Bạn đang ở tab khác. Bộ đếm vẫn hoạt động."
              : "Bộ đếm vẫn chạy khi bạn chuyển tab."}
          </p>
          {notice && (
            <p role="status" className="success-note">
              {notice}
            </p>
          )}
        </section>
        <aside className="stack">
          <section className="panel">
            <span className="eyebrow">TẠO KHÔNG GIAN CHO ĐIỀU TỐT</span>
            <h2>Một phiên học hiệu quả</h2>
            <ol className="tips">
              <li>Chọn một mục tiêu nhỏ, rõ ràng.</li>
              <li>
                Bật Focus Mode trên thiết bị và tắt thông báo mạng xã hội.
              </li>
              <li>Để điện thoại xa tầm tay.</li>
              <li>Nghỉ ngơi sau mỗi phiên học.</li>
            </ol>
            <Button
              variant="outline"
              onClick={async () => {
                if ("Notification" in window) {
                  const p = await Notification.requestPermission();
                  setNotice(
                    p === "granted"
                      ? "Đã bật thông báo."
                      : "Trình duyệt chưa cho phép thông báo.",
                  );
                } else setNotice("Trình duyệt không hỗ trợ thông báo.");
              }}
            >
              Bật thông báo kết thúc
            </Button>
          </section>
          <section className="panel">
            <h2>Phiên gần đây</h2>
            {data.sessions.length === 0 ? (
              <p className="empty">Phiên học đầu tiên đang chờ bạn.</p>
            ) : (
              data.sessions
                .slice(-5)
                .reverse()
                .map((s) => (
                  <div className={`session ${s.skill}`} key={s.id}>
                    <span className="dot" />
                    <div>
                      <b>{labels[s.skill]}</b>
                      <small>{s.date}</small>
                    </div>
                    <strong>{Math.round(s.minutes)} phút</strong>
                  </div>
                ))
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
