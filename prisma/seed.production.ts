/**
 * 배포(프로덕션)용 시드
 * - 기존 데이터 삭제(TRUNCATE) 없음
 * - 관리자 계정이 없을 때만 1명 생성 (env로 이메일/비밀번호 설정)
 * - 실행: pnpm prisma:seed:production (또는 NODE_ENV=production에서만 실행하도록 배포 스크립트에서 호출)
 */
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 [배포용] 시드 실행 (기존 데이터 유지)\n");

  const adminEmail =
    process.env.ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? "admin@fit-match.co.kr";
  const adminPassword =
    process.env.ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const adminNickname =
    process.env.ADMIN_NICKNAME ?? process.env.SEED_ADMIN_NICKNAME ?? "관리자";
  const adminPhone =
    process.env.ADMIN_PHONE ?? process.env.SEED_ADMIN_PHONE ?? "01000000000";

  const existingAdmin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
  });

  if (existingAdmin) {
    console.log("✅ 이미 관리자 계정이 존재합니다. (추가 생성 없음)");
    console.log(`   기존 관리자 이메일: ${existingAdmin.email}\n`);
    return;
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      nickname: adminNickname,
      phone: adminPhone.replace(/\D/g, "").slice(0, 11),
      role: UserRole.ADMIN,
    },
  });

  console.log("✅ 관리자 계정 1명 생성 완료");
  console.log(`   이메일: ${adminEmail}`);
  console.log(
    "   비밀번호: 환경변수(ADMIN_PASSWORD 또는 SEED_ADMIN_PASSWORD)로 설정한 값. 미설정 시 기본값 사용."
  );
  console.log("   ⚠️  배포 후 반드시 비밀번호를 변경하세요.\n");
}

main()
  .catch((e) => {
    console.error("❌ 배포용 시드 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
