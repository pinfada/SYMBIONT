// Seed réel — crée un utilisateur administrateur initial à partir des
// variables d'environnement. Aucune donnée fictive n'est insérée.
//
// Usage :
//   SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD=... npm run seed
import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log(
      'Seed ignoré : définissez SEED_ADMIN_EMAIL et SEED_ADMIN_PASSWORD pour créer un utilisateur initial.'
    );
    return;
  }

  if (password.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD doit faire au moins 12 caractères.');
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`Utilisateur ${email} déjà présent — rien à faire.`);
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        username: process.env.SEED_ADMIN_USERNAME || email.split('@')[0],
        password: hashed
      }
    });
    console.log(`Utilisateur initial créé : ${user.email} (${user.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Seed échoué :', error);
  process.exit(1);
});
