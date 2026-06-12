import { useState, useEffect } from 'react';
import { Package, Percent, Clock, Hash, Plus, Trash2, PlusCircle } from 'lucide-react';
import { PRODUCT_CATEGORIES } from '../../utils/constants';

export default function ProductForm({ product, onSave, onCancel }) {
  const [name, setName]                       = useState('');
  const [description, setDescription]         = useState('');
  const [category, setCategory]               = useState('general');
  const [materialCost, setMaterialCost]       = useState(0);
  const [printTimeMinutes, setPrintTimeMinutes] = useState(0);
  const [salePrice, setSalePrice]             = useState(0);
  const [stock, setStock]                     = useState(0);
  const [weightG, setWeightG]                 = useState(0);
  const [saving, setSaving]                   = useState(false);

  // ── Materiales adicionales ───────────────────────────────────
  const [extras, setExtras] = useState([]); // [{ name, cost }]

  // ── Calculadora de bobina ────────────────────────────────────
  const [showCalculator, setShowCalculator]   = useState(false);
  const [calcModelWeight, setCalcModelWeight] = useState('');
  const [calcSpoolPrice, setCalcSpoolPrice]   = useState('');
  const [calcSpoolWeight, setCalcSpoolWeight] = useState('1000');

  const calculatedCost = (calcModelWeight && calcSpoolPrice && calcSpoolWeight)
    ? ((Number(calcModelWeight) * Number(calcSpoolPrice)) / Number(calcSpoolWeight)).toFixed(2)
    : '0.00';

  function handleApplyCalculatedCost() {
    setMaterialCost(Number(calculatedCost));
    if (calcModelWeight) setWeightG(Number(calcModelWeight));
    setShowCalculator(false);
  }

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setDescription(product.description || '');
      setCategory(product.category || 'general');
      setMaterialCost(product.material_cost || 0);
      setPrintTimeMinutes(product.print_time_minutes || 0);
      setSalePrice(product.sale_price || 0);
      setStock(product.stock || 0);
      setWeightG(product.weight_g || 0);
      setExtras(product.extras || []);
    }
  }, [product]);

  // ── Costo total = filamento + extras ────────────────────────
  const extrasTotal  = extras.reduce((sum, e) => sum + (Number(e.cost) || 0), 0);
  const totalCost    = Number(materialCost) + extrasTotal;
  const profitMargin = salePrice > 0
    ? (((salePrice - totalCost) / salePrice) * 100).toFixed(1)
    : 0;

  // ── Manejadores de extras ────────────────────────────────────
  function addExtra() {
    setExtras(prev => [...prev, { name: '', cost: 0 }]);
  }

  function updateExtra(idx, field, value) {
    setExtras(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  }

  function removeExtra(idx) {
    setExtras(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || salePrice <= 0) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        category,
        material_cost: Number(materialCost),
        print_time_minutes: Number(printTimeMinutes),
        sale_price: Number(salePrice),
        stock: Number(stock),
        weight_g: Number(weightG),
        extras: extras.filter(e => e.name.trim()),
        total_cost: totalCost,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      {/* Nombre */}
      <div className="form-group">
        <label className="form-label">Nombre del Producto *</label>
        <input
          type="text" className="form-input" value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ej. Dispensador de Gillette"
          required autoFocus
        />
      </div>

      {/* Descripción */}
      <div className="form-group">
        <label className="form-label">Descripción</label>
        <textarea
          className="form-textarea" value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Detalles sobre filamento, resolución, etc."
          rows={2}
        />
      </div>

      {/* Categoría + Stock */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Categoría</label>
          <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
            {PRODUCT_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Stock Inicial</label>
          <div style={{ position: 'relative' }}>
            <Hash size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input type="number" className="form-input" style={{ paddingLeft: 36 }}
              value={stock} onChange={e => setStock(Math.max(0, parseInt(e.target.value) || 0))} min="0" />
          </div>
        </div>
      </div>

      {/* Costo filamento + Peso + Precio */}
      <div className="form-row form-row-3col">
        {/* Costo filamento con calculadora */}
        <div className="form-group" style={{ position: 'relative', zIndex: showCalculator ? 20 : 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label className="form-label" style={{ margin: 0 }}>Filamento ($)</label>
            <button type="button" onClick={() => setShowCalculator(!showCalculator)}
              style={{
                fontSize: '0.72rem', color: 'var(--accent-deep)', background: 'var(--accent-soft)',
                border: '1px solid var(--accent-line)', cursor: 'pointer', padding: '2px 8px',
                borderRadius: 'var(--radius-sm)', fontWeight: 600, fontFamily: 'var(--font-mono)',
              }}>
              🧮 Calcular
            </button>
          </div>

          {showCalculator && (
            <div style={{
              position: 'absolute', top: 55, left: 0, width: 320,
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)', padding: 14, zIndex: 30,
              boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 4px' }}>Costo por peso (gramos)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Peso modelo (g)', val: calcModelWeight, set: setCalcModelWeight, ph: '25' },
                  { label: 'Precio bobina ($)', val: calcSpoolPrice, set: setCalcSpoolPrice, ph: '20' },
                  { label: 'Peso bobina (g)', val: calcSpoolWeight, set: setCalcSpoolWeight, ph: '1000' },
                ].map(({ label, val, set, ph }) => (
                  <div key={label} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.65rem' }}>{label}</label>
                    <input type="number" className="form-input" style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                      value={val} onChange={e => set(e.target.value)} placeholder={ph} min="0" />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px dashed var(--line)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Costo: <strong style={{ color: 'var(--accent)' }}>${calculatedCost}</strong>
                </span>
                <button type="button" onClick={handleApplyCalculatedCost}
                  disabled={!calcModelWeight || !calcSpoolPrice}
                  className="btn btn-primary btn-sm">
                  Aplicar
                </button>
              </div>
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>$</span>
            <input type="number" className="form-input" style={{ paddingLeft: 24 }}
              value={materialCost}
              onChange={e => setMaterialCost(Math.max(0, parseFloat(e.target.value) || 0))}
              min="0" step="0.01" placeholder="0.00" />
          </div>
        </div>

        {/* Peso */}
        <div className="form-group">
          <label className="form-label">Peso (g)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.85rem' }}>g</span>
            <input type="number" className="form-input" style={{ paddingRight: 24 }}
              value={weightG} onChange={e => setWeightG(Math.max(0, parseFloat(e.target.value) || 0))}
              min="0" step="0.1" placeholder="0.0" />
          </div>
        </div>

        {/* Precio venta */}
        <div className="form-group">
          <label className="form-label">Precio de Venta ($) *</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>$</span>
            <input type="number" className="form-input" style={{ paddingLeft: 24 }}
              value={salePrice} onChange={e => setSalePrice(Math.max(0, parseFloat(e.target.value) || 0))}
              min="0.01" step="0.01" placeholder="0.00" required />
          </div>
        </div>
      </div>

      {/* ── Materiales adicionales ──────────────────────────── */}
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label className="form-label" style={{ margin: 0 }}>
            Materiales adicionales
            <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 6, fontSize: '0.75rem' }}>
              (resortes, pegamento, insertos, etc.)
            </span>
          </label>
          <button type="button" onClick={addExtra}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-deep)',
              background: 'var(--accent-soft)', border: '1px solid var(--accent-line)',
              padding: '3px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            }}>
            <Plus size={13} /> Agregar
          </button>
        </div>

        {extras.length === 0 ? (
          <button type="button" onClick={addExtra}
            style={{
              width: '100%', padding: '12px', border: '1px dashed var(--line-strong)',
              borderRadius: 'var(--radius-md)', background: 'var(--surface-soft)',
              color: 'var(--muted)', fontSize: '0.85rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-line)'; e.currentTarget.style.color = 'var(--accent-deep)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-strong)'; e.currentTarget.style.color = 'var(--muted)'; }}
          >
            <PlusCircle size={15} /> Agregar material extra (espring, pegamento, inserto...)
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {extras.map((extra, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 36px', gap: 6, alignItems: 'center' }}>
                <input
                  type="text" className="form-input"
                  placeholder="Ej. Espring, Imán, Tornillo M3..."
                  value={extra.name}
                  onChange={e => updateExtra(idx, 'name', e.target.value)}
                />
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '0.85rem' }}>$</span>
                  <input
                    type="number" className="form-input" style={{ paddingLeft: 22 }}
                    placeholder="0.00" min="0" step="0.01"
                    value={extra.cost === 0 ? '' : extra.cost}
                    onChange={e => updateExtra(idx, 'cost', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    onFocus={e => e.target.select()}
                  />
                </div>
                <button type="button" onClick={() => removeExtra(idx)}
                  style={{
                    width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 'var(--radius-sm)', color: 'var(--muted)', cursor: 'pointer',
                    background: 'transparent', border: '1px solid transparent', transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-soft)'; e.currentTarget.style.color = 'var(--red)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}

            {/* Subtotal extras */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end',
              fontSize: '0.8rem', color: 'var(--muted)', paddingTop: 4,
              fontFamily: 'var(--font-mono)',
            }}>
              Extras: <strong style={{ color: 'var(--ink)', marginLeft: 6 }}>${extrasTotal.toFixed(2)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Tiempo + Resumen de costos */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Tiempo de Impresión (min)</label>
          <div style={{ position: 'relative' }}>
            <Clock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input type="number" className="form-input" style={{ paddingLeft: 36 }}
              value={printTimeMinutes}
              onChange={e => setPrintTimeMinutes(Math.max(0, parseInt(e.target.value) || 0))}
              min="0" placeholder="Ej. 120" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Costo total de producción</label>
          <div style={{
            background: 'var(--surface-soft)', border: '1px solid var(--line)',
            borderRadius: 'var(--radius-md)', padding: '10px 14px',
            display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              <span>Filamento</span>
              <span>${Number(materialCost).toFixed(2)}</span>
            </div>
            {extras.filter(e => e.name).map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                <span>{e.name || 'Extra'}</span>
                <span>${Number(e.cost).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, color: 'var(--ink)', borderTop: '1px dashed var(--line)', paddingTop: 4, marginTop: 2, fontFamily: 'var(--font-mono)' }}>
              <span>Total</span>
              <span style={{ color: 'var(--accent)' }}>${totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Margen */}
      <div className="form-group">
        <label className="form-label">Margen de Ganancia</label>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface-soft)', border: '1px solid var(--line)',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          color: Number(profitMargin) >= 50 ? 'var(--green)' : Number(profitMargin) > 20 ? 'var(--accent)' : 'var(--amber)',
          fontWeight: 600,
        }}>
          <Percent size={16} />
          <span style={{ fontFamily: 'var(--font-mono)' }}>{profitMargin}% de margen</span>
          <span style={{ color: 'var(--muted)', fontSize: '0.78rem', fontWeight: 400, marginLeft: 'auto' }}>
            Ganancia: ${(salePrice - totalCost).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spin" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} /> : <Package size={16} />}
          {product ? 'Guardar Cambios' : 'Crear Producto'}
        </button>
      </div>
    </form>
  );
}
