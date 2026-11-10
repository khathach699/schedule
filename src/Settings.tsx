import { useState } from "react";
import { Download, Upload, ExternalLink, Cloud, RefreshCw } from "lucide-react";
import { useStore } from "./stores/useStore";
import { dayKey } from "./model";
import { storage } from "./services/storage";
import { defaultData } from "./data/defaultSchedule";
import { Button } from "./components/ui/button";
import { Dialog } from "./components/ui/dialog";
import { isSupabaseConfigured } from "./services/supabase";
export function Settings({
  onToast,
  onSchedule,
}: {
  onToast: (s: string) => void;
  onSchedule: () => void;
}) {
  const { data, update, cloudStatus, syncFromCloud } = useStore();
  const [name, setName] = useState(data.settings.name);
  const [timezone, setTimezone] = useState(data.settings.timezone);
  const [goal, setGoal] = useState(data.settings.goal);
  const [reset, setReset] = useState("");
  const [syncingNow, setSyncingNow] = useState(false);
  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `focus-routine-${dayKey(new Date(), data.settings.timezone)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">THEO CÁCH CỦA BẠN</span>
          <h1>Cài đặt không gian</h1>
          <p>Những điều nhỏ để mỗi ngày dễ dàng hơn.</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="panel">
          <h2>Cá nhân hóa</h2>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                new Intl.DateTimeFormat("vi", { timeZone: timezone });
                if (goal < 1 || goal > 1440 || !name.trim()) throw Error();
                update((d) => ({
                  ...d,
                  settings: {
                    ...d.settings,
                    name: name.trim(),
                    timezone,
                    goal,
                  },
                }));
                onToast("Đã lưu cài đặt");
              } catch {
                onToast("Kiểm tra tên, múi giờ và mục tiêu 1–1440 phút.");
              }
            }}
          >
            <label>
              Tên hiển thị
              <input
                value={name}
                maxLength={80}
                required
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Mục tiêu tập trung (phút/ngày)
              <input
                type="number"
                min={1}
                max={1440}
                required
                value={goal}
                onChange={(e) => setGoal(Number(e.target.value))}
              />
            </label>
            <label>
              Múi giờ
              <input
                required
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                list="timezones"
              />
              <datalist id="timezones">
                <option>Asia/Ho_Chi_Minh</option>
                <option>Asia/Bangkok</option>
                <option>Asia/Tokyo</option>
                <option>Europe/London</option>
                <option>America/New_York</option>
              </datalist>
            </label>
            <label>
              Giao diện
              <select
                value={data.settings.theme}
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    settings: {
                      ...d.settings,
                      theme: e.target.value as "light" | "dark",
                    },
                  }))
                }
              >
                <option value="light">Sáng</option>
                <option value="dark">Tối</option>
              </select>
            </label>
            <p className="muted">
              Ngôn ngữ: Tiếng Việt · Tuần bắt đầu từ thứ Hai.
            </p>
            <Button type="submit">Lưu cài đặt</Button>
          </form>
        </section>
        <div className="stack">
          <section className="panel">
            <h2>Lịch sinh hoạt & học tập</h2>
            <p>
              Điều chỉnh giờ thức dậy, đi ngủ, đi làm, di chuyển, ngày nghỉ và
              từng buổi học trực tiếp trong lịch lặp hằng tuần.
            </p>
            <Button variant="outline" onClick={onSchedule}>
              Chỉnh sửa lịch lặp <ExternalLink size={15} />
            </Button>
          </section>
          <section className="panel">
            <h2>Dữ liệu của bạn</h2>
            <p>
              Dữ liệu được lưu an toàn trên trình duyệt và tự động đồng bộ đám mây qua Supabase.
            </p>
            {isSupabaseConfigured() && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: 10,
                  backgroundColor: "var(--hover)",
                  marginBottom: 16,
                  border: "1px solid var(--line)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Cloud size={18} color="var(--primary)" />
                  <div>
                    <b style={{ display: "block", fontSize: 13 }}>Đồng bộ Supabase Cloud</b>
                    <small style={{ color: "var(--muted)", fontSize: 11 }}>
                      {cloudStatus === "syncing"
                        ? "Đang đồng bộ..."
                        : cloudStatus === "synced"
                          ? "Đã đồng bộ mới nhất"
                          : cloudStatus === "error"
                            ? "Lỗi kết nối đồng bộ"
                            : "Sẵn sàng kết nối"}
                    </small>
                  </div>
                </div>
                <Button
                  variant="outline"
                  disabled={syncingNow || cloudStatus === "syncing"}
                  onClick={async () => {
                    setSyncingNow(true);
                    await syncFromCloud();
                    setSyncingNow(false);
                    onToast("Đã đồng bộ với Supabase Cloud");
                  }}
                  style={{ minHeight: 32, padding: "4px 10px", fontSize: 12 }}
                >
                  <RefreshCw size={13} className={syncingNow ? "animate-spin" : ""} />
                  Đồng bộ ngay
                </Button>
              </div>
            )}
            <div className="data-actions">
              <Button variant="outline" onClick={exportData}>
                <Download size={16} />
                Xuất JSON
              </Button>
              <label className="btn outline import-button">
                <Upload size={16} />
                Nhập JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      if (file.size > 5 * 1024 * 1024) throw Error();
                      const imported = storage.parse(await file.text());
                      if (
                        confirm(
                          `Thay toàn bộ dữ liệu hiện tại bằng bản sao có ${imported.sessions.length} phiên Focus?`,
                        )
                      ) {
                        localStorage.removeItem("focus-timer");
                        window.dispatchEvent(new Event("focus-reset"));
                        update(() => imported);
                        onToast("Đã nhập dữ liệu");
                      }
                    } catch {
                      onToast(
                        "Tệp không hợp lệ, sai phiên bản hoặc lớn hơn 5 MB.",
                      );
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <div className="reset-actions">
              <Button variant="ghost" onClick={() => setReset("progress")}>
                Đặt lại tiến độ
              </Button>
              <Button variant="ghost" onClick={() => setReset("schedule")}>
                Khôi phục lịch mặc định
              </Button>
            </div>
          </section>
        </div>
      </div>
      <Dialog
        open={!!reset}
        onOpenChange={(v) => !v && setReset("")}
        title={
          reset === "progress"
            ? "Đặt lại toàn bộ tiến độ?"
            : "Khôi phục lịch mặc định?"
        }
      >
        <p>
          {reset === "progress"
            ? "Lịch sử Focus và trạng thái hoàn thành sẽ bị xóa."
            : "Lịch lặp và thay đổi riêng từng ngày sẽ được thay bằng lịch mặc định."}{" "}
          Hãy xuất bản sao nếu cần giữ dữ liệu.
        </p>
        <div className="dialog-actions">
          <Button variant="outline" onClick={() => setReset("")}>
            Hủy
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              update((d) =>
                reset === "progress"
                  ? { ...d, completion: {}, sessions: [] }
                  : {
                      ...d,
                      templates: defaultData().templates,
                      overrides: {},
                      history: {},
                    },
              );
              if (reset === "progress") {
                localStorage.removeItem("focus-timer");
                window.dispatchEvent(new Event("focus-reset"));
              }
              setReset("");
              onToast("Đã đặt lại dữ liệu");
            }}
          >
            Xác nhận đặt lại
          </Button>
        </div>
      </Dialog>
    </>
  );
}
