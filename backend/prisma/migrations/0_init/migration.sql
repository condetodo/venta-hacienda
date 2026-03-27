-- CreateEnum
CREATE TYPE "Establecimiento" AS ENUM ('LOCHIEL', 'CABO_CURIOSO');

-- CreateEnum
CREATE TYPE "MotivoVenta" AS ENUM ('FAENA', 'FAENA_UE', 'CRIA');

-- CreateEnum
CREATE TYPE "CategoriaAnimal" AS ENUM ('OVEJA', 'BORREGO', 'CORDERO', 'CAPON', 'CARNERO', 'BORREGA');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('DUT', 'REMITO_CAMPO', 'ROMANEO', 'LIQUIDACION', 'FACTURA', 'COMPROBANTE_PAGO', 'OTRO');

-- CreateEnum
CREATE TYPE "FormaPago" AS ENUM ('TRANSFERENCIA', 'EFECTIVO', 'CHEQUE', 'CHEQUE_ELECTRONICO');

-- CreateEnum
CREATE TYPE "Moneda" AS ENUM ('ARS', 'USD');

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('PENDIENTE', 'RETIRADO', 'EN_FRIGORIFICO', 'LIQUIDADO', 'FACTURADO', 'PAGO_PARCIAL', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('DIFERENCIA_CANTIDAD', 'DIFERENCIA_KILOS', 'PAGO_VENCIDO', 'DOCUMENTO_FALTANTE', 'ERROR_CALCULO', 'PRECIO_DISCREPANTE');

-- CreateEnum
CREATE TYPE "Severidad" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'USUARIO');

-- CreateTable
CREATE TABLE "Venta" (
    "id" TEXT NOT NULL,
    "establecimientoEmisor" "Establecimiento" NOT NULL,
    "numeroDUT" TEXT NOT NULL,
    "titularDestino" TEXT NOT NULL,
    "numeroRespaDestino" TEXT,
    "fechaEmisionDUT" TIMESTAMP(3) NOT NULL,
    "fechaCargaDUT" TIMESTAMP(3) NOT NULL,
    "fechaVencimientoDUT" TIMESTAMP(3),
    "motivo" TEXT NOT NULL,
    "categoria" "CategoriaAnimal" NOT NULL,
    "valorDUT" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valorGuia" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cantidadEnDUT" INTEGER NOT NULL,
    "fechaCargaReal" TIMESTAMP(3),
    "cantidadCargada" INTEGER,
    "cantidadRomaneo" INTEGER,
    "fechaRomaneo" TIMESTAMP(3),
    "tropa" TEXT,
    "totalKgs" DECIMAL(10,2),
    "kiloLimpioPorCabeza" DECIMAL(10,2),
    "precioKg" DECIMAL(10,2),
    "precioCabeza" DECIMAL(10,2),
    "importeEnUSD" DECIMAL(15,2),
    "tipoCambio" DECIMAL(10,4),
    "importeOriginal" DECIMAL(15,2),
    "importeNeto" DECIMAL(15,2),
    "iva" DECIMAL(5,2) NOT NULL DEFAULT 10.5,
    "totalOperacion" DECIMAL(15,2),
    "retencion" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "totalAPagar" DECIMAL(15,2),
    "totalPagado" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "sinFacturar" BOOLEAN NOT NULL DEFAULT false,
    "numeroFactura" TEXT,
    "formaPago" "FormaPago",
    "dondeSeAcredita" TEXT,
    "fechaPago" TIMESTAMP(3),
    "observaciones" TEXT,
    "estado" "EstadoVenta" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "datosExtraidos" JSONB,
    "procesadoOCR" BOOLEAN NOT NULL DEFAULT false,
    "fechaCarga" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "monto" DECIMAL(15,2) NOT NULL,
    "moneda" "Moneda" NOT NULL DEFAULT 'ARS',
    "tipoCambio" DECIMAL(10,4),
    "fecha" TIMESTAMP(3) NOT NULL,
    "formaPago" "FormaPago" NOT NULL,
    "referencia" TEXT,
    "dondeSeAcredita" TEXT,
    "comprobanteUrl" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "tipo" "TipoAlerta" NOT NULL,
    "mensaje" TEXT NOT NULL,
    "severidad" "Severidad" NOT NULL DEFAULT 'MEDIA',
    "resuelta" BOOLEAN NOT NULL DEFAULT false,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaResolucion" TIMESTAMP(3),

    CONSTRAINT "Alerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'ADMIN',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracion" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descripcion" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Venta_numeroDUT_key" ON "Venta"("numeroDUT");

-- CreateIndex
CREATE INDEX "Venta_numeroDUT_idx" ON "Venta"("numeroDUT");

-- CreateIndex
CREATE INDEX "Venta_titularDestino_idx" ON "Venta"("titularDestino");

-- CreateIndex
CREATE INDEX "Venta_estado_idx" ON "Venta"("estado");

-- CreateIndex
CREATE INDEX "Venta_fechaEmisionDUT_idx" ON "Venta"("fechaEmisionDUT");

-- CreateIndex
CREATE INDEX "Documento_ventaId_idx" ON "Documento"("ventaId");

-- CreateIndex
CREATE INDEX "Documento_tipo_idx" ON "Documento"("tipo");

-- CreateIndex
CREATE INDEX "Pago_ventaId_idx" ON "Pago"("ventaId");

-- CreateIndex
CREATE INDEX "Pago_fecha_idx" ON "Pago"("fecha");

-- CreateIndex
CREATE INDEX "Alerta_ventaId_idx" ON "Alerta"("ventaId");

-- CreateIndex
CREATE INDEX "Alerta_resuelta_idx" ON "Alerta"("resuelta");

-- CreateIndex
CREATE INDEX "Alerta_severidad_idx" ON "Alerta"("severidad");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_email_idx" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Configuracion_clave_key" ON "Configuracion"("clave");

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerta" ADD CONSTRAINT "Alerta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
