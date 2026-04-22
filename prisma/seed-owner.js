import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/db.js';
import { normalizePhoneNumber } from '../src/utils/phone.js';

const requiredEnv = ['INIT_OWNER_NAME', 'INIT_OWNER_PHONE', 'INIT_OWNER_PASSWORD'];

const missing = requiredEnv.filter((key) => !process.env[key] || process.env[key].trim() === '');
if (missing.length > 0) {
  console.error('Missing required environment variables:', missing.join(', '));
  console.error('Set INIT_OWNER_NAME, INIT_OWNER_PHONE, INIT_OWNER_PASSWORD and run the script again.');
  process.exit(1);
}

const run = async () => {
  const ownerName = process.env.INIT_OWNER_NAME.trim();
  const ownerPhoneRaw = process.env.INIT_OWNER_PHONE;
  const ownerPassword = process.env.INIT_OWNER_PASSWORD;

  const ownerPhoneNormalized = normalizePhoneNumber(ownerPhoneRaw);
  if (!ownerPhoneNormalized) {
    console.error('INIT_OWNER_PHONE is invalid. It must contain 7-15 digits (separators are allowed).');
    process.exit(1);
  }

  const existingByPhone = await prisma.user.findUnique({
    where: { phone_number: ownerPhoneNormalized }
  });

  if (existingByPhone) {
    if (existingByPhone.role === 'OWNER') {
      console.log('Bootstrap skipped: OWNER already exists for this phone number.');
      return;
    }

    console.error('Bootstrap aborted: this phone number already belongs to a TEAM_MEMBER.');
    process.exit(1);
  }

  const ownerCount = await prisma.user.count({ where: { role: 'OWNER' } });
  if (ownerCount > 0 && process.env.ALLOW_ADDITIONAL_OWNER !== 'true') {
    console.error('Bootstrap aborted: an OWNER already exists.');
    console.error('Use the existing OWNER account to create staff through /api/users/register.');
    console.error('If you intentionally need another OWNER via script, set ALLOW_ADDITIONAL_OWNER=true.');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(ownerPassword, 10);

  const owner = await prisma.user.create({
    data: {
      name: ownerName,
      phone_number: ownerPhoneNormalized,
      password: hashedPassword,
      role: 'OWNER'
    }
  });

  console.log('OWNER bootstrap completed successfully.');
  console.log(`Owner ID: ${owner.id}`);
  console.log(`Owner Phone: ${owner.phone_number}`);
};

run()
  .catch((error) => {
    console.error('OWNER bootstrap failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
