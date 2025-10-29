# Sistema de Gestión de Venta de Hacienda Ovina

## 1. CONTEXTO DEL NEGOCIO

### Objetivo
Plataforma administrativa interna para gestionar el ciclo completo de venta de hacienda ovina desde la emisión del DTE hasta el cobro final.

### Usuarios
- 1-2 usuarios simultáneos (uso interno administrativo)
- 3-4 transacciones por día (no todos los días)
- Sistema para el dueño de la empresa

### Flujo completo del proceso

#### 1. Venta inicial
Se pacta la venta: 300 ovejas a $X/kg con condiciones de pago específicas.

#### 2. Emisión DUT (Documento Único de Tránsito)
- Se genera DUT en SIGSA/AFIP que autoriza el traslado de 300 ovejas
- El DUT se descarga como PDF
- **Costo**: La emisión del DUT tiene un cargo que debe registrarse

#### 3. Retiro del campo
- Encargado de campo completa remito de salida
- **Posible discrepancia**: Pueden cargar solo 290 ovejas (no las 300 autorizadas)
- Se documenta la cantidad real que sale del establecimiento

#### 4. Recepción y faena en frigorífico
- Frigorífico recibe los animales
- Realiza la faena y genera romaneo
- **Posible discrepancia**: Reciben 288 animales (menos que las 290 que salieron)
- Romaneo incluye: cantidad de animales + kilos totales obtenidos
- **Formato variable**: Puede ser PDF o imagen con letra manuscrita

#### 5. Liquidación del frigorífico
- Frigorífico emite liquidación final con:
  - Cantidad de animales faenados
  - Kilos totales
  - Precio por kilo
  - Cálculo final del monto
- **Control crítico**: Validar que coincida con lo pactado

#### 6. Seguimiento financiero
- Registro de pagos según condiciones (ej: 50% contra entrega, 50% a 30 días)
- Control de saldo pendiente
- Comprobantes de pago

### Puntos críticos del sistema

#### Triple control de cantidades
- **DUT**: 300 ovejas (autorizadas)
- **Remito**: 290 ovejas (cargadas realmente)
- **Romaneo**: 288 ovejas (recibidas y faenadas)
- El sistema debe alertar todas las discrepancias

#### Documentación completa
Cada venta tiene documentos asociados:
1. DUT (PDF)
2. Remito de campo (foto/PDF)
3. Romaneo (PDF o imagen manuscrita)
4. Liquidación del frigorífico (PDF)
5. Factura (si corresponde)
6. Comprobantes de pago (varios)

#### Cálculos financieros complejos
- Precios en USD con conversión a ARS según TC del día
- IVA 10.5%
- Retenciones impositivas
- Costo de emisión DUT
- Costo de guía (solo Lochiel)
- Pagos parciales

---

## 2. STACK TECNOLÓGICO

### Frontend
- **React 18** - Framework UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **React Router DOM** - Enrutamiento
- **Tailwind CSS** - Estilos utilitarios
- **Shadcn/ui** - Componentes UI
- **React Hook Form** - Manejo de formularios complejos
- **Zod** - Validación de schemas
- **Axios** - Cliente HTTP
- **Lucide React** - Iconografía
- **XLSX** - Importar/exportar Excel
- **Recharts** - Gráficos (fase analytics)
- **date-fns** - Manejo de fechas

### Backend
- **Node.js** - Runtime
- **Express** - Framework web
- **TypeScript** - Tipado estático
- **Prisma ORM** - Mapeo objeto-relacional
- **JWT** - Autenticación basada en tokens
- **bcryptjs** - Encriptación de contraseñas
- **Multer** - Middleware para upload de archivos
- **CORS** - Cross-origin resource sharing
- **decimal.js** - Cálculos financieros precisos
- **pdf-parse** - Parsear PDFs del DTE (futuro)

### Procesamiento de documentos (Fase 2)
- **tesseract.js** - OCR para romaneos manuscritos
- **sharp** - Preprocesamiento de imágenes

### Base de Datos

#### Desarrollo Local
- **Supabase** (PostgreSQL local + Storage)
- Levantado con Supabase CLI
- PostgreSQL en `localhost:54322`
- Storage API en `localhost:54321`

#### Producción
- **Railway PostgreSQL** - Base de datos principal
- **Supabase Storage** - Almacenamiento de archivos (gratuito, 1GB)

### Servicios Externos
- **API Dólar**: dolarapi.com o bluelytics (gratuitas)
  - Cotizaciones: Blue, MEP, CCL, Oficial

### Despliegue
- **Railway** - Backend + PostgreSQL de producción
- **Vercel** - Frontend de producción
- **Supabase** - PostgreSQL + Storage de desarrollo, Storage de producción

---

## 3. MODELO DE DATOS

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// MODELO PRINCIPAL: VENTA
// ============================================

model Venta {
  id                    String      @id @default(uuid())
  
  // === INFORMACIÓN GENERAL DEL DUT ===
  establecimientoEmisor Establecimiento // "LOCHIEL" o "CABO_CURIOSO"
  numeroDUT             String      @unique // Número del DUT emitido
  titularDestino        String      // Cliente que compra
  numeroRespaDestino    String?     // Número sanitario del establecimiento comprador
  fechaEmisionDUT       DateTime    // Fecha de emisión del DUT
  fechaCargaDUT         DateTime    // Fecha de carga del DUT
  fechaVencimientoDUT   DateTime?   // Fecha de vencimiento del DUT
  motivo                MotivoVenta // FAENA, FAENA_UE, CRIA
  categoria             CategoriaAnimal // OVEJA, BORREGO, CORDERO, etc.
  valorDUT              Decimal     @default(0) @db.Decimal(10, 2) // Costo de emisión del DUT
  valorGuia             Decimal     @default(0) @db.Decimal(10, 2) // Costo de guía (solo Lochiel)
  
  // === CONTROL DE CANTIDADES (Triple control) ===
  cantidadEnDUT         Int         // Cantidad autorizada en el DUT (ej: 300)
  
  fechaCargaReal        DateTime?   // Fecha real del remito (puede coincidir con DUT)
  cantidadCargada       Int?        // Cantidad real retirada del campo (ej: 290)
  
  cantidadRomaneo       Int?        // Cantidad recibida en frigorífico (ej: 288)
  
  // === FAENA ===
  totalKgs              Decimal?    @db.Decimal(10, 2) // Kilos totales obtenidos (ej: 8640.00)
  kiloLimpioPorCabeza   Decimal?    @db.Decimal(10, 2) // Peso promedio por animal (ej: 30.00)
  
  // === PRECIOS Y CÁLCULOS ===
  precioKg              Decimal?    @db.Decimal(10, 2) // Precio por kilo en USD
  precioCabeza          Decimal?    @db.Decimal(10, 2) // Precio por unidad (si aplica)
  importeEnUSD          Decimal?    @db.Decimal(15, 2) // Total en dólares
  
  tipoCambio            Decimal?    @db.Decimal(10, 4) // TC al momento del pago/cierre (ej: 1220.5000)
  importeOriginal       Decimal?    @db.Decimal(15, 2) // Importe en pesos (USD × TC)
  importeNeto           Decimal?    @db.Decimal(15, 2) // Importe neto después de ajustes
  
  // === FACTURACIÓN ===
  iva                   Decimal     @default(10.5) @db.Decimal(5, 2) // IVA 10.5%
  totalOperacion        Decimal?    @db.Decimal(15, 2) // Total con IVA incluido
  retencion             Decimal     @default(0) @db.Decimal(15, 2) // Retenciones impositivas
  
  totalAPagar           Decimal?    @db.Decimal(15, 2) // Neto final a cobrar
  totalPagado           Decimal     @default(0) @db.Decimal(15, 2) // Lo que ya se pagó
  
  sinFacturar           Boolean     @default(false) // Flag: esta operación no lleva factura
  numeroFactura         String?     // N° de factura emitida
  
  // === INFORMACIÓN DE PAGO ===
  formaPago             FormaPago?  // Transferencia, Efectivo, Cheque
  dondeSeAcredita       String?     // Banco/cuenta donde se acredita (ej: "CREDICOOP")
  fechaPago             DateTime?   // Fecha del pago principal
  
  // === ADICIONALES ===
  observaciones         String?     @db.Text
  
  // === ESTADO DEL CICLO DE VENTA ===
  estado                EstadoVenta @default(PENDIENTE)
  
  // === RELACIONES ===
  documentos            Documento[]
  pagos                 Pago[]      // Para registrar pagos parciales
  alertas               Alerta[]
  
  // === TIMESTAMPS ===
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt
  
  @@index([numeroDUT])
  @@index([titularDestino])
  @@index([estado])
  @@index([fechaEmisionDUT])
}

// ============================================
// DOCUMENTOS ASOCIADOS
// ============================================

model Documento {
  id              String          @id @default(uuid())
  ventaId         String
  venta           Venta           @relation(fields: [ventaId], references: [id], onDelete: Cascade)
  
  tipo            TipoDocumento
  nombreArchivo   String          // Nombre original del archivo
  url             String          // URL en Supabase Storage
  mimeType        String          // image/jpeg, application/pdf, etc
  tamano          Int             // Tamaño en bytes
  
  // OCR (para romaneos manuscritos - Fase 2)
  datosExtraidos  Json?           // Datos extraídos con OCR
  procesadoOCR    Boolean         @default(false)
  
  fechaCarga      DateTime        @default(now())
  
  @@index([ventaId])
  @@index([tipo])
}

// ============================================
// PAGOS (Parciales o totales)
// ============================================

model Pago {
  id              String      @id @default(uuid())
  ventaId         String
  venta           Venta       @relation(fields: [ventaId], references: [id], onDelete: Cascade)
  
  monto           Decimal     @db.Decimal(15, 2)
  moneda          Moneda      @default(ARS)
  tipoCambio      Decimal?    @db.Decimal(10, 4) // Si el pago es en USD
  
  fecha           DateTime
  formaPago       FormaPago
  referencia      String?     // N° de cheque, transferencia, etc
  dondeSeAcredita String?     // Banco/cuenta
  
  comprobanteUrl  String?     // URL del comprobante en Storage
  observaciones   String?
  
  createdAt       DateTime    @default(now())
  
  @@index([ventaId])
  @@index([fecha])
}

// ============================================
// SISTEMA DE ALERTAS
// ============================================

model Alerta {
  id              String      @id @default(uuid())
  ventaId         String
  venta           Venta       @relation(fields: [ventaId], references: [id], onDelete: Cascade)
  
  tipo            TipoAlerta
  mensaje         String      @db.Text
  severidad       Severidad   @default(MEDIA)
  resuelta        Boolean     @default(false)
  
  fechaCreacion   DateTime    @default(now())
  fechaResolucion DateTime?
  
  @@index([ventaId])
  @@index([resuelta])
  @@index([severidad])
}

// ============================================
// USUARIOS (Sistema interno)
// ============================================

model Usuario {
  id              String      @id @default(uuid())
  email           String      @unique
  password        String      // Hash con bcryptjs
  nombre          String
  rol             RolUsuario  @default(ADMIN)
  activo          Boolean     @default(true)
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  @@index([email])
}

// ============================================
// CONFIGURACIÓN DEL SISTEMA
// ============================================

model Configuracion {
  id              String      @id @default(uuid())
  clave           String      @unique  // Ej: "TC_USD_BLUE"
  valor           String      // Valor de la configuración
  descripcion     String?
  
  updatedAt       DateTime    @updatedAt
}

// ============================================
// ENUMS
// ============================================

enum Establecimiento {
  LOCHIEL              // Establecimiento Lochiel
  CABO_CURIOSO         // Establecimiento Cabo Curioso
}

enum MotivoVenta {
  FAENA                // Para faena
  FAENA_UE             // Para faena UE
  CRIA                 // Para cría
}

enum CategoriaAnimal {
  OVEJA                // Oveja
  BORREGO              // Borrego
  CORDERO              // Cordero
  CAPON                // Capón
  CARNERO               // Carnero
  BORREGA              // Borrega
}

enum TipoDocumento {
  DUT                  // PDF del DUT emitido por SIGSA
  REMITO_CAMPO         // Remito de salida del campo
  ROMANEO              // Romaneo del frigorífico (PDF o imagen)
  LIQUIDACION          // Liquidación del frigorífico
  FACTURA              // Factura emitida
  COMPROBANTE_PAGO     // Comprobante de pago
  OTRO                 // Otros documentos
}

enum FormaPago {
  TRANSFERENCIA        // Transferencia bancaria
  EFECTIVO             // Efectivo
  CHEQUE               // Cheque físico
  CHEQUE_ELECTRONICO   // E-CHEQ
}

enum Moneda {
  ARS                  // Pesos argentinos
  USD                  // Dólares estadounidenses
}

enum EstadoVenta {
  PENDIENTE           // Recién creada, DUT emitido
  RETIRADO            // Animales retirados del campo
  EN_FRIGORIFICO      // En proceso de faena
  LIQUIDADO           // Liquidación recibida del frigorífico
  FACTURADO           // Factura emitida
  PAGO_PARCIAL        // Pagos parciales realizados
  FINALIZADO          // Todo pagado y cerrado
  CANCELADO           // Operación cancelada
}

enum TipoAlerta {
  DIFERENCIA_CANTIDAD     // Discrepancia entre DUT, remito y romaneo
  DIFERENCIA_KILOS        // Kilos esperados vs recibidos
  PAGO_VENCIDO           // Pago vencido según condiciones
  DOCUMENTO_FALTANTE     // Falta documentación requerida
  ERROR_CALCULO          // Error en liquidación o cálculos
  PRECIO_DISCREPANTE     // Precio en liquidación difiere del pactado
}

enum Severidad {
  BAJA                // Informativa, no requiere acción inmediata
  MEDIA               // Requiere atención
  ALTA                // Requiere acción pronta
  CRITICA             // Requiere acción inmediata
}

enum RolUsuario {
  ADMIN               // Acceso total
  USUARIO             // Acceso limitado (futuro)
}
```

---

## 4. REGLAS DE NEGOCIO

### Cálculos automáticos

```typescript
// 1. Conversión USD a ARS
importeOriginal = importeEnUSD * tipoCambio

// 2. Cálculo de total con IVA
totalOperacion = importeNeto * (1 + iva / 100)

// 3. Cálculo de neto a cobrar
totalAPagar = totalOperacion - retencion - valorDUT - valorGuia

// 4. Saldo pendiente
saldoPendiente = totalAPagar - totalPagado

// 5. Peso promedio por animal
kiloLimpioPorCabeza = totalKgs / cantidadRomaneo

// 6. Total en USD por kilos
importeEnUSD = totalKgs * precioKg
```

### Alertas automáticas

El sistema debe generar alertas cuando:

#### DIFERENCIA_CANTIDAD
```typescript
if (cantidadEnDUT !== cantidadCargada) {
  crearAlerta({
    tipo: 'DIFERENCIA_CANTIDAD',
    mensaje: `DUT autorizó ${cantidadEnDUT} animales pero solo se cargaron ${cantidadCargada}`,
    severidad: diferencia > 10 ? 'ALTA' : 'MEDIA'
  });
}

if (cantidadCargada !== cantidadRomaneo) {
  crearAlerta({
    tipo: 'DIFERENCIA_CANTIDAD',
    mensaje: `Se cargaron ${cantidadCargada} animales pero frigorífico recibió ${cantidadRomaneo}`,
    severidad: diferencia > 5 ? 'ALTA' : 'MEDIA'
  });
}
```

#### PAGO_VENCIDO
```typescript
if (fechaPagoEstimada < hoy && saldoPendiente > 0) {
  crearAlerta({
    tipo: 'PAGO_VENCIDO',
    mensaje: `Pago vencido desde ${fechaPagoEstimada}. Saldo: $${saldoPendiente}`,
    severidad: 'ALTA'
  });
}
```

#### DOCUMENTO_FALTANTE
```typescript
if (estado === 'LIQUIDADO' && !tieneDocumento('ROMANEO')) {
  crearAlerta({
    tipo: 'DOCUMENTO_FALTANTE',
    mensaje: 'Falta cargar romaneo del frigorífico',
    severidad: 'MEDIA'
  });
}
```

#### PRECIO_DISCREPANTE
```typescript
const precioLiquidacion = liquidacion.importeTotal / liquidacion.kilos;
if (Math.abs(precioLiquidacion - precioKg) > 0.10) { // Diferencia > $0.10/kg
  crearAlerta({
    tipo: 'PRECIO_DISCREPANTE',
    mensaje: `Precio pactado: $${precioKg}/kg. Precio liquidación: $${precioLiquidacion}/kg`,
    severidad: 'ALTA'
  });
}
```

### Validaciones de estado

```typescript
// No se puede marcar como LIQUIDADO sin romaneo
if (nuevoEstado === 'LIQUIDADO' && !tieneDocumento('ROMANEO')) {
  throw new Error('No se puede liquidar sin romaneo del frigorífico');
}

// No se puede marcar como FINALIZADO si hay saldo pendiente
if (nuevoEstado === 'FINALIZADO' && saldoPendiente > 0) {
  throw new Error(`Saldo pendiente: $${saldoPendiente}. No se puede finalizar.`);
}

// No se puede marcar como FACTURADO si no tiene número de factura
if (nuevoEstado === 'FACTURADO' && !numeroFactura && !sinFacturar) {
  throw new Error('Debe ingresar número de factura o marcar como "Sin Facturar"');
}
```

### Validaciones de datos

```typescript
// Tipo de cambio debe ser positivo
if (tipoCambio <= 0) {
  throw new Error('Tipo de cambio debe ser mayor a 0');
}

// Cantidades no pueden ser negativas
if (cantidadEnDUT < 0 || cantidadCargada < 0) {
  throw new Error('Las cantidades no pueden ser negativas');
}

// Precios deben ser positivos
if (precioKg <= 0) {
  throw new Error('El precio por kilo debe ser mayor a 0');
}

// Total pagado no puede superar total a pagar
if (totalPagado > totalAPagar) {
  throw new Error('El total pagado no puede superar el total a pagar');
}
```

---

## 5. FUNCIONALIDADES PRINCIPALES

### MVP - Fase 1 (Semanas 1-6)

#### ✅ Autenticación y usuarios
- Login con JWT
- Gestión básica de usuarios (CRUD)

#### ✅ CRUD de ventas
- Formulario completo de venta con todos los campos
- Validaciones en tiempo real
- Cálculos automáticos

#### ✅ Upload y gestión de documentos
- Subir DTE, remito, romaneo, liquidación, facturas, comprobantes
- Visualizar documentos (PDF inline, imágenes)
- Descargar documentos
- Eliminar documentos

#### ✅ Sistema de alertas
- Generación automática de alertas por discrepancias
- Panel de alertas pendientes
- Marcar alertas como resueltas
- Filtrado por severidad

#### ✅ Control de estados
- Workflow del ciclo de venta
- Transición de estados con validaciones
- Historial de cambios de estado

#### ✅ Registro de pagos
- CRUD de pagos parciales/totales
- Cálculo automático de saldo pendiente
- Upload de comprobantes de pago

#### ✅ Integración con API de dólar
- Actualización automática del tipo de cambio
- Cache de cotización (renovar cada 1 hora)
- Selector de tipo de dólar (Blue, MEP, CCL, Oficial)
- Conversión automática USD ↔ ARS

#### ✅ Dashboard básico
- Resumen de ventas activas
- Total vendido en el mes
- Total por cobrar
- Alertas pendientes (top 5)
- Gráfico simple de ventas por mes

#### ✅ Lista de ventas
- Tabla con paginación
- Filtros por:
  - Estado
  - Cliente
  - Rango de fechas
  - Tipo de animal
- Búsqueda por número de DTE
- Ordenamiento por columnas
- Exportar a Excel

### Fase 2 - Futuro (Semanas 7+)

#### 🔄 OCR para romaneos
- Procesamiento automático de romaneos manuscritos
- Extracción de cantidad y kilos
- Revisión manual antes de guardar

#### 📊 Reportes y analytics
- Reportes detallados por período
- Análisis de frigoríficos (mejor rendimiento)
- Análisis de clientes (más recurrentes)
- Gráficos de evolución de precios
- Exportación de reportes a PDF

#### 📧 Notificaciones
- Email de vencimientos de pago
- Alertas por WhatsApp (integración)

#### 🔗 Integraciones externas
- SIGSA/ARCA (si APIs disponibles)
- Facturación electrónica AFIP

---

## 6. CONFIGURACIÓN DE AMBIENTES

### Desarrollo Local

**Stack:**
- PostgreSQL: Supabase local (puerto 54322)
- Storage: Supabase Storage local (puerto 54321)
- Backend: http://localhost:3000
- Frontend: http://localhost:5173

**Levantar entorno:**
```bash
# 1. Iniciar Supabase (PostgreSQL + Storage)
supabase start

# 2. Backend
cd backend
npm install
cp .env.example .env.local
# Editar .env.local con credenciales locales
npm run db:push
npm run dev

# 3. Frontend
cd frontend
npm install
cp .env.example .env.local
# Editar .env.local
npm run dev
```

### Producción

**Stack:**
- PostgreSQL: Railway
- Storage: Supabase Storage (plan gratuito)
- Backend: Railway (https://tu-backend.railway.app)
- Frontend: Vercel (https://tu-app.vercel.app)

**Deploy:**
- Backend: Conectar repo a Railway, setear variables de entorno
- Frontend: Conectar repo a Vercel, setear variables de entorno

---

## 7. VARIABLES DE ENTORNO

### Backend - `.env.local` (Desarrollo)

```env
# Database - Supabase local
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# JWT
JWT_SECRET="dev-secret-muy-seguro-cambiar-en-produccion"
JWT_EXPIRES_IN="7d"

# Supabase Storage - Local
SUPABASE_URL="http://localhost:54321"
SUPABASE_ANON_KEY="tu-anon-key-local-de-supabase"
SUPABASE_SERVICE_KEY="tu-service-role-key-local"
SUPABASE_STORAGE_BUCKET="documentos-hacienda"

# API Externa
DOLAR_API_URL="https://dolarapi.com/v1"

# Server
PORT=3000
NODE_ENV="development"

# CORS
FRONTEND_URL="http://localhost:5173"
```

### Backend - `.env.production` (Railway)

```env
# Database - Railway PostgreSQL
DATABASE_URL="${DATABASE_URL}"  # Variable automática de Railway

# JWT
JWT_SECRET="${JWT_SECRET}"  # Setear manualmente en Railway
JWT_EXPIRES_IN="7d"

# Supabase Storage - Producción
SUPABASE_URL="${SUPABASE_URL}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY}"
SUPABASE_STORAGE_BUCKET="documentos-hacienda"

# API Externa
DOLAR_API_URL="https://dolarapi.com/v1"

# Server
PORT="${PORT}"
NODE_ENV="production"

# CORS
FRONTEND_URL="https://tu-app.vercel.app"
```

### Frontend - `.env.local` (Desarrollo)

```env
VITE_API_URL="http://localhost:3000/api"
VITE_SUPABASE_URL="http://localhost:54321"
VITE_SUPABASE_ANON_KEY="tu-anon-key-local"
```

### Frontend - `.env.production` (Vercel)

```env
VITE_API_URL="https://tu-backend.railway.app/api"
VITE_SUPABASE_URL="https://tu-proyecto.supabase.co"
VITE_SUPABASE_ANON_KEY="tu-anon-key-produccion"
```

### Archivos `.env.example` (commitear)

Crear plantillas sin valores sensibles:

**backend/.env.example:**
```env
DATABASE_URL="postgresql://user:password@host:port/database"
JWT_SECRET="cambiar-por-secret-seguro"
JWT_EXPIRES_IN="7d"
SUPABASE_URL="http://localhost:54321"
SUPABASE_ANON_KEY="tu-anon-key"
SUPABASE_SERVICE_KEY="tu-service-key"
SUPABASE_STORAGE_BUCKET="documentos-hacienda"
DOLAR_API_URL="https://dolarapi.com/v1"
PORT=3000
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"
```

**frontend/.env.example:**
```env
VITE_API_URL="http://localhost:3000/api"
VITE_SUPABASE_URL="http://localhost:54321"
VITE_SUPABASE_ANON_KEY="tu-anon-key"
```

---

## 8. ESTRUCTURA DEL PROYECTO

```
hacienda-app/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts        # Configuración Prisma
│   │   │   ├── supabase.ts        # Cliente Supabase Storage
│   │   │   ├── env.ts             # Validación variables entorno
│   │   │   └── jwt.ts             # Configuración JWT
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── ventas.controller.ts
│   │   │   ├── documentos.controller.ts
│   │   │   ├── pagos.controller.ts
│   │   │   └── dolar.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── upload.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── ventas.routes.ts
│   │   │   ├── documentos.routes.ts
│   │   │   ├── pagos.routes.ts
│   │   │   └── dolar.routes.ts
│   │   ├── services/
│   │   │   ├── ventas.service.ts
│   │   │   ├── documentos.service.ts
│   │   │   ├── alertas.service.ts
│   │   │   ├── pagos.service.ts
│   │   │   └── dolar.service.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── validators.ts
│   │   │   ├── calculators.ts
│   │   │   └── formatters.ts
│   │   └── index.ts               # Entry point
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   ├── .env.local
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                # Shadcn components
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Layout.tsx
│   │   │   ├── ventas/
│   │   │   │   ├── VentaForm.tsx
│   │   │   │   ├── VentasList.tsx
│   │   │   │   ├── VentaDetail.tsx
│   │   │   │   └── VentaCard.tsx
│   │   │   ├── documentos/
│   │   │   │   ├── DocumentUpload.tsx
│   │   │   │   ├── DocumentList.tsx
│   │   │   │   └── DocumentViewer.tsx
│   │   │   ├── pagos/
│   │   │   │   ├── PagoForm.tsx
│   │   │   │   └── PagosList.tsx
│   │   │   ├── alertas/
│   │   │   │   ├── AlertaCard.tsx
│   │   │   │   └── AlertasList.tsx
│   │   │   └── dashboard/
│   │   │       ├── DashboardCards.tsx
│   │   │       └── VentasChart.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Ventas.tsx
│   │   │   ├── VentaDetail.tsx
│   │   │   └── NotFound.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useVentas.ts
│   │   │   ├── useDocumentos.ts
│   │   │   └── useDolar.ts
│   │   ├── services/
│   │   │   ├── api.ts             # Axios instance
│   │   │   ├── auth.service.ts
│   │   │   ├── ventas.service.ts
│   │   │   ├── documentos.service.ts
│   │   │   └── dolar.service.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   └── constants.ts
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   └── supabase.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env.local
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── docs/
│   └── PROJECT_SPEC.md            # Este archivo
├── .gitignore
└── README.md
```

---

## 9. SCRIPTS NPM

### Backend

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src --ext .ts",
    
    "db:push": "prisma db push",
    "db:migrate:dev": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio",
    "db:seed": "tsx prisma/seed.ts",
    "db:reset": "prisma migrate reset",
    
    "prisma:generate": "prisma generate"
  }
}
```

### Frontend

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  }
}
```

---

## 10. SEGURIDAD

### Validación de archivos
- Tamaño máximo: 10MB por archivo
- Formatos permitidos: PDF, JPG, JPEG, PNG
- Validar MIME type en backend
- Sanitizar nombres de archivo

### Autenticación
- JWT con refresh tokens
- Tokens expiran en 7 días
- HTTPS only en producción
- CORS configurado correctamente

### Base de datos
- Usar prepared statements (Prisma lo hace por defecto)
- Validar todos los inputs
- No exponer errores de DB al frontend
- Usar Decimal para montos (precisión)

### Storage
- Archivos privados (requieren autenticación)
- URLs firmadas con expiración
- Nunca exponer keys de servicio al frontend

---

## 11. PRIORIDADES DE DESARROLLO

### Sprint 1 (Semanas 1-2): Fundación
- ✅ Setup del proyecto (Frontend + Backend)
- ✅ Configuración Prisma + PostgreSQL (Supabase local)
- ✅ Sistema de autenticación con JWT
- ✅ CRUD básico de ventas (sin documentos aún)
- ✅ Diseño de UI base con Shadcn

### Sprint 2 (Semanas 3-4): Core features
- ✅ Upload de documentos a Supabase Storage
- ✅ Visualización de documentos (PDF viewer, image viewer)
- ✅ Sistema de alertas automáticas
- ✅ Integración con API de dólar
- ✅ Estados de venta con workflow

### Sprint 3 (Semanas 5-6): Cierre y pagos
- ✅ Registro de pagos parciales/totales
- ✅ Cálculos financieros automáticos
- ✅ Dashboard básico con métricas
- ✅ Lista de ventas con filtros
- ✅ Testing y ajustes finales

### Sprint 4 (Semana 7): Deploy y producción
- ✅ Configurar Railway (backend + PostgreSQL)
- ✅ Configurar Vercel (frontend)
- ✅ Migrar datos de desarrollo a producción
- ✅ Testing en producción
- ✅ Documentación de uso

---

## 12. CONSIDERACIONES TÉCNICAS

### Performance
- Paginación en lista de ventas (20 items por página)
- Lazy loading de documentos
- Cache del TC del dólar (renovar cada 1 hora)
- Índices en columnas frecuentemente consultadas

### Manejo de archivos
- Path en Supabase: `/ventas/{ventaId}/{tipoDoc}_{timestamp}.{ext}`
- Generar thumbnails de imágenes (futuro)
- Comprimir PDFs grandes (futuro)

### Cálculos financieros
- Usar `decimal.js` para precisión
- Redondear a 2 decimales para pesos
- Redondear a 4 decimales para tipo de cambio
- Validar que no haya división por cero

### Manejo de errores
- Logs estructurados en backend
- Mensajes de error amigables en frontend
- No exponer stack traces al usuario
- Capturar errores con try/catch

### Testing (Futuro - Fase 2)
- Tests unitarios para cálculos financieros
- Tests de integración para APIs críticas
- E2E tests para flujo completo de venta

---

## 13. NOTAS IMPORTANTES

### ⚠️ Restricciones críticas
- **NO usar localStorage/sessionStorage** en artifacts de Claude (incompatible)
- **SIEMPRE usar Decimal** para montos financieros, nunca float/number
- **NUNCA commitear** archivos `.env` con credenciales reales
- **Validar tipo de cambio** antes de guardar (no puede ser 0 o negativo)

### 💡 Buenas prácticas
- Mantener logs de cambios en datos críticos (auditoría)
- Hacer backup regular de la base de datos
- Versionar migraciones de Prisma
- Documentar cambios importantes en CHANGELOG.md

### 🔄 Workflow Git recomendado
- `main` → Producción (protegida)
- `develop` → Desarrollo
- `feature/*` → Nuevas funcionalidades
- `fix/*` → Correcciones

### 📱 Responsive design
- Mobile first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Probar en dispositivos móviles (el dueño puede usarlo desde el campo)

---

## 14. RECURSOS ÚTILES

### Documentación
- [Prisma Docs](https://www.prisma.io/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Shadcn/ui](https://ui.shadcn.com)
- [React Hook Form](https://react-hook-form.com)
- [Tailwind CSS](https://tailwindcss.com)

### APIs
- [DolarAPI](https://dolarapi.com) - Cotizaciones del dólar argentino
- [Bluelytics](https://bluelytics.com.ar/#!/api) - Alternativa para cotizaciones

### Tools
- [Prisma Studio](https://www.prisma.io/studio) - GUI para base de datos
- [Railway](https://railway.app) - Hosting backend
- [Vercel](https://vercel.com) - Hosting frontend

---

## 15. CONTACTO Y SOPORTE

### En caso de dudas sobre el negocio:
Consultar con el dueño sobre:
- Reglas específicas de cálculo
- Validaciones particulares
- Flujos alternativos

### En caso de bugs o mejoras:
- Crear issues en el repo con etiquetas claras
- Incluir pasos para reproducir
- Screenshots si es UI

---

**Última actualización:** Octubre 2025
**Versión del documento:** 1.0