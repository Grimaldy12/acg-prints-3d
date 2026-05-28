const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All customer routes require authentication
router.use(authMiddleware);

// ──────────────────────────────────────────────
// GET /api/customers
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;

    // Get all customers
    const customersSnapshot = await db.collection('customers').orderBy('created_at', 'desc').get();
    let customers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get all sales to calculate total_spent (avoiding multiple DB round-trips for small businesses)
    const salesSnapshot = await db.collection('sales').get();
    const sales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Map total_spent to each customer
    customers = customers.map(c => {
      const customerSales = sales.filter(s => s.customer_id === c.id && s.status !== 'cancelado');
      const totalSpent = customerSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      return {
        ...c,
        total_spent: totalSpent
      };
    });

    // In-memory text search filtering
    if (search) {
      const term = search.toLowerCase().trim();
      customers = customers.filter(c => 
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.phone && c.phone.includes(term)) ||
        (c.instagram && c.instagram.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term))
      );
    }

    res.json({ data: customers });
  } catch (err) {
    console.error('Get customers error:', err.message);
    res.status(500).json({ error: 'Error al obtener clientes.' });
  }
});

// ──────────────────────────────────────────────
// GET /api/customers/:id
// ──────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const customerDoc = await db.collection('customers').doc(req.params.id).get();
    if (!customerDoc.exists) {
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }

    const customer = customerDoc.data();

    // Fetch purchase history (sales)
    const salesSnapshot = await db.collection('sales')
      .where('customer_id', '==', req.params.id)
      .get();
    
    const sales = salesSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Calculate total spent
    const totalSpent = sales
      .filter(s => s.status !== 'cancelado')
      .reduce((sum, s) => sum + (Number(s.total) || 0), 0);

    res.json({
      data: {
        id: customerDoc.id,
        ...customer,
        total_spent: totalSpent,
        sales
      }
    });
  } catch (err) {
    console.error('Get customer error:', err.message);
    res.status(500).json({ error: 'Error al obtener el cliente.' });
  }
});

// ──────────────────────────────────────────────
// POST /api/customers
// ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, phone, instagram, email, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El campo name es obligatorio.' });
    }

    const newCustomer = {
      name: name.trim(),
      phone: phone || '',
      instagram: instagram || '',
      email: email || '',
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    const docRef = await db.collection('customers').add(newCustomer);
    res.status(201).json({ data: { id: docRef.id, ...newCustomer } });
  } catch (err) {
    console.error('Create customer error:', err.message);
    res.status(500).json({ error: 'Error al crear el cliente.' });
  }
});

// ──────────────────────────────────────────────
// PUT /api/customers/:id
// ──────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const docRef = db.collection('customers').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }

    const existing = doc.data();

    const {
      name = existing.name,
      phone = existing.phone,
      instagram = existing.instagram,
      email = existing.email,
      notes = existing.notes,
    } = req.body;

    const updatedCustomer = {
      name: typeof name === 'string' ? name.trim() : name,
      phone: phone || '',
      instagram: instagram || '',
      email: email || '',
      notes: notes || ''
    };

    await docRef.update(updatedCustomer);

    res.json({ data: { id: doc.id, ...existing, ...updatedCustomer } });
  } catch (err) {
    console.error('Update customer error:', err.message);
    res.status(500).json({ error: 'Error al actualizar el cliente.' });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/customers/:id
// ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const docRef = db.collection('customers').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Cliente no encontrado.' });
    }

    await docRef.delete();
    res.json({ data: { message: 'Cliente eliminado correctamente.' } });
  } catch (err) {
    console.error('Delete customer error:', err.message);
    res.status(500).json({ error: 'Error al eliminar el cliente.' });
  }
});

module.exports = router;
