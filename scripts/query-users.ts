import prisma from '../src/config/prisma.ts';

async function main() {
  const users = await prisma.user.findMany({
    where: { role: { in: ['CUSTOMER', 'ADMIN'] } },
    select: { id: true, email: true, nickname: true, role: true },
    take: 10,
  });
  console.log(JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
