const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All dashboard routes require authentication
router.use(authMiddleware);

// Helper to format ISO date prefix (YYYY-MM)
function getYearMonthPrefix(dateStr) {
  if (!dateStr) return '';
  return dateStr.substring(0, 7); // 'YYYY-MM'
}

// ──────────────────────────────────────────────
// GET /api/dashboard/summary
// ──────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${year}-${month}`; // YYYY-MM

    // Fetch all collections in parallel for maximum speed
    const [salesSnap, expensesSnap, customersSnap, productsSnap] = await Promise.all([
      db.collection('sales').get(),
      db.collection('expenses').get(),
      db.collection('customers').get(),
      db.collection('products').get()
    ]);

    const sales = salesSnap.docs.map(doc => doc.data());
    const expenses = expensesSnap.docs.map(doc => doc.data());

    // Filter sales for the current month (where status !== 'cancelado')
    const currentMonthSales = sales.filter(s => 
      s.created_at && 
      getYearMonthPrefix(s.created_at) === monthPrefix && 
      s.status !== 'cancelado'
    );

    // Filter expenses for the current month
    const currentMonthExpenses = expenses.filter(e => 
      e.date && 
      getYearMonthPrefix(e.date) === monthPrefix
    );

    const totalSalesMonth = currentMonthSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const totalExpensesMonth = currentMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const salesCountMonth = currentMonthSales.length;

    res.json({
      data: {
        total_sales_month: totalSalesMonth,
        total_expenses_month: totalExpensesMonth,
        profit_month: totalSalesMonth - totalExpensesMonth,
        total_customers: customersSnap.size,
        total_products: productsSnap.size,
        sales_count_month: salesCountMonth,
      },
    });
  } catch (err) {
    console.error('Dashboard summary error:', err.message);
    res.status(500).json({ error: 'Error al obtener resumen del dashboard.' });
  }
});

// ──────────────────────────────────────────────
// GET /api/dashboard/sales-chart
// ──────────────────────────────────────────────
router.get('/sales-chart', async (req, res) => {
  try {
    // Build list of last 12 months (e.g. YYYY-MM)
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push(key);
    }

    const salesSnap = await db.collection('sales').get();
    const sales = salesSnap.docs.map(doc => doc.data());

    // Aggregate in memory
    const monthlyData = {};
    months.forEach(m => {
      monthlyData[m] = { total: 0, count: 0 };
    });

    sales.forEach(s => {
      if (s.status !== 'cancelado' && s.created_at) {
        const monthPrefix = getYearMonthPrefix(s.created_at);
        if (monthlyData[monthPrefix]) {
          monthlyData[monthPrefix].total += (Number(s.total) || 0);
          monthlyData[monthPrefix].count += 1;
        }
      }
    });

    const chart = months.map(m => ({
      month: m,
      total: monthlyData[m].total,
      count: monthlyData[m].count
    }));

    res.json({ data: chart });
  } catch (err) {
    console.error('Sales chart error:', err.message);
    res.status(500).json({ error: 'Error al obtener datos del gráfico de ventas.' });
  }
});

// ──────────────────────────────────────────────
// GET /api/dashboard/top-products
// ──────────────────────────────────────────────
router.get('/top-products', async (req, res) => {
  try {
    const salesSnap = await db.collection('sales').get();
    const sales = salesSnap.docs.map(doc => doc.data());

    // Aggregate sold products in memory
    const productAgg = {};

    sales.forEach(s => {
      if (s.status !== 'cancelado' && Array.isArray(s.items)) {
        s.items.forEach(item => {
          const pid = item.product_id;
          if (pid) {
            if (!productAgg[pid]) {
              productAgg[pid] = {
                name: item.product_name || 'Producto',
                total_quantity: 0,
                total_revenue: 0
              };
            }
            productAgg[pid].total_quantity += (Number(item.quantity) || 0);
            productAgg[pid].total_revenue += (Number(item.subtotal) || 0);
          }
        });
      }
    });

    // Convert to sorted array and limit to top 5
    const topProducts = Object.values(productAgg)
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 5);

    res.json({ data: topProducts });
  } catch (err) {
    console.error('Top products error:', err.message);
    res.status(500).json({ error: 'Error al obtener productos más vendidos.' });
  }
});

// ──────────────────────────────────────────────
// GET /api/dashboard/expenses-breakdown
// ──────────────────────────────────────────────
router.get('/expenses-breakdown', async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${year}-${month}`; // YYYY-MM

    const expensesSnap = await db.collection('expenses').get();
    const expenses = expensesSnap.docs.map(doc => doc.data());

    // Aggregate by category in memory
    const categoryAgg = {};

    expenses.forEach(e => {
      if (e.date && getYearMonthPrefix(e.date) === monthPrefix) {
        const cat = e.category;
        const amt = Number(e.amount) || 0;
        categoryAgg[cat] = (categoryAgg[cat] || 0) + amt;
      }
    });

    const breakdown = Object.entries(categoryAgg).map(([category, total]) => ({
      category,
      total
    })).sort((a, b) => b.total - a.total);

    res.json({ data: breakdown });
  } catch (err) {
    console.error('Expenses breakdown error:', err.message);
    res.status(500).json({ error: 'Error al obtener desglose de gastos.' });
  }
});

// ──────────────────────────────────────────────
// GET /api/dashboard/recent-sales
// ──────────────────────────────────────────────
router.get('/recent-sales', async (req, res) => {
  try {
    const salesSnap = await db.collection('sales')
      .orderBy('created_at', 'desc')
      .limit(5)
      .get();

    const sales = salesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ data: sales });
  } catch (err) {
    console.error('Recent sales error:', err.message);
    res.status(500).json({ error: 'Error al obtener ventas recientes.' });
  }
});

module.exports = router;
