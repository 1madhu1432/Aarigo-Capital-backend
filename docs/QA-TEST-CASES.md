# AARIGO CAPITAL — QA MASTER TEST SUITE
**Document**: `docs/QA-TEST-CASES.md`  
**Application**: Aarigo Capital Loan & EMI Management System  
**Test Plan Version**: 1.0.0  
**Status**: DRAFT / NOT EXECUTED  
**Author**: Senior QA & Financial Systems Test Engineering Team  

---

## TABLE OF CONTENTS
- [A. Environment Verification](#a-environment)
- [B. Authentication & Security](#b-authentication)
- [C. Customer Management](#c-customer-management)
- [D. Loan Products](#d-loan-product)
- [E. Loan Creation](#e-loan-creation)
- [F. Flat Interest Calculations](#f-flat-interest)
- [G. Reducing Interest Calculations](#g-reducing-interest)
- [H. Daily EMI Frequency](#h-daily-emi)
- [I. Weekly EMI Frequency](#i-weekly-emi)
- [J. Monthly EMI Frequency](#j-monthly-emi)
- [K. Installment Reconciliation](#k-installment-reconciliation)
- [L. Payment Processing](#l-payment)
- [M. Payment Allocation Logic](#m-payment-allocation)
- [N. Payment Duplication & Idempotency](#n-payment-duplication)
- [O. Concurrent Payments](#o-concurrent-payment)
- [P. Overdue Assessment](#p-overdue)
- [Q. Collections Management](#q-collection)
- [R. Receipts & PDF Generation](#r-receipt)
- [S. Daily Closing Operations](#s-daily-closing)
- [T. Dashboard Financial Metrics](#t-dashboard)
- [U. Reporting & Analytics](#u-reports)
- [V. Customer Documents & Files](#v-documents)
- [W. Field Agent Visits](#w-visits)
- [X. Collection Routes & Dispatch](#x-routes)
- [Y. Database Integrity & Constraints](#y-database-integrity)
- [Z. API Endpoint Quality](#z-api-testing)
- [AA. Frontend User Experience](#aa-frontend-testing)
- [AB. Network Resilience](#ab-network-testing)
- [AC. Cross-Layer Data Consistency](#ac-data-consistency)

---

## A. ENVIRONMENT

### TC-ENV-001
Module:
Environment

Test:
Frontend development and production server launch

Priority:
P0

Preconditions:
Node.js 18+ and project dependencies installed.

Test Data:
Vite dev port 8082, production build outputs.

Steps:
1. Start frontend dev server on designated port.
2. Verify HTTP status 200 on root route `/`.
3. Verify client assets and scripts load without bundling errors.

Expected Result:
Frontend starts cleanly and serves the SPA index shell.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-ENV-002
Module:
Environment

Test:
Backend Express server launch and health probe

Priority:
P0

Preconditions:
Backend dependencies installed, port 5000 free.

Test Data:
Endpoint `GET http://localhost:5000/health`

Steps:
1. Launch Express backend server.
2. Perform HTTP GET to `/health`.
3. Verify JSON response body contains status "UP".

Expected Result:
Backend server listens on port 5000 and responds HTTP 200 `{"status":"UP"}`.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-ENV-003
Module:
Environment

Test:
Database connectivity & Prisma ORM initialization

Priority:
P0

Preconditions:
MySQL 8 daemon running with target database configured in `.env`.

Test Data:
`DATABASE_URL="mysql://root:root@localhost:3306/aarigo_capital"`

Steps:
1. Execute query via Prisma client `$queryRaw` or model lookup.
2. Verify connection opens without connection refused or timeout errors.

Expected Result:
Prisma connects to MySQL 8 database successfully.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-ENV-004
Module:
Environment

Test:
Cross-Origin Resource Sharing (CORS) header configuration

Priority:
P1

Preconditions:
Backend server running.

Test Data:
Origin header: `http://localhost:8082`

Steps:
1. Dispatch HTTP OPTIONS request to `http://localhost:5000/api/v1/auth/login`.
2. Inspect `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials`.

Expected Result:
CORS preflight responds with approved headers and allows requests from the frontend client.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-ENV-005
Module:
Environment

Test:
Production secret exposure and environment security audit

Priority:
P0

Preconditions:
Frontend and backend codebase present.

Test Data:
Client bundle files, `.env` file presence.

Steps:
1. Search client-side bundle for raw database passwords and JWT private secrets.
2. Verify `DATABASE_URL` and `JWT_SECRET` are not leaked in Vite public assets.

Expected Result:
Secrets remain strictly within the backend environment and are never bundled into client assets.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## B. AUTHENTICATION

### TC-AUTH-001
Module:
Authentication

Test:
Valid login

Priority:
P0

Preconditions:
Valid test user exists in the database.

Test Data:
Email: `admin@aarigocapital.com`, Password: `Password@123`

Steps:
1. Open login page
2. Enter valid credentials
3. Click Login

Expected Result:
User is authenticated, receives JWT token, and is redirected to the dashboard.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-AUTH-002
Module:
Authentication

Test:
Invalid email

Priority:
P1

Preconditions:
Authentication endpoint available.

Test Data:
Email: `notregistered@aarigo.com`, Password: `Password@123`

Steps:
1. Submit login request with non-existent email.
2. Verify response status code and error message.

Expected Result:
HTTP 401 Unauthorized with generic "Invalid credentials" message.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-AUTH-003
Module:
Authentication

Test:
Invalid password

Priority:
P1

Preconditions:
User `admin@aarigocapital.com` exists.

Test Data:
Email: `admin@aarigocapital.com`, Password: `WrongPassword999`

Steps:
1. Enter valid email and incorrect password.
2. Submit login request.

Expected Result:
HTTP 401 Unauthorized, login rejected, no token issued.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-AUTH-004
Module:
Authentication

Test:
Empty email

Priority:
P2

Preconditions:
Login form accessible.

Test Data:
Email: `""`, Password: `Password@123`

Steps:
1. Submit login with empty email field.
2. Observe validation behavior.

Expected Result:
Validation error displayed; submission blocked or HTTP 400 Bad Request returned.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-AUTH-005
Module:
Authentication

Test:
Empty password

Priority:
P2

Preconditions:
Login form accessible.

Test Data:
Email: `admin@aarigocapital.com`, Password: `""`

Steps:
1. Submit login with empty password field.
2. Observe validation response.

Expected Result:
Validation error displayed; submission blocked or HTTP 400 Bad Request returned.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-AUTH-006
Module:
Authentication

Test:
Invalid credentials format

Priority:
P2

Preconditions:
Authentication API active.

Test Data:
Email: `not-an-email`, Password: `1`

Steps:
1. Post malformed email format to `/api/v1/auth/login`.
2. Inspect schema validation response.

Expected Result:
HTTP 400 with detailed schema validation errors.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-AUTH-007
Module:
Authentication

Test:
Logout

Priority:
P1

Preconditions:
User is currently logged in with active session/token.

Test Data:
Authenticated session.

Steps:
1. Click Logout in UI or call logout endpoint.
2. Verify token removal from storage and headers.
3. Attempt to access authenticated route `/customers`.

Expected Result:
Session terminated, token cleared, user redirected to login.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-AUTH-008
Module:
Authentication

Test:
Page refresh after login preserves authenticated state

Priority:
P1

Preconditions:
User is logged in.

Test Data:
Valid auth token in browser storage.

Steps:
1. Log in successfully.
2. Navigate to `/loans`.
3. Trigger hard browser refresh (F5).

Expected Result:
User remains authenticated and dashboard/loan view re-renders without redirecting to login.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-AUTH-009
Module:
Authentication

Test:
Expired JWT token rejection

Priority:
P0

Preconditions:
Backend auth middleware configured.

Test Data:
JWT signed with past expiration timestamp (`exp: now - 3600`).

Steps:
1. Send request to protected endpoint `GET /api/v1/customers` with expired Bearer token.
2. Verify response status and header.

Expected Result:
HTTP 401 Unauthorized with token expired message.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-AUTH-010
Module:
Authentication

Test:
Invalid JWT signature rejection

Priority:
P0

Preconditions:
Backend auth middleware configured.

Test Data:
Bearer token signed with untrusted secret key.

Steps:
1. Send request to protected endpoint with forged JWT token.
2. Verify response.

Expected Result:
HTTP 401 Unauthorized with invalid token message.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-AUTH-011
Module:
Authentication

Test:
Missing Authorization header on protected endpoint

Priority:
P0

Preconditions:
Protected endpoints active.

Test Data:
Request without `Authorization` header.

Steps:
1. Send `GET /api/v1/loans` without auth header.
2. Inspect HTTP status.

Expected Result:
HTTP 401 Unauthorized with missing token error.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-AUTH-012
Module:
Authentication

Test:
Protected API without authentication

Priority:
P0

Preconditions:
All `/api/v1/*` routes except `/auth/login` and `/health`.

Test Data:
Unauthenticated requests to customers, loans, payments, reports, daily-closing.

Steps:
1. Invoke each protected endpoint without token.
2. Verify consistent 401 response across all controllers.

Expected Result:
All protected resources return HTTP 401.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-AUTH-013
Module:
Authentication

Test:
Hardcoded client-side password verification check

Priority:
P0

Preconditions:
Frontend authentication store and login component.

Test Data:
Arbitrary credentials vs backend validated credentials.

Steps:
1. Verify client does not bypass backend login via hardcoded strings like `aarigo2026`.
2. Ensure authentication strictly validates against backend JWT.

Expected Result:
Client requires authentic backend token and does not allow bypass.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## C. CUSTOMER MANAGEMENT

### TC-CUST-001
Module:
Customer Management

Test:
Create customer with valid data

Priority:
P0

Preconditions:
Authenticated admin user.

Test Data:
`fullName: "QA Test Borrower 1"`, `mobile: "9876500001"`, `address: "Shop 12, Main Market"`, `city: "Pune"`, `state: "Maharashtra"`, `pincode: "411001"`, `kycType: "Aadhaar"`, `kycNumber: "123456789012"`

Steps:
1. Submit customer creation via UI and API.
2. Verify database insertion in `customers` table.
3. Verify customer code generation (`CUS-000001`).

Expected Result:
Customer record created in MySQL with unique ID and code; visible in frontend customer list.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-CUST-002
Module:
Customer Management

Test:
View customer profile and detail tabs

Priority:
P1

Preconditions:
Customer `CUS-000001` exists.

Test Data:
Customer ID / Code `CUS-000001`

Steps:
1. Navigate to `/customers/$id`.
2. Inspect profile information, KYC details, nominee, and guarantor.

Expected Result:
All profile fields render accurately matching database values.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-CUST-003
Module:
Customer Management

Test:
Edit customer information

Priority:
P1

Preconditions:
Existing customer.

Test Data:
Updated monthly income: `₹45,000`, Updated landmark: `Opposite City Post Office`

Steps:
1. Open Edit Customer modal.
2. Update income and landmark fields.
3. Submit update and check database row.

Expected Result:
Database row updated; UI reflects new values immediately.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-CUST-004
Module:
Customer Management

Test:
Search customer by name, mobile, and customer code

Priority:
P1

Preconditions:
Multiple customers exist in database.

Test Data:
Search query: `"QA Test"`, `"9876500001"`, `"CUS-000001"`

Steps:
1. Type search query in Customer list search input.
2. Verify list filters correctly.

Expected Result:
Only matching customer records are returned.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-CUST-005
Module:
Customer Management

Test:
Filter customers by status (Active, Inactive, Blocked)

Priority:
P2

Preconditions:
Customers with varying statuses exist.

Test Data:
Status filters: `ACTIVE`, `INACTIVE`, `BLOCKED`

Steps:
1. Select status filter from dropdown.
2. Verify filtered rows match selected status.

Expected Result:
Table displays only customers matching status filter.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-CUST-006
Module:
Customer Management

Test:
Customer list pagination

Priority:
P2

Preconditions:
More than 20 customer records exist.

Test Data:
Page 1, Page 2, limit 10.

Steps:
1. Request page 1 with limit 10.
2. Navigate to page 2.
3. Verify distinct non-overlapping records and total count.

Expected Result:
Pagination meta matches total count and items are correctly sliced.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-CUST-007
Module:
Customer Management

Test:
Customer loan history view

Priority:
P1

Preconditions:
Customer has 2 disbursed loans.

Test Data:
Customer ID with associated loans.

Steps:
1. Open customer profile Loan History tab.
2. Verify listed loans, status badges, principal, and outstanding balance.

Expected Result:
All customer loans appear with accurate balances matching loan records.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-CUST-008
Module:
Customer Management

Test:
Customer payment history view

Priority:
P1

Preconditions:
Customer has recorded payments.

Test Data:
Customer ID with payment entries.

Steps:
1. Open customer profile Payments tab.
2. Verify receipt numbers, amounts, dates, and modes.

Expected Result:
Payment history matches payments table in MySQL.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-CUST-009
Module:
Customer Management

Test:
Customer documents association

Priority:
P2

Preconditions:
Customer profile active.

Test Data:
Document metadata: Identity KYC / Aadhaar scan.

Steps:
1. Upload customer document.
2. Verify document row created with foreign key `customerId`.

Expected Result:
Document correctly linked to customer and accessible in Documents tab.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-CUST-010
Module:
Customer Management

Test:
Duplicate customer mobile rejection

Priority:
P0

Preconditions:
Customer with mobile `9876500001` already exists.

Test Data:
New customer payload with mobile `9876500001`.

Steps:
1. Attempt to create second customer with identical mobile number.
2. Inspect API error response.

Expected Result:
HTTP 409 Conflict or 400 Bad Request with "Mobile number already registered" error.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-CUST-011
Module:
Customer Management

Test:
Missing required fields validation (Full name, mobile)

Priority:
P1

Preconditions:
Customer creation API.

Test Data:
Payload omitting `fullName` or `mobile`.

Steps:
1. Post payload with missing `fullName`.
2. Post payload with missing `mobile`.

Expected Result:
HTTP 400 with validation failure specifying missing required fields.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-CUST-012
Module:
Customer Management

Test:
Invalid mobile number format validation

Priority:
P2

Preconditions:
Customer creation API.

Test Data:
Mobile: `"12345"` (less than 10 digits), `"abcdefghij"` (non-numeric).

Steps:
1. Submit customer with invalid mobile formats.
2. Verify rejection.

Expected Result:
HTTP 400 validation error rejecting non-standard 10-digit mobile numbers.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## D. LOAN PRODUCT

### TC-PROD-001
Module:
Loan Product

Test:
Create loan product

Priority:
P1

Preconditions:
Authenticated admin.

Test Data:
`name: "Daily Micro Retail"`, `minAmount: 5000`, `maxAmount: 50000`, `interestRate: 12.0`, `interestType: "FLAT"`, `defaultTenure: 100`, `repaymentFrequency: "DAILY"`, `processingFee: 500`

Steps:
1. Post payload to `/api/v1/loan-products`.
2. Inspect database entry in `loan_products`.

Expected Result:
Loan product created with active status and specified financial parameters.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-PROD-002
Module:
Loan Product

Test:
Loan product min/max amount constraints enforcement

Priority:
P0

Preconditions:
Product "Daily Micro Retail" has min ₹5,000, max ₹50,000.

Test Data:
Loan principal: ₹2,000 (below min), Loan principal: ₹75,000 (above max).

Steps:
1. Attempt to disburse loan with principal outside product limits.
2. Verify API response.

Expected Result:
HTTP 400 Bad Request indicating principal violates product limit constraints.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-PROD-003
Module:
Loan Product

Test:
Deactivate loan product and verify new loan creation blocked

Priority:
P1

Preconditions:
Active loan product exists.

Test Data:
Product ID set to `isActive: false`.

Steps:
1. Update product to inactive.
2. Attempt to create loan referencing inactive product.

Expected Result:
System blocks loan creation referencing deactivated product.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## E. LOAN CREATION

### TC-LOAN-001
Module:
Loan Creation

Test:
Create loan with valid inputs & automatic schedule generation

Priority:
P0

Preconditions:
Active customer exists in database.

Test Data:
Principal: ₹10,000, Rate: 10%, Type: FLAT, Tenure: 10, Frequency: MONTHLY, StartDate: "2026-09-01"

Steps:
1. Post loan creation request to `/api/v1/loans`.
2. Verify loan record in MySQL `loans` table.
3. Verify 10 installment records generated in MySQL `installments` table.

Expected Result:
Loan record created with unique `loanNumber` (`LN-000001`), `status: ACTIVE`, and 10 linked installments.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-LOAN-002
Module:
Loan Creation

Test:
Reject loan creation for non-existent customer

Priority:
P1

Preconditions:
Customer ID `non-existent-cuid` does not exist.

Test Data:
`customerId: "cuid_invalid_12345"`

Steps:
1. Attempt to create loan with invalid customer ID.
2. Verify response status.

Expected Result:
HTTP 404 Not Found "Customer not found".

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-LOAN-003
Module:
Loan Creation

Test:
Reject loan creation for blocked or inactive customer

Priority:
P1

Preconditions:
Customer with `status: BLOCKED` exists.

Test Data:
Blocked customer ID.

Steps:
1. Attempt to create loan for blocked customer.
2. Verify response.

Expected Result:
HTTP 400 Bad Request "Cannot create loan for inactive or blocked customer".

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-LOAN-004
Module:
Loan Creation

Test:
Reject zero or negative principal amount

Priority:
P0

Preconditions:
Active customer exists.

Test Data:
`principalAmount: 0`, `principalAmount: -5000`

Steps:
1. Submit loan request with 0 and negative principal.
2. Observe validation response.

Expected Result:
HTTP 400 Bad Request with positive number validation error.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## F. FLAT INTEREST

### TC-FIN-FLAT-001
Module:
Flat Interest

Test:
Controlled Flat Interest calculation (Principal ₹10,000, 10% p.a., 10 Months)

Priority:
P0

Preconditions:
Independent financial formula:
$Years = 10 / 12 = 0.833333$
$TotalInterest = round(10000 \times 0.10 \times (10 / 12)) = round(833.33) = ₹833$
$TotalPayable = 10000 + 833 = ₹10,833$
$EMI = round(10833 / 10) = ₹1,083$

Test Data:
Principal: ₹10,000, Rate: 10%, Tenure: 10, Frequency: MONTHLY

Steps:
1. Request loan calculation via API.
2. Create loan in system.
3. Compare backend result with independent formula.
4. Verify values stored in `loans` MySQL table.
5. Verify values displayed in frontend UI.

Expected Result:
Backend: Total Interest = ₹833, Total Payable = ₹10,833, EMI = ₹1,083.
Database: Matches expected.
Frontend: Matches expected.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-FIN-FLAT-002
Module:
Flat Interest

Test:
Controlled Flat Interest calculation (Principal ₹20,000, 12% p.a., 1 Year / 12 Months)

Priority:
P0

Preconditions:
Independent financial formula:
$Years = 12 / 12 = 1.0$
$TotalInterest = 20000 \times 0.12 \times 1 = ₹2,400$
$TotalPayable = 20000 + 2400 = ₹22,400$
$EMI = round(22400 / 12) = ₹1,867$

Test Data:
Principal: ₹20,000, Rate: 12%, Tenure: 12, Frequency: MONTHLY

Steps:
1. Calculate loan schedule.
2. Check installment totals and monthly EMI.

Expected Result:
Total Interest = ₹2,400, Total Payable = ₹22,400, Base EMI = ₹1,867.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## G. REDUCING INTEREST

### TC-FIN-RED-001
Module:
Reducing Interest

Test:
Controlled Reducing Balance calculation (Principal ₹10,000, 12% p.a., 3 Months)

Priority:
P0

Preconditions:
Independent reducing balance amortisation formula:
Monthly rate $r = 12\% / 12 = 0.01$ (1% per month).
Factor $(1+r)^3 = 1.01^3 = 1.030301$
$EMI = round(\frac{10000 \times 0.01 \times 1.030301}{0.030301}) = round(3400.22) = ₹3,400$
Month 1:
- Opening: ₹10,000
- Interest: $10000 \times 0.01 = ₹100$
- Principal: $3400 - 100 = ₹3,300$
- Closing: $10000 - 3300 = ₹6,700$
Month 2:
- Opening: ₹6,700
- Interest: $6700 \times 0.01 = ₹67$
- Principal: $3400 - 67 = ₹3,333$
- Closing: $6700 - 3333 = ₹3,367$
Month 3:
- Opening: ₹3,367
- Interest: $3367 \times 0.01 = ₹34$
- Principal: ₹3,367
- Closing: ₹0

Test Data:
Principal: ₹10,000, Rate: 12%, Tenure: 3, Frequency: MONTHLY

Steps:
1. Generate schedule via domain service.
2. Verify opening, interest, principal, and closing balance for each month.
3. Verify closing balance equals exactly 0 at maturity.

Expected Result:
Sum of installment principals equals exactly ₹10,000; final closing balance is 0.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## H. DAILY EMI

### TC-FIN-DAILY-001
Module:
Daily EMI

Test:
Daily loan schedule generation & maturity date calculation

Priority:
P0

Preconditions:
Principal: ₹10,000, Rate: 15% p.a., Tenure: 60 days, StartDate: "2026-09-01"

Test Data:
Tenure: 60 daily installments.

Steps:
1. Create daily loan.
2. Verify exactly 60 installments are generated.
3. Verify due dates increment day-by-day without skipping.
4. Verify maturity date equals StartDate + 60 days ("2026-10-31").

Expected Result:
60 consecutive daily installments created; due dates continuous; sum of principals equals ₹10,000.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## I. WEEKLY EMI

### TC-FIN-WEEKLY-001
Module:
Weekly EMI

Test:
Weekly loan schedule generation & 7-day cadence

Priority:
P0

Preconditions:
Principal: ₹14,000, Rate: 14% p.a., Tenure: 10 weeks, StartDate: "2026-09-01"

Test Data:
Tenure: 10 weekly installments.

Steps:
1. Create weekly loan.
2. Verify exactly 10 installments created.
3. Verify each due date is exactly 7 days after previous.
4. Verify sum of installment principal components equals ₹14,000.

Expected Result:
10 weekly installments on 7-day intervals; schedule fully reconciles with principal and interest.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## J. MONTHLY EMI

### TC-FIN-MONTHLY-001
Module:
Monthly EMI

Test:
Monthly schedule date progression & month-end / leap year handling

Priority:
P1

Preconditions:
Start date at end of month (e.g., January 31).

Test Data:
StartDate: "2028-01-31" (Leap year 2028), Tenure: 3 months.

Steps:
1. Generate monthly schedule starting January 31.
2. Verify month 1 due date handles February (Feb 29 in leap year, Feb 28 in non-leap year).
3. Verify month 2 due date handles March 31.

Expected Result:
Due dates correctly clamp to valid end-of-month calendar dates without date rollover errors.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## K. INSTALLMENT RECONCILIATION

### TC-RECON-001
Module:
Installment Reconciliation

Test:
Reconcile installment sums against loan master totals

Priority:
P0

Preconditions:
Controlled loans created across all frequencies and interest types.

Test Data:
Loans: Flat Monthly, Reducing Monthly, Flat Daily, Flat Weekly.

Steps:
1. Query MySQL for each loan:
   - Calculate `SUM(principalAmount)` across all linked installments.
   - Calculate `SUM(interestAmount)` across all linked installments.
   - Calculate `SUM(totalAmount)` across all linked installments.
2. Compare against `loans.principalAmount`, `loans.totalInterest`, `loans.totalPayable`.

Expected Result:
- `SUM(installment principal) === loan.principalAmount`
- `SUM(installment interest) === loan.totalInterest`
- `SUM(installment total) === loan.totalPayable`
Zero discrepancy across all loans.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## L. PAYMENT

### TC-PAY-001
Module:
Payment

Test:
Full single installment payment

Priority:
P0

Preconditions:
Active loan with pending installments of ₹1,083 each.

Test Data:
Payment amount: ₹1,083, Method: CASH

Steps:
1. Submit payment of ₹1,083 against loan.
2. Verify Payment record created in MySQL.
3. Verify Installment #1 status transitions to `PAID`.
4. Verify Installment #1 `paidAmount` = ₹1,083, `outstandingAmount` = ₹0.
5. Verify Loan `paidAmount` increases by ₹1,083, `outstandingAmount` decreases by ₹1,083.

Expected Result:
Installment #1 marked fully paid; loan balances update accurately in MySQL and frontend.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-PAY-002
Module:
Payment

Test:
Partial installment payment

Priority:
P0

Preconditions:
Pending installment of ₹1,083.

Test Data:
Payment amount: ₹500, Method: UPI

Steps:
1. Submit payment of ₹500 against loan.
2. Verify Installment #1 status transitions to `PARTIAL`.
3. Verify Installment #1 `paidAmount` = ₹500, `outstandingAmount` = ₹583.
4. Verify Loan `paidAmount` increases by ₹500.

Expected Result:
Installment correctly recorded as PARTIAL with remaining outstanding balance ₹583.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-PAY-003
Module:
Payment

Test:
Advance payment covering multiple installments

Priority:
P0

Preconditions:
Installment #1 has ₹583 remaining; Installment #2 has ₹1,083; Installment #3 has ₹1,083.

Test Data:
Payment amount: ₹2,000

Steps:
1. Submit payment of ₹2,000.
2. Verify sequential FIFO allocation:
   - ₹583 allocated to Installment #1 (new balance: ₹0, status: PAID).
   - ₹1,083 allocated to Installment #2 (new balance: ₹0, status: PAID).
   - Remaining ₹334 allocated to Installment #3 (new balance: ₹749, status: PARTIAL).
3. Inspect MySQL installments table.

Expected Result:
Sequential waterfall allocation executes cleanly across multiple installments without discrepancy.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## M. PAYMENT ALLOCATION

### TC-ALLOC-001
Module:
Payment Allocation

Test:
FIFO payment allocation across mixed overdue and future installments

Priority:
P0

Preconditions:
Loan with 1 overdue installment (due 10 days ago) and 3 upcoming installments.

Test Data:
Installment #1 (Overdue): ₹1,000
Installment #2 (Pending): ₹1,000
Payment amount: ₹1,500

Steps:
1. Record payment of ₹1,500.
2. Inspect allocation order.

Expected Result:
Overdue Installment #1 receives ₹1,000 and is settled first (status: PAID); Installment #2 receives ₹500 (status: PARTIAL).

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-ALLOC-002
Module:
Payment Allocation

Test:
Payment exceeding total outstanding loan balance

Priority:
P0

Preconditions:
Loan has remaining total outstanding of ₹800.

Test Data:
Payment amount: ₹1,000

Steps:
1. Submit payment of ₹1,000.
2. Inspect system behavior and excess calculation.

Expected Result:
Loan is fully settled (`outstandingAmount: 0`, `status: CLOSED`); excess ₹200 identified and handled without creating negative installment balances.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## N. PAYMENT DUPLICATION

### TC-DUP-001
Module:
Payment Duplication

Test:
Prevent accidental double submission of payment (Idempotency)

Priority:
P0

Preconditions:
Active loan with pending balance.

Test Data:
Identical payment payload submitted twice in immediate succession with same reference number.

Steps:
1. Send first payment request with reference `TXN-DUP-001`.
2. Immediately replay exact same request.
3. Check total payments recorded in MySQL.

Expected Result:
System processes transaction once or rejects duplicate reference, preventing double debit / allocation.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## O. CONCURRENT PAYMENT

### TC-CONC-001
Module:
Concurrent Payment

Test:
Simultaneous concurrent payment requests against same loan

Priority:
P0

Preconditions:
Loan with remaining balance of ₹2,000.

Test Data:
Two concurrent requests of ₹1,500 each submitted in parallel via `Promise.all`.

Steps:
1. Fire two concurrent payments of ₹1,500 simultaneously to `/api/v1/payments`.
2. Verify database transaction isolation.
3. Verify loan `outstandingAmount` does not drop below 0.
4. Verify sum of installment paid amounts equals valid allocation.

Expected Result:
Atomic database transactions prevent race conditions; no corrupt balances or negative installments.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## P. OVERDUE

### TC-DUE-001
Module:
Overdue

Test:
Overdue classification based on due date vs current date

Priority:
P0

Preconditions:
Installments with due dates: past (yesterday), today, future (tomorrow).

Test Data:
Loan with 3 installments.

Steps:
1. Check status and overdue calculation when installment due date < today and `paidAmount < totalAmount`.
2. Verify `loan.overdueAmount` equals sum of unpaid amounts of past-due installments.

Expected Result:
Only past-due unpaid installments contribute to `overdueAmount`; future installments do not count as overdue.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## Q. COLLECTION

### TC-COLL-001
Module:
Collection

Test:
Create collection and verify automated payment and receipt linking

Priority:
P0

Preconditions:
Active loan with borrower.

Test Data:
Amount: ₹1,000, Method: CASH, Collector: Admin User

Steps:
1. Submit collection entry via `/api/v1/collections`.
2. Verify row inserted into `collections` table.
3. Verify linked `Payment` record created with matching `amount`.
4. Verify linked `Receipt` generated with unique receipt number.

Expected Result:
Collection, Payment, Receipt, and Installment updates are atomic and linked by foreign keys.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## R. RECEIPT

### TC-RCP-001
Module:
Receipt

Test:
Receipt creation, numbering sequence, and data accuracy

Priority:
P0

Preconditions:
Payment recorded.

Test Data:
Payment `PAY-000001`

Steps:
1. Fetch receipt for payment via `/api/v1/receipts/$id`.
2. Verify `receiptNumber` format matches `RCP-YYYY-XXXXX`.
3. Verify customer name, loan ID, amount, date, and payment mode match the payment.

Expected Result:
Receipt contains exact matching payment data and sequential receipt number.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-RCP-002
Module:
Receipt

Test:
PDF receipt generation & download integrity

Priority:
P1

Preconditions:
Valid receipt data.

Test Data:
Receipt ID.

Steps:
1. Invoke client-side PDF generator `downloadReceiptPdf`.
2. Verify PDF document builds with valid PDF header `%PDF-1.`.
3. Verify business branding, borrower name, amount, and receipt number appear in document structure.

Expected Result:
Valid downloadable PDF file generated without client runtime exceptions.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## S. DAILY CLOSING

### TC-CLOSE-001
Module:
Daily Closing

Test:
Daily closing summary aggregation across payment modes

Priority:
P0

Preconditions:
Multiple collections recorded on date "2026-09-08":
- Cash: ₹5,000
- UPI: ₹3,000
- Bank: ₹2,000
Total expected: ₹10,000 across 3 transactions.

Test Data:
Closing date: "2026-09-08"

Steps:
1. Request daily closing calculation via `/api/v1/daily-closing`.
2. Inspect aggregated cash, upi, bank amounts, and grand total.
3. Compare against raw database queries in `collections` table.

Expected Result:
- Cash Total: ₹5,000
- UPI Total: ₹3,000
- Bank Total: ₹2,000
- Grand Total: ₹10,000
- Transaction Count: 3
Zero discrepancy between API and database.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-CLOSE-002
Module:
Daily Closing

Test:
Prevent duplicate daily closing record creation for same date

Priority:
P1

Preconditions:
Daily closing for "2026-09-08" already finalized.

Test Data:
Closing date: "2026-09-08"

Steps:
1. Attempt to post second daily closing for the same date.
2. Verify database unique constraint on `closingDate`.

Expected Result:
System updates existing closing or rejects duplicate creation cleanly.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## T. DASHBOARD

### TC-DASH-001
Module:
Dashboard

Test:
Dashboard summary metrics independent reconciliation

Priority:
P0

Preconditions:
Active customers, disbursed loans, recorded payments, and overdue installments present.

Test Data:
API `GET /api/v1/dashboard/summary`

Steps:
1. Call dashboard summary endpoint.
2. Independently compute in MySQL:
   - `COUNT(*)` of active customers
   - `COUNT(*)` of active loans
   - `SUM(outstandingAmount)` of active loans
   - `SUM(amount)` of payments today
   - `SUM(overdueAmount)` of all loans
3. Compare API values with independent database query results.

Expected Result:
Every dashboard metric matches the independent database calculation exactly.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## U. REPORTS

### TC-REP-001
Module:
Reports

Test:
Loan disbursement and collection reports date-range filtering

Priority:
P1

Preconditions:
Transactions recorded across multiple dates.

Test Data:
From: "2026-09-01", To: "2026-09-08"

Steps:
1. Request collection report for date range.
2. Verify all returned rows fall within the specified date boundaries.
3. Reconcile report total against sum of individual rows.

Expected Result:
Report rows strictly conform to date filters and reported total equals mathematical sum of row amounts.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## V. DOCUMENTS

### TC-DOC-001
Module:
Documents

Test:
Customer document upload and file storage verification

Priority:
P1

Preconditions:
Customer profile exists.

Test Data:
File: `sample_aadhaar.pdf` (valid PDF, 250 KB).

Steps:
1. Upload file via `/api/v1/customers/$id/documents`.
2. Verify record inserted into `customer_documents`.
3. Verify file stored in backend upload directory.

Expected Result:
Metadata recorded in MySQL and file saved to disk securely.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-DOC-002
Module:
Documents

Test:
Reject unsupported file types and path traversal attempts

Priority:
P0

Preconditions:
Document upload endpoint.

Test Data:
Filename: `../../etc/passwd`, Executable file: `test.exe`

Steps:
1. Attempt upload of executable and path-traversal filename.
2. Verify upload rejection.

Expected Result:
Upload rejected with HTTP 400; no malicious files stored on disk.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## W. VISITS

### TC-VIS-001
Module:
Visits

Test:
Field agent visit creation, status update, and collection linking

Priority:
P2

Preconditions:
Customer with active loan.

Test Data:
Visit payload: `dueAmount: 1000`, `status: "PLANNED"`, `date: "2026-09-08"`

Steps:
1. Create visit record.
2. Record collection of ₹1,000 and update visit status to `PAID`.
3. Verify visit record in MySQL.

Expected Result:
Visit successfully tracked and updated with collected amount and status.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## X. ROUTES

### TC-ROUTE-001
Module:
Routes

Test:
Route dispatch creation and customer sequence ordering

Priority:
P2

Preconditions:
Multiple customers assigned to agent daily route.

Test Data:
Route date: "2026-09-08", sequence: 1, 2, 3.

Steps:
1. Create route entries.
2. Query route for date.
3. Verify entries returned in ascending sequence order.

Expected Result:
Route lists customers in configured operational sequence.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## Y. DATABASE INTEGRITY

### TC-DB-001
Module:
Database Integrity

Test:
Foreign key cascade and referential constraints

Priority:
P0

Preconditions:
MySQL foreign key checks enabled.

Test Data:
Customer with active loan, Loan with installments.

Steps:
1. Attempt to insert installment referencing non-existent `loanId`.
2. Attempt to insert payment referencing non-existent `customerId`.
3. Verify foreign key constraint violations are triggered.

Expected Result:
Database engine enforces referential integrity and rejects orphan records.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-DB-002
Module:
Database Integrity

Test:
Unique constraint enforcement (Customer code, mobile, loan number, payment number)

Priority:
P0

Preconditions:
Existing records in MySQL.

Test Data:
Duplicate `customerCode`, duplicate `loanNumber`.

Steps:
1. Attempt direct insert of duplicate `loanNumber`.
2. Verify unique index violation.

Expected Result:
Database unique indexes prevent duplicates at storage layer.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

### TC-DB-003
Module:
Database Integrity

Test:
Scan for orphan installments, payments, or negative balances

Priority:
P0

Preconditions:
All active database rows.

Test Data:
Integrity audit script query.

Steps:
1. Query for installments without parent loan.
2. Query for payments without parent loan or customer.
3. Query for any negative `paidAmount` or `outstandingAmount`.

Expected Result:
Zero orphan records, zero negative balances across the entire database.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## Z. API TESTING

### TC-API-001
Module:
API Testing

Test:
API response standard envelope & HTTP status codes

Priority:
P1

Preconditions:
Backend endpoints online.

Test Data:
Success payloads and error payloads across routes.

Steps:
1. Call successful endpoints: verify `{ success: true, data: ... }`.
2. Call error endpoints: verify `{ success: false, error: { message, code } }`.

Expected Result:
All API responses strictly adhere to uniform envelope contract.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## AA. FRONTEND TESTING

### TC-UI-001
Module:
Frontend Testing

Test:
Page navigation and route rendering without unhandled console errors

Priority:
P1

Preconditions:
Frontend application running on port 8082.

Test Data:
Routes: `/`, `/customers`, `/loans`, `/emi`, `/receipts`, `/reports`, `/settings`

Steps:
1. Navigate across all major navigation links.
2. Inspect browser console for JavaScript exceptions or unhandled promise rejections.

Expected Result:
All pages render smoothly with zero unhandled JavaScript errors in the console.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## AB. NETWORK TESTING

### TC-NET-001
Module:
Network Testing

Test:
API payload format, headers, and HTTP method verification

Priority:
P1

Preconditions:
Frontend making network calls to backend.

Test Data:
Browser network trace.

Steps:
1. Trigger customer creation and loan disbursement from UI.
2. Inspect network tab requests: verify correct `Content-Type: application/json`, `Authorization: Bearer ...`, and response codes 200/201.

Expected Result:
All API calls use valid HTTP methods, JSON payloads, and authorization headers.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---

## AC. DATA CONSISTENCY

### TC-CONS-001
Module:
Data Consistency

Test:
End-to-end consistency across Frontend, API, Backend, and MySQL

Priority:
P0

Preconditions:
Full loan lifecycle executed: Customer created -> Loan disbursed -> Payment collected -> Receipt issued.

Test Data:
Loan LN-000001, Payment PAY-000001.

Steps:
1. Inspect values in MySQL table: principal, total interest, total payable, paid, outstanding.
2. Inspect API response for loan and installments.
3. Inspect Frontend UI displayed values on Loan Detail and Customer Profile pages.
4. Compare all 4 layers side-by-side.

Expected Result:
Frontend UI === API Response === Backend Service === MySQL Database.
No layer silently displays or computes divergent financial figures.

Actual Result:
NOT EXECUTED

Status:
NOT EXECUTED

Evidence:
NOT EXECUTED

---
EOF
