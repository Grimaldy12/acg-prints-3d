import { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet, Download, ShoppingCart, DollarSign,
  TrendingUp, Users, Package, Calendar, Loader,
} from 'lucide-react';
import { api } from '../../utils/api.js';
import { useToast } from '../../App.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { EXPENSE_CATEGORIES } from '../../utils/constants.js';

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function getMonthLabel(prefix) {
  if (!prefix) return '';
  const [y, m] = prefix.split('-');
  return `${MONTH_NAMES[parseInt(m,10)-1]} ${y}`;
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function getCategoryLabel(cat) {
  const found = EXPENSE_CATEGORIES.find(c => c.value === cat);
  return found ? found.label : cat;
}

/* ── Utilidad: descargar workbook ───────────────────────────── */
function downloadExcel(workbook, filename) {
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/* ── Estilo de encabezado para las hojas ───────────────────── */
function styleHeader(ws, cols) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: 'E2570F' } },
      alignment: { horizontal: 'center' },
    };
  }
  ws['!cols'] = cols;
}

/* ── Tarjeta de reporte ─────────────────────────────────────── */
function ReportCard({ icon: Icon, title, description, color, onExport, loading, children }) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 'var(--radius-md)',
            background: `${color}1A`, color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={20} />
          </div>
          <div>
            <div className="card-title">{title}</div>
            <div className="card-subtitle">{description}</div>
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={onExport}
          disabled={loading}
          style={{ minWidth: 120 }}
        >
          {loading
            ? <><Loader size={15} className="spin" /> Generando...</>
            : <><Download size={15} /> Exportar</>
          }
        </button>
      </div>
      {children && <div style={{ marginTop: 'var(--space-md)' }}>{children}</div>}
    </div>
  );
}

export default function ReportsPage() {
  const toast = useToast();

  // Período seleccionado (para reportes de mes)
  const [month, setMonth] = useState(currentMonth());

  // Período personalizado (desde/hasta)
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  // Estados de carga por reporte
  const [loading, setLoading] = useState({});

  const setLoad = (key, val) => setLoading(p => ({ ...p, [key]: val }));

  /* ── 1. Reporte de Ventas ─────────────────────────────────── */
  async function exportSales() {
    setLoad('sales', true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo)   params.append('to',   dateTo);
      if (!dateFrom && !dateTo) {
        // Si no hay rango, filtrar por mes seleccionado
        const [y, m] = month.split('-');
        const lastDay = new Date(Number(y), Number(m), 0).getDate();
        params.append('from', `${month}-01`);
        params.append('to',   `${month}-${String(lastDay).padStart(2,'0')}`);
      }
      const res = await api.get(`/api/sales?${params}`);
      const sales = Array.isArray(res) ? res : res?.data || [];

      if (sales.length === 0) { toast.info('No hay ventas en el período seleccionado'); return; }

      const rows = sales.map((s, i) => ({
        '#': i + 1,
        'Fecha': formatDate(s.created_at),
        'Cliente': s.customer_name || 'Sin cliente',
        'Productos': s.items?.map(it => `${it.product_name} x${it.quantity}`).join(', ') || '',
        'Descuento ($)': Number(s.discount) || 0,
        'Total ($)': Number(s.total) || 0,
        'Estado': s.status,
        'Notas': s.notes || '',
      }));

      // Hoja de detalle
      const ws = XLSX.utils.json_to_sheet(rows);
      styleHeader(ws, [
        { wch: 5 }, { wch: 12 }, { wch: 22 }, { wch: 40 },
        { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 30 },
      ]);

      // Hoja de resumen
      const totalVentas    = sales.reduce((s, v) => s + (Number(v.total) || 0), 0);
      const totalPagadas   = sales.filter(v => v.status === 'pagado' || v.status === 'entregado').length;
      const totalPendientes = sales.filter(v => v.status === 'pendiente').length;
      const totalCanceladas = sales.filter(v => v.status === 'cancelado').length;

      const summary = [
        ['Período', dateFrom ? `${dateFrom} → ${dateTo || 'hoy'}` : getMonthLabel(month)],
        ['Total ventas', sales.length],
        ['Monto total ($)', totalVentas],
        ['Pagadas / Entregadas', totalPagadas],
        ['Pendientes', totalPendientes],
        ['Canceladas', totalCanceladas],
        ['Ticket promedio ($)', sales.length > 0 ? (totalVentas / sales.length).toFixed(2) : 0],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summary);
      wsSummary['!cols'] = [{ wch: 28 }, { wch: 20 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');
      XLSX.utils.book_append_sheet(wb, ws, 'Detalle');
      downloadExcel(wb, `ventas_${dateFrom || month}`);
      toast.success('Reporte de ventas exportado');
    } catch (err) {
      toast.error('Error al generar reporte de ventas');
    } finally {
      setLoad('sales', false);
    }
  }

  /* ── 2. Reporte de Gastos ─────────────────────────────────── */
  async function exportExpenses() {
    setLoad('expenses', true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo)   params.append('to',   dateTo);
      if (!dateFrom && !dateTo) {
        const [y, m] = month.split('-');
        const lastDay = new Date(Number(y), Number(m), 0).getDate();
        params.append('from', `${month}-01`);
        params.append('to',   `${month}-${String(lastDay).padStart(2,'0')}`);
      }
      const res = await api.get(`/api/expenses?${params}`);
      const expenses = Array.isArray(res) ? res : res?.data || [];

      if (expenses.length === 0) { toast.info('No hay gastos en el período seleccionado'); return; }

      const rows = expenses.map((e, i) => ({
        '#': i + 1,
        'Fecha': e.date,
        'Categoría': getCategoryLabel(e.category),
        'Descripción': e.description || '',
        'Monto ($)': Number(e.amount) || 0,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      styleHeader(ws, [{ wch: 5 }, { wch: 12 }, { wch: 24 }, { wch: 36 }, { wch: 12 }]);

      // Resumen por categoría
      const byCategory = {};
      expenses.forEach(e => {
        const cat = getCategoryLabel(e.category);
        byCategory[cat] = (byCategory[cat] || 0) + (Number(e.amount) || 0);
      });
      const catRows = [
        ['Categoría', 'Total ($)'],
        ...Object.entries(byCategory).sort((a,b) => b[1]-a[1]).map(([k,v]) => [k, v]),
        [],
        ['TOTAL', expenses.reduce((s,e) => s+(Number(e.amount)||0), 0)],
      ];
      const wsCat = XLSX.utils.aoa_to_sheet(catRows);
      wsCat['!cols'] = [{ wch: 28 }, { wch: 14 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsCat, 'Por Categoría');
      XLSX.utils.book_append_sheet(wb, ws, 'Detalle');
      downloadExcel(wb, `gastos_${dateFrom || month}`);
      toast.success('Reporte de gastos exportado');
    } catch (err) {
      toast.error('Error al generar reporte de gastos');
    } finally {
      setLoad('expenses', false);
    }
  }

  /* ── 3. Reporte de Ganancias ──────────────────────────────── */
  async function exportProfits() {
    setLoad('profits', true);
    try {
      // Últimos 12 meses
      const months = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
      }

      const [salesRes, expensesRes] = await Promise.all([
        api.get('/api/sales'),
        api.get('/api/expenses'),
      ]);
      const sales    = Array.isArray(salesRes)    ? salesRes    : salesRes?.data    || [];
      const expenses = Array.isArray(expensesRes) ? expensesRes : expensesRes?.data || [];

      const rows = months.map(m => {
        const [y, mo] = m.split('-');
        const lastDay = new Date(Number(y), Number(mo), 0).getDate();
        const from = `${m}-01`, to = `${m}-${String(lastDay).padStart(2,'0')}`;

        const mSales    = sales.filter(s => s.status !== 'cancelado' && s.created_at?.startsWith(m));
        const mExpenses = expenses.filter(e => e.date >= from && e.date <= to);
        const totalSales    = mSales.reduce((s,v) => s+(Number(v.total)||0), 0);
        const totalExpenses = mExpenses.reduce((s,e) => s+(Number(e.amount)||0), 0);

        return {
          'Mes': getMonthLabel(m),
          'Ventas ($)': totalSales,
          'Gastos ($)': totalExpenses,
          'Ganancia ($)': totalSales - totalExpenses,
          '# Ventas': mSales.length,
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      styleHeader(ws, [{ wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ganancias 12 meses');
      downloadExcel(wb, `ganancias_${now.getFullYear()}`);
      toast.success('Reporte de ganancias exportado');
    } catch (err) {
      toast.error('Error al generar reporte de ganancias');
    } finally {
      setLoad('profits', false);
    }
  }

  /* ── 4. Reporte de Clientes ───────────────────────────────── */
  async function exportCustomers() {
    setLoad('customers', true);
    try {
      const res = await api.get('/api/customers');
      const customers = Array.isArray(res) ? res : res?.data || [];

      if (customers.length === 0) { toast.info('No hay clientes registrados'); return; }

      const rows = customers.map((c, i) => ({
        '#': i + 1,
        'Nombre': c.name,
        'Teléfono': c.phone || '',
        'Instagram': c.instagram || '',
        'Email': c.email || '',
        'Cédula': c.cedula || '',
        'Total comprado ($)': Number(c.total_spent) || 0,
        'Notas': c.notes || '',
        'Registrado': formatDate(c.created_at),
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      styleHeader(ws, [
        { wch: 5 }, { wch: 24 }, { wch: 14 }, { wch: 18 },
        { wch: 24 }, { wch: 14 }, { wch: 18 }, { wch: 30 }, { wch: 14 },
      ]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
      downloadExcel(wb, `clientes_${new Date().toISOString().split('T')[0]}`);
      toast.success('Reporte de clientes exportado');
    } catch (err) {
      toast.error('Error al generar reporte de clientes');
    } finally {
      setLoad('customers', false);
    }
  }

  /* ── 5. Reporte de Productos ──────────────────────────────── */
  async function exportProducts() {
    setLoad('products', true);
    try {
      const [productsRes, salesRes] = await Promise.all([
        api.get('/api/products'),
        api.get('/api/sales'),
      ]);
      const products = Array.isArray(productsRes) ? productsRes : productsRes?.data || [];
      const sales    = Array.isArray(salesRes)    ? salesRes    : salesRes?.data    || [];

      // Agregar métricas de ventas a cada producto
      const agg = {};
      sales.forEach(s => {
        if (s.status !== 'cancelado' && Array.isArray(s.items)) {
          s.items.forEach(item => {
            if (!agg[item.product_id]) agg[item.product_id] = { qty: 0, revenue: 0 };
            agg[item.product_id].qty     += Number(item.quantity) || 0;
            agg[item.product_id].revenue += Number(item.subtotal) || 0;
          });
        }
      });

      const rows = products.map((p, i) => ({
        '#': i + 1,
        'Nombre': p.name,
        'Categoría': p.category || '',
        'Precio venta ($)': Number(p.sale_price) || 0,
        'Costo material ($)': Number(p.material_cost) || 0,
        'Margen ($)': (Number(p.sale_price) || 0) - (Number(p.material_cost) || 0),
        'Stock': Number(p.stock) || 0,
        'Tiempo impresión (min)': Number(p.print_time_minutes) || 0,
        'Unidades vendidas': agg[p.id]?.qty || 0,
        'Ingresos generados ($)': agg[p.id]?.revenue || 0,
        'Descripción': p.description || '',
      }));

      // Ordenar por ingresos generados desc
      rows.sort((a, b) => b['Ingresos generados ($)'] - a['Ingresos generados ($)']);
      rows.forEach((r, i) => { r['#'] = i + 1; });

      const ws = XLSX.utils.json_to_sheet(rows);
      styleHeader(ws, [
        { wch: 5 }, { wch: 26 }, { wch: 16 }, { wch: 16 }, { wch: 18 },
        { wch: 12 }, { wch: 8 }, { wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 30 },
      ]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Productos');
      downloadExcel(wb, `productos_${new Date().toISOString().split('T')[0]}`);
      toast.success('Reporte de productos exportado');
    } catch (err) {
      toast.error('Error al generar reporte de productos');
    } finally {
      setLoad('products', false);
    }
  }

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Reportes</h1>
          <p>Exporta tus datos a Excel para análisis detallado</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', fontSize: '0.8rem' }}>
          <FileSpreadsheet size={16} style={{ color: 'var(--accent)' }} />
          Formato .xlsx
        </div>
      </div>

      {/* ── Selector de período ──────────────────────────────── */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <h3 style={{
          fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)',
          fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
          letterSpacing: '0.1em', marginBottom: 'var(--space-md)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <Calendar size={14} style={{ color: 'var(--accent)' }} />
          Período de los reportes
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Mes (reportes mensuales)</label>
            <input
              type="month"
              className="form-input"
              value={month}
              onChange={e => setMonth(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Desde (rango personalizado)</label>
            <input
              type="date"
              className="form-input"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Hasta</label>
            <input
              type="date"
              className="form-input"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
        </div>

        {(dateFrom || dateTo) && (
          <div style={{ marginTop: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Usando rango personalizado para ventas y gastos
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setDateFrom(''); setDateTo(''); }}
            >
              Limpiar rango
            </button>
          </div>
        )}
      </div>

      {/* ── Reportes ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: 'var(--space-md)' }}>

        <ReportCard
          icon={ShoppingCart}
          title="Ventas"
          description={`Detalle y resumen · ${dateFrom ? `${dateFrom} → ${dateTo||'hoy'}` : getMonthLabel(month)}`}
          color="#2E7D4F"
          onExport={exportSales}
          loading={loading.sales}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>✓ Fecha, cliente, productos</span>
            <span>✓ Total y descuento</span>
            <span>✓ Estado de cada venta</span>
            <span>✓ Hoja de resumen con totales</span>
          </div>
        </ReportCard>

        <ReportCard
          icon={DollarSign}
          title="Gastos"
          description={`Por categoría · ${dateFrom ? `${dateFrom} → ${dateTo||'hoy'}` : getMonthLabel(month)}`}
          color="#C13A2E"
          onExport={exportExpenses}
          loading={loading.expenses}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>✓ Fecha, categoría, descripción</span>
            <span>✓ Monto de cada gasto</span>
            <span>✓ Hoja de totales por categoría</span>
          </div>
        </ReportCard>

        <ReportCard
          icon={TrendingUp}
          title="Ganancias"
          description="Ventas vs gastos · Últimos 12 meses"
          color="#E2570F"
          onExport={exportProfits}
          loading={loading.profits}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>✓ Mes a mes</span>
            <span>✓ Ventas, gastos y ganancia neta</span>
            <span>✓ Número de ventas por mes</span>
          </div>
        </ReportCard>

        <ReportCard
          icon={Users}
          title="Clientes"
          description="Directorio completo con métricas"
          color="#6D4BBE"
          onExport={exportCustomers}
          loading={loading.customers}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>✓ Contacto completo</span>
            <span>✓ Total comprado por cliente</span>
            <span>✓ Fecha de registro</span>
          </div>
        </ReportCard>

        <ReportCard
          icon={Package}
          title="Productos más vendidos"
          description="Catálogo con métricas de ventas"
          color="#2F63C4"
          onExport={exportProducts}
          loading={loading.products}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>✓ Precio, costo y margen</span>
            <span>✓ Unidades vendidas</span>
            <span>✓ Ingresos generados</span>
            <span>✓ Ordenado por más vendido</span>
          </div>
        </ReportCard>

      </div>
    </div>
  );
}
