import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User } from '../src/database/entities/user.entity';
import { OtpCode } from '../src/database/entities/otp-code.entity';
import { PasswordResetToken } from '../src/database/entities/password-reset-token.entity';
import { Role, UserStatus } from '../src/common/enums/role.enum';

dotenv.config();

const BCRYPT_ROUNDS = 12;

const EMAIL = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@disaster-portal.test';
const PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'Sup3rAdmin!23';
const NAME = process.env.SEED_SUPER_ADMIN_NAME ?? 'Super Admin';

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'disaster_portal',
    entities: [User, OtpCode, PasswordResetToken],
  });
  await dataSource.initialize();

  const users = dataSource.getRepository(User);
  const existing = await users.findOne({ where: { email: EMAIL } });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`Super Admin already exists: ${EMAIL}`);
    await dataSource.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);
  await users.save(
    users.create({
      name: NAME,
      email: EMAIL,
      password_hash: passwordHash,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    }),
  );

  // eslint-disable-next-line no-console
  console.log('Super Admin account created:');
  // eslint-disable-next-line no-console
  console.log(`  email:    ${EMAIL}`);
  // eslint-disable-next-line no-console
  console.log(`  password: ${PASSWORD}`);

  await dataSource.destroy();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seeding failed:', err);
  process.exit(1);
});
