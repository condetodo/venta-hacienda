# Sistema de Gestión de Venta de Hacienda Ovina

Plataforma administrativa interna para gestionar el ciclo completo de venta de hacienda ovina desde la emisión del DTE hasta el cobro final.

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker Desktop
- Supabase CLI

### Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd venta-hacienda
```

2. **Instalar dependencias**
```bash
npm run install:all
```

3. **Configurar Supabase local con Docker**
```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Asegúrate de que Docker Desktop esté ejecutándose
# Iniciar Supabase local (esto levantará contenedores Docker automáticamente)
supabase start
```

4. **Configurar variables de entorno**
```bash
# Backend
cp backend/.env.example backend/.env.local
# Editar backend/.env.local con las credenciales

# Frontend  
cp frontend/.env.example frontend/.env.local
# Editar frontend/.env.local con las URLs
```

5. **Inicializar base de datos**
```bash
cd backend
npm run db:push
```

6. **Ejecutar en desarrollo**
```bash
# Desde la raíz del proyecto
npm run dev
```

## 🐳 Docker y Supabase

Este proyecto utiliza **Supabase** para el entorno de desarrollo local, que automáticamente levanta contenedores Docker para:

- **PostgreSQL** - Base de datos principal
- **Supabase Studio** - Interfaz web para gestionar la base de datos
- **Supabase API Gateway** - API REST y GraphQL
- **Supabase Auth** - Sistema de autenticación
- **Supabase Storage** - Almacenamiento de archivos
- **Supabase Realtime** - WebSockets en tiempo real
- **Supabase Edge Functions** - Funciones serverless
- **Inbucket** - Servidor de email para testing

### Comandos útiles de Supabase

```bash
# Iniciar todos los servicios
supabase start

# Ver estado de los servicios
supabase status

# Detener todos los servicios
supabase stop

# Reiniciar servicios
supabase restart

# Ver logs
supabase logs
```

## 📁 Estructura del Proyecto

```
venta-hacienda/
├── backend/           # API Node.js + Express + Prisma
├── frontend/          # React + TypeScript + Vite
├── docs/             # Documentación
└── PROJECT_SPEC.md   # Especificaciones completas
```

## 🔧 URLs de Desarrollo

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000
- **PostgreSQL**: localhost:54322
- **Supabase Studio**: http://localhost:54323
- **Supabase API Gateway**: http://localhost:54321
- **Supabase Inbucket (Email)**: http://localhost:54324

## 📋 Funcionalidades

- ✅ Gestión completa de ventas de hacienda
- ✅ Triple control de cantidades (DTE, Remito, Romaneo)
- ✅ Upload y gestión de documentos
- ✅ Sistema de alertas automáticas
- ✅ Cálculos financieros precisos
- ✅ Integración con API de dólar
- ✅ Dashboard con métricas

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + Shadcn/ui
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Base de Datos**: PostgreSQL (Supabase local + Railway producción)
- **Storage**: Supabase Storage
- **Containerización**: Docker (Supabase local)
- **Deploy**: Railway (backend) + Vercel (frontend)

## 📖 Documentación

Ver [PROJECT_SPEC.md](./PROJECT_SPEC.md) para especificaciones completas del proyecto.

