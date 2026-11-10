import { useState } from "react";
import {
  addDays,
  format,
  startOfWeek,
  startOfMonth,
  eachDayOfInterval,
  endOfMonth,
} from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Clock3, CircleCheck, Timer, Target, Flame } from "lucide-react";
import { useStore } from "./stores/useStore";
import {
  actual,
  tasksFor,
  skills,
  duration,
  labels,
  streak,
  dateObject,
  dayKey,
} from "./model";
export function Statistics({ today }: { today: string }) {
  const { data } = useStore();
  const [period, setPeriod] = useState("week");
  const now = dateObject(today);
  const days =
    period === "day"
      ? [now]
      : period === "week"
        ? Array.from({ length: 7 }, (_, i) =>
            addDays(startOfWeek(now, { weekStartsOn: 1 }), i),
          )
        : eachDayOfInterval({ start: startOfMonth(now), end: endOfMonth(now) });
  const keys = days.map((d) => format(d, "yyyy-MM-dd"));
  const sessions = data.sessions.filter((s) => keys.includes(s.date));
  const minutes = sessions.reduce((a, s) => a + s.minutes, 0);
  const chart = keys.map((k) => ({
    name: format(dateObject(k), period === "month" ? "dd" : "EEE"),
    planned: tasksFor(data, k)
      .filter((t) => skills.includes(t.category))
      .reduce((n, t) => n + duration(t), 0),
    actual: Math.round(actual(data, k)),
  }));
  const count = keys.reduce(
    (n, k) =>
      n +
      tasksFor(data, k).filter(
        (t) => data.completion[k]?.[t.id] === "completed",
      ).length,
    0,
  );
  const total = keys.reduce((n, k) => n + tasksFor(data, k).length, 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">NHÌN LẠI ĐỂ TIẾN XA HƠN</span>
          <h1>Những bước tiến của bạn</h1>
          <p>Thời gian thực tế được ghi nhận từ các phiên Focus.</p>
        </div>
        <div className="segmented">
          {[
            ["day", "Hôm nay"],
            ["week", "Tuần này"],
            ["month", "Tháng này"],
          ].map(([v, l]) => (
            <button
              key={v}
              className={period === v ? "selected" : ""}
              onClick={() => setPeriod(v)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="metrics">
        <Metric
          icon={<Clock3 size={18} />}
          label="Tập trung thực tế"
          value={`${(minutes / 60).toFixed(1)} giờ`}
        />
        <Metric
          icon={<CircleCheck size={18} />}
          tone="green"
          label="Hoàn thành"
          value={`${count}/${total}`}
        />
        <Metric
          icon={<Timer size={18} />}
          tone="purple"
          label="Phiên tập trung"
          value={String(sessions.length)}
        />
        <Metric
          icon={<Target size={18} />}
          tone="orange"
          label="Ngày đạt mục tiêu"
          value={`${keys.filter((k) => actual(data, k) >= data.settings.goal).length} ngày`}
        />
      </div>
      <section className="panel">
        <div className="section-heading">
          <h2>Nhịp học tập</h2>
          <div className="legend">
            <span>
              <i style={{ background: "#b9cbfb" }} />
              Dự kiến
            </span>
            <span>
              <i style={{ background: "#3d6cf4" }} />
              Thực tế
            </span>
          </div>
        </div>
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis unit="p" width={48} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "var(--hover)" }}
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  color: "var(--text)",
                  boxShadow: "var(--shadow)",
                }}
              />
              <Bar
                name="Dự kiến (phút)"
                dataKey="planned"
                fill="#b9cbfb"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                name="Thực tế (phút)"
                dataKey="actual"
                fill="#3d6cf4"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <div className="two-col">
        <section className="panel">
          <h2>Thời gian theo kỹ năng</h2>
          {skills.map((s) => {
            const mins = sessions
              .filter((x) => x.skill === s)
              .reduce((n, x) => n + x.minutes, 0);
            return (
              <div className={`skill-row ${s}`} key={s}>
                <div>
                  <span className="dot" />
                  <b>{labels[s]}</b>
                  <span>
                    {Math.round(mins)} phút ·{" "}
                    {sessions.filter((x) => x.skill === s).length} phiên
                  </span>
                </div>
                <div className="progress">
                  <i
                    style={{
                      width: `${minutes ? (mins / minutes) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </section>
        <section className="panel reflection">
          <span className="eyebrow">TÍCH LŨY TỪ NHỮNG ĐIỀU NHỎ</span>
          <h2>
            <Flame size={28} />
            {streak(data, today)} ngày liên tiếp
          </h2>
          <p>
            Mục tiêu hiện tại: {data.settings.goal} phút tập trung mỗi ngày. Một
            ngày chưa trọn vẹn cũng là cơ hội để bắt đầu lại.
          </p>
          <p className="muted">
            Tỷ lệ hoàn thành: {total ? Math.round((count / total) * 100) : 0}%.
            Hoàn thành lịch và thời gian Focus được theo dõi riêng. Giải trí
            không được cộng vào thời gian học.
          </p>
          <small>Cập nhật {dayKey(new Date(), data.settings.timezone)}</small>
        </section>
      </div>
    </>
  );
}
function Metric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "green" | "orange" | "purple";
}) {
  return (
    <section className="panel metric">
      <div className="metric-label">
        <span>{label}</span>
        <span className={`metric-icon ${tone ?? ""}`}>{icon}</span>
      </div>
      <strong>{value}</strong>
    </section>
  );
}
