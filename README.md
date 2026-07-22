# GameZ Platform Monorepo

## System Architecture & Deployment Model

The GameZ backend is built on top of PocketBase (Go) and engineered for high performance, single-binary distribution.

### Single-Instance Concurrency Constraint
> [!IMPORTANT]
> **Single-Instance Deployment Required:**
> The booking creation engine uses an in-memory `sync.Mutex` (`bookingMutex`) in `Backend/hooks/bookings.go` to guarantee TOCTOU-safe transaction isolation for booking slots. 
> 
> Because this lock is in-memory:
> - The backend **must be deployed as a single application instance** (single Go process).
> - Horizontal scaling across multiple load-balanced process instances is **not supported** without replacing the internal Go mutex with a distributed lock manager (e.g., Redis `redlock` or Postgres advisory locks).
> - Vertical scaling (increasing CPU/RAM on the instance) is the recommended path for increased capacity.

### Route Topology
- `/` - Customer Website SPA (Served from `pb_public/`)
- `/admin/` - Custom GameZ Admin Panel SPA (Embedded via `go:embed`)
- `/_/` - Native PocketBase Superuser Dashboard
- `/api/` - Backend REST API Endpoints

### Production Build
Run `build.sh` (Linux/Mac) or `build.ps1` (Windows) from the repository root:
```bash
./build.sh
```
This script compiles both React SPAs, copies static assets into their designated paths (`ui/admin` and `pb_public`), and compiles the single `gamez-server` Go executable.
