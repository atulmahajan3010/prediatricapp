# Doctor Prescription App — PostgreSQL Edition

Full-stack offline clinic app: React frontend + Express API + PostgreSQL database.

## Architecture

```
Browser (React + Vite)
    │ /api/*  (proxied in dev)
    ▼
Express API (server/)   — JWT auth, all CRUD routes
    │
    ▼
PostgreSQL              — patients, visits, prescriptions, medicines, bills, queue…
```

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally (or a remote instance)

---

## Setup — step by step

### 1. Create PostgreSQL database

```bash
psql -U postgres
CREATE DATABASE doctor_app;
\q
```

### 2026-09-04 — Dashboard performance indexes

The dashboard now uses one aggregate API query and creates its covering indexes automatically on first dashboard request. To create them ahead of time, rerun `server/schema.sql` against an existing database.

### 2. Run the schema

```bash
psql -U postgres -d doctor_app -f server/schema.sql
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env and set DATABASE_URL and JWT_SECRET
```

Example `.env`:
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/doctor_app
JWT_SECRET=my_super_secret_key_change_in_production
PORT=3001
```

### 4. Install dependencies

```bash
# Frontend
npm install

# Backend
cd server && npm install && cd ..
```

### 5. Run both together

```bash
npm run dev:all
```

Or separately in two terminals:

```bash
# Terminal 1 — API
npm run dev:server

# Terminal 2 — React
npm run dev
```

Open **http://localhost:5173** → Register a doctor account → Fill in Clinic Profile for letterhead.

## Deploy on a Windows client machine

Copy the complete project folder to the client computer, including `server/`, `src/`, `public/`, `.env.example`, and `start-client.bat`.

### One-time client setup

1. Install **Node.js 18 or newer** from https://nodejs.org/.
2. Install **PostgreSQL 14 or newer** and make sure the PostgreSQL service is running.
3. Open **SQL Shell (psql)** or a terminal and create the database:

```sql
CREATE DATABASE doctor_app;
```

4. From the project folder, run the schema once:

```bash
psql -U postgres -d doctor_app -f server/schema.sql
```

5. Copy `.env.example` to `.env` and update the PostgreSQL password and a private JWT secret:

```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/doctor_app
JWT_SECRET=replace_with_a_long_private_random_value
PORT=3001
```

### Daily startup

Double-click **`start-client.bat`**. It installs missing npm packages, creates the frontend build on the first run, starts the API and frontend, and opens:

**http://localhost:4173**

Keep the two command windows open while using the application. Close them after finishing. The client can register a doctor account on the first visit and then fill in the clinic profile.

## Build a Windows `.exe`

The desktop build packages the React frontend and Express API into a native Windows app. PostgreSQL is still required because patient and clinic data remains in the PostgreSQL database.

From the project folder:

```bash
npm install --legacy-peer-deps
cd server && npm install && cd ..
npm run desktop:build
```

The generated files are written to `release/`:

- `Doctor Prescription App Setup 2.0.0.exe` — normal installer
- `Doctor Prescription App 2.0.0.exe` — portable executable

Before launching the installed app, place a `.env` file beside the executable and set `DATABASE_URL` and `JWT_SECRET`. PostgreSQL must be running and the `doctor_app` database must already have the schema applied. The app opens in its own window and no browser or Node.js installation is needed on the client machine.

### Important backup

The application data is stored in PostgreSQL, not in the project folder. Back up the `doctor_app` database regularly, for example:

The app also has an **Operations > Backups** page. It can create a complete doctor-scoped backup from inside the app, download it as JSON, open Google Drive, and remind the doctor every 30 days. Upload the downloaded file manually to Google Drive.

```bash
pg_dump -U postgres -d doctor_app -f doctor_app_backup.sql
```

---

## Production build

```bash
npm run build       # Builds React to dist/
node server/index.js   # Serve API (serve dist/ separately or via nginx)
```

---

## Data

All data lives in PostgreSQL, scoped per doctor (`doctor_id` on every table). Passwords are hashed with bcrypt. Auth uses JWT (30-day tokens stored in browser localStorage).

The `server/schema.sql` file can be re-run safely (uses `CREATE TABLE IF NOT EXISTS`).

---

## Database changes / migrations

### 2026-09-02 — Prescription O/E field + liquid medicine dosage support

The following database change is required for existing installations where the prescription table was created before the O/E field was added.

```sql
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS oe TEXT DEFAULT '';
```

This ensures the prescription form can save and display the O/E (On Examination / physical exam) notes correctly.

Also, the medicine dosage data now supports unit values such as `mg`, `gm`, `ml`, `drops`, `tablet`, etc. No extra database schema change is required for the unit field because the medicine entry is stored in the existing `medicines` JSONB column.

If you are creating a fresh database, this will already be present in the latest `server/schema.sql`.

### 2026-09-03 — Per-clinic branding and login URLs

Run the latest `server/schema.sql` against an existing database. It safely adds the clinic branding fields and unique URL slug to `clinic_profiles`:

```bash
psql -U postgres -d doctor_app -f server/schema.sql
```

New registrations create a clinic-specific login URL such as `/clinic/sunrise-clinic/login`. The public branding endpoint is `GET /api/public/clinics/:slug`; it returns clinic and doctor display details only and does not expose account credentials.

### 2026-09-08 — Prescription print licensing

Clinic Profile now has a license key field. Enter `c2FjaGktc2Fhdmk=` (the encoded `sachi-saavi` value) and save the profile to unlock the Compact prescription print format. Without a valid key, the app keeps the Pad and Letterhead formats available and shows a license message when Compact is selected.

For existing databases, rerun `server/schema.sql` to add the `license_key` column safely.

### 2026-09-08 — Optional patient phone numbers

Patient phone numbers are optional on the prescription page. For existing databases, rerun the latest `server/schema.sql` so the `patients.phone` column can accept blank values.

### Create test patients

To create 1,000 repeatable demo patients, visits, and prescriptions for a doctor account, run this from the project folder:

```bash
npm --prefix server run seed:patients -- doctor@example.com
```

The email must belong to an existing doctor account. The optional final argument changes the count, for example `500`. Demo records are named `Demo Patient 0001`, etc.; rerunning the command does not duplicate them.
