import { minute, duration, type Task } from "./model";

export function formatMinuteToTime(totalMin: number): string {
  const norm = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Tự động điều chỉnh các task trong ngày/template khi một task thay đổi giờ:
 * - Sắp xếp theo thứ tự thời gian.
 * - Đẩy các task tiếp theo bắt đầu nối tiếp ngay sau task trước nếu bị chồng lấn (hoặc nối khít nếu chọn snap).
 * - Giữ nguyên thời lượng (duration) của mỗi task phía sau.
 */
export function adjustScheduleCascade(
  tasks: Task[],
  editedTask: Task,
  mode: "shift-overlapping" | "snap-chain" = "shift-overlapping",
): Task[] {
  // Thay thế task đang sửa
  const list = tasks.map((t) =>
    t.id === editedTask.id ? editedTask : { ...t },
  );
  if (!list.some((t) => t.id === editedTask.id)) {
    list.push(editedTask);
  }

  // Sắp xếp các task theo giờ bắt đầu
  list.sort((a, b) => minute(a.start) - minute(b.start));

  const editedIdx = list.findIndex((t) => t.id === editedTask.id);
  if (editedIdx === -1) return list;

  let currentEndMin = minute(editedTask.start) + duration(editedTask);

  // Điều chỉnh dây chuyền các task phía sau
  for (let i = editedIdx + 1; i < list.length; i++) {
    const task = list[i];
    const taskStartMin = minute(task.start);
    const taskDur = duration(task);

    if (mode === "shift-overlapping") {
      // Chỉ đẩy lùi nếu bị đè giờ lên nhau
      if (taskStartMin < currentEndMin) {
        const newStart = formatMinuteToTime(currentEndMin);
        const newEnd = formatMinuteToTime(currentEndMin + taskDur);
        list[i] = { ...task, start: newStart, end: newEnd };
        currentEndMin = currentEndMin + taskDur;
      } else {
        // Không bị đè nữa, cập nhật mốc currentEndMin theo task này
        currentEndMin = taskStartMin + taskDur;
      }
    } else if (mode === "snap-chain") {
      // Khớp nối liền mạch liên tục
      const newStart = formatMinuteToTime(currentEndMin);
      const newEnd = formatMinuteToTime(currentEndMin + taskDur);
      list[i] = { ...task, start: newStart, end: newEnd };
      currentEndMin = currentEndMin + taskDur;
    }
  }

  return list;
}
