import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Crear usuario administrador por defecto
  const hashedPassword = await bcrypt.hash('admin123', 12);

  const adminUser = await prisma.usuario.upsert({
    where: { email: 'admin@hacienda.com' },
    update: {},
    create: {
      email: 'admin@hacienda.com',
      password: hashedPassword,
      nombre: 'Administrador',
      rol: 'ADMIN',
      activo: true,
    },
  });

  console.log('✅ Usuario administrador creado:', adminUser.email);

  // Crear configuración inicial del sistema
  const configuraciones = [
    {
      clave: 'TC_USD_BLUE',
      valor: '1200.00',
      descripcion: 'Tipo de cambio dólar blue por defecto',
    },
    {
      clave: 'IVA_DEFAULT',
      valor: '10.5',
      descripcion: 'IVA por defecto para operaciones',
    },
    {
      clave: 'EMPRESA_NOMBRE',
      valor: 'LA LOCHIEL',
      descripcion: 'Nombre del establecimiento',
    },
  ];

  for (const config of configuraciones) {
    await prisma.configuracion.upsert({
      where: { clave: config.clave },
      update: { valor: config.valor, descripcion: config.descripcion },
      create: config,
    });
  }

  console.log('✅ Configuraciones iniciales creadas');

  // Crear venta de ejemplo (opcional, solo para desarrollo)
  if (process.env.NODE_ENV === 'development') {
    const ventaEjemplo = await prisma.venta.create({
      data: {
        establecimiento: 'LA LOCHIEL',
        numeroInforme: 'General 2025',
        cliente: 'ZARCO MONICA',
        razonSocialComprador: 'ZARCO MONICA S.A.',
        fechaEmisionDTE: new Date('2024-01-15'),
        numeroDTE: 'DTE-2024-001',
        importeEmisionDTE: 150.00,
        tipoAnimal: 'Ovejas',
        descripAnimal: 'Ovejas de descarte',
        numeroTropa: 'TROPA-001',
        cantidadEnDTE: 300,
        fechaCargaDTE: new Date('2024-01-15'),
        fechaCargaReal: new Date('2024-01-16'),
        cantidadCargada: 290,
        cantidadRomaneo: 288,
        totalKgs: 8640.00,
        kiloLimpioPorCabeza: 30.00,
        precioKg: 2.50,
        importeEnUSD: 21600.00,
        tipoCambio: 1200.00,
        importeOriginal: 25920000.00,
        importeNeto: 25920000.00,
        iva: 10.5,
        totalOperacion: 28641600.00,
        retencion: 0.00,
        totalAPagar: 28641600.00,
        totalPagado: 0.00,
        formaPago: 'TRANSFERENCIA',
        dondeSeAcredita: 'CREDICOOP',
        observaciones: 'Venta de ejemplo para desarrollo',
        estado: 'PENDIENTE',
      },
    });

    console.log('✅ Venta de ejemplo creada:', ventaEjemplo.numeroDTE);
  }

  console.log('🎉 Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

