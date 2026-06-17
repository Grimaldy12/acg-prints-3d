const express = require('express');
const db = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ──────────────────────────────────────────────
// POST /api/orders/public  — SIN autenticación
// Formulario público para clientes
// ──────────────────────────────────────────────
router.post('/public', async (req, res) => {
  try {
    const {
      customer_name, customer_lastname, customer_phone,
      customer_cedula, customer_company,
      product_name, product_color, description,
    } = req.body;

    if (!customer_name || !customer_phone || !product_name) {
      return res.status(400).json({ error: 'Nombre, teléfono y producto son requeridos.' });
    }

    const fullName = `${customer_name.trim()} ${(customer_lastname||'').trim()}`.trim();

    const newOrder = {
      customer_id: null,
      customer_name: fullName,
      customer_phone: customer_phone.trim(),
      customer_cedula: customer_cedula || '',
      customer_company: customer_company || '',
      items: [],
      description: [
        product_name ? `Producto: ${product_name}` : '',
        product_color ? `Color: ${product_color}` : '',
        description ? `Detalles: ${description}` : '',
      ].filter(Boolean).join(' | '),
      product_name: product_name || '',
      product_color: product_color || '',
      total_price: 0,
      deposit: 0,
      balance_due: 0,
      status: 'cola',
      source: 'portal_cliente',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };

    const docRef = await db.collection('orders').add(newOrder);
    res.status(201).json({ data: { id: docRef.id, customer_name: fullName } });
  } catch (err) {
    console.error('Public order error:', err.message);
    res.status(500).json({ error: 'Error al registrar el pedido. Intenta de nuevo.' });
  }
});

// Todas las demás rutas requieren autenticación
router.use(authMiddleware);

// ──────────────────────────────────────────────
// GET /api/orders
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const snapshot = await db.collection('orders').orderBy('created_at', 'desc').get();
    let orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (status) orders = orders.filter(o => o.status === status);
    res.json({ data: orders });
  } catch (err) {
    console.error('Get orders error:', err.message);
    res.status(500).json({ error: 'Error al obtener los pedidos.' });
  }
});

// ──────────────────────────────────────────────
// GET /api/orders/:id
// ──────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('orders').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Pedido no encontrado.' });
    res.json({ data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    console.error('Get order error:', err.message);
    res.status(500).json({ error: 'Error al obtener el pedido.' });
  }
});

// ──────────────────────────────────────────────
// POST /api/orders
// ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { customer_id, customer_name, customer_phone, customer_cedula, items, description = '', total_price = 0, deposit = 0, status = 'cola', deadline } = req.body;

    if (!customer_name && !customer_id) return res.status(400).json({ error: 'Se requiere el nombre del cliente.' });

    let finalCustomerName = customer_name || 'Sin cliente';
    let finalCustomerPhone = customer_phone || '';
    let finalCustomerCedula = customer_cedula || '';

    if (customer_id) {
      const customerDoc = await db.collection('customers').doc(customer_id).get();
      if (customerDoc.exists) {
        const d = customerDoc.data();
        finalCustomerName = d.name;
        finalCustomerPhone = d.phone || finalCustomerPhone;
        finalCustomerCedula = d.cedula || finalCustomerCedula;
      }
    }

    const resolvedItems = [];
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.product_id) {
          const productDoc = await db.collection('products').doc(item.product_id).get();
          const pName = productDoc.exists ? productDoc.data().name : 'Producto';
          resolvedItems.push({ product_id: item.product_id, product_name: item.product_name || pName, quantity: Number(item.quantity)||1, unit_price: Number(item.unit_price)||0, subtotal: (Number(item.quantity)||1)*(Number(item.unit_price)||0) });
          if (productDoc.exists) {
            const currentStock = Number(productDoc.data().stock)||0;
            await db.collection('products').doc(item.product_id).update({ stock: Math.max(0, currentStock - (Number(item.quantity)||1)) });
          }
        }
      }
    }

    const newOrder = {
      customer_id: customer_id||null, customer_name: finalCustomerName,
      customer_phone: finalCustomerPhone, customer_cedula: finalCustomerCedula,
      items: resolvedItems, description: description||'',
      total_price: Number(total_price)||0, deposit: Number(deposit)||0,
      balance_due: Math.max(0, Number(total_price)-Number(deposit)),
      status: status||'cola',
      deadline: deadline||new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    const docRef = await db.collection('orders').add(newOrder);

    if (newOrder.status === 'entregado') {
      await db.collection('sales').add({ customer_id: newOrder.customer_id, customer_name: newOrder.customer_name, total: newOrder.total_price, discount: 0, status: 'entregado', notes: `Pedido creado y entregado: ${newOrder.description||''}`, items: newOrder.items, created_at: new Date().toISOString() });
    }

    res.status(201).json({ data: { id: docRef.id, ...newOrder } });
  } catch (err) {
    console.error('Create order error:', err.message);
    res.status(400).json({ error: err.message||'Error al crear el pedido.' });
  }
});

// ──────────────────────────────────────────────
// PUT /api/orders/:id
// ──────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const docRef = db.collection('orders').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Pedido no encontrado.' });

    const existing = doc.data();
    const { customer_id=existing.customer_id, customer_name=existing.customer_name, customer_phone=existing.customer_phone, customer_cedula=existing.customer_cedula, items, description=existing.description, total_price=existing.total_price, deposit=existing.deposit, status=existing.status, deadline=existing.deadline } = req.body;

    let finalCustomerName = customer_name, finalCustomerPhone = customer_phone, finalCustomerCedula = customer_cedula;
    if (customer_id && customer_id !== existing.customer_id) {
      const customerDoc = await db.collection('customers').doc(customer_id).get();
      if (customerDoc.exists) { const d = customerDoc.data(); finalCustomerName = d.name; finalCustomerPhone = d.phone||finalCustomerPhone; finalCustomerCedula = d.cedula||finalCustomerCedula; }
    }

    let resolvedItems = existing.items||[];
    if (items && Array.isArray(items)) {
      resolvedItems = [];
      for (const item of items) {
        const productDoc = item.product_id ? await db.collection('products').doc(item.product_id).get() : null;
        const pName = productDoc&&productDoc.exists ? productDoc.data().name : (item.product_name||'Producto');
        resolvedItems.push({ product_id: item.product_id||null, product_name: pName, quantity: Number(item.quantity)||1, unit_price: Number(item.unit_price)||0, subtotal: (Number(item.quantity)||1)*(Number(item.unit_price)||0) });
      }
    }

    const updatedOrder = { customer_id: customer_id||null, customer_name: finalCustomerName, customer_phone: finalCustomerPhone, customer_cedula: finalCustomerCedula, items: resolvedItems, description: description||'', total_price: Number(total_price)||0, deposit: Number(deposit)||0, balance_due: Math.max(0, Number(total_price)-Number(deposit)), status, deadline };
    await docRef.update(updatedOrder);

    if (status === 'entregado' && existing.status !== 'entregado') {
      await db.collection('sales').add({ customer_id: updatedOrder.customer_id, customer_name: updatedOrder.customer_name, total: updatedOrder.total_price, discount: 0, status: 'entregado', notes: `Pedido entregado: ${updatedOrder.description||''}`, items: updatedOrder.items, created_at: new Date().toISOString() });
    }

    const finalDoc = await docRef.get();
    res.json({ data: { id: finalDoc.id, ...finalDoc.data() } });
  } catch (err) {
    console.error('Update order error:', err.message);
    res.status(500).json({ error: 'Error al actualizar el pedido.' });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/orders/:id
// ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const docRef = db.collection('orders').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Pedido no encontrado.' });
    await docRef.delete();
    res.json({ data: { message: 'Pedido eliminado correctamente.' } });
  } catch (err) {
    console.error('Delete order error:', err.message);
    res.status(500).json({ error: 'Error al eliminar el pedido.' });
  }
});

module.exports = router;
