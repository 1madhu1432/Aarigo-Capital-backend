# AARIGO CAPITAL — SYSTEM ARCHITECTURE SPECIFICATION

**Application**: Aarigo Capital Loan Management & EMI Collection System  
**Document**: `docs/ARCHITECTURE.md`  
**Architecture Version**: 2.0.0 (Strict Layered Separation)  
**Security Classification**: Confidential Financial Infrastructure

---

## 1. Architectural Overview & Boundary Isolation

The Aarigo Capital system enforces a strict physical and logical boundary between the User Interface (Frontend) and the Data Processing & Persistence Engine (Backend).

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                             │
│       React 19 + Vite + TanStack Router + Tailwind CSS 4        │
│              (Located in: ./frontend)                           │
│                                                                 │
│  • UI Views & Dashboard Presentations                           │
│  • Form Validation & UX State Transitions                       │
│  • Client-side Cache & Optimistic Renderings                    │
│  • Typed API Service Layer (frontend/src/services/api/)         │
│  • Strictly NO direct database queries or credentials           │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ HTTPS / REST API JSON
                                │ Bearer JWT Authorization
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND API                               │
│                Node.js + Express.js + Zod                       │
│               (Located in: ./backend)                           │
│                                                                 │
│  • Auth, Rate Limiting & Audit Logging                          │
│  • Strict Request Schema Validation (Zod)                       │
│  • Thin Express Route Controllers                               │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BUSINESS & DOMAIN LAYER                      │
│             backend/src/services/ & backend/src/domain/         │
│                                                                 │
│  • Authoritative Loan Amortization Calculations                 │
│  • Flat & Reducing Balance Formulas                             │
│  • Payment Waterfall Allocation Engine                          │
│  • Overdue & Penalty Calculation Logic                          │
│  • Transaction Safety & Idempotency Enforcement                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER (ORM)                      │
│                  Prisma ORM (backend/prisma)                    │
│                                                                 │
│  • Strongly-typed Data Access Repositories                      │
│  • ACID Database Transactions ($transaction)                    │
│  • Decimal(15,2) Precision Type Mapping                         │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                             │
│                          MySQL 8                                │
│                                                                 │
│  • Relational Integrity & Foreign Keys                          │
│  • Unique Indexes (Loan #, Payment #, Receipt #, Cust Code)     │
│  • Isolated Test Schema: aarigo_capital_test                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Critical Security Boundaries

### A. Direct Database Access Prohibition
- **The frontend is strictly prohibited from accessing MySQL or importing Prisma.**
- `DATABASE_URL` is never referenced, loaded, or bundled into any frontend file.
- The frontend communicates **exclusively** over HTTP/HTTPS with the backend REST API (`/api/*`).

### B. Credential Management & Zero Secret Exposure
- `backend/.env` is strictly gitignored and holds the actual database credentials and `JWT_SECRET`.
- Production credentials are never used in test suites.
- Temporary scratch files or password brute-force scripts are strictly banned.

### C. Financial Calculation Authority
- While the frontend may display estimates or preview schedules, the **backend domain services are the sole authoritative source of truth** for:
  1. Principal, Interest, and EMI schedule generation.
  2. Installment reconciliation and rounding adjustments.
  3. Payment allocation waterfalls.
  4. Outstanding and overdue balances.
  5. Daily closing and financial ledger reports.

---

## 3. Directory Layout

```
aarigo-capital/
├── frontend/                         # React SPA Only
│   ├── public/                       # Static web assets & PWA manifest
│   ├── src/
│   │   ├── components/               # Pure UI and domain presentation components
│   │   ├── routes/                   # TanStack Router route definitions
│   │   ├── services/                 # Unified HTTP client & typed domain APIs
│   │   │   ├── http.ts               # Authoritative Fetch-based HTTP layer
│   │   │   └── api/                  # Individual REST resource clients
│   │   ├── store/                    # Frontend presentation state
│   │   ├── types/                    # Shared TypeScript domain contracts
│   │   └── utils/                    # Client formatting, PDF, and templates
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/                          # Express.js REST API Only
│   ├── prisma/                       # Database schema & migrations
│   │   ├── schema.prisma             # MySQL 8 relational schema with Decimal types
│   │   └── seed.ts                   # Deterministic test & admin seed
│   ├── src/
│   │   ├── config/                   # Environment & Database config
│   │   ├── controllers/              # Thin HTTP controllers
│   │   ├── domain/                   # Authoritative mathematical loan calculations
│   │   ├── middleware/               # Auth, error handling, upload, rate limit
│   │   ├── repositories/             # Data access abstraction over Prisma
│   │   ├── routes/                   # Express route dispatchers
│   │   ├── services/                 # Core business transaction services
│   │   └── validators/               # Strict Zod schemas
│   ├── tests/                        # Unit, integration, and API test suites
│   ├── package.json
│   └── tsconfig.json
│
├── docs/                             # Architecture, API, and QA Documentation
│   ├── ARCHITECTURE.md               # This document
│   ├── API-CONTRACT-MATRIX.md        # Endpoint-by-endpoint contract verification
│   └── QA-TEST-CASES.md              # 64 master QA test specifications
│
├── .gitignore                        # Central workspace ignore rules
├── package.json                      # Workspace runner & test orchestrator
└── README.md
```
