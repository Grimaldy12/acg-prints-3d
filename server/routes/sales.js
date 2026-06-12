const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/* ── Obtener y reservar el siguiente número de recibo ───────── */
async function getNextReceiptNumber() {
  const counterRef = db.collection('counters').doc('sales');
  let nextNum = 1;

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(counterRef);
    nextNum = doc.exists ? (doc.data().current || 0) + 1 : 1;
    tx.set(counterRef, { current: nextNum }, { merge: true });
  });

  return nextNum;
}

function formatReceiptNumber(num) {
  return String(num).padStart(4, '0'); // 0001, 0002, ...
}

// ──────────────────────────────────────────────
// GET /api/sales/summary
// ──────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const snapshot = await db.collection('sales').get();
    const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const total_ventas    = sales.length;
    const total_recaudado = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const total_pagado    = sales.filter(s => s.status === 'pagado' || s.status === 'entregado')
                                 .reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const total_pendiente = sales.filter(s => s.status === 'pendiente')
                                 .reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const total_entregado = sales.filter(s => s.status === 'entregado').length;
    const total_cancelado = sales.filter(s => s.status === 'cancelado').length;
    const validSales      = sales.filter(s => s.status !== 'cancelado');
    const ticket_promedio = validSales.length > 0
      ? validSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0) / validSales.length
      : 0;

    res.json({ data: { total_ventas, total_recaudado, total_pagado, total_pendiente, total_entregado, total_cancelado, ticket_promedio } });
  } catch (err) {
    console.error('Sales summary error:', err.message);
    res.status(500).json({ error: 'Error al obtener resumen de ventas.' });
  }
});

// ──────────────────────────────────────────────
// GET /api/sales
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, customer_id, from, to, search } = req.query;
    const snapshot = await db.collection('sales').orderBy('created_at', 'desc').get();
    let sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (status)      sales = sales.filter(s => s.status === status);
    if (customer_id) sales = sales.filter(s => s.customer_id === customer_id);
    if (from) { const d = new Date(from); sales = sales.filter(s => new Date(s.created_at) >= d); }
    if (to)   { const d = new Date(to); d.setHours(23,59,59,999); sales = sales.filter(s => new Date(s.created_at) <= d); }
    if (search) { const t = search.toLowerCase(); sales = sales.filter(s => s.customer_name?.toLowerCase().includes(t)); }

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
    if (!doc.exists) return res.status(404).json({ error: 'Venta no encontrada.' });
    res.json({ data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error('Get sale error:', err.message);
    res.status(500).json({ error: 'Error al obtener la venta.' });
  }
});

// ──────────────────────────────────────────────
// POST /api/sales  — asigna número consecutivo
// ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { customer_id, discount = 0, status = 'pendiente', notes = '', items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un item en la venta.' });
    }

    let customerName = 'Sin cliente';
    if (customer_id) {
      const customerDoc = await db.collection('customers').doc(customer_id).get();
      if (customerDoc.exists) customerName = customerDoc.data().name;
    }

    let total = 0;
    const resolvedItems = [];

    for (const item of items) {
      if (!item.product_id || !item.quantity || item.unit_price == null) {
        return res.status(400).json({ error: 'Cada item requiere product_id, quantity y unit_price.' });
      }
      const productDoc = await db.collection('products').doc(item.product_id).get();
      const productName = productDoc.exists ? productDoc.data().name : 'Producto eliminado';
      const subtotal = Number(item.quantity) * Number(item.unit_price);
      total += subtotal;
      resolvedItems.push({ product_id: item.product_id, product_name: productName, quantity: Number(item.quantity), unit_price: Number(item.unit_price), subtotal });

      if (productDoc.exists) {
        const newStock = Math.max(0, (Number(productDoc.data().stock) || 0) - Number(item.quantity));
        await db.collection('products').doc(item.product_id).update({ stock: newStock });
      }
    }

    total = Math.max(0, total - Number(discount));

    // ── Número consecutivo ────────────────────
    const receiptNum = await getNextReceiptNumber();
    const receipt_number = formatReceiptNumber(receiptNum);

    const newSale = {
      customer_id: customer_id || null,
      customer_name: customerName,
      total: Number(total),
      discount: Number(discount) || 0,
      status,
      notes: notes || '',
      items: resolvedItems,
      receipt_number,        // ← "0001", "0002"...
      receipt_seq: receiptNum, // número entero para ordenar
      created_at: new Date().toISOString(),
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
    if (!doc.exists) return res.status(404).json({ error: 'Venta no encontrada.' });

    const existing = doc.data();
    const { status = existing.status, notes = existing.notes, discount = existing.discount, customer_id = existing.customer_id, items } = req.body;

    let customerName = existing.customer_name;
    if (customer_id && customer_id !== existing.customer_id) {
      const customerDoc = await db.collection('customers').doc(customer_id).get();
      customerName = customerDoc.exists ? customerDoc.data().name : 'Sin cliente';
    }

    let updatedSale = {};

    if (items && Array.isArray(items) && items.length > 0) {
      let total = 0;
      const resolvedItems = [];
      for (const item of items) {
        const productDoc = await db.collection('products').doc(item.product_id).get();
        const productName = productDoc.exists ? productDoc.data().name : 'Producto eliminado';
        const subtotal = Number(item.quantity) * Number(item.unit_price);
        total += subtotal;
        resolvedItems.push({ product_id: item.product_id, product_name: productName, quantity: Number(item.quantity), unit_price: Number(item.unit_price), subtotal });
      }
      total = Math.max(0, total - Number(discount));
      updatedSale = { customer_id: customer_id || null, customer_name: customerName, total: Number(total), discount: Number(discount) || 0, status, notes: notes || '', items: resolvedItems };
    } else {
      const itemsList = existing.items || [];
      const total = Math.max(0, itemsList.reduce((sum, i) => sum + (Number(i.subtotal) || 0), 0) - Number(discount));
      updatedSale = { customer_id: customer_id || null, customer_name: customerName, discount: Number(discount) || 0, total, status, notes: notes || '' };
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
    if (!doc.exists) return res.status(404).json({ error: 'Venta no encontrada.' });
    await docRef.delete();
    res.json({ data: { message: 'Venta eliminada correctamente.' } });
  } catch (err) {
    console.error('Delete sale error:', err.message);
    res.status(500).json({ error: 'Error al eliminar la venta.' });
  }
});

module.exports = router;
