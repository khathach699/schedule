import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("dialog", (d) => d.accept());
await page.clock.install({ time: new Date("2026-11-10T12:00:00+07:00") });
await page.goto("http://localhost:5173");
await page.getByRole("button", { name: "Tập trung", exact: true }).click();
await page
  .getByRole("button", { name: "Bắt đầu tập trung", exact: true })
  .click();
await page.getByRole("button", { name: "Tổng quan", exact: true }).click();
await page.clock.fastForward(25 * 60 * 1000 + 1000);
let sessions = await page.evaluate(
  () => JSON.parse(localStorage.getItem("focus-routine:v1")).sessions,
);
assert.equal(sessions.length, 1);
assert.equal(Math.round(sessions[0].minutes), 25);
await page.reload();
sessions = await page.evaluate(
  () => JSON.parse(localStorage.getItem("focus-routine:v1")).sessions,
);
assert.equal(sessions.length, 1);
await page
  .getByRole("button", { name: "Thêm hoạt động", exact: true })
  .first()
  .click();
await page.getByLabel("Tên hoạt động").fill("Mobile deletion");
await page.getByLabel("Bắt đầu", { exact: true }).fill("05:00");
await page.getByLabel("Kết thúc", { exact: true }).fill("05:10");
await page.getByRole("button", { name: "Lưu hoạt động", exact: true }).click();
await page
  .locator(".timeline-row")
  .filter({ hasText: "Mobile deletion" })
  .getByTitle("Chỉnh sửa", { exact: true })
  .click();
await page.getByRole("button", { name: "Xóa", exact: true }).click();
await page.getByRole("button", { name: "Xóa hoạt động", exact: true }).click();
assert.equal(
  await page.getByText("Mobile deletion", { exact: true }).count(),
  0,
);
await page
  .getByRole("button", { name: "Cài đặt", exact: true })
  .first()
  .click();
const before = await page.evaluate(() =>
  localStorage.getItem("focus-routine:v1"),
);
await page
  .locator("input[type=file]")
  .setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
assert.equal(
  await page.evaluate(() => localStorage.getItem("focus-routine:v1")),
  before,
);
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Xuất JSON", exact: true }).click();
const download = await downloadPromise;
assert.ok(download.suggestedFilename().endsWith(".json"));
await page
  .getByRole("button", { name: "Đổi giao diện sáng tối", exact: true })
  .click();
assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
await page.reload();
assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
await page.getByRole("button", { name: "Lịch trình", exact: true }).click();
assert.ok(
  await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  ),
);
console.log(
  "Edge smoke passed: background Focus completion saved once, reload idempotency, mobile deletion, invalid import rejected, export, dark persistence, week mobile overflow.",
);
await browser.close();
