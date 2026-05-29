import { useState, useEffect } from 'react';
import { Package, Percent, DollarSign, Clock, Hash } from 'lucide-react';
import { PRODUCT_CATEGORIES } from '../../utils/constants';

export default function ProductForm({ product, onSave, onCancel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [materialCost, setMaterialCost] = useState(0);
  const [printTimeMinutes, setPrintTimeMinutes] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [weightG, setWeightG] = useState(0);
  const [saving, setSaving] = useState(false);

  // Spool weight calculator state
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcModelWeight, setCalcModelWeight] = useState('');
  const [calcSpoolPrice, setCalcSpoolPrice] = useState('');
  const [calcSpoolWeight, setCalcSpoolWeight] = useState('1000'); // default 1kg spool

  const calculatedCost = (calcModelWeight && calcSpoolPrice && calcSpoolWeight)
    ? ((Number(calcModelWeight) * Number(calcSpoolPrice)) / Number(calcSpoolWeight)).toFixed(2)
    : '0.00';

  function handleApplyCalculatedCost() {
    setMaterialCost(Number(calculatedCost));
    if (calcModelWeight) {
      setWeightG(Number(calcModelWeight));
    }
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
    }
  }, [product]);

  // Calculate profit margin: ((sale_price - material_cost) / sale_price * 100)
  const profitMargin = salePrice > 0 
    ? ((salePrice - materialCost) / salePrice * 100).toFixed(1)
    : 0;

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
        weight_g: Number(weightG)
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="product-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Nombre del Producto *</label>
        <input
          type="text"
          className="form-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ej. Articulado Dragón, Maceta Geométrica"
          required
          autoFocus
        />
      </div>

      <div className="form-group">
        <label className="form-label">Descripción</label>
        <textarea
          className="form-textarea"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Detalles sobre filamento, resolución, etc."
          rows={3}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Categoría</label>
          <select
            className="form-select"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {PRODUCT_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Stock Inicial</label>
          <div style={{ position: 'relative' }}>
            <Hash size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b6b80' }} />
            <input
              type="number"
              className="form-input"
              style={{ paddingLeft: '36px' }}
              value={stock}
              onChange={e => setStock(Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
            />
          </div>
        </div>
      </div>

      <div className="form-row form-row-3col">
        <div className="form-group" style={{ position: 'relative', zIndex: showCalculator ? 20 : 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label className="form-label" style={{ margin: 0 }}>Costo de Material ($)</label>
            <button
              type="button"
              onClick={() => setShowCalculator(!showCalculator)}
              style={{
                fontSize: '0.75rem',
                color: 'var(--accent-cyan)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: 'rgba(0, 212, 170, 0.08)',
                transition: 'all 0.2s'
              }}
            >
              🧮 Calcular
            </button>
          </div>

          {showCalculator && (
            <div style={{
              position: 'absolute',
              top: '55px',
              left: 0,
              width: '340px',
              maxWidth: 'calc(100vw - 48px)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              zIndex: 30,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)'
            }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                🧮 Costo por Peso (Gramos)
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Peso Modelo (g)</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                    value={calcModelWeight}
                    onChange={e => setCalcModelWeight(e.target.value)}
                    placeholder="Ej. 25"
                    min="0"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Precio Bobina ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                    value={calcSpoolPrice}
                    onChange={e => setCalcSpoolPrice(e.target.value)}
                    placeholder="Ej. 20"
                    min="0"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Peso Bobina (g)</label>
                  <input
                    type="number"
                    className="form-input"
                    style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                    value={calcSpoolWeight}
                    onChange={e => setCalcSpoolWeight(e.target.value)}
                    placeholder="1000"
                    min="1"
                  />
                </div>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '4px',
                paddingTop: '8px',
                borderTop: '1px dashed rgba(255, 255, 255, 0.05)'
              }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Costo: <strong style={{ color: 'var(--accent-cyan)' }}>${calculatedCost}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleApplyCalculatedCost}
                  disabled={!calcModelWeight || !calcSpoolPrice}
                  style={{
                    backgroundColor: 'var(--accent-cyan)',
                    color: '#0a0a0f',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    opacity: (!calcModelWeight || !calcSpoolPrice) ? 0.5 : 1
                  }}
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b6b80' }}>$</span>
            <input
              type="number"
              className="form-input"
              style={{ paddingLeft: '24px' }}
              value={materialCost}
              onChange={e => setMaterialCost(Math.max(0, parseFloat(e.target.value) || 0))}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Peso (gramos)</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b6b80', fontSize: '0.85rem' }}>g</span>
            <input
              type="number"
              className="form-input"
              style={{ paddingRight: '24px' }}
              value={weightG}
              onChange={e => setWeightG(Math.max(0, parseFloat(e.target.value) || 0))}
              min="0"
              step="0.1"
              placeholder="0.0"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Precio de Venta ($) *</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b6b80' }}>$</span>
            <input
              type="number"
              className="form-input"
              style={{ paddingLeft: '24px' }}
              value={salePrice}
              onChange={e => setSalePrice(Math.max(0, parseFloat(e.target.value) || 0))}
              min="0.01"
              step="0.01"
              placeholder="0.00"
              required
            />
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Tiempo de Impresión (minutos)</label>
          <div style={{ position: 'relative' }}>
            <Clock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b6b80' }} />
            <input
              type="number"
              className="form-input"
              style={{ paddingLeft: '36px' }}
              value={printTimeMinutes}
              onChange={e => setPrintTimeMinutes(Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
              placeholder="Ej. 120"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Margen de Ganancia</label>
          <div className="form-input-static" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: 'var(--font-md)',
            color: Number(profitMargin) >= 50 ? 'var(--color-success)' : Number(profitMargin) > 20 ? 'var(--color-accent)' : 'var(--color-warning)',
            fontWeight: '600',
            height: '42px',
            boxSizing: 'border-box'
          }}>
            <Percent size={16} />
            <span>{profitMargin}% de margen</span>
          </div>
        </div>
      </div>

      <div className="form-actions" style={{ marginTop: '24px' }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spin-icon">⏳</span> : <Package size={16} />}
          {product ? 'Guardar Cambios' : 'Crear Producto'}
        </button>
      </div>
    </form>
  );
}
