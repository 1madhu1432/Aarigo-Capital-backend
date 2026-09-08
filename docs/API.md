# AARIGO CAPITAL — REST API DOCUMENTATION

**Document**: `docs/API.md`  
**Application**: Aarigo Capital Loan Management & EMI Collection System  
**Base URL**: `http://localhost:5000/api`  
**Format**: REST JSON  
**Auth Scheme**: Bearer JWT (`Authorization: Bearer <token>`)

---

## 1. Authentication Endpoints

### `POST /api/auth/login`
- **Description**: Authenticates user and returns JWT bearer token.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "admin@aarigocapital.com",
    "password": "..."
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "cuid_...",
        "name": "Admin User",
        "email": "admin@aarigocapital.com",
        "mobile": "9876543210"
      },
      "token": "eyJhbGciOiJIUzI1NiIs..."
    },
    "message": "Login successful"
  }
  ```

### `POST /api/auth/logout`
- **Description**: Invalidation acknowledgment for client-side token discard.
- **Access**: Public
- **Response**: `200 OK`

### `GET /api/auth/me`
- **Description**: Retrieves current authenticated profile.
- **Access**: Bearer Token
- **Response**: `200 OK`

---

## 2. Customer Endpoints

### `GET /api/customers`
- **Description**: Search and list customer profiles with pagination.
- **Access**: Bearer Token
- **Query Parameters**: `page` (default 1), `limit` (default 20), `search`, `status` (`ACTIVE`|`INACTIVE`|`BLOCKED`), `city`.
- **Response**: `200 OK` with paginated records.

### `POST /api/customers`
- **Description**: Register new customer with KYC and contact information.
- **Access**: Bearer Token
- **Request Body**:
  ```json
  {
    "fullName": "Rajesh Sharma",
    "mobile": "9876543210",
    "alternateMobile": "9876543211",
    "email": "rajesh@example.com",
    "dateOfBirth": "1988-05-12",
    "gender": "MALE",
    "address": "123 Market Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "monthlyIncome": 45000,
    "kycType": "AADHAAR",
    "kycNumber": "123456789012"
  }
  ```

### `GET /api/customers/:id`
- **Description**: Customer detail with KYC status and linked accounts.

### `PUT /api/customers/:id`
- **Description**: Update customer profile.

### `DELETE /api/customers/:id`
- **Description**: Soft delete/deactivate customer profile.

### `GET /api/customers/:id/loans`
- **Description**: List all loans associated with the customer.

### `GET /api/customers/:id/documents`
- **Description**: List all verified and pending documents.

### `POST /api/customers/:id/documents`
- **Description**: Upload document file (`multipart/form-data`).

---

## 3. Loan Products & Loan Origination

### `GET /api/loan-products`
- **Description**: Retrieve active loan products (Daily Small Business, Weekly Commercial, Monthly Personal).

### `POST /api/loans`
- **Description**: Originate and disburse a new loan. Computes amortization schedule on the backend.
- **Request Body**:
  ```json
  {
    "customerId": "cuid_customer",
    "principalAmount": 50000,
    "interestRate": 14.5,
    "interestType": "REDUCING",
    "tenure": 12,
    "frequency": "MONTHLY",
    "startDate": "2026-09-01",
    "processingFee": 1000
  }
  ```

### `GET /api/loans/:id`
- **Description**: Full loan details including current paid, outstanding, and overdue amounts.

### `GET /api/loans/:id/summary`
- **Description**: Consolidated financial statistics for a specific loan.

### `GET /api/loans/:loanId/installments`
- **Description**: Complete installment repayment schedule for the loan.

### `POST /api/loans/:id/early-closure-quote`
- **Description**: Generates an authoritative quotation for early loan foreclosure.

---

## 4. Payment Processing & Allocation

### `POST /api/payments`
- **Description**: Critical financial transaction. Atomically applies payment allocation waterfall across unpaid installments.
- **Request Body**:
  ```json
  {
    "loanId": "cuid_loan",
    "amount": 5000,
    "paymentDate": "2026-09-08",
    "paymentMethod": "UPI",
    "referenceNumber": "UPI-987654321",
    "notes": "EMI installment payment"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "payment": { "id": "PAY-...", "amount": 5000 },
      "receipt": { "id": "RCP-...", "receiptNumber": "RCP-202609-0001" },
      "allocations": [
        { "installmentId": "inst-1", "allocated": 3500, "newStatus": "PAID" },
        { "installmentId": "inst-2", "allocated": 1500, "newStatus": "PARTIAL" }
      ],
      "loanSummary": {
        "paidAmount": 5000,
        "outstandingAmount": 45000,
        "overdueAmount": 0,
        "status": "ACTIVE"
      }
    }
  }
  ```

---

## 5. Collections & Field Management

### `GET /api/collections`
- **Description**: Agent collections log.

### `POST /api/collections`
- **Description**: Records field agent collection and links to loan installment.

### `GET /api/receipts/:id/download`
- **Description**: Downloads PDF receipt.

### `GET /api/visits` & `POST /api/visits`
- **Description**: Agent visit scheduling and collection notes.

### `GET /api/routes` & `POST /api/routes`
- **Description**: Agent dispatch route sheets and stop ordering.

---

## 6. Daily Closing & Reports

### `POST /api/daily-closing`
- **Description**: Closes financial day, reconciling Cash, UPI, and Bank collections.

### `GET /api/dashboard/summary`
- **Description**: Executive dashboard aggregation (customers, active loans, collections, overdue balances).

### `GET /api/reports/loans`
### `GET /api/reports/payments`
### `GET /api/reports/collections`
### `GET /api/reports/overdue`
### `GET /api/reports/daily-collections`
