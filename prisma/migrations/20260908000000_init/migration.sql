-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `mobile` VARCHAR(20) NOT NULL,
    `passwordHash` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` VARCHAR(191) NOT NULL,
    `customerCode` VARCHAR(20) NOT NULL,
    `fullName` VARCHAR(200) NOT NULL,
    `mobile` VARCHAR(20) NOT NULL,
    `alternateMobile` VARCHAR(20) NULL,
    `email` VARCHAR(255) NULL,
    `dateOfBirth` VARCHAR(10) NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER') NULL,
    `address` VARCHAR(500) NULL,
    `addressHouse` VARCHAR(50) NULL,
    `addressArea` VARCHAR(200) NULL,
    `city` VARCHAR(100) NULL,
    `district` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `pincode` VARCHAR(10) NULL,
    `addressLandmark` VARCHAR(200) NULL,
    `occupation` VARCHAR(200) NULL,
    `monthlyIncome` DECIMAL(12, 2) NULL,
    `kycType` ENUM('AADHAAR', 'PAN', 'VOTER_ID', 'DRIVING_LICENCE') NULL,
    `kycNumber` VARCHAR(50) NULL,
    `kycStatus` ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `nomineeName` VARCHAR(200) NULL,
    `nomineeRelationship` VARCHAR(100) NULL,
    `nomineeMobile` VARCHAR(20) NULL,
    `nomineeAddress` VARCHAR(500) NULL,
    `guarantorName` VARCHAR(200) NULL,
    `guarantorRelationship` VARCHAR(100) NULL,
    `guarantorMobile` VARCHAR(20) NULL,
    `guarantorAddress` VARCHAR(500) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
    `notes` TEXT NULL,
    `photoPath` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `customers_customerCode_key`(`customerCode`),
    UNIQUE INDEX `customers_mobile_key`(`mobile`),
    INDEX `customers_mobile_idx`(`mobile`),
    INDEX `customers_customerCode_idx`(`customerCode`),
    INDEX `customers_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_documents` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `documentType` ENUM('AADHAAR', 'PAN', 'ADDRESS_PROOF', 'INCOME_PROOF', 'BANK_STATEMENT', 'PHOTO', 'OTHER') NOT NULL,
    `documentNumber` VARCHAR(100) NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `filePath` VARCHAR(500) NOT NULL,
    `mimeType` VARCHAR(100) NULL,
    `fileSizeBytes` INTEGER NULL,
    `expiryDate` VARCHAR(10) NULL,
    `verificationStatus` ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `verificationNotes` TEXT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `customer_documents_customerId_idx`(`customerId`),
    INDEX `customer_documents_documentType_idx`(`documentType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loan_products` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `minAmount` DECIMAL(12, 2) NOT NULL,
    `maxAmount` DECIMAL(12, 2) NOT NULL,
    `interestRate` DECIMAL(5, 2) NOT NULL,
    `interestType` ENUM('FLAT', 'REDUCING') NOT NULL,
    `defaultTenure` INTEGER NOT NULL,
    `repaymentFrequency` ENUM('DAILY', 'WEEKLY', 'MONTHLY') NOT NULL,
    `processingFee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `loan_products_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loans` (
    `id` VARCHAR(191) NOT NULL,
    `loanNumber` VARCHAR(20) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `loanProductId` VARCHAR(191) NULL,
    `principalAmount` DECIMAL(12, 2) NOT NULL,
    `interestRate` DECIMAL(5, 2) NOT NULL,
    `interestType` ENUM('FLAT', 'REDUCING') NOT NULL,
    `tenure` INTEGER NOT NULL,
    `frequency` ENUM('DAILY', 'WEEKLY', 'MONTHLY') NOT NULL,
    `processingFee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `insurance` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `emiAmount` DECIMAL(12, 2) NOT NULL,
    `totalInterest` DECIMAL(12, 2) NOT NULL,
    `totalPayable` DECIMAL(12, 2) NOT NULL,
    `startDate` VARCHAR(10) NOT NULL,
    `firstDueDate` VARCHAR(10) NOT NULL,
    `maturityDate` VARCHAR(10) NOT NULL,
    `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `outstandingAmount` DECIMAL(12, 2) NOT NULL,
    `overdueAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `purpose` VARCHAR(500) NULL,
    `disbursementMethod` VARCHAR(50) NULL,
    `bankTransactionId` VARCHAR(200) NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'OVERDUE', 'CLOSED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `loans_loanNumber_key`(`loanNumber`),
    INDEX `loans_customerId_idx`(`customerId`),
    INDEX `loans_loanNumber_idx`(`loanNumber`),
    INDEX `loans_status_idx`(`status`),
    INDEX `loans_maturityDate_idx`(`maturityDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `installments` (
    `id` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `installmentNumber` INTEGER NOT NULL,
    `dueDate` VARCHAR(10) NOT NULL,
    `principalAmount` DECIMAL(12, 2) NOT NULL,
    `interestAmount` DECIMAL(12, 2) NOT NULL,
    `totalAmount` DECIMAL(12, 2) NOT NULL,
    `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `outstandingAmount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
    `paidAt` DATETIME(3) NULL,
    `lateFee` DECIMAL(10, 2) NULL,
    `lateFeePaid` DECIMAL(10, 2) NULL,
    `lateFeeWaived` BOOLEAN NOT NULL DEFAULT false,
    `remarks` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `installments_loanId_idx`(`loanId`),
    INDEX `installments_dueDate_idx`(`dueDate`),
    INDEX `installments_status_idx`(`status`),
    UNIQUE INDEX `installments_loanId_installmentNumber_key`(`loanId`, `installmentNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `paymentNumber` VARCHAR(30) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `paymentDate` VARCHAR(10) NOT NULL,
    `paymentMethod` ENUM('CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'OTHER') NOT NULL,
    `referenceNumber` VARCHAR(200) NULL,
    `notes` TEXT NULL,
    `isReversed` BOOLEAN NOT NULL DEFAULT false,
    `reversalReason` TEXT NULL,
    `isEarlyClosure` BOOLEAN NOT NULL DEFAULT false,
    `lateFeePaid` DECIMAL(10, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_paymentNumber_key`(`paymentNumber`),
    INDEX `payments_loanId_idx`(`loanId`),
    INDEX `payments_customerId_idx`(`customerId`),
    INDEX `payments_paymentDate_idx`(`paymentDate`),
    INDEX `payments_paymentNumber_idx`(`paymentNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `collections` (
    `id` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NULL,
    `collectedByUserId` VARCHAR(191) NULL,
    `collectionDate` VARCHAR(10) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `paymentMethod` ENUM('CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'OTHER') NOT NULL,
    `referenceNumber` VARCHAR(200) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `collections_paymentId_key`(`paymentId`),
    INDEX `collections_loanId_idx`(`loanId`),
    INDEX `collections_customerId_idx`(`customerId`),
    INDEX `collections_collectionDate_idx`(`collectionDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receipts` (
    `id` VARCHAR(191) NOT NULL,
    `receiptNumber` VARCHAR(30) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `filePath` VARCHAR(500) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ISSUED',

    UNIQUE INDEX `receipts_receiptNumber_key`(`receiptNumber`),
    UNIQUE INDEX `receipts_paymentId_key`(`paymentId`),
    INDEX `receipts_receiptNumber_idx`(`receiptNumber`),
    INDEX `receipts_loanId_idx`(`loanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `visits` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NOT NULL,
    `visitDate` VARCHAR(10) NOT NULL,
    `purpose` VARCHAR(500) NULL,
    `status` ENUM('PLANNED', 'VISITED', 'PAID', 'PARTIALLY_PAID', 'NOT_PAID') NOT NULL DEFAULT 'PLANNED',
    `notes` TEXT NULL,
    `location` VARCHAR(500) NULL,
    `dueAmount` DECIMAL(12, 2) NULL,
    `collected` DECIMAL(12, 2) NULL,
    `nextVisit` VARCHAR(10) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `visits_customerId_idx`(`customerId`),
    INDEX `visits_loanId_idx`(`loanId`),
    INDEX `visits_visitDate_idx`(`visitDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `routes` (
    `id` VARCHAR(191) NOT NULL,
    `routeDate` VARCHAR(10) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `loanId` VARCHAR(191) NULL,
    `sequence` INTEGER NOT NULL DEFAULT 0,
    `visitStatus` ENUM('PLANNED', 'VISITED', 'PAID', 'PARTIALLY_PAID', 'NOT_PAID') NOT NULL DEFAULT 'PLANNED',
    `collectionStatus` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `amountDue` DECIMAL(12, 2) NULL,
    `amountCollected` DECIMAL(12, 2) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `routes_routeDate_idx`(`routeDate`),
    INDEX `routes_customerId_idx`(`customerId`),
    INDEX `routes_loanId_idx`(`loanId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_closings` (
    `id` VARCHAR(191) NOT NULL,
    `closingDate` VARCHAR(10) NOT NULL,
    `totalDue` DECIMAL(14, 2) NOT NULL,
    `totalCollected` DECIMAL(14, 2) NOT NULL,
    `shortfall` DECIMAL(14, 2) NOT NULL,
    `collectionRate` DECIMAL(5, 2) NOT NULL,
    `cashAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `cashCount` INTEGER NOT NULL DEFAULT 0,
    `upiAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `upiCount` INTEGER NOT NULL DEFAULT 0,
    `bankAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `bankCount` INTEGER NOT NULL DEFAULT 0,
    `transactionsCount` INTEGER NOT NULL DEFAULT 0,
    `visitsCount` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('OPEN', 'CLOSED', 'AUDITED') NOT NULL DEFAULT 'OPEN',
    `closedByUserId` VARCHAR(191) NULL,
    `closedAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `daily_closings_closingDate_key`(`closingDate`),
    INDEX `daily_closings_closingDate_idx`(`closingDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NULL,
    `entityType` VARCHAR(50) NOT NULL,
    `entityId` VARCHAR(100) NOT NULL,
    `action` VARCHAR(50) NOT NULL,
    `oldValue` JSON NULL,
    `newValue` JSON NULL,
    `reason` TEXT NULL,
    `ipAddress` VARCHAR(50) NULL,
    `requestId` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_customerId_idx`(`customerId`),
    INDEX `audit_logs_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `customer_documents` ADD CONSTRAINT `customer_documents_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `loans_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loans` ADD CONSTRAINT `loans_loanProductId_fkey` FOREIGN KEY (`loanProductId`) REFERENCES `loan_products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `installments` ADD CONSTRAINT `installments_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `loans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `loans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collections` ADD CONSTRAINT `collections_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `loans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collections` ADD CONSTRAINT `collections_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collections` ADD CONSTRAINT `collections_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `collections` ADD CONSTRAINT `collections_collectedByUserId_fkey` FOREIGN KEY (`collectedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `loans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visits` ADD CONSTRAINT `visits_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `visits` ADD CONSTRAINT `visits_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `loans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routes` ADD CONSTRAINT `routes_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routes` ADD CONSTRAINT `routes_loanId_fkey` FOREIGN KEY (`loanId`) REFERENCES `loans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_closings` ADD CONSTRAINT `daily_closings_closedByUserId_fkey` FOREIGN KEY (`closedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

