# EMI Tracker — Feature Task List

Track all planned features here. Complete one task at a time.
When a task is done, mark it `[x]` and add a short note under **Done** with what was built.

---

## Status Legend
- `[ ]` — Not started
- `[~]` — In progress
- `[x]` — Completed

---

## 📊 Analytics & Reporting

- [x] **T01 — Monthly Report Page**
  Charts showing how much paid per month, per shop breakdown, outstanding balances over time.
  _Suggested: bar chart by month, pie chart by shop_

- [ ] **T02 — Export to PDF / Excel**
  Download payment history or full EMI summary as a PDF or Excel file.

- [x] **T03 — Spending Trends Chart**
  Line chart on dashboard showing EMI spend trend month-over-month.

---

## 🔔 Notifications & Reminders

- [ ] **T04 — Email Reminders**
  Automatic email N days before a payment is due. Configurable from profile settings.

- [x] **T05 — In-App Notification Center**
  Bell icon in header showing overdue and upcoming payment alerts.

---

## 💰 Payment Management

- [x] **T06 — Bulk Payment**
  Pay multiple EMIs at once from a single screen (useful at month-end).

- [x] **T07 — Payment Receipt (Printable)**
  Each recorded payment gets a printable/downloadable receipt page.

- [x] **T08 — Edit / Delete Payment**
  Allow correcting a mistakenly recorded payment entry.

---

## 🏪 Shop & Product Enhancements

- [ ] **T09 — Document Upload per EMI**
  Attach scanned agreement, warranty card, or invoice to an EMI order.

- [ ] **T10 — Shop Notes / Rating**
  Add personal notes and a star rating to each shop.

---

## 📱 UX / Convenience

- [x] **T11 — Dark Mode Toggle**
  Light/dark mode switch accessible from profile or header.

- [x] **T12 — Quick Pay from Dashboard**
  Record a payment directly from the dashboard card without going to the detail page.

- [x] **T13 — Calendar View**
  Monthly calendar showing which EMIs are due on which days.

- [x] **T14 — Global Search**
  Search bar that searches across all shops, products, and payments at once.

- [x] **T15 — EMI Calculator (Standalone)**
  A tool page: enter total price, down payment, months → see monthly amount instantly.

---

## 📈 Smart Features

- [ ] **T16 — Early Payoff Calculator**
  Shows how much you save if you pay off the remaining balance today.

- [x] **T17 — Total Debt Overview**
  One-screen summary of all active EMIs combined: total owed, months left, projected payoff date.

- [x] **T18 — Overdue Summary Page**
  Dedicated page listing all overdue EMIs sorted by how late they are.

---

## 🔒 Account & Security

- [ ] **T19 — Session Management**
  View and revoke active login sessions from profile settings.

- [ ] **T20 — Data Export (My Data)**
  Download all personal data (orders, payments, shops) as JSON or CSV.

---

## 📷 Product Documentation

- [ ] **T21 — Product Photo Upload**
  Attach photos of the purchased product, box, or warranty card to an EMI order. Viewable in the detail page.

- [ ] **T22 — Serial Number / IMEI Tracker**
  Save serial number, IMEI, or barcode of the product per EMI order. Useful for insurance or warranty claims.

---

## 🔐 Security & Trust

- [ ] **T23 — PIN Lock**
  4-digit PIN to open the app (protects sensitive financial data from others who have phone access).

- [ ] **T24 — Activity Log**
  History of all important actions: login, payment recorded, order created, profile changed — with timestamp.

- [ ] **T25 — Auto Logout**
  Automatically log out after a configurable period of inactivity (e.g. 15 min, 30 min, 1 hour).

---

## 🌐 Integration Ideas

- [x] **T26 — bKash / Nagad SMS Parser**
  Paste a payment SMS and the app auto-fills amount and transaction ID in the payment form.

- [ ] **T27 — WhatsApp Reminder**
  Send a due date reminder message via WhatsApp (wa.me link with pre-filled message, or API integration).

- [ ] **T28 — Google Calendar Sync**
  Export all EMI due dates as a .ics file so they appear in Google Calendar or any calendar app.

---

## ✅ Completed Tasks

- [x] **T07 — Payment Receipt (Printable)** _(2026-06-15)_
  - **New page** `pages/receipt.tsx` — route `/emi-orders/:id/payments/:paymentId/receipt`.
  - Loads order via `useGetEmiOrder`; finds the specific payment by `paymentId` from the payments array.
  - **Receipt layout**: teal branded header with receipt number (`orderId-paymentId`), "PAID" green badge, product/shop details, payment fields (method, account/TxnID/bank based on type), amount highlight block with total paid + remaining, 3-col summary bar (purchase date, down payment, monthly amount).
  - **Print support**: `window.print()` button; `@media print` CSS injected via `<style>` tag hides nav/back/print buttons and removes card border for clean paper output.
  - **Detail page**: Receipt 🧾 icon button added to each payment history row (appears on hover), links to the receipt page.
  - **Router**: `/emi-orders/:id/payments/:paymentId/receipt` added as a protected route.

- [x] **T26 — bKash / Nagad SMS Parser** _(2026-06-15)_
  - **Pure frontend** — no backend changes. Regex parser in `lib/smsParser.ts`.
  - **Detects**: bKash / Nagad / Rocket (from SMS text); amount (`Tk`, `Taka`, `৳`); transaction ID (`TrxID`, `Ref`, or `AB1234...` patterns); phone number (`01[3-9]XXXXXXXX`).
  - **Reusable component** `components/SmsPastePanel.tsx` — collapsible "SMS থেকে auto-fill করুন" panel; paste SMS → shows detected fields as badges → "Form-এ apply করুন" button fills the form.
  - **Added to QuickPayDialog** (from due-this-month / overdue screens) and **PaymentFormFields in detail.tsx** (EMI order detail payment section).
  - Apply only patches detected fields; undetected fields remain unchanged.

- [x] **T06 — Bulk Payment** _(2026-06-15)_
  - **No new backend needed** — uses existing `POST /api/emi-orders/:id/payments` sequentially for each selected order.
  - **New page** `pages/bulk-pay.tsx` — lists all active (non-completed) EMI orders sorted overdue-first; each row has a checkbox, editable amount field pre-filled with `nextMonthlyAmount`, and per-row payment method selector.
  - **Global controls** — "Select All / Deselect All" toggle; global payment date picker; global payment method selector that applies to all rows at once.
  - **Sticky footer** — summary bar showing selected count, total amount, and "Pay N EMI" button; appears only when at least one order is selected.
  - **Confirm dialog** — lists each selected order with amount; shows total; requires explicit confirmation before submitting.
  - **Submit flow** — payments sent sequentially; success/failure counts toasted; query cache invalidated for `listEmiOrders`, `dashboardSummary`, and `dueThisMonth` on completion.
  - **Sidebar** — "Bulk Payment" nav link added with CreditCard icon.
  - **Router** — `/bulk-pay` route added as a protected route.

- [x] **T14 — Global Search** _(2026-06-15)_
  - **No new backend needed** — fetches `GET /api/emi-orders` and `GET /api/shops` on page load; all filtering done client-side in real-time.
  - **New page** `pages/search.tsx` — large autofocus search input; results split into two sections (EMI Orders, Shops) with match count; matched text highlighted inline; clicking an EMI order goes to its detail page; Esc key navigates back to dashboard.
  - **EMI Orders results** — shows product name, shop name, model number (when present), remaining amount, and status badge (Active / Overdue / Completed).
  - **Shops results** — shows shop name and description.
  - **Layout** — Search icon button added to the header (beside notification bell); pressing `/` from any page (outside an input) navigates to `/search` via keyboard shortcut.
  - **Router** — `/search` route added as a protected route.

- [x] **T01 — Monthly Report Page** _(2026-06-15)_
  - **No new backend needed** — uses existing `GET /api/dashboard/monthly-spending` and `GET /api/dashboard/shop-stats` endpoints.
  - **New page** `pages/reports.tsx` — 3-stat summary cards (total paid all time, total outstanding, active EMIs), bar chart of monthly payments (last N months, reversed chronologically), pie chart of total paid broken down by shop.
  - **Charts** — Recharts `BarChart` + `PieChart` with custom Bengali-currency tooltips; Y-axis auto-formats to K/L notation.
  - **Sidebar** — "Reports" nav link added.
  - **Router** — `/reports` route added as a protected route.

- [x] **T03 — Spending Trends Chart** _(2026-06-15)_
  - **No new backend needed** — uses existing `GET /api/dashboard/monthly-spending`.
  - **New component** `components/SpendingTrendChart.tsx` — Recharts `AreaChart` with gradient fill, custom tooltip, Y-axis formatted as K/L; shows last N months of EMI spend.
  - **Dashboard** — SpendingTrendChart embedded on the dashboard page below the summary cards.

- [x] **T05 — In-App Notification Center** _(2026-06-15)_
  - **No new backend needed** — uses `GET /api/dashboard/due-this-month`.
  - **New component** `components/NotificationBell.tsx` — bell icon in the header; red badge shows overdue count, yellow badge shows upcoming-this-month count; clicking opens a Popover listing each overdue/upcoming EMI with days-until label and "Pay Now" link.
  - **Layout** — `NotificationBell` added to the top-right header area.

- [x] **T11 — Dark Mode Toggle** _(2026-06-15)_
  - **New hook** `hooks/useTheme.ts` — reads initial theme from `user.themePreference` (server), persists choice to `localStorage`, and applies/removes the `dark` class on `<html>`.
  - **Layout** — Sun/Moon icon button in the header calls `toggleTheme()`; tooltip switches label between "Switch to light mode" and "Switch to dark mode".
  - **No backend changes needed** — theme preference stored client-side in localStorage; server preference used only as the initial value on first load.

- [x] **T12 — Quick Pay from Dashboard** _(2026-06-15)_
  - **No new backend needed** — uses existing `POST /api/emi-orders/:id/payments`.
  - **New component** `components/QuickPayDialog.tsx` — dialog with amount, payment date, payment method (Cash/Bank Transfer/bKash/Nagad/Rocket), optional bank name/account/transaction ID/notes fields; pre-fills `nextMonthlyAmount` as the default amount.
  - **Dashboard** — "Pay Now" button on each due-this-month order card; clicking opens the QuickPayDialog pre-loaded with that order. On success, invalidates `listEmiOrders`, `dashboardSummary`, and `dueThisMonth` query keys.

- [x] **T13 — Calendar View** _(2026-06-15)_
  - **No new backend needed** — uses `GET /api/emi-orders`.
  - **New page** `pages/calendar.tsx` — 7-column monthly calendar grid; due dates shown as colored dots (red = overdue, primary = due); clicking a day opens a detail panel listing all EMIs due that day with amount and "Pay Now" button.
  - **Due date calculation** — computed from `purchaseDate + n months` (where n = installment number for the viewed month) using `dueDayOfMonth` or purchase day as the anchor; correctly shows dues for any past/future month, not just `nextDueDate`.
  - **Sidebar** — "Calendar" nav link added.
  - **Router** — `/calendar` route added as a protected route.

- [x] **T15 — EMI Calculator (Standalone)** _(2026-06-15)_
  - **Pure frontend, no backend** — all calculations done client-side.
  - **New page** `pages/calculator.tsx` — inputs for total price, discount, down payment, and months (with slider); live output shows monthly installment, total EMI amount, total payment, and effective interest rate.
  - **CTA** — "Create EMI Order" button links to `/emi-orders/new` pre-filling nothing (user can copy values manually).
  - **Sidebar** — "Calculator" nav link added.
  - **Router** — `/calculator` route added as a protected route.

- [x] **T17 — Total Debt Overview** _(2026-06-15)_
  - **No new backend needed** — uses `GET /api/emi-orders` and `GET /api/dashboard/summary`.
  - **New page** `pages/debt-overview.tsx` — summary banner (total outstanding, total active EMIs, projected last payoff date); lists all active EMI orders with per-card progress bar, months left, remaining amount, and next due date.
  - **Sorting** — three sort modes: Most Remaining (by outstanding amount), Finishing Soon (by months left ascending), Most Paid (by installments paid descending).
  - **Sidebar** — "Debt Overview" nav link added.
  - **Router** — `/debt-overview` route added as a protected route.

- [x] **T18 — Overdue Summary Page** _(2026-06-15)_
  - **No new backend needed** — filters `GET /api/emi-orders?status=active` on frontend for `nextDueDate < today`.
  - **New page** `pages/overdue.tsx` — lists overdue EMIs sorted by days overdue (most late first), with 3-stat summary banner (count, this month's installments due, total remaining), per-card progress bar, and "Pay Now" button linking to detail page. Green "All clear!" empty state when none overdue.
  - **Sidebar** — "Overdue" nav link added with red count badge (fetches `dashboard/summary`); badge only appears when `overdueOrders > 0`.
  - **Dashboard** — Overdue stat card is now clickable (wrapped in `<Link href="/overdue">`); shows "View all →" when there are overdue EMIs.
  - **Router** — `/overdue` route added as a protected route.

- [x] **T08 — Edit / Delete Payment** _(2026-06-15)_
  - **Backend:** Added `PATCH /api/payments/:paymentId` route for editing any field of a payment. Fixed `DELETE /api/payments/:paymentId` to revert order status from `completed` → `active` when total paid drops below threshold after deletion. Both routes recalculate and auto-update order completion status.
  - **API Client:** Added `useUpdateEmiPayment` hook (manually) to `lib/api-client-react/src/generated/api.ts` following the same pattern as `useDeleteEmiPayment`.
  - **Frontend:** Refactored `detail.tsx` — extracted shared `PaymentFormFields` component used by both Add and Edit dialogs. Each payment row now shows ✏️ Edit and 🗑️ Delete buttons on hover. Edit opens a pre-filled dialog; delete prompts confirmation before removing. Down payment row has no edit/delete controls.

---

_Last updated: 2026-06-15_
