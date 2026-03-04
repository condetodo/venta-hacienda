# ROADMAP - Sistema Gestion Venta Hacienda Ovina

> Ultima actualizacion: 2026-03-04

---

## FASE 1 - MVP (COMPLETADO)

### Sprint 1: Fundacion
- [x] Setup proyecto (monorepo con concurrently)
- [x] Prisma + PostgreSQL (Supabase local con Docker)
- [x] Autenticacion JWT (login/register/logout)
- [x] CRUD basico de ventas
- [x] UI base con Tailwind + Shadcn/ui

### Sprint 2: Core Features
- [x] Upload de documentos a Supabase Storage
- [x] Visualizacion de documentos (PDF/imagenes)
- [x] Sistema de alertas automaticas
- [x] Integracion API dolar (blue, MEP, CCL, oficial)
- [x] Estados de venta con workflow

### Sprint 3: Cierre y Pagos
- [x] Registro de pagos parciales/totales
- [x] Calculos financieros automaticos (USD/ARS, IVA, retenciones)
- [x] Dashboard con metricas
- [x] Lista de ventas con filtros y paginacion

### Sprint 4: Extraccion DUT
- [x] Extraccion automatica de datos desde PDF DUT
- [x] Claude Vision API para extraccion precisa
- [x] Fallback regex para cuando no hay API key
- [x] Creacion automatica de venta desde DUT

---

## FASE 2 - EN PROGRESO

### Mejoras de Extraccion
- [ ] Mejorar extraccion regex (campo motivo, establecimiento emisor)
- [ ] Soporte para distintos formatos de DUT
- [ ] Validacion cruzada de datos extraidos

### Edicion de Ventas
- [x] Pagina VentaEdit.tsx creada
- [ ] Formulario completo de edicion
- [ ] Edicion inline de campos individuales

### Dashboard Mejorado
- [x] Cards de metricas (ventas activas, total vendido, por cobrar, alertas)
- [x] Grafico de ventas por mes
- [x] Tabla de ultimas ventas
- [ ] Filtros por rango de fechas en dashboard
- [ ] Grafico de evolucion de precios

### Seccion Pagos
- [x] Lista de pagos (PagosList)
- [ ] Mejoras en flujo de pago (comprobantes)
- [ ] Alertas de pagos vencidos

---

## FASE 3 - FUTURO

### OCR para Romaneos
- [ ] Procesamiento de romaneos manuscritos (imagenes)
- [ ] Extraccion de cantidad y kilos
- [ ] Revision manual antes de guardar

### Reportes y Analytics
- [ ] Reportes por periodo
- [ ] Analisis por frigorifico (rendimiento)
- [ ] Analisis por cliente (recurrencia)
- [ ] Exportacion a Excel/PDF

### Deploy a Produccion
- [ ] Backend en Railway
- [ ] Frontend en Vercel
- [ ] PostgreSQL en Railway
- [ ] Supabase Storage en produccion
- [ ] Migracion de datos

### Notificaciones
- [ ] Email de vencimientos de pago
- [ ] Integracion WhatsApp (opcional)

### Integraciones Externas
- [ ] SIGSA/ARCA (si APIs disponibles)
- [ ] Facturacion electronica AFIP

---

## Notas
- Proyecto de uso interno (1-2 usuarios, 3-4 transacciones/dia)
- Priorizar estabilidad y precision en calculos sobre features nuevas
- Siempre usar Decimal para montos financieros
