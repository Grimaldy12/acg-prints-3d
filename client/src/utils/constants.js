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
  { value: 'pendiente', label: 'Pendiente', color: '#F59E0B' },
  { value: 'pagado', label: 'Pagado', color: '#22C55E' },
  { value: 'entregado', label: 'Entregado', color: '#3B82F6' },
  { value: 'cancelado', label: 'Cancelado', color: '#EF4444' },
];

export const STATUS_COLORS = {
  pendiente: '#F59E0B',
  pagado: '#22C55E',
  entregado: '#3B82F6',
  cancelado: '#EF4444',
};

export const EXPENSE_CATEGORY_COLORS = {
  filamento_pla: '#00D4AA',
  filamento_abs: '#8B5CF6',
  filamento_petg: '#3B82F6',
  resina: '#F5A623',
  electricidad: '#F59E0B',
  mantenimiento: '#EF4444',
  envios: '#22C55E',
  herramientas: '#EC4899',
  impresoras: '#6366F1',
  publicidad: '#F43F5E',
  otros: '#6b6b80',
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
