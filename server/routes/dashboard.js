const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function getYearMonthPrefix(dateStr) {
  if (!dateStr) return '';
  return dateStr.substring(0, 7);
}

function currentMonthPrefix() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ──────────────────────────────────────────────
// GET /api/dashboard/summary?month=YYYY-MM
// ──────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const monthPrefix = req.query.month || currentMonthPrefix();

    const [salesSnap, expensesSnap, customersSnap, productsSnap, ordersSnap] = await Promise.all([
      db.collection('sales').get(),
      db.collection('expenses').get(),
      db.collection('customers').get(),
      db.collection('products').get(),
      db.collection('orders').get()
    ]);

    const sales    = salesSnap.docs.map(doc => doc.data());
    const expenses = expensesSnap.docs.map(doc => doc.data());
    const orders   = ordersSnap.docs.map(doc => doc.data());

    const monthSales = sales.filter(s =>
      s.created_at && getYearMonthPrefix(s.created_at) === monthPrefix && s.status !== 'cancelado'
    );
    const monthExpenses = expenses.filter(e =>
      e.date && getYearMonthPrefix(e.date) === monthPrefix
    );

    const totalSales    = monthSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const totalExpenses = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    res.json({
      data: {
        month: monthPrefix,
        total_sales_month: totalSales,
        total_expenses_month: totalExpenses,
        profit_month: totalSales - totalExpenses,
        total_customers: customersSnap.size,
        total_products: productsSnap.size,
        sales_count_month: monthSales.length,
        active_orders_count:   orders.filter(o => o.status === 'cola' || o.status === 'imprimiendo').length,
        finished_orders_count: orders.filter(o => o.status === 'terminado').length,
        total_active_deposits: orders
          .filter(o => o.status !== 'entregado' && o.status !== 'cancelado')
          .reduce((sum, o) => sum + (Number(o.deposit) || 0), 0),
      },
    });
  } catch (err) {
    console.error('Dashboard summary error:', err.message);
    res.status(500).json({ error: 'Error al obtener resumen del dashboard.' });
  }
});

// ──────────────────────────────────────────────
// GET /api/dashboard/sales-chart  (sin cambios)
// ──────────────────────────────────────────────
router.get('/sales-chart', async (req, res) => {
  try {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const salesSnap = await db.collection('sales').get();
    const sales = salesSnap.docs.map(doc => doc.data());

    const monthlyData = {};
    months.forEach(m => { monthlyData[m] = { total: 0, count: 0 }; });

    sales.forEach(s => {
      if (s.status !== 'cancelado' && s.created_at) {
        const mp = getYearMonthPrefix(s.created_at);
        if (monthlyData[mp]) {
          monthlyData[mp].total += (Number(s.total) || 0);
          monthlyData[mp].count += 1;
        }
      }
    });

    res.json({ data: months.map(m => ({ month: m, total: monthlyData[m].total, count: monthlyData[m].count })) });
  } catch (err) {
    console.error('Sales chart error:', err.message);
    res.status(500).json({ error: 'Error al obtener gráfico de ventas.' });
  }
});

// ──────────────────────────────────────────────
// GET /api/dashboard/top-products  (sin cambios)
// ──────────────────────────────────────────────
router.get('/top-products', async (req, res) => {
  try {
    const salesSnap = await db.collection('sales').get();
    const sales = salesSnap.docs.map(doc => doc.data());
    const agg = {};

    sales.forEach(s => {
      if (s.status !== 'cancelado' && Array.isArray(s.items)) {
        s.items.forEach(item => {
          const pid = item.product_id;
          if (pid) {
            if (!agg[pid]) agg[pid] = { name: item.product_name || 'Producto', total_quantity: 0, total_revenue: 0 };
            agg[pid].total_quantity += (Number(item.quantity) || 0);
            agg[pid].total_revenue  += (Number(item.subtotal) || 0);
          }
        });
      }
    });

    res.json({ data: Object.values(agg).sort((a, b) => b.total_quantity - a.total_quantity).slice(0, 5) });
  } catch (err) {
    console.error('Top products error:', err.message);
    res.status(500).json({ error: 'Error al obtener productos más vendidos.' });
  }
});

// ──────────────────────────────────────────────
// GET /api/dashboard/expenses-breakdown?month=YYYY-MM
// ──────────────────────────────────────────────
router.get('/expenses-breakdown', async (req, res) => {
  try {
    const monthPrefix = req.query.month || currentMonthPrefix();

    const expensesSnap = await db.collection('expenses').get();
    const expenses = expensesSnap.docs.map(doc => doc.data());
    const agg = {};

    expenses.forEach(e => {
      if (e.date && getYearMonthPrefix(e.date) === monthPrefix) {
        agg[e.category] = (agg[e.category] || 0) + (Number(e.amount) || 0);
      }
    });

    res.json({ data: Object.entries(agg).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total) });
  } catch (err) {
    console.error('Expenses breakdown error:', err.message);
    res.status(500).json({ error: 'Error al obtener desglose de gastos.' });
  }
});

// ──────────────────────────────────────────────
// GET /api/dashboard/recent-sales  (sin cambios)
// ──────────────────────────────────────────────
router.get('/recent-sales', async (req, res) => {
  try {
    const salesSnap = await db.collection('sales').orderBy('created_at', 'desc').limit(5).get();
    res.json({ data: salesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
  } catch (err) {
    console.error('Recent sales error:', err.message);
    res.status(500).json({ error: 'Error al obtener ventas recientes.' });
  }
});

module.exports = router;
