/* ============================================================
   PrintFlow 3D — Constants
   ============================================================ */

export const PRODUCT_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'figuras', label: 'Figuras' },
  { value: 'funcional', label: 'Funcional' },
  { value: 'decorativo', label: 'Decorativo' },
  { value: 'personalizado', label: 'Personalizado' },
  { value: 'prototipo', label: 'Prototipo' },
];

export const EXPENSE_CATEGORIES = [
  { value: 'filamento_pla', label: 'Filamento PLA' },
  { value: 'filamento_abs', label: 'Filamento ABS' },
  { value: 'filamento_petg', label: 'Filamento PETG' },
  { value: 'resina', label: 'Resina' },
  { value: 'electricidad', label: 'Electricidad' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'envios', label: 'Envíos' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'impresoras', label: 'Impresoras' },
  { value: 'publicidad', label: 'Publicidad' },
  { value: 'otros', label: 'Otros' },
];

export const SALE_STATUSES = [
  { value: 'pendiente', label: 'Pendiente', color: '#A66B06' },
  { value: 'pagado', label: 'Pagado', color: '#2E7D4F' },
  { value: 'entregado', label: 'Entregado', color: '#2F63C4' },
  { value: 'cancelado', label: 'Cancelado', color: '#C13A2E' },
];

export const STATUS_COLORS = {
  pendiente: '#A66B06',
  pagado: '#2E7D4F',
  entregado: '#2F63C4',
  cancelado: '#C13A2E',
};

export const EXPENSE_CATEGORY_COLORS = {
  filamento_pla: '#E2570F',
  filamento_abs: '#6D4BBE',
  filamento_petg: '#2F63C4',
  resina: '#A66B06',
  electricidad: '#A66B06',
  mantenimiento: '#C13A2E',
  envios: '#2E7D4F',
  herramientas: '#B83A74',
  impresoras: '#2F63C4',
  publicidad: '#C13A2E',
  otros: '#79806F',
};

/**
 * Get the label for a category value
 */
export function getCategoryLabel(value) {
  const cat = PRODUCT_CATEGORIES.find((c) => c.value === value);
  return cat ? cat.label : value;
}

/**
 * Get the label for an expense category value
 */
export function getExpenseCategoryLabel(value) {
  const cat = EXPENSE_CATEGORIES.find((c) => c.value === value);
  return cat ? cat.label : value;
}

/**
 * Get the label for a sale status value
 */
export function getStatusLabel(value) {
  const st = SALE_STATUSES.find((s) => s.value === value);
  return st ? st.label : value;
}
