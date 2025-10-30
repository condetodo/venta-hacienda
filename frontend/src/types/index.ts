// ============================================
// ENUMS
// ============================================

export enum Establecimiento {
  LOCHIEL = 'LOCHIEL',
  CABO_CURIOSO = 'CABO_CURIOSO',
}

export enum MotivoVenta {
  FAENA = 'FAENA',
  FAENA_UE = 'FAENA_UE',
  CRIA = 'CRIA',
}

export enum CategoriaAnimal {
  OVEJA = 'OVEJA',
  BORREGO = 'BORREGO',
  CORDERO = 'CORDERO',
  CAPON = 'CAPON',
  CARNERO = 'CARNERO',
  BORREGA = 'BORREGA',
}

export enum TipoDocumento {
  DUT = 'DUT',
  REMITO_CAMPO = 'REMITO_CAMPO',
  ROMANEO = 'ROMANEO',
  LIQUIDACION = 'LIQUIDACION',
  FACTURA = 'FACTURA',
  COMPROBANTE_PAGO = 'COMPROBANTE_PAGO',
  OTRO = 'OTRO',
}

export enum FormaPago {
  TRANSFERENCIA = 'TRANSFERENCIA',
  EFECTIVO = 'EFECTIVO',
  CHEQUE = 'CHEQUE',
  CHEQUE_ELECTRONICO = 'CHEQUE_ELECTRONICO',
}

export enum Moneda {
  ARS = 'ARS',
  USD = 'USD',
}

export enum EstadoVenta {
  ABIERTO = 'ABIERTO',
  RETIRADO = 'RETIRADO',
  ROMANEO = 'ROMANEO',
  FINALIZADO = 'FINALIZADO',
}

export enum TipoAlerta {
  DIFERENCIA_CANTIDAD = 'DIFERENCIA_CANTIDAD',
  DIFERENCIA_KILOS = 'DIFERENCIA_KILOS',
  PAGO_VENCIDO = 'PAGO_VENCIDO',
  DOCUMENTO_FALTANTE = 'DOCUMENTO_FALTANTE',
  ERROR_CALCULO = 'ERROR_CALCULO',
  PRECIO_DISCREPANTE = 'PRECIO_DISCREPANTE',
}

export enum Severidad {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
}

export enum RolUsuario {
  ADMIN = 'ADMIN',
  USUARIO = 'USUARIO',
}

// ============================================
// INTERFACES PRINCIPALES
// ============================================

export interface Venta {
  id: string;
  
  // === INFORMACIÓN GENERAL DEL DUT ===
  establecimientoEmisor: Establecimiento;
  numeroDUT: string;
  titularDestino: string;
  numeroRespaDestino?: string;
  fechaEmisionDUT: string;
  fechaCargaDUT: string;
  fechaVencimientoDUT?: string;
  motivo: string;
  categoria: CategoriaAnimal;
  valorDUT: number;
  valorGuia: number;
  
  // === CONTROL DE CANTIDADES (Triple control) ===
  cantidadEnDUT: number;
  fechaCargaReal?: string;
  cantidadCargada?: number;
  cantidadRomaneo?: number;
  fechaRomaneo?: string;
  tropa?: string;
  numeroRemito?: string;
  
  // === FAENA ===
  totalKgs?: number;
  kiloLimpioPorCabeza?: number;
  
  // === PRECIOS Y CÁLCULOS ===
  precioKg?: number;
  precioCabeza?: number;
  importeEnUSD?: number;
  tipoCambio?: number;
  importeOriginal?: number;
  importeNeto?: number;
  
  // === FACTURACIÓN ===
  iva: number;
  totalOperacion?: number;
  retencion: number;
  totalAPagar?: number;
  totalPagado: number;
  sinFacturar: boolean;
  numeroFactura?: string;
  
  // === INFORMACIÓN DE PAGO ===
  formaPago?: FormaPago;
  dondeSeAcredita?: string;
  fechaPago?: string;
  
  // === ADICIONALES ===
  observaciones?: string;
  
  // === ESTADO DEL CICLO DE VENTA ===
  estado: string;
  
  // === RELACIONES ===
  documentos?: Documento[];
  pagos?: Pago[];
  alertas?: Alerta[];
  
  // === TIMESTAMPS ===
  createdAt: string;
  updatedAt: string;
}

export interface Documento {
  id: string;
  ventaId: string;
  tipo: TipoDocumento;
  nombreArchivo: string;
  url: string;
  mimeType: string;
  tamano: number;
  datosExtraidos?: any;
  procesadoOCR: boolean;
  fechaCarga: string;
}

export interface Pago {
  id: string;
  ventaId: string;
  monto: number;
  moneda: Moneda;
  tipoCambio?: number;
  fecha: string;
  formaPago: FormaPago;
  referencia?: string;
  dondeSeAcredita?: string;
  comprobanteUrl?: string;
  observaciones?: string;
  createdAt: string;
}

export interface Alerta {
  id: string;
  ventaId: string;
  tipo: TipoAlerta;
  mensaje: string;
  severidad: Severidad;
  resuelta: boolean;
  fechaCreacion: string;
  fechaResolucion?: string;
  venta?: {
    numeroDUT: string;
    titularDestino: string;
  };
}

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Configuracion {
  id: string;
  clave: string;
  valor: string;
  descripcion?: string;
  updatedAt: string;
}

// ============================================
// INTERFACES PARA FORMULARIOS
// ============================================

export interface VentaFormData {
  // === INFORMACIÓN GENERAL DEL DUT ===
  establecimientoEmisor: Establecimiento;
  numeroDUT: string;
  titularDestino: string;
  numeroRespaDestino?: string;
  fechaEmisionDUT: string;
  fechaCargaDUT: string;
  fechaVencimientoDUT?: string;
  motivo: string;
  categoria: CategoriaAnimal;
  valorDUT: number;
  valorGuia: number;
  
  // === CONTROL DE CANTIDADES ===
  cantidadEnDUT: number;
  fechaCargaReal?: string;
  cantidadCargada?: number;
  cantidadRomaneo?: number;
  fechaRomaneo?: string;
  tropa?: string;
  numeroRemito?: string;
  
  // === FAENA ===
  totalKgs?: number;
  kiloLimpioPorCabeza?: number;
  
  // === PRECIOS Y CÁLCULOS ===
  precioKg?: number;
  precioCabeza?: number;
  importeEnUSD?: number;
  tipoCambio?: number;
  importeOriginal?: number;
  importeNeto?: number;
  
  // === FACTURACIÓN ===
  iva: number;
  totalOperacion?: number;
  retencion: number;
  totalAPagar?: number;
  sinFacturar: boolean;
  numeroFactura?: string;
  
  // === INFORMACIÓN DE PAGO ===
  formaPago?: FormaPago;
  dondeSeAcredita?: string;
  fechaPago?: string;
  
  // === ADICIONALES ===
  observaciones?: string;
  estado: string;
}

export interface PagoFormData {
  ventaId: string;
  monto: number;
  moneda: Moneda;
  tipoCambio?: number;
  fecha: string;
  formaPago: FormaPago;
  referencia?: string;
  dondeSeAcredita?: string;
  comprobanteUrl?: string;
  observaciones?: string;
}

// ============================================
// INTERFACES PARA API RESPONSES
// ============================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface DashboardStats {
  ventasActivas: number;
  totalVendidoMes: number;
  totalPorCobrar: number;
  alertasPendientes: Alerta[];
}

export interface VentasPorMes {
  mes: number;
  año: number;
  total: number;
  cantidad: number;
}

// ============================================
// INTERFACES PARA FILTROS
// ============================================

export interface VentasFilters {
  estado?: string;
  titularDestino?: string;
  categoria?: CategoriaAnimal;
  establecimientoEmisor?: Establecimiento;
  fechaEmisionDUT?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  limit?: number;
}

// ============================================
// INTERFACES PARA CÁLCULOS
// ============================================

export interface CalculosVenta {
  importeOriginal?: number;
  totalOperacion?: number;
  totalAPagar?: number;
  kiloLimpioPorCabeza?: number;
  importeEnUSD?: number;
}

// ============================================
// CONSTANTES
// ============================================

export const ESTABLECIMIENTOS = [
  { value: Establecimiento.LOCHIEL, label: 'Lochiel' },
  { value: Establecimiento.CABO_CURIOSO, label: 'Cabo Curioso' },
];

export const MOTIVOS_VENTA = [
  { value: MotivoVenta.FAENA, label: 'Para Faena' },
  { value: MotivoVenta.FAENA_UE, label: 'Para Faena UE' },
  { value: MotivoVenta.CRIA, label: 'Para Cría' },
];

export const CATEGORIAS_ANIMAL = [
  { value: CategoriaAnimal.OVEJA, label: 'Oveja' },
  { value: CategoriaAnimal.BORREGO, label: 'Borrego' },
  { value: CategoriaAnimal.CORDERO, label: 'Cordero' },
  { value: CategoriaAnimal.CAPON, label: 'Capón' },
  { value: CategoriaAnimal.CARNERO, label: 'Carnero' },
  { value: CategoriaAnimal.BORREGA, label: 'Borrega' },
];

export const TIPOS_DOCUMENTO = [
  { value: TipoDocumento.DUT, label: 'DUT' },
  { value: TipoDocumento.REMITO_CAMPO, label: 'Remito de Campo' },
  { value: TipoDocumento.ROMANEO, label: 'Romaneo' },
  { value: TipoDocumento.LIQUIDACION, label: 'Liquidación' },
  { value: TipoDocumento.FACTURA, label: 'Factura' },
  { value: TipoDocumento.COMPROBANTE_PAGO, label: 'Comprobante de Pago' },
  { value: TipoDocumento.OTRO, label: 'Otro' },
];

export const FORMAS_PAGO = [
  { value: FormaPago.TRANSFERENCIA, label: 'Transferencia' },
  { value: FormaPago.EFECTIVO, label: 'Efectivo' },
  { value: FormaPago.CHEQUE, label: 'Cheque' },
  { value: FormaPago.CHEQUE_ELECTRONICO, label: 'E-CHEQ' },
];

export const ESTADOS_VENTA = [
  { value: EstadoVenta.ABIERTO, label: 'Abierto', color: 'blue' },
  { value: EstadoVenta.RETIRADO, label: 'Retirado', color: 'orange' },
  { value: EstadoVenta.ROMANEO, label: 'Romaneo', color: 'purple' },
  { value: EstadoVenta.FINALIZADO, label: 'Finalizado', color: 'green' },
];

export const SEVERIDADES_ALERTA = [
  { value: Severidad.BAJA, label: 'Baja', color: 'gray' },
  { value: Severidad.MEDIA, label: 'Media', color: 'yellow' },
  { value: Severidad.ALTA, label: 'Alta', color: 'orange' },
  { value: Severidad.CRITICA, label: 'Crítica', color: 'red' },
];