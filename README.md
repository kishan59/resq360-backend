# ResQ360 - Core API Server

The centralized backend for the ResQ360 animal rescue ecosystem. Built to handle offline-first syncing from the mobile app, secure role-based access control, and $0-budget cloud media storage for street triage.

## 🚀 Tech Stack
* **Runtime:** Node.js + Express.js
* **Database & ORM:** PostgreSQL + Prisma
* **Authentication:** JWT (JSON Web Tokens) with strict RBAC (OWNER vs TEAM_MEMBER)
* **Media Storage:** Cloudinary (via Multer)

## 🛠️ Local Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a .env file in the root directory and add the following keys:

```bash
PORT=5000
DATABASE_URL="your_postgresql_connection_string"
JWT_SECRET="your_super_secret_jwt_key"

# Cloudinary Storage ($0 Budget Setup)
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

### 3. Database Initialization
Push the schema to your database and generate the Prisma client:

```bash
npx prisma db push
npx prisma generate
```

### 3.1 First OWNER Bootstrap (one-time)
The register route is OWNER-only by design. Create the first OWNER account once using the seed script:

```bash
INIT_OWNER_NAME="Shelter Admin" INIT_OWNER_PHONE="9876543210" INIT_OWNER_PASSWORD="strong-password" npm run seed:owner
```

PowerShell example:

```powershell
$env:INIT_OWNER_NAME="Shelter Admin"
$env:INIT_OWNER_PHONE="9876543210"
$env:INIT_OWNER_PASSWORD="strong-password"
npm run seed:owner
```

Notes:
- Phone is normalized to digits-only format (7-15 digits).
- If an OWNER already exists, bootstrap is blocked unless `ALLOW_ADDITIONAL_OWNER=true` is explicitly set.

### 4. Start the Server
Start the development server with live-reloading:

```bash
npm run dev
The server will run on http://localhost:5000
```

### 🔒 Core Architecture Notes
* **No Public API:** This system is strictly internal. Good Samaritans are logged by the field team via the app's createEncounter silent directory transaction.

* **The Master Switchboard:** App features (like video uploads and literacy-based text inputs) are controlled by the Admin via the AppSettings table to strictly manage cloud storage budgets.

* **Reporter Matching:** Reporter phone numbers are stored as digits only after validation. The intake flow reuses an existing reporter when the same number appears again and exposes a reporter summary endpoint so staff can see how many animal reports are already linked to that person.

* **Reporter Identity Rule:** If a good samaritan is not anonymous, phone number is required and used for deduplication. Anonymous reports do not create or link a reporter record.

* **Media Upload Flow:** The mobile app uploads image/audio/video files to Cloudinary before creating the encounter record, so the backend stores public Cloudinary URLs rather than local device file paths.

* **Video Feature Flag:** `AppSettings.allow_video_uploads` controls whether the intake screen can switch into video mode.