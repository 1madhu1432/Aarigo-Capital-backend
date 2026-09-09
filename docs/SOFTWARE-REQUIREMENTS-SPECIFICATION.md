# AARIGO CAPITAL — SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

**Document Reference**: `docs/SOFTWARE-REQUIREMENTS-SPECIFICATION.md`  
**System Name**: Aarigo Capital Loan Management & EMI Collection System  
**Version**: 2.1.0  
**Target Audience**: Full-Stack Engineers, Backend Developers, Frontend Developers, QA Engineers, DevOps  
**Security Classification**: Confidential — Financial Infrastructure  

---

## 1. Executive Summary & Purpose

### 1.1 Business Overview
**Aarigo Capital** (*"Growing Today, Securing Tomorrow"*) is an enterprise-grade Loan Management System (LMS) and Door-to-Door Field EMI Collection Platform. It is engineered for microfinance institutions (MFIs), non-banking financial companies (NBFCs), and private commercial lenders operating daily, weekly, and monthly repayment schedules.

### 1.2 Core Problem Solved
Traditional credit collection suffers from:
- Manual paper receipt books prone to fraud and calculation errors.
- Lack of real-time field visibility on agent collections.
- Disconnected loan origination, installment amortizations, and day-end accounting.
- Floating-point calculation rounding discrepancies.

### 1.3 Solution Architecture
Aarigo Capital delivers:
1. An authoritative **Double-Precision Financial Engine** with flat and reducing balance amortization.
2. A **Field Agent Portal & Mobile PWA** with real-time payment collection, offline capability, and instant WhatsApp receipt dispatch.
3. A **Management Operations Portal** for loan approvals, KYC verification, overdue tracking, route planning, and day-end closing reconciliations.
4. An isolated, strictly-typed **Node.js/Express + MySQL REST API** behind strong JWT authentication.

---

## 2. Technology Stack & Architecture

### 2.1 Technology Standards
| Layer | Technologies | Key Packages & Versions |
| :--- | :--- | :--- |
| **Frontend UI** | React 19, TypeScript, Vite | TanStack Router, TanStack Query, Tailwind CSS 4, Radix UI primitives, Lucide React, Sonner |
| **PWA / Client-side** | Service Workers, HTML5 Canvas, jsPDF | html2canvas, jspdf, xlsx, localforage |
| **Backend API** | Node.js (v20+ LTS), Express.js, TypeScript | Zod, Winston, bcryptjs, jsonwebtoken, CORS, helmet |
| **ORM / Data Access**| Prisma ORM (v5.22.0) | `@prisma/client`, `prisma` CLI |
| **Database** | MySQL 8.0+ | InnoDB engine, utf8mb4 collation, Decimal(15,2) precision |
| **Testing & Quality**| Vitest, Supertest, TypeScript | ESLint, Prettier, Custom Financial Integrity Test Scripts |

### 2.2 Architectural Topology
```
┌──────────────────────────────────────────────────────────────────┐
│                   CLIENT LAYER (FRONTEND)                        │
│            React 19 + TanStack Router + Tailwind CSS 4           │
│                    (Runs on: Port 8080/8081)                     │
│                                                                  │
│  • PWA & Field Collector Mobile UI                               │
│  • Operations & Admin Management Portal                          │
│  • Instant WhatsApp Share & Print Generator                      │
│  • Strictly NO direct database connection                        │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 │ HTTPS / REST JSON API
                                 │ Header: Authorization: Bearer <JWT>
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                    API GATEWAY & MIDDLEWARE                      │
│                  Express.js (Port 5000)                          │
│                                                                  │
│  • Rate Limiting (10 req/15min auth, 500 req/15min general)      │
│  • JWT Verification & Role-Based Access Control                  │
│  • Zod Request Schema Validation                                 │
│  • Structured Winston Logging (Passwords/Tokens Redacted)        │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                    BUSINESS DOMAIN SERVICES                      │
│                                                                  │
│  • Authoritative Loan Amortization Engine                        │
│  • Payment Waterfall Allocation Engine (Penalty -> Int -> Princ) │
│  • Day-End Cashier Reconciliations & Audit Logs                  │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                     DATABASE PERSISTENCE                         │
│                    Prisma ORM 5.22 + MySQL 8                     │
│                                                                  │
│  • Decimal(15,2) Exact Financial Precision                       │
│  • ACID Multi-Table Transactions ($transaction)                  │
│  • Unique Business Identifiers (LOAN-, PAY-, REC-, CUST-)        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Security & Compliance Requirements

### 3.1 Credential & Secret Management
1. **Zero Hardcoded Secrets**: Source code must **NEVER** contain passwords, demo passwords, or fallback secrets.
2. **Environment Variable Configuration**:
   - `SEED_ADMIN_EMAIL`: Initial admin email address.
   - `SEED_ADMIN_PASSWORD`: Initial admin password (required when initializing an empty database).
   - `DATABASE_URL`: MySQL connection URI.
   - `JWT_SECRET`: High-entropy secret key for signing tokens.
3. **Startup Guard**: If the database contains zero users and `SEED_ADMIN_PASSWORD` is missing, backend startup must **immediately halt** with exit code `1`.
4. **Log Sanitization**: The logger must automatically strip and redact:
   - `password`, `passwordHash`, `jwt`, `token`, `accessToken`, `refreshToken`, `authorization`, `database_url`, `seed_admin_password`.
5. **No Frontend Secrets**: `SEED_ADMIN_PASSWORD`, `DATABASE_URL`, or secret keys must **never** be imported or bundled into frontend code.

---

## 4. Functional Modules & Requirements

### Module 1: Authentication & Authorization
- **FR-AUTH-01 (Admin Seeding)**: On startup, `AuthService.ensureInitialAdmin()` idempotently checks for an administrative user. If missing, it creates the admin using `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. If existing, it verifies `isActive: true`.
- **FR-AUTH-02 (Staff Login)**: `POST /api/auth/login` accepts `{ username, password }` where username can be email or mobile.
- **FR-AUTH-03 (Token Issuance)**: Issues signed JWT token containing `{ id, userId, email, name }` with configurable expiry (default: 8 hours).
- **FR-AUTH-04 (Route Protection)**: Frontend wraps all operational routes in an authentication guard. Unauthenticated requests are rejected with `HTTP 401 Unauthorized`.

### Module 2: Customer & KYC Management
- **FR-CUST-01 (Unique Code Generation)**: Automatically generates sequential customer identifiers: `CUST-YYYY-XXXXX`.
- **FR-CUST-02 (Customer Demographics)**: Captures full name, primary mobile, secondary mobile, email, date of birth, gender, residential address (house, area, landmark, city, state, pincode), occupation, and monthly income.
- **FR-CUST-03 (Guarantor & Nominee)**: Stores guarantor details (name, relation, mobile, address) and nominee details.
- **FR-CUST-04 (KYC Document Vault)**: Supports Aadhaar, PAN card, Voter ID, and Driver's License uploads with verification status (`PENDING`, `VERIFIED`, `REJECTED`).

### Module 3: Loan Products & Credit Origination
- **FR-PROD-01 (Product Catalog)**: Configurable loan products with:
  - Repayment Frequency: `DAILY` (e.g. 100 days), `WEEKLY` (e.g. 26 weeks), `MONTHLY` (e.g. 12 months).
  - Interest Method: `FLAT` (flat rate on original principal) or `REDUCING` (reducing balance amortization).
  - Principal limits, default interest rate, and processing fees.
- **FR-LOAN-01 (Origination Workflow)**:
  1. Select verified customer.
  2. Select loan product.
  3. Input principal amount, tenure, and start date.
  4. Backend automatically calculates total interest, processing fee, total payable, and installment EMI amount.
  5. Assigns unique loan number `LN-YYYY-XXXXX`.

### Module 4: Installment & Amortization Engine
- **FR-EMI-01 (Authoritative Schedule)**: Generates installment records for every cycle:
  - Installment Number (1 to N)
  - Due Date (excluding non-operational bank holidays/Sundays where configured)
  - Expected EMI Amount = Principal Component + Interest Component
  - Paid Amount, Paid Date, and Balance Remaining
  - Status: `PENDING`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`.
- **FR-EMI-02 (Financial Reconciliation)**: The sum of all installment principal components must exactly equal the loan principal amount (`tolerance <= 0.01 INR`).

### Module 5: Field Collections & Payment Allocation
- **FR-PAY-01 (Payment Recording)**: Records collections in cash, UPI, or bank transfer.
- **FR-PAY-02 (Payment Allocation Waterfall)**:
  When a payment is received, the funds are automatically distributed in the following strict priority:
  1. Outstanding Penalties & Late Fees
  2. Outstanding Processing Fees
  3. Oldest Overdue Interest
  4. Oldest Overdue Principal
  5. Current Due Interest
  6. Current Due Principal
  7. Advance Payment towards subsequent installments
- **FR-PAY-03 (Digital Receipt Generation)**: Automatically generates unique receipt `REC-YYYY-XXXXX` with transaction timestamp, customer details, loan number, and collector attribution.
- **FR-PAY-04 (Instant WhatsApp Receipt)**: Provides a pre-formatted WhatsApp template with payment confirmation, installment balance, and remaining balance.

### Module 6: Agent Field Visits & Collections Routing
- **FR-VISIT-01 (Daily Collection Run)**: Generates daily route sheets for field agents filtered by locality/area.
- **FR-VISIT-02 (Visit Logging)**: Agents record visit outcomes:
  - `COLLECTED`: Payment received and receipt issued.
  - `PROMISE_TO_PAY`: Customer committed to pay on a future date.
  - `UNAVAILABLE`: Customer premises locked / customer unreachable.
  - `DISPUTED`: Customer disputed loan balance.

### Module 7: Accounting & Day-End Closing
- **FR-CLOSE-01 (Daily Cash Reconciliation)**:
  - Total Opening Balance
  - Total Cash Collections Received
  - Total UPI / Digital Collections Received
  - Total Loans Disbursed
  - Closing Cash in Drawer
- **FR-CLOSE-02 (Cashier Handover)**: Agent-to-cashier balance verification with digital sign-off.

### Module 8: Reporting, PDF Export & Analytics
- **FR-REP-01 (Executive Dashboard)**: Total Active Loans, Total Portfolio Outstanding, Today's Target vs Today's Collected, Overdue Count & Amount.
- **FR-REP-02 (Filter Controls)**: Day-wise date picker and frequency filters (`All`, `Daily`, `Weekly`, `Monthly`) across all financial tables.
- **FR-REP-03 (Export Capabilities)**: Export loan ledgers, customer statements, and collection runs to Microsoft Excel (`.xlsx`), CSV, and printable PDF.

---

## 5. Database Schema Specifications

### Core Models & Table Relationships
```
Users (Staff & Admins)
  ├── 1:N ──> AuditLogs
  ├── 1:N ──> DailyClosings
  └── 1:N ──> Payments (collectedBy)

Customers
  ├── 1:N ──> CustomerDocuments
  ├── 1:N ──> FieldVisits
  └── 1:N ──> Loans
                ├── 1:N ──> Installments (Amortization Schedule)
                ├── 1:N ──> Payments
                │             └── 1:1 ──> Receipts
                └── 1:N ──> FieldVisits
```

### Table Field Types Standard
- All monetary amounts use `DECIMAL(15, 2)`.
- All timestamps use `DATETIME(3)` with `DEFAULT CURRENT_TIMESTAMP(3)`.
- All IDs use UUID v4 or ULID strings.
- Business identifiers must have unique database indexes (`loanNumber`, `customerCode`, `receiptNumber`, `paymentNumber`).

---

## 6. REST API Endpoint Specifications

### Base URL: `/api`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/login` | Authenticates staff and returns JWT Bearer token | No |
| `GET` | `/api/auth/me` | Returns current user profile | Yes |
| `GET` | `/api/dashboard/stats` | Portfolio metrics, targets, and collections | Yes |
| `GET` | `/api/customers` | Paginated customer list with search & filters | Yes |
| `POST` | `/api/customers` | Creates customer and KYC profile | Yes |
| `GET` | `/api/customers/:id` | Detailed customer profile with loan history | Yes |
| `GET` | `/api/loans` | Loan portfolio with status and frequency filters | Yes |
| `POST` | `/api/loans` | Originates loan and generates amortization schedule | Yes |
| `GET` | `/api/loans/:id` | Full loan details, installments, and payment ledger | Yes |
| `POST` | `/api/loans/:id/disburse` | Disburses approved loan and activates installments | Yes |
| `POST` | `/api/payments` | Records payment, applies waterfall, generates receipt | Yes |
| `GET` | `/api/receipts/:id` | Retrieves receipt for printing / WhatsApp sharing | Yes |
| `GET` | `/api/collection/daily-run` | Day collection sheet for field agents | Yes |
| `POST` | `/api/visits` | Logs door-to-door field agent collection visit | Yes |
| `POST` | `/api/daily-closing` | Reconciles day-end collections and cash drawer | Yes |
| `GET` | `/api/reports/portfolio` | Full financial and portfolio audit report | Yes |

---

## 7. Developer Onboarding & Local Setup

### 7.1 Prerequisites
- **Node.js**: `v20.x` or `v22.x` LTS
- **npm**: `v10.x` or higher
- **MySQL Server**: `v8.0+` running on `localhost:3306`

### 7.2 Environment Setup
1. Copy environment template files:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
2. Configure `backend/.env`:
   ```env
   PORT=5000
   NODE_ENV=development
   DATABASE_URL="mysql://<user>:<password>@127.0.0.1:3306/aarigo_capital"
   JWT_SECRET="generate_a_secure_random_64_char_string"
   SEED_ADMIN_EMAIL=admin@aarigocapital.com
   SEED_ADMIN_PASSWORD=SetAStrongPasswordHere2026!
   ```
3. Configure `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

### 7.3 Database Initialization
```bash
# Generate Prisma Client & Run Database Migrations
npm --prefix backend run build
```

### 7.4 Running the Application
```bash
# Terminal 1: Start Backend API (Port 5000)
npm --prefix backend run dev

# Terminal 2: Start Frontend Application (Port 8080/8081)
npm --prefix frontend run dev
```

### 7.5 Testing & Validation
```bash
# Run backend typecheck
npm --prefix backend run typecheck

# Run backend automated tests
npm --prefix backend test

# Run frontend production build
npm --prefix frontend run build
```

---

## 8. Git & Deployment Guidelines

1. **Never Commit Secrets**: Never commit `.env`, private keys, or credentials.
2. **Database Migration Policy**: Never edit existing applied migration files. Always generate new migrations with `npx prisma migrate dev --name <description>`.
3. **Repository Remotes**:
   - Monorepo: `https://github.com/resumesync/loan.git`
   - Frontend: `git@github.com:1madhu1432/Aarigo-Capital-front-end-.git`
   - Backend: `git@github.com:1madhu1432/Aarigo-Capital-backend.git`
