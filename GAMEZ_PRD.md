# GameZ Gaming Arena Platform - Product Requirement Document (PRD)

## 1. Executive Summary & Overview
**GameZ** is an end-to-end gaming lounge management system designed for high-throughput gaming cafes (offering PlayStation 5 lounges, Snooker tables, Pool tables, and Carrom boards). The platform consists of two primary interfaces served from a single, self-contained Go executable (`gamez-server.exe`):
1. **Customer Booking Website**: Served at `http://127.0.0.1:8090/` (Customer-facing SPA for station discovery and self-service booking holds).
2. **Admin Management Portal**: Served at `http://127.0.0.1:8090/admin/` (Staff-facing SPA for station monitoring, walk-in management, payment confirmations, and customer access control).

---

## 2. User Roles & Access Hierarchy

| Role | Access Level | Key Responsibilities |
| :--- | :--- | :--- |
| **Guest Customer** | Public (`/`, `/book`) | Discover stations, view hourly rates, calculate pricing, and lock temporary 5-minute booking holds. |
| **Lounge Staff / Cashier** | Authenticated (`/admin/`) | Confirm pending bookings (`POST /api/custom/bookings/{id}/confirm`), log manual walk-ins, and process checkouts. |
| **Store Manager / Superadmin** | Full Superuser (`/admin/`, `/_/`) | Manage station inventory, configure hourly pricing, set maintenance modes, manage staff accounts, and ban users. |

---

## 3. Key Functional Specifications & User Flows

### 3.1 Customer Booking Journey (`/book`)
- **Station Selection**: Filter available gaming stations by category (PS5, Snooker, Pool, Carrom).
- **Interactive Duration & Slot Picker**: Select start time, end time, and number of players.
- **Server-Side Pricing Engine**: Automatically calculates `total_price = duration_hours * station_price_per_hour`.
- **Temporary Hold Engine**:
  - Upon submission, creates a booking with `status: "pending"`.
  - Generates a secure 32-character `hold_token` and a strict 5-minute `expires_at` countdown.
- **Atomic TOCTOU Overlap Guard**:
  - Uses an in-memory Go concurrency mutex to serialize booking requests.
  - Rejects overlapping requests for the same station/time slot with `400 Bad Request`.

### 3.2 Staff & Admin Operations (`/admin/`)
- **Staff Authentication (`/admin/auth`)**:
  - Secure login with staff email/password (`test@admin.com` / `admin@1234`).
  - Session token storage & persistent JWT state.
- **Live Occupancy Dashboard (`/admin/dashboard`)**:
  - Real-time station status grid (Available, Active, Maintenance, Offline).
  - Daily revenue metrics and total booking counters.
- **Booking Confirmation & Verification (`/admin/bookings`)**:
  - Displays all pending, confirmed, completed, and cancelled bookings.
  - **Staff Confirmation Guard**: Only authenticated staff can confirm pending bookings via `POST /api/custom/bookings/{id}/confirm`. Guests attempting self-confirmation receive `403 Forbidden`.
- **Manual Walk-In Creator (`/admin/bookings/new`)**:
  - Allows staff to override guest holds and instantly create confirmed walk-in bookings.

### 3.3 Inventory & Customer Protection Hooks
- **Station Maintenance Lock**: Prevents staff from switching a station to `maintenance` mode if active or future confirmed bookings exist (`400 Bad Request`).
- **Station Deletion Lock**: Hard-blocks deletion of any station linked to active bookings.
- **Customer Status Control (`/admin/customers`)**:
  - Upgrade regular customers to `VIP` status.
  - Set status to `banned`, immediately blocking user authentication attempts.

---

## 4. Technical Architecture & Security Standards

- **Single-Binary Delivery**: Single executable (`gamez-server.exe`) containing PocketBase backend and embedded Admin UI (`go:embed ui/admin/*`).
- **Static Website Delivery**: Serves static web build from `./pb_public`.
- **Production Obfuscation**:
  - Vite `sourcemap: false` disabled across all builds. Zero `.map` files exposed.
  - Stripped `console.log` and `console.debug` chatter while keeping `console.error` for diagnostics.
- **Local & Offline Execution**: Configured for local laptop execution (`127.0.0.1:8090`).

---

## 5. End-to-End Test Scenarios for TestSprite

### Scenario 1: Customer Booking & Overlap Conflict
1. Navigate to `http://127.0.0.1:8090/book`.
2. Select Station `PS5-01` for `10:00 AM - 11:00 AM`.
3. Submit guest details ──▶ Verify booking hold created with `status: pending` and 5-minute timer.
4. Attempt a second booking for `PS5-01` at `10:30 AM - 11:30 AM` ──▶ Verify rejection with `400 Bad Request`.

### Scenario 2: Staff Login & Confirmation Flow
1. Navigate to `http://127.0.0.1:8090/admin/`.
2. Login with `test@admin.com` / `admin@1234`.
3. Locate the pending booking from Scenario 1.
4. Click **Confirm Booking** ──▶ Verify API call `POST /api/custom/bookings/{id}/confirm` returns `200 OK` and status updates to `confirmed`.

### Scenario 3: Inventory Maintenance Safety Test
1. While Station `PS5-01` has a confirmed booking, open `http://127.0.0.1:8090/admin/stations`.
2. Attempt to update `PS5-01` status to `maintenance` ──▶ Verify operation is rejected with message: `Cannot put station into maintenance. There are future confirmed bookings.`

### Scenario 4: User Ban & Access Guard
1. In Admin Portal (`/admin/customers`), update a user status to `banned`.
2. Attempt logging in as that banned user ──▶ Verify access is denied.
