/* ============================================================
   ACG PRINTS 3D — Página de Finanzas
   ============================================================ */
import { useState, useEffect, useRef } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, BarChart2,
  Calendar, Award, PieChart as PieIcon,
} from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie,
  Cell, AreaChart, Area,
} from 'recharts';
import { api } from '../../utils/api.js';
import { formatCurrency } from '../../utils/formatters.js';
import { EXPENSE_CATEGORIES } from '../../utils/constants.js';

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const PIE_COLORS  = ['#E2570F','#C13A2E','#6D4BBE','#2F63C4','#B83A74','#A66B06','#2E7D4F','#79806F'];

function getMonthLabel(prefix) {
  if (!prefix) return '';
  const [y, m] = prefix.split('-');
  return `${MONTH_NAMES[parseInt(m,10)-1]} ${y}`;
}

function getCategoryLabel(cat) {
  const found = EXPENSE_CATEGORIES.find(c => c.value === cat);
  return found ? found.label : cat;
}

/* ── Contador animado ───────────────────────────────────────── */
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { setValue(target||0); return; }
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(from + (target - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

function StatCard({ icon: Icon, label, value, color, sub, negative }) {
  const animated = useCountUp(Math.abs(value));
  const display  = (negative || value < 0 ? '-' : '') + formatCurrency(animated);
  return (
    <div className="stat-card" style={{ '--card-accent': color }}>
      <div className="stat-icon" style={{ background: `${color}1A`, color }}>
        <Icon size={22} />
      </div>
      <div className="stat-info">
        <span className="stat-label">{label}</span>
        <span className="stat-value" style={{ color: value < 0 ? 'var(--red)' : undefined }}>{display}</span>
        {sub && <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>{sub}</span>}
      </div>
    </div>
  );
}

/* ── Tooltips ───────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{getMonthLabel(label)}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 4 }}>
          <span style={{ color: p.color, fontSize: '0.78rem', fontWeight: 600 }}>{p.name}</span>
          <span style={{ color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{payload[0].name}</p>
      <p style={{ color: payload[0].payload.fill, fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700 }}>
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

/* ── Skeleton ───────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div className="skeleton skeleton-title" style={{ width: 200 }} />
      </div>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[0,1,2,3].map(i => <div key={i} className="skeleton skeleton-card" />)}
      </div>
      <div className="charts-grid">
        {[0,1].map(i => <div key={i} className="skeleton skeleton-chart" />)}
      </div>
    </div>
  );
}

export default function FinancePage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths]   = useState(12);

  useEffect(() => {
    loadFinance();
  }, [months]);

  async function loadFinance() {
    setLoading(true);
    try {
      const res = await api.get(`/api/dashboard/finance?months=${months}`);
      setData(res.data || res);
    } catch (err) {
      console.error('Finance error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <Skeleton />;

  const { chart = [], totals = {}, best_month, expenses_by_category = [] } = data || {};
  const margin = totals.sales > 0 ? ((totals.profit / totals.sales) * 100).toFixed(1) : 0;

  // Datos para gráfica de área de ganancia
  const profitChart = chart.map(m => ({ ...m, profit: m.sales - m.expenses }));

  return (
    <div className="animate-fadeIn">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Finanzas</h1>
          <p>Comparativa de ingresos, gastos y ganancias</p>
        </div>
        {/* Selector de período */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={15} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>Últimos</span>
          {[6, 12, 24].map(n => (
            <button key={n}
              onClick={() => setMonths(n)}
              style={{
                padding: '5px 12px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--line)',
                background: months === n ? 'var(--ink)' : 'var(--surface)',
                color: months === n ? 'var(--bg)' : 'var(--muted)',
                fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 700,
                cursor: 'pointer', transition: 'all var(--transition-fast)',
              }}
            >
              {n}m
            </button>
          ))}
        </div>
      </div>

      {/* ── Tarjetas resumen ────────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        <StatCard icon={TrendingUp}  label="Total ingresos"  value={totals.sales}    color="#2E7D4F" sub={`${chart.filter(m=>m.sales>0).length} meses con ventas`} />
        <StatCard icon={TrendingDown} label="Total gastos"    value={totals.expenses} color="#C13A2E" sub={`${expenses_by_category.length} categorías`} />
        <StatCard icon={DollarSign}  label="Ganancia neta"   value={totals.profit}   color={totals.profit >= 0 ? '#E2570F' : '#C13A2E'} sub={`${margin}% de margen`} />
        <StatCard icon={Award}       label="Mejor mes"       value={best_month?.sales || 0} color="#6D4BBE" sub={getMonthLabel(best_month?.month)} />
      </div>

      {/* ── Gráfica principal: barras ventas vs gastos + línea ganancia ── */}
      <div className="charts-grid">
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <h3 className="chart-title">
            <BarChart2 size={18} /> Ingresos vs Gastos
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontWeight: 400 }}>
              Últimos {months} meses
            </span>
          </h3>
          <div style={{ height: 300, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={m => MONTH_NAMES[parseInt(m.split('-')[1],10)-1]}
                  stroke="var(--muted)" fontSize={11}
                  tick={{ fill: 'var(--muted)' }} axisLine={false} tickLine={false}
                />
                <YAxis
                  stroke="var(--muted)" fontSize={11}
                  tickFormatter={v => `$${v}`}
                  tick={{ fill: 'var(--muted)' }} axisLine={false} tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  formatter={v => <span style={{ color: 'var(--ink-soft)', fontSize: '0.78rem' }}>{v}</span>}
                  iconType="square" iconSize={9}
                />
                <Bar dataKey="sales"    name="Ingresos" fill="#2E7D4F" radius={[3,3,0,0]} barSize={22} animationDuration={800} />
                <Bar dataKey="expenses" name="Gastos"   fill="#C13A2E" radius={[3,3,0,0]} barSize={22} animationDuration={800} />
                <Line dataKey="profit"  name="Ganancia" stroke="#E2570F" strokeWidth={2.5} dot={{ fill: '#E2570F', r: 3 }} animationDuration={800} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Gráfica de ganancia neta ─────────────────────── */}
        <div className="chart-card">
          <h3 className="chart-title">
            <TrendingUp size={18} /> Ganancia neta mensual
          </h3>
          <div style={{ height: 260, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={profitChart}>
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#E2570F" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#E2570F" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#C13A2E" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#C13A2E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis dataKey="month" tickFormatter={m => MONTH_NAMES[parseInt(m.split('-')[1],10)-1]} stroke="var(--muted)" fontSize={11} tick={{ fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--muted)" fontSize={11} tickFormatter={v => `$${v}`} tick={{ fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="profit" name="Ganancia" stroke="#E2570F" strokeWidth={2.5} fill="url(#profitGrad)" animationDuration={900} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Gastos por categoría ─────────────────────────── */}
        <div className="chart-card">
          <h3 className="chart-title">
            <PieIcon size={18} /> Gastos por categoría
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontWeight: 400 }}>
              Histórico
            </span>
          </h3>
          {expenses_by_category.length === 0 ? (
            <div className="empty-chart">Sin gastos registrados.</div>
          ) : (
            <div style={{ height: 260, marginTop: 8 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenses_by_category.map(e => ({ ...e, name: getCategoryLabel(e.category) }))}
                    cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    paddingAngle={3} dataKey="total" animationDuration={900}
                  >
                    {expenses_by_category.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="var(--surface)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend verticalAlign="bottom" iconType="square" iconSize={9}
                    formatter={v => <span style={{ color: 'var(--ink-soft)', fontSize: '11px' }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabla resumen por mes ────────────────────────────── */}
      <div className="table-container" style={{ marginTop: 24 }}>
        <table className="table">
          <thead>
            <tr>
              <th>Mes</th>
              <th style={{ textAlign: 'right' }}>Ingresos</th>
              <th style={{ textAlign: 'right' }}>Gastos</th>
              <th style={{ textAlign: 'right' }}>Ganancia</th>
              <th style={{ textAlign: 'right' }}>Margen</th>
              <th style={{ textAlign: 'right' }}># Ventas</th>
            </tr>
          </thead>
          <tbody>
            {[...chart].reverse().map(m => {
              const profit  = m.sales - m.expenses;
              const margin  = m.sales > 0 ? ((profit / m.sales) * 100).toFixed(1) : '—';
              return (
                <tr key={m.month}>
                  <td style={{ fontWeight: 600 }}>{getMonthLabel(m.month)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--green)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(m.sales)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(m.expenses)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: profit >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                    {profit < 0 ? '-' : ''}{formatCurrency(Math.abs(profit))}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontSize: '0.85rem' }}>
                    {m.sales > 0 ? `${margin}%` : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{m.sales_count}</td>
                </tr>
              );
            })}
          </tbody>
          {/* Totales */}
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--line)' }}>
              <td style={{ fontWeight: 800, fontSize: '0.85rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL</td>
              <td style={{ textAlign: 'right', color: 'var(--green)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{formatCurrency(totals.sales)}</td>
              <td style={{ textAlign: 'right', color: 'var(--red)', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>{formatCurrency(totals.expenses)}</td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: totals.profit >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                {totals.profit < 0 ? '-' : ''}{formatCurrency(Math.abs(totals.profit))}
              </td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--muted)' }}>{margin}%</td>
              <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontWeight: 700 }}>
                {chart.reduce((s, m) => s + m.sales_count, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
