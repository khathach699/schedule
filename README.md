# Focus Routine

Ứng dụng quản lý lịch trình và tập trung cá nhân bằng React, TypeScript strict, Vite, Tailwind CSS, Zustand, date-fns, Recharts và các UI primitives theo cấu trúc shadcn/ui (Radix Dialog, CVA, clsx, tailwind-merge). Giao diện tiếng Việt, responsive, sáng/tối; không cần tài khoản.

## Chạy trên máy

Yêu cầu Node.js 20.19+ hoặc 22.12+.

```sh
npm ci
npm run dev
```

Mở URL Vite hiển thị (thông thường http://localhost:5173).

```sh
npm test
npm run build
npm run preview
```

`npm run build` kiểm tra TypeScript và tạo bản production tại `dist/`.

## Chức năng

- Dashboard theo ngày và múi giờ đã chọn, lịch mặc định chính xác thứ Hai–Chủ Nhật.
- Lịch ngày/tuần, chuyển ngày và tuần, thêm/sửa/xóa, hoàn thành/bỏ qua.
- Chọn chỉnh sửa riêng ngày hoặc lịch lặp. Các ngày đã có lịch riêng không bị ghi đè khi chỉnh lịch lặp. Có thể khôi phục lịch lặp từ chế độ xem ngày.
- Cảnh báo khung giờ trùng; hoạt động qua đêm gắn tiến độ với ngày bắt đầu, thời lượng qua 00:00 được xử lý riêng. Dashboard hiển thị hoạt động tiếp nối từ hôm trước.
- Focus 25/5, 50/10, 90 phút, tùy chỉnh; tạm dừng/tiếp tục/kết thúc/hủy; lưu bộ đếm khi tải lại. Chạy nền ngay cả khi chuyển trang trong ứng dụng.
- Phiên Focus thực tế được tách theo ngày tại múi giờ đã chọn, không tính thời gian tạm dừng. Mỗi phần phiên có ID ổn định để tránh lưu trùng.
- Thống kê ngày/tuần/tháng phân biệt dự kiến và thực tế, tiến độ theo kỹ năng, mục tiêu và streak.
- Cài đặt tên, múi giờ IANA, mục tiêu, theme. Sửa giờ sinh hoạt/ngày nghỉ/lịch học trực tiếp qua lịch lặp.
- Nhập/xuất JSON có kiểm tra schema, phiên bản, ID trùng và giới hạn 5 MB; xác nhận trước ghi đè/xóa.

## Dữ liệu & kiến trúc

- `src/model.ts`: types, Zod schema, phép tính lịch và ngày.
- `src/data/defaultSchedule.ts`: seed với ID ổn định, không tạo lại dữ liệu khi reload.
- `src/services/storage.ts`: adapter lưu trữ, kiểm tra phiên bản khi đọc/import; điểm mở rộng migration và Supabase.
- `src/stores/useStore.ts`: Zustand và xử lý lỗi lưu localStorage.
- `src/focusTime.ts`: tách các khoảng tập trung theo ngày thực tế.
- `src/components/ui/`: Button và Dialog tái sử dụng, quản lý focus và bàn phím bằng Radix.
- `src/Focus.tsx`, `src/Statistics.tsx`, `src/Settings.tsx`, `src/App.tsx`: các màn hình và điều phối.

Khóa `focus-routine:v1` lưu lịch lặp, overrides theo ngày, snapshots lịch từng ngày đã được ghi nhận, completion theo ngày, Focus sessions và settings. Khóa `focus-timer` lưu trạng thái phiên đang chạy. Schema v1 là phiên bản đầu tiên; thêm migration trước bước parse ở storage adapter nếu thay schema trong tương lai. Dữ liệu v1 chưa có snapshots được bổ sung trường mặc định khi đọc.

Snapshot giữ lịch của những ngày đã sử dụng ứng dụng để chỉnh lịch lặp sau này không làm thay đổi mẫu số thống kê cũ. Không thể tái tạo lịch sử thực tế từ những ngày trước lần đầu sử dụng. Giải trí không được tính vào học; chọn một kỹ năng và chủ động chạy Focus nếu muốn ghi nhận luyện nghe.

Dữ liệu nằm trong **trình duyệt/thiết bị hiện tại**, không đồng bộ và có thể bị mất khi xóa dữ liệu trình duyệt. Hãy xuất JSON định kỳ. Focus chỉ có thể hiện thông báo khi ứng dụng còn được trình duyệt thực thi; đóng trình duyệt hoặc hệ điều hành đình chỉ tab không bảo đảm thông báo đúng thời điểm. Khi mở lại, deadline vẫn được khôi phục. Website không chặn ứng dụng khác.

## Kiểm tra trình duyệt

```sh
npx playwright install chromium
npm run dev
# Trong terminal khác:
npm run test:browser
node scripts/edge-smoke.mjs
```

Smoke test dùng browser context mới, không chạm dữ liệu trình duyệt người dùng: kiểm tra CRUD, persistence sau reload, Focus, thống kê, cài đặt, desktop/mobile và lỗi runtime. Ảnh kiểm tra được tạo tại `desktop-preview.png` và `mobile-preview.png`.

## Deploy Vercel

### Qua dashboard

1. Đẩy mã nguồn lên GitHub/GitLab/Bitbucket.
2. Trong Vercel, chọn **Add New → Project**, import repository.
3. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`.
4. Deploy. Không cần biến môi trường hoặc backend.

### Qua CLI

```sh
npx vercel login
npx vercel --prod
```

`vercel.json` đã cấu hình SPA fallback. Repository chưa liên kết với tài khoản/project Vercel cụ thể. Không đưa token vào mã nguồn.

## Phạm vi còn lại

PWA, nhắc nhở nền và Supabase thuộc giai đoạn sau, chưa bật trong bản hiện tại. Giao diện hiện dùng tiếng Việt và cố định tuần bắt đầu thứ Hai theo brief. Không có dữ liệu học mẫu giả: các số liệu thực tế bắt đầu từ 0.

Khi dữ liệu lưu cũ không hợp lệ, ứng dụng không tự ghi đè lúc khởi động. Nếu người dùng tiếp tục lưu dữ liệu mới, adapter giữ nguyên chuỗi dữ liệu cũ tại khóa localStorage `focus-routine:recovery` để có thể phục hồi.
