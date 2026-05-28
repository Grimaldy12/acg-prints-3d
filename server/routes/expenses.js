const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All expense routes require authentication
router.use(authMiddleware);

// ──────────────────────────────────────────────
// GET /api/expenses
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { category, from, to } = req.query;

    const snapshot = await db.collection('expenses').orderBy('date', 'desc').get();
    let expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Apply filters in-memory
    if (category) {
      expenses = expenses.filter(e => e.category === category);
    }

    if (from) {
      expenses = expenses.filter(e => e.date >= from);
    }

    if (to) {
      expenses = expenses.filter(e => e.date <= to);
    }

    res.json({ data: expenses });
  } catch (err) {
    console.error('Get expenses error:', err.message);
    res.status(500).json({ error: 'Error al obtener gastos.' });
  }
});

// ──────────────────────────────────────────────
// GET /api/expenses/:id
// ──────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('expenses').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Gasto no encontrado.' });
    }
    res.json({ data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error('Get expense error:', err.message);
    res.status(500).json({ error: 'Error al obtener el gasto.' });
  }
});

// ──────────────────────────────────────────────
// POST /api/expenses
// ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { category, amount, description, date } = req.body;

    if (!category || amount == null) {
      return res.status(400).json({ error: 'Los campos category y amount son obligatorios.' });
    }

    const defaultDate = date || new Date().toISOString().split('T')[0];

    const newExpense = {
      category,
      amount: Number(amount),
      description: description || '',
      date: defaultDate,
      created_at: new Date().toISOString()
    };

    const docRef = await db.collection('expenses').add(newExpense);
    res.status(201).json({ data: { id: docRef.id, ...newExpense } });
  } catch (err) {
    console.error('Create expense error:', err.message);
    res.status(500).json({ error: 'Error al crear el gasto.' });
  }
});

// ──────────────────────────────────────────────
// PUT /api/expenses/:id
// ──────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const docRef = db.collection('expenses').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Gasto no encontrado.' });
    }

    const existing = doc.data();

    const {
      category = existing.category,
      amount = existing.amount,
      description = existing.description,
      date = existing.date,
    } = req.body;

    const updatedExpense = {
      category,
      amount: Number(amount),
      description: description || '',
      date: date || existing.date
    };

    await docRef.update(updatedExpense);

    res.json({ data: { id: doc.id, ...existing, ...updatedExpense } });
  } catch (err) {
    console.error('Update expense error:', err.message);
    res.status(500).json({ error: 'Error al actualizar el gasto.' });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/expenses/:id
// ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const docRef = db.collection('expenses').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Gasto no encontrado.' });
    }

    await docRef.delete();
    res.json({ data: { message: 'Gasto eliminado correctamente.' } });
  } catch (err) {
    console.error('Delete expense error:', err.message);
    res.status(500).json({ error: 'Error al eliminar el gasto.' });
  }
});

module.exports = router;
