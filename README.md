# ResQ360 - Core API Server (V2)

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

### 4. Start the Server
Start the development server with live-reloading:

```bash
npm run dev
The server will run on http://localhost:5000
```

### 🔒 Core Architecture Notes
* **No Public API:** This system is strictly internal. Good Samaritans are logged by the field team via the app's createEncounter silent directory transaction.

* **The Master Switchboard:** App features (like video uploads and literacy-based text inputs) are controlled by the Admin via the AppSettings table to strictly manage cloud storage budgets.