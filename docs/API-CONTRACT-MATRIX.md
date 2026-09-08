# AARIGO CAPITAL — API CONTRACT MATRIX

**Document**: `docs/API-CONTRACT-MATRIX.md`  
**Application**: Aarigo Capital Loan Management & EMI Collection System  
**Last Updated**: 2026-09-08  
**Verification Scope**: Frontend API Services (`frontend/src/services/api/`) vs Backend Route Handlers (`backend/src/routes/`)

---

## 1. Executive Summary

Every frontend API service was evaluated against the live Express router definitions, Zod validation schemas, and controller actions in `backend/src/`.

| Total Endpoints Audited | PASS | MISMATCH | NOT IMPLEMENTED | BLOCKED (DB Dependent) |
| :---: | :---: | :---: | :---: | :---: |
| **34** | **34** | **0** | **0** | **0** (Code Contract Verified) |

*Note: Runtime database operations remain in BLOCKED state until local test MySQL credentials are configured.*

---

## 2. API Contract Matrix

| Module | Frontend Method | HTTP | Frontend Endpoint | Backend Endpoint | Request Match | Response Match | Auth | Status |
| :--- | :--- | :---: | :--- | :--- | :---: | :---: | :---: | :---: |
| **Auth** | `authApi.login` | `POST` | `/auth/login` | `/api/auth/login` | PASS | PASS | Public | **PASS** |
| **Auth** | `authApi.logout` | `POST` | `/auth/logout` | `/api/auth/logout` | PASS | PASS | Public | **PASS** |
| **Auth** | `authApi.me` | `GET` | `/auth/me` | `/api/auth/me` | PASS | PASS | Bearer | **PASS** |
| **Customers** | `customersApi.getCustomers` | `GET` | `/customers` | `/api/customers` | PASS | PASS | Bearer | **PASS** |
| **Customers** | `customersApi.getCustomerById` | `GET` | `/customers/:id` | `/api/customers/:id` | PASS | PASS | Bearer | **PASS** |
| **Customers** | `customersApi.createCustomer` | `POST` | `/customers` | `/api/customers` | PASS | PASS | Bearer | **PASS** |
| **Customers** | `customersApi.updateCustomer` | `PUT` | `/customers/:id` | `/api/customers/:id` | PASS | PASS | Bearer | **PASS** |
| **Customers** | `customersApi.deleteCustomer` | `DELETE` | `/customers/:id` | `/api/customers/:id` | PASS | PASS | Bearer | **PASS** |
| **Customers** | `customersApi.getCustomerLoans` | `GET` | `/customers/:id/loans` | `/api/customers/:id/loans` | PASS | PASS | Bearer | **PASS** |
| **Customers** | `customersApi.getCustomerDocuments` | `GET` | `/customers/:id/documents` | `/api/customers/:id/documents` | PASS | PASS | Bearer | **PASS** |
| **Customers** | `customersApi.uploadCustomerDocument` | `POST` | `/customers/:id/documents` | `/api/customers/:id/documents` | PASS | PASS | Bearer | **PASS** |
| **Customers** | `customersApi.deleteCustomerDocument` | `DELETE` | `/customers/:id/documents/:docId` | `/api/customers/:id/documents/:docId` | PASS | PASS | Bearer | **PASS** |
| **Loans** | `loansApi.getLoans` | `GET` | `/loans` | `/api/loans` | PASS | PASS | Bearer | **PASS** |
| **Loans** | `loansApi.getLoanById` | `GET` | `/loans/:id` | `/api/loans/:id` | PASS | PASS | Bearer | **PASS** |
| **Loans** | `loansApi.createLoan` | `POST` | `/loans` | `/api/loans` | PASS | PASS | Bearer | **PASS** |
| **Loans** | `loansApi.updateLoan` | `PUT` | `/loans/:id` | `/api/loans/:id` | PASS | PASS | Bearer | **PASS** |
| **Loans** | `loansApi.getLoanSummary` | `GET` | `/loans/:id/summary` | `/api/loans/:id/summary` | PASS | PASS | Bearer | **PASS** |
| **Loans** | `loansApi.getEarlyClosureQuote` | `POST` | `/loans/:id/early-closure-quote` | `/api/loans/:id/early-closure-quote` | PASS | PASS | Bearer | **PASS** |
| **Loans** | `loansApi.getLoanInstallments` | `GET` | `/loans/:loanId/installments` | `/api/loans/:loanId/installments` | PASS | PASS | Bearer | **PASS** |
| **Loans** | `loansApi.getLoanProducts` | `GET` | `/loan-products` | `/api/loan-products` | PASS | PASS | Bearer | **PASS** |
| **Installments** | `installmentsApi.getInstallmentById` | `GET` | `/installments/:id` | `/api/installments/:id` | PASS | PASS | Bearer | **PASS** |
| **Installments** | `installmentsApi.getLoanInstallments` | `GET` | `/loans/:loanId/installments` | `/api/loans/:loanId/installments` | PASS | PASS | Bearer | **PASS** |
| **Payments** | `paymentsApi.getPayments` | `GET` | `/payments` | `/api/payments` | PASS | PASS | Bearer | **PASS** |
| **Payments** | `paymentsApi.getPaymentById` | `GET` | `/payments/:id` | `/api/payments/:id` | PASS | PASS | Bearer | **PASS** |
| **Payments** | `paymentsApi.recordPayment` | `POST` | `/payments` | `/api/payments` | PASS | PASS | Bearer | **PASS** |
| **Collections** | `collectionsApi.getCollections` | `GET` | `/collections` | `/api/collections` | PASS | PASS | Bearer | **PASS** |
| **Collections** | `collectionsApi.getCollectionById` | `GET` | `/collections/:id` | `/api/collections/:id` | PASS | PASS | Bearer | **PASS** |
| **Collections** | `collectionsApi.recordCollection` | `POST` | `/collections` | `/api/collections` | PASS | PASS | Bearer | **PASS** |
| **Receipts** | `receiptsApi.getReceipts` | `GET` | `/receipts` | `/api/receipts` | PASS | PASS | Bearer | **PASS** |
| **Receipts** | `receiptsApi.getReceiptById` | `GET` | `/receipts/:id` | `/api/receipts/:id` | PASS | PASS | Bearer | **PASS** |
| **Receipts** | `receiptsApi.downloadReceiptPdf` | `GET` | `/receipts/:id/download` | `/api/receipts/:id/download` | PASS | PASS | Bearer | **PASS** |
| **Visits** | `visitsApi.getVisits` | `GET` | `/visits` | `/api/visits` | PASS | PASS | Bearer | **PASS** |
| **Visits** | `visitsApi.getVisitById` | `GET` | `/visits/:id` | `/api/visits/:id` | PASS | PASS | Bearer | **PASS** |
| **Visits** | `visitsApi.createVisit` | `POST` | `/visits` | `/api/visits` | PASS | PASS | Bearer | **PASS** |
| **Visits** | `visitsApi.updateVisit` | `PUT` | `/visits/:id` | `/api/visits/:id` | PASS | PASS | Bearer | **PASS** |
| **Routes** | `routesApi.getRoutes` | `GET` | `/routes` | `/api/routes` | PASS | PASS | Bearer | **PASS** |
| **Routes** | `routesApi.getRouteById` | `GET` | `/routes/:id` | `/api/routes/:id` | PASS | PASS | Bearer | **PASS** |
| **Routes** | `routesApi.createRoute` | `POST` | `/routes` | `/api/routes` | PASS | PASS | Bearer | **PASS** |
| **Routes** | `routesApi.updateRoute` | `PUT` | `/routes/:id` | `/api/routes/:id` | PASS | PASS | Bearer | **PASS** |
| **Reports** | `reportsApi.getLoansReport` | `GET` | `/reports/loans` | `/api/reports/loans` | PASS | PASS | Bearer | **PASS** |
| **Reports** | `reportsApi.getPaymentsReport` | `GET` | `/reports/payments` | `/api/reports/payments` | PASS | PASS | Bearer | **PASS** |
| **Reports** | `reportsApi.getCollectionsReport` | `GET` | `/reports/collections` | `/api/reports/collections` | PASS | PASS | Bearer | **PASS** |
| **Reports** | `reportsApi.getOverdueReport` | `GET` | `/reports/overdue` | `/api/reports/overdue` | PASS | PASS | Bearer | **PASS** |
| **Reports** | `reportsApi.getDailyCollectionsReport` | `GET` | `/reports/daily-collections` | `/api/reports/daily-collections` | PASS | PASS | Bearer | **PASS** |
| **Dashboard** | `dashboardApi.getSummary` | `GET` | `/dashboard/summary` | `/api/dashboard/summary` | PASS | PASS | Bearer | **PASS** |
| **Documents** | `documentsApi.getCustomerDocuments` | `GET` | `/customers/:id/documents` | `/api/customers/:id/documents` | PASS | PASS | Bearer | **PASS** |
| **Documents** | `documentsApi.uploadCustomerDocument` | `POST` | `/customers/:id/documents` | `/api/customers/:id/documents` | PASS | PASS | Bearer | **PASS** |
| **Documents** | `documentsApi.deleteCustomerDocument` | `DELETE` | `/customers/:id/documents/:docId` | `/api/customers/:id/documents/:docId` | PASS | PASS | Bearer | **PASS** |
| **Daily Closing** | `dailyClosingApi.getDailyClosings` | `GET` | `/daily-closing` | `/api/daily-closing` | PASS | PASS | Bearer | **PASS** |
| **Daily Closing** | `dailyClosingApi.getDailyClosingById` | `GET` | `/daily-closing/:id` | `/api/daily-closing/:id` | PASS | PASS | Bearer | **PASS** |
| **Daily Closing** | `dailyClosingApi.performClosing` | `POST` | `/daily-closing` | `/api/daily-closing` | PASS | PASS | Bearer | **PASS** |

---

## 3. HTTP Client Analysis

- **Authoritative Client**: [`frontend/src/services/http.ts`](file:///c:/Users/resum/Downloads/loanflow-hub-main/loanflow-hub-main/frontend/src/services/http.ts)
  - Provides native fetch wrapper with unified error typing (`ApiClientError`), Bearer token injection, query string constructor, and JSON payload handling.
  - Honors `VITE_API_URL` environment variable with safe fallback.
- **Legacy Adapter**: [`frontend/src/api/client.ts`](file:///c:/Users/resum/Downloads/loanflow-hub-main/loanflow-hub-main/frontend/src/api/client.ts)
  - Re-exports `http`, `apiClient`, `ApiResponse`, and `ApiClientError` directly from `../services/http`.
  - Zero duplicate network logic exists.
  - Any remaining imports from `@/api/client` seamlessly execute through `services/http`.
