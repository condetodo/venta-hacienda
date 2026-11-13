// Crea un usuario administrador o resetea su contraseña.
//
// Uso (desde la raíz del repo, ya compilado):
//   npm run user:set -- <email> <nombre>
// La contraseña se pide por teclado. También se puede pasar por la variable
// de entorno USER_PASSWORD para usos no interactivos.
import bcrypt from 'bcryptjs';
import readline from 'readline';
import { prisma } from '../config/database';

const MIN_PASSWORD_LENGTH = 6; // el formulario de login exige lo mismo

const ask = (question: string): Promise<string> => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
};

const main = async (): Promise<void> => {
  const [email, ...nombreParts] = process.argv.slice(2);
  const nombre = nombreParts.join(' ').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Uso: npm run user:set -- <email> <nombre>');
    console.error('El email debe ser válido (el login lo exige).');
    process.exit(1);
  }

  const existing = await prisma.usuario.findUnique({ where: { email } });
  if (!existing && !nombre) {
    console.error('El usuario no existe: indicá también el nombre para crearlo.');
    process.exit(1);
  }

  const password = process.env.USER_PASSWORD || (await ask('Contraseña nueva: '));
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 12);

  if (existing) {
    await prisma.usuario.update({
      where: { email },
      data: { password: hashed, activo: true, ...(nombre ? { nombre } : {}) },
    });
    console.log(`✅ Contraseña actualizada para ${email}`);
  } else {
    await prisma.usuario.create({
      data: { email, password: hashed, nombre, rol: 'ADMIN' },
    });
    console.log(`✅ Usuario administrador creado: ${email}`);
  }
};

main()
  .catch((error) => {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
