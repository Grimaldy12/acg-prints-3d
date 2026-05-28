const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All sales routes require authentication
router.use(authMiddleware);

// ──────────────────────────────────────────────
// GET /api/sales
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, customer_id, from, to, search } = req.query;

    const snapshot = await db.collection('sales').orderBy('created_at', 'desc').get();
    let sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Apply filters in-memory
    if (status) {
      sales = sales.filter(s => s.status === status);
    }

    if (customer_id) {
      sales = sales.filter(s => s.customer_id === customer_id);
    }

    if (from) {
      const fromDate = new Date(from);
      sales = sales.filter(s => new Date(s.created_at) >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999); // Include the whole end day
      sales = sales.filter(s => new Date(s.created_at) <= toDate);
    }

    if (search) {
      const term = search.toLowerCase().trim();
      sales = sales.filter(s => 
        (s.customer_name && s.customer_name.toLowerCase().includes(term))
      );
    }

    res.json({ data: sales });
  } catch (err) {
    console.error('Get sales error:', err.message);
    res.status(500).json({ error: 'Error al obtener ventas.' });
  }
});

// ──────────────────────────────────────────────
// GET /api/sales/:id
// ──────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('sales').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Venta no encontrada.' });
    }
    
    // In our NoSQL Firestore schema, items are embedded directly in the sale doc!
    res.json({ data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error('Get sale error:', err.message);
    res.status(500).json({ error: 'Error al obtener la venta.' });
  }
});

// ──────────────────────────────────────────────
// POST /api/sales
// ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { customer_id, discount = 0, status = 'pendiente', notes = '', items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un item en la venta.' });
    }

    // Fetch customer name
    let customerName = 'Sin cliente';
    if (customer_id) {
      const customerDoc = await db.collection('customers').doc(customer_id).get();
      if (customerDoc.exists) {
        customerName = customerDoc.data().name;
      }
    }

    // Resolve products and calculate totals
    let total = 0;
    const resolvedItems = [];

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.unit_price == null) {
        return res.status(400).json({ error: 'Cada item requiere product_id, quantity y unit_price.' });
      }

      // Fetch product name
      const productDoc = await db.collection('products').doc(item.product_id).get();
      const productName = productDoc.exists ? productDoc.data().name : 'Producto eliminado';

      const subtotal = Number(item.quantity) * Number(item.unit_price);
      total += subtotal;

      resolvedItems.push({
        product_id: item.product_id,
        product_name: productName,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        subtotal
      });

      // Optionally deduct stock
      if (productDoc.exists) {
        const prodData = productDoc.data();
        const currentStock = Number(prodData.stock) || 0;
        const newStock = Math.max(0, currentStock - Number(item.quantity));
        await db.collection('products').doc(item.product_id).update({ stock: newStock });
      }
    }

    // Apply discount
    total = total - Number(discount);
    if (total < 0) total = 0;

    const newSale = {
      customer_id: customer_id || null,
      customer_name: customerName,
      total: Number(total),
      discount: Number(discount) || 0,
      status,
      notes: notes || '',
      items: resolvedItems,
      created_at: new Date().toISOString()
    };

    const docRef = await db.collection('sales').add(newSale);

    res.status(201).json({ data: { id: docRef.id, ...newSale } });
  } catch (err) {
    console.error('Create sale error:', err.message);
    res.status(400).json({ error: err.message || 'Error al crear la venta.' });
  }
});

// ──────────────────────────────────────────────
// PUT /api/sales/:id
// ──────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const docRef = db.collection('sales').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Venta no encontrada.' });
    }

    const existing = doc.data();

    const {
      status = existing.status,
      notes = existing.notes,
      discount = existing.discount,
      customer_id = existing.customer_id,
      items,
    } = req.body;

    // Fetch customer name if it changed
    let customerName = existing.customer_name;
    if (customer_id && customer_id !== existing.customer_id) {
      const customerDoc = await db.collection('customers').doc(customer_id).get();
      if (customerDoc.exists) {
        customerName = customerDoc.data().name;
      } else {
        customerName = 'Sin cliente';
      }
    }

    let updatedSale = {};

    if (items && Array.isArray(items) && items.length > 0) {
      // Recalculate totals with new items
      let total = 0;
      const resolvedItems = [];

      for (const item of items) {
        const productDoc = await db.collection('products').doc(item.product_id).get();
        const productName = productDoc.exists ? productDoc.data().name : 'Producto eliminado';
        const subtotal = Number(item.quantity) * Number(item.unit_price);
        total += subtotal;

        resolvedItems.push({
          product_id: item.product_id,
          product_name: productName,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          subtotal
        });
      }

      total = total - Number(discount);
      if (total < 0) total = 0;

      updatedSale = {
        customer_id: customer_id || null,
        customer_name: customerName,
        total: Number(total),
        discount: Number(discount) || 0,
        status,
        notes: notes || '',
        items: resolvedItems
      };
    } else {
      // Just update metadata, keep existing items
      const itemsList = existing.items || [];
      let total = itemsList.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
      total = total - Number(discount);
      if (total < 0) total = 0;

      updatedSale = {
        customer_id: customer_id || null,
        customer_name: customerName,
        discount: Number(discount) || 0,
        total: Number(total),
        status,
        notes: notes || ''
      };
    }

    await docRef.update(updatedSale);

    const finalDoc = await docRef.get();
    res.json({ data: { id: finalDoc.id, ...finalDoc.data() } });
  } catch (err) {
    console.error('Update sale error:', err.message);
    res.status(500).json({ error: 'Error al actualizar la venta.' });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/sales/:id
// ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const docRef = db.collection('sales').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Venta no encontrada.' });
    }

    await docRef.delete();
    res.json({ data: { message: 'Venta eliminada correctamente.' } });
  } catch (err) {
    console.error('Delete sale error:', err.message);
    res.status(500).json({ error: 'Error al eliminar la venta.' });
  }
});

module.exports = router;
