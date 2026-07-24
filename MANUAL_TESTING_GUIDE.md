# 🧪 GameZ Complete Manual Testing Master Guide

The production single-binary server (`gamez-server.exe`) is **LIVE and running** on your local machine at `http://127.0.0.1:8090`.

Follow this step-by-step master guide to manually test every feature, page, form, modal, and edge-case guard in both the **Customer Website** and the **Admin Portal**!

---

## 🌐 SECTION 1: CUSTOMER WEBSITE TESTING (`http://127.0.0.1:8090/`)

### Test 1.1: Landing Page & Static Asset Check
1. Open Chrome/Edge and visit: **`http://127.0.0.1:8090/`**
2. **What to Verify**:
   - Navigation Bar renders logo ("GameZ") and links cleanly.
   - Hero banner and station category showcase cards render (PS5 Lounge, Snooker, Pool, Carrom).
   - Hourly rates are displayed (PS5: ₹200/hr, Snooker: ₹300/hr, etc.).
   - Click **"Book Now"** button ──▶ Verify it smoothly navigates to `http://127.0.0.1:8090/book`.

---

### Test 1.2: Customer Self-Service Booking Hold Flow
1. Open **`http://127.0.0.1:8090/book`**
2. **Step 1 (Station & Category)**: Select `PlayStation 5 Lounge` and pick Station `PS5-01`.
3. **Step 2 (Date & Time)**: Select today's date and a future time slot (e.g. `06:00 PM - 08:00 PM`).
4. **Step 3 (Duration & Players)**: Set duration to **2 Hours** and players to **2**.
5. **Step 4 (Price Check)**: Verify the summary card automatically displays `Total: ₹400` (₹200/hr × 2 hrs).
6. **Step 5 (Guest Details)**: Enter:
   - Name: `Manual Tester`
   - Email: `manualtest@example.com`
   - Phone: `9876543210`
7. **Step 6 (Submit)**: Click **"Reserve Station"**.
8. **What to Verify**:
   - Confirmation screen appears showing your Booking ID.
   - A **5-minute live countdown timer** appears (showing temporary hold expiry).

---

### Test 1.3: Atomic Double-Booking / Overlap Block (Conflict Test)
1. Open a **New Incognito Window** in your browser.
2. Go to **`http://127.0.0.1:8090/book`**
3. Select the **SAME station (`PS5-01`)** for the **SAME time slot (`06:00 PM - 08:00 PM`)**.
4. Enter name `Hacker User` and click **"Reserve Station"**.
5. **What to Verify**:
   - The system **REJECTS** the booking with an error message: *"This station is already booked during the requested time."*
   - Double-booking is 100% prevented!

---

## 🔐 SECTION 2: ADMIN PORTAL TESTING (`http://127.0.0.1:8090/admin/`)

### Test 2.1: Staff Login & Security Guard
1. Open **`http://127.0.0.1:8090/admin/`** (redirects to `/admin/auth`).
2. **Negative Test**: Enter `test@admin.com` with wrong password `wrongpass` ──▶ Verify error toast appears (*"Invalid credentials"*).
3. **Positive Test**: Enter valid credentials:
   - **Email**: `test@admin.com`
   - **Password**: `admin@1234`
4. Click **Login** ──▶ Verify you are logged in and redirected to the **Dashboard**.

---

### Test 2.2: Live Occupancy Dashboard (`/admin/dashboard`)
1. On the Dashboard page, inspect top metric cards:
   - Revenue metric card
   - Active Bookings count
   - Total Stations count
2. **Station Occupancy Grid**:
   - Locate `PS5-01` ──▶ Verify it shows **Blue/Active** or **Pending** badge corresponding to your booking hold!

---

### Test 2.3: Booking Management & Staff Confirmation (`/admin/bookings`)
1. In the left sidebar, click **Bookings**.
2. Click the **"Pending"** tab.
3. Locate the pending booking created by `Manual Tester` (from Test 1.2).
4. Click the green **"Confirm Booking"** button.
5. **What to Verify**:
   - Booking status badge instantly changes from `Pending` to **`Confirmed`**!
   - (Behind the scenes, calls `POST /api/custom/bookings/{id}/confirm`).

---

### Test 2.4: Walk-in Manual Booking Creator (`/admin/bookings/new` or Modal)
1. On the Bookings page, click **"+ New Walk-in Booking"**.
2. Select Station `Snooker Table 1`, set start/end time, enter Customer Name `Walkin Guest`, Phone `9123456789`.
3. Click **"Save Booking"**.
4. **What to Verify**:
   - Walk-in booking is created instantly with **`Confirmed`** status.

---

### Test 2.5: Gaming Stations & Maintenance Safety Lock (`/admin/stations`)
1. Click **Stations** in the left sidebar.
2. Locate `PS5-01` (which currently has your confirmed booking).
3. Try changing `PS5-01` status to **"Maintenance"**.
4. **What to Verify**:
   - The backend safety hook **BLOCKS** the status change and displays error toast: *"Cannot put station into maintenance. There are 1 future confirmed bookings."*

---

### Test 2.6: Station Deletion Lock Test
1. Try clicking the **Delete (Trash icon)** button on `PS5-01`.
2. Confirm the deletion dialog.
3. **What to Verify**:
   - The backend safety hook **BLOCKS** deletion: *"Cannot delete this station. It has active bookings."*

---

### Test 2.7: Add & Delete New Station
1. On the Stations page, click **"+ Add Station"**.
2. Fill out:
   - Station Name/Number: `PS5-06`
   - Category: `PlayStation 5 Lounge`
   - Price Per Hour: `₹250`
   - Max Players: `4`
3. Click **Save** ──▶ Verify `PS5-06` appears in grid.
4. Click **Delete** on `PS5-06` ──▶ Verify deletion succeeds for stations without active bookings.

---

### Test 2.8: Customer VIP Upgrade & Ban Test (`/admin/customers`)
1. Click **Customers** in the left sidebar.
2. Locate customer `luke@gmail.com`.
3. Click **Status Dropdown / Toggle** ──▶ Upgrade status to **VIP**. Verify badge turns gold/VIP.
4. Locate customer `tony@gmail.com` ──▶ Set status to **Banned**.
5. **Login Block Verification**:
   - Open a new tab to `http://127.0.0.1:8090/` and attempt logging in as `tony@gmail.com` / `password123`.
   - Verify login is **rejected** because user is banned!

---

## 🔒 SECTION 3: DEVTOOLS SOURCE CODE PROTECTION AUDIT

1. In Chrome/Edge, open **`http://127.0.0.1:8090/admin/`**
2. Press **`F12`** (or Right Click ──▶ Inspect).
3. Click the **Sources** tab in DevTools.
4. Expand the file tree under `127.0.0.1:8090` ──▶ `admin/assets/`.
5. **What to Verify**:
   - You only see minified `index-XXXXX.js` and `index-XXXXX.css`.
   - **NO `.tsx` or `.ts` original source files exist.**
   - **NO `.map` sourcemap files exist.**
   - Your original TypeScript React code remains 100% hidden and protected!
