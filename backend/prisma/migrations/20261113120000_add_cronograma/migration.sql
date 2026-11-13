-- CreateEnum
CREATE TYPE "EstadoCarga" AS ENUM ('PROGRAMADA', 'CARGADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "CargaProgramada" (
    "id" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "categoria" TEXT NOT NULL,
    "comprador" TEXT NOT NULL,
    "origen" TEXT,
    "condiciones" TEXT,
    "notas" TEXT,
    "estado" "EstadoCarga" NOT NULL DEFAULT 'PROGRAMADA',
    "ventaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CargaProgramada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CargaProgramada_fecha_idx" ON "CargaProgramada"("fecha");

-- CreateIndex
CREATE INDEX "CargaProgramada_comprador_idx" ON "CargaProgramada"("comprador");

-- AddForeignKey
ALTER TABLE "CargaProgramada" ADD CONSTRAINT "CargaProgramada_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
