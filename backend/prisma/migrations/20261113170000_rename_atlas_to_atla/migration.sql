-- El asistente se llama Atla, no Atlas
ALTER TYPE "OrigenCarga" RENAME VALUE 'ATLAS' TO 'ATLA';

-- RenameColumn
ALTER TABLE "Venta" RENAME COLUMN "atlasDocId" TO "atlaDocId";
