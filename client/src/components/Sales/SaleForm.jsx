import { useState, useEffect } from 'react';
import { Plus, X, ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { SALE_STATUSES } from '../../utils/constants';

export default function SaleForm({ sale, customers, products, onSave, onCancel }) {
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 1, unit_price: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [status, setStatus] = useState('pendiente');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (sale) {
      setCustomerId(sale.customer_id || '');
      setDiscount(sale.discount || 0);
      setStatus(sale.status || 'pendiente');
      setNotes(sale.notes || '');
      if (sale.items && sale.items.length > 0) {
        setItems(sale.items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })));
      }
    }
  }, [sale]);

  function addItem() {
    setItems([...items, { product_id: '', quantity: 1, unit_price: 0 }]);
  }

  function removeItem(index) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index, field, value) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'product_id' && value) {
      const prod = products.find(p => String(p.id) === String(value));
      if (prod) {
        updated[index].unit_price = prod.sale_price;
      }
    }
    setItems(updated);
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const total = Math.max(0, subtotal - discount);

  async function handleSubmit(e) {
    e.preventDefault();
    const validItems = items.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) return;

    setSaving(true);
    try {
      await onSave({
        customer_id: customerId || null,
        items: validItems.map(i => ({
          product_id: String(i.product_id),
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
        })),
        discount: Number(discount),
        status,
        notes,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="sale-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Cliente</label>
        <select
          className="form-select"
          value={customerId}
          onChange={e => setCustomerId(e.target.value)}
        >
          <option value="">Sin cliente asignado</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="form-section">
        <label className="form-label">Productos</label>
        {items.map((item, idx) => (
          <div key={idx} className="sale-item-row">
            <select
              className="form-select"
              value={item.product_id}
              onChange={e => updateItem(idx, 'product_id', e.target.value)}
              required
            >
              <option value="">Seleccionar producto</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.sale_price)}</option>
              ))}
            </select>
            <input
              type="number"
              className="form-input qty-input"
              value={item.quantity}
              onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
              min="1"
              placeholder="Cant."
            />
            <input
              type="number"
              className="form-input price-input"
              value={item.unit_price}
              onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
              min="0"
              step="0.01"
              placeholder="Precio"
            />
            <span className="item-subtotal">{formatCurrency(item.quantity * item.unit_price)}</span>
            {items.length > 1 && (
              <button type="button" className="btn-icon danger" onClick={() => removeItem(idx)}>
                <X size={16} />
              </button>
            )}
          </div>
        ))}
        <button type="button" className="btn btn-ghost" onClick={addItem}>
          <Plus size={16} /> Agregar producto
        </button>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Descuento ($)</label>
          <input
            type="number"
            className="form-input"
            value={discount}
            onChange={e => setDiscount(Number(e.target.value))}
            min="0"
            step="0.01"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Estado</label>
          <select
            className="form-select"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            {SALE_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Notas</label>
        <textarea
          className="form-textarea"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          placeholder="Notas opcionales..."
        />
      </div>

      <div className="sale-total-bar">
        <div className="sale-totals">
          <span>Subtotal: {formatCurrency(subtotal)}</span>
          {discount > 0 && <span>Descuento: -{formatCurrency(discount)}</span>}
          <strong>Total: {formatCurrency(total)}</strong>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spin-icon">⏳</span> : <ShoppingCart size={16} />}
          {sale ? 'Actualizar Venta' : 'Registrar Venta'}
        </button>
      </div>
    </form>
  );
}
