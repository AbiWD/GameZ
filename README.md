# 🎮 GameZ Platform Monorepo

An all-in-one gaming cafe management & online reservation platform built with **Go (PocketBase)** and **React (TypeScript & Vite)**. Engineered for single-binary distribution with zero external database dependencies.

---

## 🏗️ System Architecture & Route Topology

The system compiles into a single executable serving both frontends and the backend REST API:

- `/` — **Customer Website** (Served from `Backend/pb_public/`)
- `/admin/` — **Admin & Staff Roster Portal** (Served from `Backend/ui/admin/`)
- `/_/` — **Native PocketBase Superuser Dashboard**
- `/api/` — **Backend REST API Endpoints**

### ⚠️ Single-Instance Concurrency Constraint
> [!IMPORTANT]
> **Single-Instance Deployment Required:**
> The booking creation engine uses an in-memory `sync.Mutex` (`bookingMutex`) in `Backend/hooks/bookings.go` to guarantee TOCTOU-safe transaction isolation for booking slots. 
> 
> Because this lock is in-memory:
> - The backend **must be deployed as a single application process**.
> - Horizontal scaling across multiple load-balanced process instances is **not supported** without replacing the internal Go mutex with a distributed lock manager (e.g., Redis `redlock` or Postgres advisory locks).
> - Vertical scaling (increasing CPU/RAM on the instance) is the recommended path for increased capacity.

---

## 🛠️ Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v18 or higher)
- **Go** (v1.22 or higher)
- **Git**

---

## 🚀 Quick Start (Development Mode)

### 1. Install Dependencies
Run the command below from the repository root to install dependencies for the root, Admin frontend, and Website frontend:
```bash
npm run install:all
```

### 2. Start Local Development Environment
Start the Go backend and both Vite dev servers concurrently with hot-reloading:
```bash
npm run dev
```

Once running, access the services at:
- **Website (Dev)**: `http://localhost:8080`
- **Admin Portal (Dev)**: `http://localhost:8081/admin`
- **Backend API & Dashboard**: `http://localhost:8090`

---

## 📦 Production Build & Running the Server

To compile the entire monorepo into a single self-contained executable and launch it:

### Step 1: Build the Executable
- **On Linux / macOS**:
  ```bash
  ./build.sh
  ```
- **On Windows (PowerShell)**:
  ```powershell
  .\build.ps1
  ```
*This script compiles both React SPAs, copies static assets into designated backend folders (`Backend/ui/admin` and `Backend/pb_public`), and compiles the `gamez-server` Go binary.*

---

### Step 2: Start the Production Server
> [!NOTE]
> The build script only **compiles** the executable (`gamez-server.exe`). You must run the command below to turn the server **ON** before clicking the links!

- **On Windows (PowerShell)**:
  ```powershell
  cd Backend
  .\gamez-server.exe serve --http="127.0.0.1:8090"
  ```
- **On Linux / macOS (Bash)**:
  ```bash
  cd Backend
  ./gamez-server serve --http="127.0.0.1:8090"
  ```

---

### Step 3: Access Live Production Applications
Once the server is running, open:
- **Admin & Staff Portal**: 👉 `http://localhost:8090/admin/`
- **Customer Website**: 👉 `http://localhost:8090/`
- **REST API**: 👉 `http://localhost:8090/api/`

---

## 🔑 Default Credentials

- **Permanent System Admin Email**: `sysadmin@gamez.in`
- **Permanent System Admin Password**: `Password123!`
