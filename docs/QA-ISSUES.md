# QA ISSUES LOG — AARIGO CAPITAL

**Project**: Aarigo Capital Loan Management & EMI Collection System  
**Audit Date**: 2026-09-08  
**Scope**: Full end-to-end audit (Frontend, Backend, Database, Contracts, Tests)

---

## 1. Issue Summary

| Issue ID | Module | Severity | Status | Description | Resolution / Evidence |
|---|---|---|---|---|---|
| **ISS-001** | Database Environment | High | **RESOLVED** | Local MySQL database credentials for `aarigo_test` configured and tested with IPv4 loopback (`127.0.0.1:3306`). | Connection established successfully via Prisma and native MySQL client. |
| **ISS-002** | Database Migrations | Medium | **RESOLVED** | Database schema synchronized to MySQL `aarigo_capital_test`. | All 13 relational tables created and 4 seed records populated (Admin user + 3 Loan Products). |
| **ISS-003** | Live Integration & Reconciliation Tests | Medium | **RESOLVED** | Live database integration, mathematical financial reconciliation, and API tests executed against real MySQL instance. | 29/29 Jest unit & integration tests PASS; 21/21 Live QA test cases PASS (100% pass rate). |
| **ISS-004** | Frontend Store Migration | Low | **RESOLVED** | `frontend/src/store/app-store.tsx` integrated with backend API client. | Customer creation, loan creation, payment recording, and closing operations dispatch to backend REST API. |

---

## 2. Detailed Issue Reports & Resolution History

### ISS-001: Local Database Credentials Configured
- **Component**: `backend/.env`
- **Severity**: High
- **Status**: **RESOLVED**
- **Resolution**: Dedicated non-root user `aarigo_test` verified and connected to MySQL database `aarigo_capital_test` on `127.0.0.1:3306`. Zero credentials exposed or logged.

### ISS-002: Live Database Migrations & Seeding
- **Component**: `backend/prisma/schema.prisma` & `backend/prisma/seed.ts`
- **Severity**: Medium
- **Status**: **RESOLVED**
- **Resolution**: `prisma db push` applied all 13 tables (`users`, `customers`, `loan_products`, `loans`, `installments`, `payments`, `receipts`, `collections`, `visits`, `routes`, `daily_closings`, `audit_logs`, `customer_documents`). Seeded initial super administrator and standard loan products.

### ISS-003: Live Database Financial Reconciliation
- **Component**: `backend/tests/integration/financialReconciliation.test.ts` & `scripts/execute-qa-test-cases.ts`
- **Severity**: Medium
- **Status**: **RESOLVED**
- **Resolution**: Reconciled flat interest (daily, weekly, monthly), reducing balance interest amortization, waterfall payment allocation, and full loan closure to zero balance directly against live MySQL tables.

---

## 3. Verified Non-Issues & Certified System Status

- **Frontend Build**: Zero errors. Rolldown/Vite SSR production build compiles cleanly.
- **Backend Build**: Zero errors. TypeScript compiles to `dist/` cleanly.
- **API Contracts**: 34/34 audited endpoints across all 13 modules pass without any mismatch (`docs/API-CONTRACT-MATRIX.md`).
- **Data Integrity Audit**: 12/12 data integrity, foreign key constraint, and non-negative balance checks pass (`scripts/check-data-integrity.ts`).
- **Live QA Engine**: 21/21 automated end-to-end test cases pass against active backend server and MySQL database (`scripts/execute-qa-test-cases.ts`).
- **Security Boundaries**: No `.env` files tracked in git. Zero hardcoded passwords. Frontend does not bundle or expose backend secrets or DB credentials.
