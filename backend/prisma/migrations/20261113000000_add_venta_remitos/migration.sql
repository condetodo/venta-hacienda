-- AlterTable: soporte de múltiples remitos por venta
ALTER TABLE "Venta" ADD COLUMN IF NOT EXISTS "remitos" JSONB;
