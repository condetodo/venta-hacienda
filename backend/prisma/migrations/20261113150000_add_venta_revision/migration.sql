-- CreateEnum
CREATE TYPE "OrigenCarga" AS ENUM ('MANUAL', 'ATLAS');

-- AlterTable
ALTER TABLE "Venta" ADD COLUMN     "atlasDocId" TEXT,
ADD COLUMN     "motivoRevision" TEXT,
ADD COLUMN     "origenCarga" "OrigenCarga" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "pendienteRevision" BOOLEAN NOT NULL DEFAULT false;

