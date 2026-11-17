-- Los archivos de los documentos pasan a guardarse en Postgres (antes Supabase Storage)

-- CreateTable
CREATE TABLE "DocumentoArchivo" (
    "documentoId" TEXT NOT NULL,
    "contenido" BYTEA NOT NULL,

    CONSTRAINT "DocumentoArchivo_pkey" PRIMARY KEY ("documentoId")
);

-- AddForeignKey
ALTER TABLE "DocumentoArchivo" ADD CONSTRAINT "DocumentoArchivo_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "Documento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
