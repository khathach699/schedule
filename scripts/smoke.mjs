import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:5173");
await page.getByRole("heading", { name: /Chào buổi/ }).waitFor();
const check = page.getByRole("button", { name: /Hoàn thành Vệ sinh/ }).first();
await check.click();
assert.equal(await check.getAttribute("aria-pressed"), "true");
await page.reload();
assert.equal(
  await page
    .getByRole("button", { name: /Hoàn thành Vệ sinh/ })
    .first()
    .getAttribute("aria-pressed"),
  "true",
);
await page
  .getByRole("button", { name: "Thêm hoạt động", exact: true })
  .first()
  .click();
await page.getByLabel("Tên hoạt động").fill("Browser smoke task");
await page.getByLabel("Bắt đầu", { exact: true }).fill("05:00");
await page.getByLabel("Kết thúc", { exact: true }).fill("05:10");
page.on("dialog", (d) => d.accept());
await page.getByRole("button", { name: "Lưu hoạt động", exact: true }).click();
await page.getByText("Browser smoke task", { exact: true }).waitFor();
const row = page
  .locator(".timeline-row")
  .filter({ hasText: "Browser smoke task" });
await row.getByTitle("Chỉnh sửa", { exact: true }).click();
await page.getByLabel("Tên hoạt động").fill("Edited smoke task");
await page.getByRole("button", { name: "Lưu hoạt động", exact: true }).click();
await page.getByText("Edited smoke task", { exact: true }).waitFor();
await page.screenshot({ path: "desktop-preview.png", fullPage: true });
await page.getByRole("button", { name: "Tập trung", exact: true }).click();
await page
  .getByRole("button", { name: "Bắt đầu tập trung", exact: true })
  .click();
await page.waitForTimeout(1200);
await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
await page.getByRole("button", { name: "Tổng quan", exact: true }).click();
await page.getByRole("button", { name: "Tập trung", exact: true }).click();
await page.getByRole("button", { name: "Tiếp tục", exact: true }).waitFor();
await page.reload();
await page.getByRole("button", { name: "Tập trung", exact: true }).click();
await page.getByRole("button", { name: "Kết thúc", exact: true }).click();
assert.ok((await page.getByText(/phút/).count()) > 0);
await page.getByRole("button", { name: "Thống kê", exact: true }).click();
await page.getByRole("heading", { name: "Nhịp học tập" }).waitFor();
await page.getByRole("button", { name: "Lịch trình", exact: true }).click();
await page.getByRole("button", { name: "Ngày", exact: true }).click();
await page.getByText("Edited smoke task", { exact: true }).waitFor();
await page
  .locator(".timeline-row")
  .filter({ hasText: "Edited smoke task" })
  .getByTitle("Xóa hoạt động", { exact: true })
  .click();
await page.getByRole("button", { name: "Xóa hoạt động", exact: true }).click();
assert.equal(
  await page.getByText("Edited smoke task", { exact: true }).count(),
  0,
);
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole("button", { name: "Tổng quan", exact: true }).click();
assert.ok(
  await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  ),
);
await page.screenshot({ path: "mobile-preview.png", fullPage: true });
await page
  .getByRole("button", { name: "Cài đặt", exact: true })
  .first()
  .click();
await page.getByRole("heading", { name: "Cài đặt không gian" }).waitFor();
await page.getByLabel("Tên hiển thị").fill("Khánh");
await page.getByRole("button", { name: "Lưu cài đặt" }).click();
assert.equal(errors.length, 0, errors.join("\n"));
console.log(
  "Browser smoke passed: CRUD, persistence, Focus resume/reload, statistics, settings, mobile overflow; no runtime errors.",
);
await browser.close();
