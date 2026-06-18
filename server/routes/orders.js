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
      product_id, product_name: rawProductName, product_quantity, description,
    } = req.body;

    if (!customer_name || !customer_phone || (!rawProductName && !product_id)) {
      return res.status(400).json({ error: 'Nombre, teléfono y producto son requeridos.' });
    }

    const fullName = `${customer_name.trim()} ${(customer_lastname||'').trim()}`.trim();

    // Resolver nombre del producto desde el catálogo
    let product_name = rawProductName || '';
    let resolvedProductPrice = 0;
    if (product_id) {
      try {
        const productDoc = await db.collection('products').doc(product_id).get();
        if (productDoc.exists) {
          product_name = productDoc.data().name;
          resolvedProductPrice = Number(productDoc.data().sale_price) || 0;
        }
      } catch (_) {}
    }

    const descriptionText = [
      product_name   ? `Producto: ${product_name}` : '',
      product_quantity ? `Cantidad: ${product_quantity}` : '',
      customer_company ? `Envío: ${customer_company}` : '',
      description    ? `Detalles: ${description}` : '',
    ].filter(Boolean).join(' | ');

    const newOrder = {
      customer_id: null,
      customer_name: fullName,
      customer_phone: customer_phone.trim(),
      customer_cedula: customer_cedula || '',
      customer_company: customer_company || '',
      description: descriptionText,
      product_name: product_name || '',
      product_quantity: product_quantity || '',
      total_price: product_id && resolvedProductPrice
        ? resolvedProductPrice * (Number(product_quantity) || 1)
        : 0,
      items: product_id ? [{
        product_id,
        product_name: product_name,
        quantity: Number(product_quantity) || 1,
        unit_price: resolvedProductPrice,
        subtotal: resolvedProductPrice * (Number(product_quantity) || 1),
      }] : [],
      deposit: 0,
      balance_due: 0,
      status: 'cola',
      source: 'portal_cliente',
      deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };

    // ── Crear cliente automáticamente si no existe ──────────────
    let newCustomerId = null;
    try {
      const existingCustomers = await db.collection('customers')
        .where('phone', '==', customer_phone.trim()).get();

      if (existingCustomers.empty) {
        const customerRef = await db.collection('customers').add({
          name:       fullName,
          phone:      customer_phone.trim(),
          cedula:     customer_cedula || '',
          instagram:  '',
          email:      '',
          notes:      `Cliente registrado via portal web`,
          created_at: new Date().toISOString(),
        });
        newCustomerId = customerRef.id;
      } else {
        newCustomerId = existingCustomers.docs[0].id;
      }
      // Actualizar el pedido con el customer_id
      newOrder.customer_id = newCustomerId;
    } catch (customerErr) {
      console.error('Auto-create customer error:', customerErr.message);
    }

    const docRef = await db.collection('orders').add(newOrder);

    // ── Notificación por email via Resend ─────────────────────
    try {
      const RESEND_KEY = process.env.RESEND_API_KEY;
      if (RESEND_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_KEY}`,
          },
          body: JSON.stringify({
            from: 'ACG PRINTS 3D <noreply@acgprints3d.com>',
            to: ['acg3dprints@outlook.com'],
            subject: `🖨️ Nuevo pedido de ${fullName}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px">
                <div style="background:#12181F;padding:16px 20px;border-radius:8px 8px 0 0;border-bottom:3px solid #E2570F">
                  <h2 style="color:#fff;margin:0;font-size:1.1rem">ACG PRINTS 3D — Nuevo Pedido</h2>
                </div>
                <div style="background:#f9f9f7;border:1px solid #e0e0d8;border-top:none;padding:20px;border-radius:0 0 8px 8px">
                  <table style="width:100%;border-collapse:collapse;font-size:0.9rem">
                    <tr><td style="padding:6px 0;color:#79806F;font-weight:600;width:140px">Cliente</td><td style="color:#20251F;font-weight:700">${fullName}</td></tr>
                    <tr><td style="padding:6px 0;color:#79806F;font-weight:600">Teléfono</td><td style="color:#20251F">${customer_phone}</td></tr>
                    ${customer_cedula ? `<tr><td style="padding:6px 0;color:#79806F;font-weight:600">Cédula</td><td style="color:#20251F">${customer_cedula}</td></tr>` : ''}
                    <tr><td style="padding:6px 0;color:#79806F;font-weight:600">Producto</td><td style="color:#20251F;font-weight:700">${product_name}</td></tr>
                    ${product_quantity ? `<tr><td style="padding:6px 0;color:#79806F;font-weight:600">Cantidad</td><td style="color:#20251F">${product_quantity}</td></tr>` : ''}
                    ${customer_company ? `<tr><td style="padding:6px 0;color:#79806F;font-weight:600">Envío</td><td style="color:#20251F">${customer_company}</td></tr>` : ''}
                    ${description ? `<tr><td style="padding:6px 0;color:#79806F;font-weight:600;vertical-align:top">Detalles</td><td style="color:#20251F">${description}</td></tr>` : ''}
                  </table>
                  <div style="margin-top:16px;padding:12px;background:#FBEADF;border-radius:6px;text-align:center">
                    <span style="color:#E2570F;font-weight:700;font-size:0.85rem">El pedido ya aparece en tu kanban en estado "En Cola"</span>
                  </div>
                </div>
              </div>
            `,
          }),
        });
      }
    } catch (emailErr) {
      console.error('Email notification error:', emailErr.message);
      // No fallar el pedido si el email falla
    }

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
