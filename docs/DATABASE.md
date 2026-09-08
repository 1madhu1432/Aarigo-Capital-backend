# AARIGO CAPITAL — DATABASE SCHEMA SPECIFICATION

**Document**: `docs/DATABASE.md`  
**Database**: MySQL 8 (Community Server)  
**ORM**: Prisma 5.22.0  
**Test Database Name**: `aarigo_capital_test`  
**Precision Standard**: `Decimal(15, 2)` for all monetary values  

---

## 1. Relational Entity-Relationship Design

The database schema models the entire lifecycle of credit origination, daily/weekly/monthly EMI scheduling, multi-installment payment allocation, field agent collection, daily closing, and audit logging.

```
                  ┌──────────────┐
                  │     User     │
                  └──────┬───────┘
                         │ 1:N
                         ▼
┌──────────────┐  1:N    ┌──────────────┐  1:N    ┌──────────────┐
│ LoanProduct  ├────────►│     Loan     ├────────►│ Installment  │
└──────────────┘         └───────┬──────┘         └──────────────┘
                                 │ 1:N
                                 ├──────────────┐
                                 ▼              ▼
                         ┌──────────────┐┌──────────────┐
                         │   Payment    ││  Collection  │
                         └───────┬──────┘└──────────────┘
                                 │ 1:1
                                 ▼
                         ┌──────────────┐
                         │   Receipt    │
                         └──────────────┘
```

---

## 2. Model Definitions

### `User`
- **Fields**: `id`, `email` (unique), `passwordHash`, `name`, `mobile`, `role` (`ADMIN`, `COLLECTION_AGENT`, `FINANCE_MANAGER`, `AUDITOR`), `isActive`, `createdAt`, `updatedAt`.
- **Purpose**: Staff identity, role-based access control, and payment/visit attribution.

### `Customer`
- **Fields**: `id`, `customerCode` (unique), `fullName`, `mobile`, `alternateMobile`, `email`, `dateOfBirth`, `gender`, `address`, `city`, `state`, `pincode`, `occupation`, `monthlyIncome`, `kycType`, `kycNumber`, `kycStatus`, `status` (`ACTIVE`, `INACTIVE`, `BLOCKED`).
- **Indexes**: `customerCode`, `mobile`, `status`, `city`.

### `CustomerDocument`
- **Fields**: `id`, `customerId`, `loanId`, `documentType`, `documentNumber`, `filePath`, `fileSize`, `mimeType`, `verificationStatus`, `verifiedAt`, `verifiedBy`.
- **Foreign Key**: Cascades on `Customer` deletion.

### `LoanProduct`
- **Fields**: `id`, `productCode` (unique), `name`, `interestType` (`FLAT`, `REDUCING`), `minInterestRate`, `maxInterestRate`, `defaultRate`, `minPrincipal`, `maxPrincipal`, `defaultTenure`, `frequency` (`DAILY`, `WEEKLY`, `MONTHLY`), `processingFeePercent`, `isActive`.

### `Loan`
- **Fields**: `id`, `loanNumber` (unique), `customerId`, `loanProductId`, `principalAmount` (`Decimal(15,2)`), `interestRate`, `interestType`, `tenure`, `frequency`, `emiAmount` (`Decimal(15,2)`), `totalInterest` (`Decimal(15,2)`), `totalPayable` (`Decimal(15,2)`), `paidAmount` (`Decimal(15,2)`), `outstandingAmount` (`Decimal(15,2)`), `overdueAmount` (`Decimal(15,2)`), `startDate`, `firstDueDate`, `maturityDate`, `status` (`PENDING`, `ACTIVE`, `OVERDUE`, `CLOSED`, `CANCELLED`).
- **Constraints**: Sum of installment principal must reconcile with `principalAmount`.

### `Installment`
- **Fields**: `id`, `loanId`, `installmentNumber`, `dueDate`, `principalAmount` (`Decimal(15,2)`), `interestAmount` (`Decimal(15,2)`), `totalAmount` (`Decimal(15,2)`), `paidAmount` (`Decimal(15,2)`), `outstandingAmount` (`Decimal(15,2)`), `status` (`PENDING`, `PARTIAL`, `PAID`, `OVERDUE`), `paidAt`.
- **Compound Index**: `[loanId, installmentNumber]` (unique).

### `Payment`
- **Fields**: `id`, `paymentNumber` (unique), `loanId`, `customerId`, `amount` (`Decimal(15,2)`), `paymentDate`, `paymentMethod` (`CASH`, `BANK_TRANSFER`, `UPI`, `CHEQUE`, `OTHER`), `referenceNumber`, `status` (`SUCCESS`, `PENDING`, `REVERSED`), `notes`, `isEarlyClosure`.
- **Foreign Keys**: `loanId` -> `Loan`, `customerId` -> `Customer`.

### `Receipt`
- **Fields**: `id`, `receiptNumber` (unique), `paymentId` (unique 1:1), `customerId`, `loanId`, `amount` (`Decimal(15,2)`), `paymentDate`, `paymentMethod`, `issuedBy`.

### `Collection`
- **Fields**: `id`, `collectionNumber` (unique), `customerId`, `loanId`, `amount` (`Decimal(15,2)`), `collectionDate`, `paymentMethod`, `status` (`PENDING`, `VERIFIED`, `REJECTED`), `agentId`.

### `Visit` & `Route`
- **Fields**: Agent field schedules, geo-tagged notes, visit status (`PLANNED`, `VISITED`, `PAID`, `NOT_PAID`), sequence ordering.

### `DailyClosing`
- **Fields**: `id`, `closingDate` (unique), `totalCash` (`Decimal(15,2)`), `totalUpi` (`Decimal(15,2)`), `totalBank` (`Decimal(15,2)`), `totalOther` (`Decimal(15,2)`), `grandTotal` (`Decimal(15,2)`), `transactionCount`, `status` (`OPEN`, `CLOSED`, `AUDITED`), `closedBy`.

### `AuditLog`
- **Fields**: `id`, `userId`, `action`, `entityType`, `entityId`, `oldValue` (JSON), `newValue` (JSON), `ipAddress`, `createdAt`.

---

## 3. Database Isolation Rules

1. **Production Protection**: The application must never run automated tests or development migrations against a production database.
2. **Dedicated Test Database**: `aarigo_capital_test` with dedicated user `aarigo_test`.
3. **No Root Access**: The application layer connects only via non-privileged database accounts.
4. **Transactions**: Multi-record payment allocations and daily closures are executed within Prisma `$transaction([ ... ])` to guarantee ACID consistency.
