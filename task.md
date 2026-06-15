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

- [ ] **T01 — Monthly Report Page**
  Charts showing how much paid per month, per shop breakdown, outstanding balances over time.
  _Suggested: bar chart by month, pie chart by shop_

- [ ] **T02 — Export to PDF / Excel**
  Download payment history or full EMI summary as a PDF or Excel file.

- [ ] **T03 — Spending Trends Chart**
  Line chart on dashboard showing EMI spend trend month-over-month.

---

## 🔔 Notifications & Reminders

- [ ] **T04 — Email Reminders**
  Automatic email N days before a payment is due. Configurable from profile settings.

- [ ] **T05 — In-App Notification Center**
  Bell icon in header showing overdue and upcoming payment alerts.

---

## 💰 Payment Management

- [ ] **T06 — Bulk Payment**
  Pay multiple EMIs at once from a single screen (useful at month-end).

- [ ] **T07 — Payment Receipt (Printable)**
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

- [ ] **T11 — Dark Mode Toggle**
  Light/dark mode switch accessible from profile or header.

- [ ] **T12 — Quick Pay from Dashboard**
  Record a payment directly from the dashboard card without going to the detail page.

- [ ] **T13 — Calendar View**
  Monthly calendar showing which EMIs are due on which days.

- [ ] **T14 — Global Search**
  Search bar that searches across all shops, products, and payments at once.

- [ ] **T15 — EMI Calculator (Standalone)**
  A tool page: enter total price, down payment, months → see monthly amount instantly.

---

## 📈 Smart Features

- [ ] **T16 — Early Payoff Calculator**
  Shows how much you save if you pay off the remaining balance today.

- [ ] **T17 — Total Debt Overview**
  One-screen summary of all active EMIs combined: total owed, months left, projected payoff date.

- [ ] **T18 — Overdue Summary Page**
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

- [ ] **T26 — bKash / Nagad SMS Parser**
  Paste a payment SMS and the app auto-fills amount and transaction ID in the payment form.

- [ ] **T27 — WhatsApp Reminder**
  Send a due date reminder message via WhatsApp (wa.me link with pre-filled message, or API integration).

- [ ] **T28 — Google Calendar Sync**
  Export all EMI due dates as a .ics file so they appear in Google Calendar or any calendar app.

---

## ✅ Completed Tasks

- [x] **T08 — Edit / Delete Payment** _(2026-06-15)_
  - **Backend:** Added `PATCH /api/payments/:paymentId` route for editing any field of a payment. Fixed `DELETE /api/payments/:paymentId` to revert order status from `completed` → `active` when total paid drops below threshold after deletion. Both routes recalculate and auto-update order completion status.
  - **API Client:** Added `useUpdateEmiPayment` hook (manually) to `lib/api-client-react/src/generated/api.ts` following the same pattern as `useDeleteEmiPayment`.
  - **Frontend:** Refactored `detail.tsx` — extracted shared `PaymentFormFields` component used by both Add and Edit dialogs. Each payment row now shows ✏️ Edit and 🗑️ Delete buttons on hover. Edit opens a pre-filled dialog; delete prompts confirmation before removing. Down payment row has no edit/delete controls.

---

_Last updated: 2026-06-15_
