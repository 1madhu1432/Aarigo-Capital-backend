# Aarigo Capital — Loan Management & EMI Collection System

Aarigo Capital is an enterprise-grade Loan Origination, Amortization, and Door-to-Door EMI Collection Management System designed for microfinance institutions and non-banking financial companies (NBFCs).

---

## Architecture

The project features a **strict physical separation** between the client-side single-page application and the server-side REST API:

```
aarigo-capital/
├── frontend/                     # React 19 + TanStack Start/Router frontend
│   ├── src/
│   │   ├── components/           # UI components (shadcn/ui + Radix UI)
│   │   ├── routes/               # TanStack file-based routes
│   │   ├── services/             # Typed HTTP client & API service layer
│   │   │   ├── http.ts           # Centralized Fetch wrapper with Bearer token injection
│   │   │   └── api/              # Module-specific API clients
│   │   └── store/                # UI application state
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/                      # Node.js + Express + TypeScript + Prisma ORM
│   ├── prisma/
│   │   ├── schema.prisma         # Authoritative MySQL relational schema
│   │   └── seed.ts               # Deterministic seed data
│   ├── src/
│   │   ├── controllers/          # Thin HTTP route handlers
│   │   ├── domain/               # Authoritative financial logic (Amortization, Waterfall allocation)
│   │   ├── middleware/           # JWT authentication, error handling, rate limiting
│   │   ├── repositories/         # Prisma data access layer
│   │   ├── routes/               # Express REST routes
│   │   └── services/             # Business workflow services
│   ├── tests/
│   │   └── unit/                 # Domain financial tests (Jest)
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                         # Architecture, API specifications, and QA documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── API-CONTRACT-MATRIX.md
│   ├── DATABASE.md
│   ├── QA-TEST-CASES.md
│   ├── QA-ISSUES.md
│   └── FINAL-QA-REPORT.md
├── package.json                  # Workspace script runner
└── README.md
```

---

## Requirements

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **MySQL Server**: 8.0 or higher
- **Operating System**: Windows, macOS, or Linux

---

## Installation

Clone the repository and install dependencies in the root workspace and sub-projects:

```bash
# Clone repository
git clone <repository-url>
cd loanflow-hub-main

# Install dependencies in frontend and backend
cd frontend && npm install
cd ../backend && npm install
cd ..
```

---

## Environment Configuration

### Backend (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="mysql://aarigo_test:<your_password>@localhost:3306/aarigo_capital_test"
JWT_SECRET=aarigo_capital_dev_jwt_secret_key_2026_secure_super_safe_token
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173,http://localhost:4173,http://localhost:3000
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=500
AUTH_RATE_LIMIT_MAX=10
SEED_ADMIN_EMAIL=admin@aarigocapital.com
SEED_ADMIN_PASSWORD=Aarigo@2026
```

> **Security Notice**: Never commit `.env` or expose passwords in version control.

### Frontend (`frontend/.env`)

Copy `frontend/.env.example` to `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Database Setup

1. Open your MySQL client and create a dedicated database and test user:
   ```sql
   CREATE DATABASE aarigo_capital_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'aarigo_test'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';
   GRANT ALL PRIVILEGES ON aarigo_capital_test.* TO 'aarigo_test'@'localhost';
   FLUSH PRIVILEGES;
   ```
2. Update the `DATABASE_URL` in `backend/.env` with your password.

---

## Prisma Migration & Seed

Run database migrations to generate the tables, indexes, foreign keys, and precision constraints:

```bash
cd backend
npm run prisma:migrate
npm run prisma:seed
```

---

## Running the Application

You can start both frontend and backend concurrently from the root directory or independently:

### From Root Directory:

```bash
# Start frontend development server (http://localhost:5173)
npm run dev:frontend

# Start backend REST API server (http://localhost:5000)
npm run dev:backend
```

### From Subdirectories:

```bash
# Frontend
cd frontend
npm run dev

# Backend
cd backend
npm run dev
```

---

## Testing

### Backend Unit Tests

Runs domain amortization, reducing balance EMI calculations, late fee logic, and payment allocation waterfall unit tests:

```bash
cd backend
npm test
```

### TypeScript Validation

```bash
# Frontend type check
npm run test:frontend

# Backend type check
npm run test:backend
```

---

## Production Build

Build production bundles for deployment:

```bash
# Build frontend (SSR + client assets via Vite/Rolldown)
npm run build:frontend

# Build backend (Transpiles TypeScript to backend/dist)
npm run build:backend
```

---

## Deployment

### Backend Deployment (PM2 / Docker / Node.js)
1. Run `npm run build` in `backend/`.
2. Ensure environment variables (`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`) are configured in the target production environment.
3. Run database migrations: `npx prisma migrate deploy`.
4. Start the server using a process manager:
   ```bash
   pm2 start dist/server.js --name "aarigo-backend"
   ```

### Frontend Deployment (Vercel / Cloudflare / Nginx)
1. Run `npm run build` in `frontend/`.
2. Deploy `.output/` or preview locally with `npm run preview`.
3. Set the production API URL in `VITE_API_URL`.

---

## Documentation

For comprehensive technical specifications, refer to:
- [Architecture & Design Decisions](docs/ARCHITECTURE.md)
- [REST API Specifications](docs/API.md)
- [API Contract Verification Matrix](docs/API-CONTRACT-MATRIX.md)
- [Database Schema & Precision Rules](docs/DATABASE.md)
- [QA Test Cases](docs/QA-TEST-CASES.md)
- [QA Issues Log](docs/QA-ISSUES.md)
- [Final QA Report](docs/FINAL-QA-REPORT.md)
