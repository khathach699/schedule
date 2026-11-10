import type { Task, Category, Data } from "../model";
type Row = [string, string, string, Category];
const weekday: Row[] = [
  ["06:00", "06:45", "Vệ sinh, nấu ăn & chuẩn bị bữa sáng", "Personal"],
  ["06:45", "07:30", "Ôn luyện tiếng Anh", "English"],
  ["07:30", "07:35", "Chuẩn bị đi làm", "Personal"],
  ["07:35", "08:20", "Di chuyển đến công ty", "Commute"],
  ["08:20", "12:00", "Ăn sáng tại công ty & làm việc", "Work"],
  ["12:00", "12:30", "Ăn trưa", "Personal"],
  ["12:30", "13:15", "Ngủ trưa", "Sleep"],
  ["13:15", "13:30", "Nghỉ ngơi", "Personal"],
  ["13:30", "17:45", "Làm việc", "Work"],
  ["17:45", "18:30", "Di chuyển về nhà", "Commute"],
  ["18:30", "20:00", "Nấu ăn, ăn tối & dọn dẹp", "Personal"],
  ["20:00", "21:30", "Deep Work", "Flutter"],
  ["21:30", "22:15", "Học tiếng Trung", "Chinese"],
  ["22:15", "22:30", "Ôn tiếng Anh", "English"],
  ["22:30", "22:50", "Xem hoạt hình Trung Quốc", "Entertainment"],
  ["22:50", "23:05", "Chuẩn bị ngủ", "Personal"],
  ["23:05", "06:00", "Ngủ đêm", "Sleep"],
];
const sat: Row[] = [
  ["07:30", "08:30", "Thức dậy, ăn sáng, vệ sinh", "Personal"],
  ["08:30", "09:00", "Đến cà phê / thư viện", "Commute"],
  ["09:00", "10:30", "Deep Work — Flutter", "Flutter"],
  ["10:30", "10:45", "Nghỉ giải lao", "Personal"],
  ["10:45", "12:00", "Deep Work — Python", "Python"],
  ["12:00", "13:30", "Ăn trưa, nghỉ ngơi", "Personal"],
  ["13:30", "14:30", "Native Kotlin", "Native"],
  ["14:30", "15:30", "Phát triển dự án cá nhân", "Flutter"],
  ["15:30", "16:00", "Tiếng Anh", "English"],
  ["16:00", "19:00", "Về nhà, sinh hoạt cá nhân", "Personal"],
  ["19:00", "19:20", "Học tiếng Trung", "Chinese"],
  ["19:20", "19:40", "Xem phim Trung", "Entertainment"],
  ["19:40", "23:30", "Giải trí, thời gian cá nhân", "Entertainment"],
  ["23:30", "23:45", "Chuẩn bị ngủ", "Personal"],
];
const sun: Row[] = [
  ["07:30", "08:30", "Thức dậy, vệ sinh, ăn sáng", "Personal"],
  ["08:30", "09:00", "Đi cà phê / thư viện", "Commute"],
  ["09:00", "10:00", "Ôn tập Flutter / Python", "Flutter"],
  ["10:00", "11:00", "Phát triển app", "Flutter"],
  ["11:00", "11:30", "Tiếng Anh", "English"],
  ["11:30", "13:30", "Ăn trưa & nghỉ ngơi", "Personal"],
  ["13:30", "16:30", "Thời gian cá nhân", "Personal"],
  ["16:30", "18:30", "Nấu ăn, vệ sinh, dọn dẹp", "Personal"],
  ["18:30", "18:50", "Học tiếng Trung", "Chinese"],
  ["18:50", "19:10", "Xem phim Trung", "Entertainment"],
  ["19:10", "19:40", "Weekly Review", "Personal"],
  ["19:40", "23:30", "Giải trí & nghỉ ngơi", "Entertainment"],
  ["23:30", "23:45", "Chuẩn bị ngủ", "Personal"],
];
export function defaultData(): Data {
  const templates: Record<string, Task[]> = {};
  for (let day = 0; day < 7; day++) {
    templates[day] = (day === 0 ? sun : day === 6 ? sat : weekday).map(
      ([start, end, title, category], i) => ({
        id: `default-${day}-${i}`,
        start,
        end,
        title,
        category,
      }),
    );
    if (day > 0 && day < 6) {
      const t = templates[day][11];
      t.category = day === 5 ? "Native" : day % 2 === 0 ? "Python" : "Flutter";
      t.title = [
        "",
        "Flutter — Phát triển ứng dụng",
        "Python — Kiến thức & bài tập",
        "Flutter — Architecture / Refactoring",
        "Python — API / Mini Project",
        "Native Kotlin / Ôn tập",
      ][day];
    }
  }
  return {
    version: 1,
    templates,
    overrides: {},
    history: {},
    completion: {},
    sessions: [],
    settings: {
      name: "Bạn",
      theme: "light",
      timezone: "Asia/Ho_Chi_Minh",
      goal: 90,
    },
  };
}
