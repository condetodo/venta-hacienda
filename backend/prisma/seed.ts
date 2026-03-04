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
  // Comentado porque requiere muchos campos obligatorios del nuevo schema
  // if (process.env.NODE_ENV === 'development') {
  //   const ventaEjemplo = await prisma.venta.create({
  //     data: {
  //       establecimientoEmisor: 'LOCHIEL',
  //       numeroDUT: 'DUT-2024-001',
  //       titularDestino: 'ZARCO MONICA',
  //       numeroRespaDestino: '12345',
  //       fechaEmisionDUT: new Date('2024-01-15'),
  //       fechaCargaDUT: new Date('2024-01-15'),
  //       motivo: 'FAENA',
  //       categoria: 'OVEJA',
  //       valorDUT: 150.00,
  //       valorGuia: 0.00,
  //       cantidadEnDUT: 300,
  //       iva: 10.5,
  //       retencion: 0.00,
  //       totalPagado: 0.00,
  //       sinFacturar: false,
  //       estado: 'PENDIENTE',
  //     },
  //   });
  //   console.log('✅ Venta de ejemplo creada:', ventaEjemplo.numeroDUT);
  // }

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

