# Aarigo Capital — Backend API

Backend service for Aarigo Capital Loan & EMI Management System.

Built with **Node.js, TypeScript, Express, Prisma ORM, MySQL 8, and Zod**.

---

## Architecture & Layers

```
Route (src/routes/)
  ↓
Middleware (src/middleware/) [Auth, Validation, Rate Limit, RequestID]
  ↓
Controller (src/controllers/) [Input parsing & Response serialization]
  ↓
Service (src/services/) [Orchestration, DB Transactions, Auditing]
  ↓
Domain (src/domain/) [Authoritative Financial Logic & Payment Allocation]
  ↓
Prisma Client / MySQL 8
```

---

## Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and configure your MySQL database credentials:
```bash
cp .env.example .env
```
Edit `DATABASE_URL` inside `.env`:
```env
DATABASE_URL="mysql://root:your_mysql_password@localhost:3306/aarigo_capital"
```

### 3. Initialize Database & Run Migrations
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```
The server will run on `http://localhost:5000`.
Health check: `http://localhost:5000/health`
API base route: `http://localhost:5000/api`

---

## API Endpoints Summary

### Authentication
- `POST /api/auth/login` - User login with bcrypt check & JWT token issue
- `POST /api/auth/logout` - Invalidate session
- `GET /api/auth/me` - Current authenticated user profile

### Customers
- `POST /api/customers` - Create customer (generates `CUS-XXXXXX`)
- `GET /api/customers` - Paginated customer directory with search & filters
- `GET /api/customers/:id` - Detailed customer record with loan history
- `PUT /api/customers/:id` - Update customer profile
- `DELETE /api/customers/:id` - Deactivate customer
- `GET /api/customers/:id/loans` - Loans for specific customer
- `GET /api/customers/:id/documents` - Uploaded KYC and business documents
- `POST /api/customers/:id/documents` - Upload customer document
- `DELETE /api/customers/:id/documents/:documentId` - Remove customer document

### Loan Products
- `POST /api/loan-products` - Create loan product (Flat / Reducing)
- `GET /api/loan-products` - List active loan products
- `GET /api/loan-products/:id` - Loan product details
- `PUT /api/loan-products/:id` - Update loan product
- `DELETE /api/loan-products/:id` - Deactivate / delete product

### Loans & Amortization
- `POST /api/loans` - Create loan and generate installment schedule atomically
- `GET /api/loans` - Paginated loans list with status & customer search
- `GET /api/loans/:id` - Loan details with full schedule & payments
- `GET /api/loans/:id/summary` - Loan completion KPIs and next due date
- `POST /api/loans/:id/early-closure-quote` - Early closure calculation quote
- `GET /api/loans/:loanId/installments` - Full schedule of installments

### Installments
- `GET /api/installments/:id` - Single installment details

### Payments & Allocations
- `POST /api/payments` - Record payment with centralized installment allocation
- `GET /api/payments` - Paginated payments ledger
- `GET /api/payments/:id` - Payment breakdown and allocation summary

### Collections & Field Operations
- `POST /api/collections` - Record field collection
- `GET /api/collections` - Paginated field collections
- `GET /api/collections/:id` - Field collection detail

### Receipts
- `GET /api/receipts` - Issued receipts
- `GET /api/receipts/:id` - Receipt details
- `GET /api/receipts/:id/download` - Stream authoritative PDF receipt generated via PDFKit

### Visits & Routes
- `POST /api/visits` - Schedule customer visit
- `GET /api/visits` - List field visits
- `PUT /api/visits/:id` - Update visit outcome & collection
- `POST /api/routes` - Add collection route stop
- `GET /api/routes` - Collection route itinerary
- `PUT /api/routes/:id` - Update route stop status

### Reports & Dashboard
- `GET /api/reports/loans` - Loan disbursement report
- `GET /api/reports/payments` - Payment ledger report
- `GET /api/reports/collections` - Collection summary report
- `GET /api/reports/overdue` - Delinquency & overdue aging report
- `GET /api/reports/daily-collections` - Daily closing breakdown
- `GET /api/dashboard/summary` - Executive portfolio KPIs

### Daily Closing
- `POST /api/daily-closing` - Reconcile cash, UPI, bank receipts and close day
- `GET /api/daily-closing` - Historical daily closing records
- `GET /api/daily-closing/:id` - Detailed closing audit

---

## Testing

```bash
npm run test
```
Runs Jest unit tests for the financial domain logic (`loanCalculation.ts` and `paymentAllocation.ts`).
