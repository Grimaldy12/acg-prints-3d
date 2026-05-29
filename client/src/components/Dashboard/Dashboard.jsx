import { useState, useEffect, useContext } from 'react';
import {
  LayoutDashboard, TrendingUp, TrendingDown, DollarSign,
  Users, ShoppingCart, Package, ArrowRight, Loader2, Printer, ClipboardList
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Link } from 'react-router-dom';
import { api } from '../../utils/api';
import { formatCurrency, formatDate, getMonthName } from '../../utils/formatters';
import { EXPENSE_CATEGORIES, STATUS_COLORS } from '../../utils/constants';

const PIE_COLORS = ['#00D4AA', '#8B5CF6', '#F5A623', '#EF4444', '#3B82F6', '#EC4899', '#F59E0B', '#22C55E', '#6366F1'];

function StatCard({ icon: Icon, label, value, color, trend }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `${color}20`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '10px', flexShrink: 0 }}>
        <Icon size={24} />
      </div>
      <div className="stat-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span className="stat-label" style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{label}</span>
        <span className="stat-value" style={{ display: 'block', fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-primary)' }}>{value}</span>
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
        <p className="chart-tooltip-value income">
          {formatCurrency(payload[0].value)}
        </p>
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
        <p className="chart-tooltip-value expense">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
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
    return (
      <div className="page-loading">
        <Loader2 className="spin" size={40} />
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  const getCategoryLabel = (cat) => {
    const found = EXPENSE_CATEGORIES.find(c => c.value === cat);
    return found ? found.label : cat;
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-subtitle">Resumen de tu negocio de impresión 3D</p>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <StatCard
          icon={TrendingUp}
          label="Ventas del Mes"
          value={formatCurrency(summary?.total_sales_month || 0)}
          color="#22C55E"
        />
        <StatCard
          icon={TrendingDown}
          label="Gastos del Mes"
          value={formatCurrency(summary?.total_expenses_month || 0)}
          color="#EF4444"
        />
        <StatCard
          icon={DollarSign}
          label="Ganancia"
          value={formatCurrency(summary?.profit_month || 0)}
          color="#F5A623"
        />
        <StatCard
          icon={Users}
          label="Clientes"
          value={summary?.total_customers || 0}
          color="#8B5CF6"
        />
      </div>

      {/* Production and Active Orders Summary */}
      <div style={{ marginTop: '32px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Printer size={18} style={{ color: 'var(--accent-cyan)' }} />
          Producción y Pedidos Activos
        </h2>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <StatCard
            icon={ClipboardList}
            label="Pedidos Activos (Cola/Impr.)"
            value={summary?.active_orders_count || 0}
            color="#8B5CF6"
          />
          <StatCard
            icon={Printer}
            label="Pedidos Terminados (Listo)"
            value={summary?.finished_orders_count || 0}
            color="#EC4899"
          />
          <StatCard
            icon={DollarSign}
            label="Adelantos en Caja Activos"
            value={formatCurrency(summary?.total_active_deposits || 0)}
            color="#00D4AA"
          />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Sales Chart */}
        <div className="chart-card">
          <h3 className="chart-title">
            <ShoppingCart size={18} />
            Ventas Mensuales
          </h3>
          <div className="chart-container">
            {salesChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={salesChart}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00D4AA" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(m) => m.split('-')[1]}
                    stroke="#6b6b80"
                    fontSize={12}
                  />
                  <YAxis stroke="#6b6b80" fontSize={12} tickFormatter={(v) => `$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#00D4AA"
                    strokeWidth={2}
                    fill="url(#salesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Sin datos de ventas aún</div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="chart-card">
          <h3 className="chart-title">
            <Package size={18} />
            Productos Más Vendidos
          </h3>
          <div className="chart-container">
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topProducts} margin={{ left: 10, right: 10, top: 20, bottom: 10 }}>
                  <defs>
                    <linearGradient id="productGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00D4AA" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#6b6b80"
                    fontSize={11}
                    tick={{ fill: '#a0a0b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#6b6b80"
                    fontSize={11}
                    tickFormatter={(v) => `$${v}`}
                    tick={{ fill: '#a0a0b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ProductTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)', radius: [8, 8, 0, 0] }} />
                  <Bar dataKey="total_revenue" fill="url(#productGradient)" radius={[8, 8, 0, 0]} barSize={45} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Sin productos vendidos aún</div>
            )}
          </div>
        </div>

        {/* Expenses Pie */}
        <div className="chart-card">
          <h3 className="chart-title">
            <DollarSign size={18} />
            Gastos por Categoría
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
                    paddingAngle={4}
                    dataKey="total"
                  >
                    {expensesBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    formatter={(value) => <span style={{ color: '#a0a0b8', fontSize: '12px' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Sin gastos registrados este mes</div>
            )}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="chart-card">
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={18} style={{ color: 'var(--accent-cyan)' }} />
              <span>Ventas Recientes</span>
            </div>
            <Link to="/ventas" className="chart-link" style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                      <td>{formatDate(sale.created_at)}</td>
                      <td>{sale.customer_name || 'Sin cliente'}</td>
                      <td className="money">{formatCurrency(sale.total)}</td>
                      <td>
                        <span className={`badge badge-${sale.status}`}>
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-chart">Sin ventas registradas aún</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
