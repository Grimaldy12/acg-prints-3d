const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Ensure the data directory exists before the database module initializes
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Import database (starts async init)
const db = require('./database');

// Import routes
const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const customersRoutes = require('./routes/customers');
const salesRoutes = require('./routes/sales');
const expensesRoutes = require('./routes/expenses');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// Wait for database to be ready before handling requests
app.use((req, res, next) => {
  if (!db.ready) {
    return res.status(503).json({ error: 'Database is initializing. Please try again.' });
  }
  next();
});

// ─── Routes ─────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ─── Health check ───────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'ACG PRINTS 3D API', timestamp: new Date().toISOString() });
});

// ─── 404 handler ────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada.' });
});

// ─── Global error handler ───────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

// ─── Start server after DB is ready ─────────
async function start() {
  await db._initPromise;
  app.listen(PORT, () => {
    console.log(`ACG PRINTS 3D API running on port ${PORT}`);
  });
}

if (require.main === module) {
  start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = app;
