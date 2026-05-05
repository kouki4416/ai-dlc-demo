import { PrismaClient, UserRole, CycleStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'AdminPass123!';
  const adminName = process.env.SEED_ADMIN_NAME ?? 'System Admin';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  let adminId: string;
  if (existing) {
    adminId = existing.id;
    console.log(`[seed] admin already exists: ${adminEmail}`);
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: adminName,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });
    adminId = admin.id;
    console.log(`[seed] created admin: ${adminEmail} / ${adminPassword}`);
  }

  const openCycle = await prisma.cycle.findFirst({ where: { status: CycleStatus.OPEN } });
  if (!openCycle) {
    const now = new Date();
    const cycle = await prisma.cycle.create({
      data: {
        name: '2026 Q2 Ideation Cycle',
        status: CycleStatus.OPEN,
        startsAt: now,
        endsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        createdById: adminId,
      },
    });
    console.log(`[seed] created cycle: ${cycle.name} (id=${cycle.id})`);
  } else {
    console.log(`[seed] OPEN cycle already exists: ${openCycle.name}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error('[seed] failed:', err);
    await prisma.$disconnect();
    process.exit(1);
  });
