import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@aarigocapital.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Aarigo@2026';
  const adminName = process.env.SEED_ADMIN_NAME || 'System Administrator';
  const adminMobile = process.env.SEED_ADMIN_MOBILE || '9876543210';

  // 1. Seed Admin User
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      isActive: true,
    },
    create: {
      email: adminEmail,
      mobile: adminMobile,
      name: adminName,
      passwordHash,
      isActive: true,
    },
  });
  console.log(`✅ Admin user seeded: ${adminUser.email}`);

  // 2. Seed Loan Products
  const products = [
    {
      name: 'Daily Small Business Loan',
      description: 'Daily collection micro loan for local merchants and retailers',
      minAmount: new Prisma.Decimal(5000),
      maxAmount: new Prisma.Decimal(100000),
      interestRate: new Prisma.Decimal(18.0),
      interestType: 'FLAT' as const,
      defaultTenure: 100, // 100 days
      repaymentFrequency: 'DAILY' as const,
      processingFee: new Prisma.Decimal(500),
    },
    {
      name: 'Weekly Commercial Credit',
      description: 'Weekly repayment credit facility for working capital requirements',
      minAmount: new Prisma.Decimal(25000),
      maxAmount: new Prisma.Decimal(250000),
      interestRate: new Prisma.Decimal(16.0),
      interestType: 'FLAT' as const,
      defaultTenure: 26, // 26 weeks (~6 months)
      repaymentFrequency: 'WEEKLY' as const,
      processingFee: new Prisma.Decimal(1000),
    },
    {
      name: 'Monthly Personal Loan',
      description: 'Monthly reducing balance loan for salaried individuals and entrepreneurs',
      minAmount: new Prisma.Decimal(50000),
      maxAmount: new Prisma.Decimal(1000000),
      interestRate: new Prisma.Decimal(14.5),
      interestType: 'REDUCING' as const,
      defaultTenure: 12, // 12 months
      repaymentFrequency: 'MONTHLY' as const,
      processingFee: new Prisma.Decimal(2000),
    },
  ];

  for (const prod of products) {
    await prisma.loanProduct.upsert({
      where: { name: prod.name },
      update: prod,
      create: prod,
    });
  }
  console.log(`✅ ${products.length} loan products seeded`);

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
