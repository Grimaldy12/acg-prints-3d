const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All product routes require authentication
router.use(authMiddleware);

// ──────────────────────────────────────────────
// GET /api/products
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;

    const snapshot = await db.collection('products').orderBy('created_at', 'desc').get();
    let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (search) {
      const term = search.toLowerCase().trim();
      products = products.filter(p => 
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.description && p.description.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term))
      );
    }

    res.json({ data: products });
  } catch (err) {
    console.error('Get products error:', err.message);
    res.status(500).json({ error: 'Error al obtener productos.' });
  }
});

// ──────────────────────────────────────────────
// GET /api/products/:id
// ──────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('products').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }
    res.json({ data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error('Get product error:', err.message);
    res.status(500).json({ error: 'Error al obtener el producto.' });
  }
});

// ──────────────────────────────────────────────
// POST /api/products
// ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, description, category, material_cost, print_time_minutes, sale_price, stock, weight_g } = req.body;

    if (!name || sale_price == null) {
      return res.status(400).json({ error: 'Los campos name y sale_price son obligatorios.' });
    }

    const newProduct = {
      name: name.trim(),
      description: description || '',
      category: category || 'general',
      material_cost: Number(material_cost) || 0,
      print_time_minutes: Number(print_time_minutes) || 0,
      sale_price: Number(sale_price),
      stock: Number(stock) || 0,
      weight_g: Number(weight_g) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const docRef = await db.collection('products').add(newProduct);
    res.status(201).json({ data: { id: docRef.id, ...newProduct } });
  } catch (err) {
    console.error('Create product error:', err.message);
    res.status(500).json({ error: 'Error al crear el producto.' });
  }
});

// ──────────────────────────────────────────────
// PUT /api/products/:id
// ──────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const docRef = db.collection('products').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const existing = doc.data();

    const {
      name = existing.name,
      description = existing.description,
      category = existing.category,
      material_cost = existing.material_cost,
      print_time_minutes = existing.print_time_minutes,
      sale_price = existing.sale_price,
      stock = existing.stock,
      weight_g = existing.weight_g,
    } = req.body;

    const updatedProduct = {
      name: typeof name === 'string' ? name.trim() : name,
      description: description || '',
      category: category || 'general',
      material_cost: Number(material_cost) || 0,
      print_time_minutes: Number(print_time_minutes) || 0,
      sale_price: Number(sale_price),
      stock: Number(stock) || 0,
      weight_g: Number(weight_g) || 0,
      updated_at: new Date().toISOString()
    };

    await docRef.update(updatedProduct);

    res.json({ data: { id: doc.id, ...existing, ...updatedProduct } });
  } catch (err) {
    console.error('Update product error:', err.message);
    res.status(500).json({ error: 'Error al actualizar el producto.' });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/products/:id
// ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const docRef = db.collection('products').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    await docRef.delete();
    res.json({ data: { message: 'Producto eliminado correctamente.' } });
  } catch (err) {
    console.error('Delete product error:', err.message);
    res.status(500).json({ error: 'Error al eliminar el producto.' });
  }
});

module.exports = router;
