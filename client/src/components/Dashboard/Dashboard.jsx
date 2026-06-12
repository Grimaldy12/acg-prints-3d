import { useState, useEffect, useRef } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign,
  Users, ShoppingCart, Package, ArrowRight, Printer, ClipboardList
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import { formatCurrency, formatDate, getMonthName } from '../../utils/formatters';
import { EXPENSE_CATEGORIES } from '../../utils/constants';

// Paleta "taller": tinta + naranja filamento + semánticos sobrios
const PIE_COLORS = ['#E2570F', '#20251F', '#6D4BBE', '#2E7D4F', '#2F63C4', '#B83A74', '#A66B06', '#79806F', '#C13A2E'];

/* ── Contador animado: los números "se imprimen" al cargar ──── */
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !target) {
      setValue(target || 0);
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cúbico
      setValue(target * eased);
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

function StatCard({ icon: Icon, label, value, color, isCurrency = true, trend }) {
  const animated = useCountUp(value);
  const display = isCurrency
    ? formatCurrency(animated)
    : Math.round(animated).toLocaleString('es-PA');

  return (
    <div className="stat-card" style={{ '--card-accent': color }}>
      <div className="stat-icon" style={{ background: `${color}1A`, color }}>
        <Icon size={22} />
      </div>
      <div className="stat-info">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{display}</span>
        {trend !== undefined && (
          <span className={`stat-trend ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{getMonthName(label)}</p>
        <p className="chart-tooltip-value income">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

function ProductTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{payload[0].payload.name}</p>
        <p className="chart-tooltip-value income">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

function PieTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{payload[0].name}</p>
        <p className="chart-tooltip-value expense">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

/* ── Esqueleto de carga: la página mantiene su estructura ───── */
function DashboardSkeleton() {
  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div style={{ width: '100%' }}>
          <div className="skeleton skeleton-title" style={{ width: 220 }} />
          <div className="skeleton skeleton-text" style={{ width: 300 }} />
        </div>
      </div>
      <div className="stats-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
      <div className="charts-grid">
        {[0, 1].map((i) => (
          <div key={i} className="skeleton skeleton-chart" />
        ))}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [salesChart, setSalesChart] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [expensesBreakdown, setExpensesBreakdown] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [summaryRes, chartRes, productsRes, expensesRes, recentRes] = await Promise.all([
        api.get('/api/dashboard/summary'),
        api.get('/api/dashboard/sales-chart'),
        api.get('/api/dashboard/top-products'),
        api.get('/api/dashboard/expenses-breakdown'),
        api.get('/api/dashboard/recent-sales'),
      ]);
      setSummary(summaryRes.data);
      setSalesChart(chartRes.data);
      setTopProducts(productsRes.data);
      setExpensesBreakdown(expensesRes.data);
      setRecentSales(recentRes.data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  const getCategoryLabel = (cat) => {
    const found = EXPENSE_CATEGORIES.find(c => c.value === cat);
    return found ? found.label : cat;
  };

  const rawDate = new Date().toLocaleDateString('es-PA', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const today = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>{getGreeting()}</h1>
          <p className="page-subtitle">{today} · así va el taller</p>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="stats-grid">
        <StatCard
          icon={TrendingUp}
          label="Ventas del mes"
          value={summary?.total_sales_month || 0}
          color="#2E7D4F"
        />
        <StatCard
          icon={TrendingDown}
          label="Gastos del mes"
          value={summary?.total_expenses_month || 0}
          color="#C13A2E"
        />
        <StatCard
          icon={DollarSign}
          label="Ganancia"
          value={summary?.profit_month || 0}
          color="#E2570F"
        />
        <StatCard
          icon={Users}
          label="Clientes"
          value={summary?.total_customers || 0}
          color="#6D4BBE"
          isCurrency={false}
        />
      </div>

      {/* Producción y pedidos activos */}
      <div style={{ marginTop: '32px', marginBottom: '8px' }}>
        <h2 style={{
          fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          fontFamily: 'var(--font-mono)', marginBottom: '14px',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <Printer size={16} style={{ color: 'var(--accent)' }} />
          Producción y pedidos activos
        </h2>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <StatCard
            icon={ClipboardList}
            label="En cola / imprimiendo"
            value={summary?.active_orders_count || 0}
            color="#6D4BBE"
            isCurrency={false}
          />
          <StatCard
            icon={Printer}
            label="Listos para entregar"
            value={summary?.finished_orders_count || 0}
            color="#B83A74"
            isCurrency={false}
          />
          <StatCard
            icon={DollarSign}
            label="Adelantos en caja"
            value={summary?.total_active_deposits || 0}
            color="#2F63C4"
          />
        </div>
      </div>

      {/* Gráficas */}
      <div className="charts-grid">
        {/* Ventas mensuales */}
        <div className="chart-card">
          <h3 className="chart-title">
            <ShoppingCart size={18} />
            Ventas mensuales
          </h3>
          <div className="chart-container">
            {salesChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={salesChart}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E2570F" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#E2570F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DBDCD0" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(m) => m.split('-')[1]}
                    stroke="#79806F"
                    fontSize={12}
                  />
                  <YAxis stroke="#79806F" fontSize={12} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#E2570F"
                    strokeWidth={2.5}
                    fill="url(#salesGradient)"
                    animationDuration={900}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Sin ventas todavía. Registra la primera y aquí verás la curva.</div>
            )}
          </div>
        </div>

        {/* Productos más vendidos */}
        <div className="chart-card">
          <h3 className="chart-title">
            <Package size={18} />
            Productos más vendidos
          </h3>
          <div className="chart-container">
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topProducts} margin={{ left: 10, right: 10, top: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DBDCD0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#79806F"
                    fontSize={10}
                    interval={0}
                    tick={{ fill: '#4C5249' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#79806F"
                    fontSize={11}
                    tickFormatter={(v) => `$${v}`}
                    tick={{ fill: '#4C5249' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ProductTooltip />} cursor={{ fill: 'rgba(32, 37, 31, 0.05)', radius: [4, 4, 0, 0] }} />
                  <Bar
                    dataKey="total_revenue"
                    fill="#20251F"
                    radius={[4, 4, 0, 0]}
                    barSize={42}
                    animationDuration={900}
                  >
                    {topProducts.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#E2570F' : '#20251F'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Sin productos vendidos aún.</div>
            )}
          </div>
        </div>

        {/* Gastos por categoría */}
        <div className="chart-card">
          <h3 className="chart-title">
            <DollarSign size={18} />
            Gastos por categoría
          </h3>
          <div className="chart-container">
            {expensesBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={expensesBreakdown.map(e => ({ ...e, name: getCategoryLabel(e.category) }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="total"
                    animationDuration={900}
                  >
                    {expensesBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#FFFFFF" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="square"
                    iconSize={9}
                    formatter={(value) => <span style={{ color: '#4C5249', fontSize: '12px' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Sin gastos registrados este mes.</div>
            )}
          </div>
        </div>

        {/* Ventas recientes */}
        <div className="chart-card">
          <h3 className="chart-title" style={{ justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={18} />
              Ventas recientes
            </span>
            <Link to="/ventas" className="chart-link">
              Ver todas <ArrowRight size={14} />
            </Link>
          </h3>
          <div className="recent-sales-list">
            {recentSales.length > 0 ? (
              <table className="data-table compact">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="mono">{formatDate(sale.created_at)}</td>
                      <td>{sale.customer_name || 'Sin cliente'}</td>
                      <td className="money">{formatCurrency(sale.total)}</td>
                      <td>
                        <span className={`badge badge-${sale.status}`}>
                          <span className="badge-dot" />
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-chart">Sin ventas registradas aún.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
