# GameZ Dual Frontend Platform - Product Requirement Document (PRD)

## 1. Product Overview & Architecture
The **GameZ** platform features a dual React-based frontend architecture serving two distinct user experiences:
1. **Customer Booking Website**: Served at `http://127.0.0.1:8090/` (Customer-facing Single Page Application for discovering gaming stations, calculating rates, and placing 5-minute booking holds).
2. **Admin Lounge Management Portal**: Served at `http://127.0.0.1:8090/admin/` (Staff-facing Single Page Application for live station monitoring, walk-in registration, payment confirmation, customer VIP/ban controls, and inventory management).

---

## 2. Customer Website UI Requirements (`Frontend/Website`)

### 2.1 Landing Page (`/`)
- **Header & Navigation Bar**: Branding logo ("GameZ"), navigation links (Home, Stations, Pricing, Location), and primary CTA button ("Book Now").
- **Hero Banner**: High-impact gaming lounge showcase with quick navigation to `/book`.
- **Station Showcase Cards**: Interactive visual cards for each gaming category:
  - PlayStation 5 Lounge (₹200/hr)
  - Snooker Tables (₹300/hr)
  - Pool Tables (₹250/hr)
  - Carrom Boards (₹100/hr)
- **Live Hourly Pricing Calculator**: Interactive calculator where users pick a station and duration to see real-time price totals.
- **Footer**: Venue address (Mangaluru), opening hours, contact details, and social media links.

### 2.2 Interactive Booking Journey (`/book`)
- **Step 1: Station Selector**: Dropdown / Grid cards to select gaming station (PS5, Snooker, Pool, Carrom).
- **Step 2: Date & Time Picker**: Interactive calendar and slot selector grid.
- **Step 3: Duration & Players**: Slider / Counter for booking duration (1-4 hours) and player count (1-6 players).
- **Step 4: Live Price Summary**: Real-time summary card updating `Total = Hourly Rate × Duration`.
- **Step 5: Customer Details Form**: Form inputs for `Name`, `Email Address`, and `Phone Number` with client-side validation.
- **Step 6: Submit Booking Hold**: Primary CTA button ("Reserve Station") submitting a temporary hold request.
- **Step 7: Hold Confirmation & Expiry Screen**: Displays booking confirmation ID, booking summary details, and a 5-minute live countdown timer (`hold_token` expiry).

---

## 3. Admin Management Portal UI Requirements (`Frontend/Admin`)

### 3.1 Staff Authentication Page (`/admin/auth`)
- **Login Card**: Clean login modal requesting `Staff Email` and `Password` (`test@admin.com` / `admin@1234`).
- **Validation Alerts**: Toast notifications for invalid password attempts or empty fields.
- **Session Persistence**: Auto-redirect to `/admin/dashboard` upon successful login.

### 3.2 Live Occupancy Dashboard (`/admin/dashboard`)
- **Key Metric Cards**: Top summary row displaying:
  - Total Daily Revenue (₹)
  - Active Bookings Count
  - Total Stations Occupancy Rate (%)
- **Live Station Occupancy Grid**: Real-time visual grid of all lounge stations displaying color-coded status badges:
  - 🟢 **Available** (Ready for booking)
  - 🔵 **Active** (Currently in a gaming session)
  - 🟡 **Maintenance** (Station under repair/cleaning)
  - 🔴 **Offline** (Station disabled)
- **Quick Action Shortcuts**: Buttons for "New Walk-in Booking", "Add Station", and "Quick Checkout".

### 3.3 Bookings Roster & Actions (`/admin/bookings`)
- **Bookings Data Table**: Complete tabular view listing Customer Name, Station, Time Slot, Duration, Total Price, and Status.
- **Status Filter Tabs**: Filter table by status (`All`, `Pending`, `Confirmed`, `Completed`, `Cancelled`).
- **Confirm Booking Button**: Primary staff action button on `pending` rows triggering confirmation (`POST /api/custom/bookings/{id}/confirm`). Updates status badge to `Confirmed`.
- **Complete / Checkout Button**: Secondary action button to conclude a session and update status to `Completed`.

### 3.4 Create Walk-In Booking (`/admin/bookings/new`)
- **Manual Booking Form**: Form for staff to log walk-in customers on the spot (Station Dropdown, Start/End Time, Customer Name, Contact Number, Payment Amount).
- **Instant Confirmation**: Submitting automatically marks the booking as `Confirmed`.

### 3.5 Gaming Stations Inventory (`/admin/stations`)
- **Stations Management Grid**: Grid view of all gaming stations with edit & delete controls.
- **Add Station Modal**: Form modal to create a new station (Station Number/Name, Category Type, Price per hour, Max players).
- **Edit Station Modal**: Form modal to update station pricing, amenities, and capacity.
- **Maintenance Toggle**: Switch to toggle station status between `Available` and `Maintenance`. Triggers a warning modal if future bookings exist.
- **Delete Station Action**: Trash icon button to delete a station. Triggers safety alert modal if linked to active bookings.

### 3.6 Customer Directory (`/admin/customers`)
- **Customer Roster Table**: Displays customer list, email, total bookings count, and customer status badge.
- **VIP Status Toggle**: Action button to elevate customer status from `Regular` to `VIP`.
- **Customer Ban Action**: Action button to set status to `Banned` with confirmation modal.

---

## 4. Visual E2E Test Scenarios for TestSprite (Frontend URLs)

### Scenario A: Customer Booking Flow (`http://127.0.0.1:8090/book`)
1. Open `http://127.0.0.1:8090/book`.
2. Select Station `PS5-01`.
3. Choose Date, set duration to `2 Hours`, and set players to `2`.
4. Verify the Live Price Summary displays `₹400`.
5. Enter Name `Test User`, Email `testuser@example.com`, Phone `9876543210`.
6. Click **Reserve Station** ──▶ Assert confirmation screen renders with 5-minute hold timer.

### Scenario B: Staff Login & Booking Confirmation (`http://127.0.0.1:8090/admin/`)
1. Open `http://127.0.0.1:8090/admin/`.
2. Enter `test@admin.com` and `admin@1234`, then click **Login**.
3. Verify Dashboard metric cards and live station grid render cleanly.
4. Navigate to **Bookings** sidebar tab.
5. Locate the pending booking from Scenario A and click **Confirm Booking**.
6. Assert status badge changes to `Confirmed`.

### Scenario C: Station Inventory & Maintenance Safety (`http://127.0.0.1:8090/admin/stations`)
1. In Admin Portal, click **Stations** in navigation.
2. Click **Add Station** button ──▶ Fill out new station `VR-01`, Rate `₹350/hr` ──▶ Click **Save**.
3. Verify new station card appears in the grid.
4. Click **Delete** icon on `VR-01` ──▶ Confirm deletion.
