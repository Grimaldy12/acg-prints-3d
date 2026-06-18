/* ============================================================
   ACG PRINTS 3D — Formulario público de pedidos v3
   - Productos del catálogo
   - Layout 100% responsivo en móvil
   ============================================================ */
import { useState, useEffect } from 'react';
import { Package, User, Phone, CreditCard, Truck, CheckCircle, AlertCircle, Loader, ChevronDown } from 'lucide-react';

const SHIPPING = ['Ferguson', 'Uno Express', 'Retiro en punto de encuentro'];

export default function OrderForm() {
  const [step, setStep]       = useState('form');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [form, setForm] = useState({
    customer_name: '', customer_lastname: '', customer_phone: '',
    customer_cedula: '', customer_company: '',
    product_id: '', product_name: '', product_quantity: '1', description: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Cargar productos del catálogo
  useEffect(() => {
    fetch('/api/products/public')
      .then(r => r.json())
      .then(d => setProducts(d.data || []))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, []);

  const handleProductChange = (pid) => {
    const prod = products.find(p => (p.id || p._id) === pid);
    set('product_id', pid);
    set('product_name', prod ? prod.name : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_company) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/orders/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar');
      setStep('success');
    } catch (err) {
      setErrorMsg(err.message);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('form');
    setForm({ customer_name:'', customer_lastname:'', customer_phone:'', customer_cedula:'', customer_company:'', product_id:'', product_name:'', product_quantity:'1', description:'' });
  };

  if (step === 'success') {
    return (
      <>
        <style>{css}</style>
        <div className="pf-page">
          <Header />
          <div className="pf-wrap">
            <div className="pf-card" style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 16 }}><CheckCircle size={52} color="#2E7D4F" /></div>
              <h2 className="pf-title">¡Pedido recibido!</h2>
              <p style={{ color: '#4C5249', marginBottom: 20, lineHeight: 1.6, fontSize: '0.9rem' }}>
                Te contactaremos pronto por WhatsApp al número <strong>{form.customer_phone}</strong>.
              </p>
              <div className="pf-summary">
                <SummaryRow label="Nombre"   value={`${form.customer_name} ${form.customer_lastname}`} />
                <SummaryRow label="Producto" value={form.product_name} />
                <SummaryRow label="Cantidad" value={form.product_quantity} />
                <SummaryRow label="Envío"    value={form.customer_company} />
                {form.description && <SummaryRow label="Detalles" value={form.description} />}
              </div>
              <button className="pf-btn-secondary" onClick={resetForm}>Hacer otro pedido</button>
            </div>
            <Footer />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="pf-page">
        <Header />
        <div className="pf-wrap">
          <div className="pf-card">
            <h1 className="pf-title">Realiza tu pedido</h1>
            <p className="pf-subtitle">Completa el formulario y te contactaremos por WhatsApp</p>

            {step === 'error' && (
              <div className="pf-error">
                <AlertCircle size={16} /> {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {/* ── Datos personales ─────────────────────── */}
              <div className="pf-section-label">
                <User size={13} /> Datos personales
              </div>

              <div className="pf-row">
                <div className="pf-field">
                  <label className="pf-label">Nombre *</label>
                  <input className="pf-input" type="text" placeholder="Ej. Juan"
                    value={form.customer_name} onChange={e => set('customer_name', e.target.value)} required />
                </div>
                <div className="pf-field">
                  <label className="pf-label">Apellido *</label>
                  <input className="pf-input" type="text" placeholder="Ej. Pérez"
                    value={form.customer_lastname} onChange={e => set('customer_lastname', e.target.value)} required />
                </div>
              </div>

              <div className="pf-row">
                <div className="pf-field">
                  <label className="pf-label">Celular *</label>
                  <input className="pf-input" type="tel" placeholder="Ej. 6000-0000"
                    value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} required />
                </div>
                <div className="pf-field">
                  <label className="pf-label">Cédula</label>
                  <input className="pf-input" type="text" placeholder="Ej. 8-000-0000"
                    value={form.customer_cedula} onChange={e => set('customer_cedula', e.target.value)} />
                </div>
              </div>

              {/* ── Compañía de envío ────────────────────── */}
              <div className="pf-section-label pf-section-top">
                <Truck size={13} /> Compañía de envío
              </div>

              <div className="pf-shipping">
                {SHIPPING.map(s => (
                  <button key={s} type="button"
                    className={`pf-ship-btn${form.customer_company === s ? ' active' : ''}`}
                    onClick={() => set('customer_company', s)}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* ── Detalle del pedido ───────────────────── */}
              <div className="pf-section-label pf-section-top">
                <Package size={13} /> Detalle del pedido
              </div>

              {/* Selector de producto */}
              <div className="pf-field">
                <label className="pf-label">Producto *</label>
                {loadingProducts ? (
                  <div className="pf-input" style={{ color: '#79806F', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Cargando productos...
                  </div>
                ) : products.length > 0 ? (
                  <div className="pf-select-wrap">
                    <select
                      className="pf-input pf-select"
                      value={form.product_id}
                      onChange={e => handleProductChange(e.target.value)}
                      required
                    >
                      <option value="">-- Selecciona un producto --</option>
                      {products.map(p => (
                        <option key={p.id || p._id} value={p.id || p._id}>
                          {p.name} — ${Number(p.sale_price || 0).toFixed(2)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="pf-select-icon" />
                  </div>
                ) : (
                  <input className="pf-input" type="text" placeholder="Ej. Dispensador de Gillette..."
                    value={form.product_name} onChange={e => set('product_name', e.target.value)} required />
                )}
              </div>

              {/* Cantidad */}
              <div className="pf-field">
                <label className="pf-label">Cantidad *</label>
                <input className="pf-input" type="number" placeholder="Ej. 1, 2, 5..." min="1"
                  value={form.product_quantity} onChange={e => set('product_quantity', e.target.value)} required />
              </div>

              {/* Detalles */}
              <div className="pf-field">
                <label className="pf-label">Detalles adicionales</label>
                <textarea className="pf-input pf-textarea"
                  placeholder="Color deseado, medidas, referencias de imagen, cualquier detalle importante..."
                  value={form.description} onChange={e => set('description', e.target.value)} rows={3} />
              </div>

              {!form.customer_company && (
                <p className="pf-warning">⚠️ Selecciona una compañía de envío para continuar</p>
              )}

              <button type="submit" className="pf-btn-primary"
                disabled={loading || !form.customer_company}>
                {loading
                  ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Enviando...</>
                  : <><Package size={16} /> Enviar pedido</>
                }
              </button>
            </form>
          </div>
          <Footer />
        </div>
      </div>
    </>
  );
}

function Header() {
  return (
    <div className="pf-header">
      <div className="pf-header-inner">
        <img src="/logo.jpg" alt="ACG" className="pf-logo-img"
          onError={e => { e.target.style.display='none'; }} />
        <div>
          <div className="pf-logo-name">ACG PRINTS 3D</div>
          <div className="pf-logo-sub">Diseños · Personalizados · Impresión 3D</div>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <p className="pf-footer">
      ¿Tienes dudas? Escríbenos a{' '}
      <a href="https://wa.me/50762199471" target="_blank" rel="noopener noreferrer">WhatsApp</a>
      {' '}· @acgprints3d
    </p>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="pf-summary-row">
      <span className="pf-summary-label">{label}</span>
      <span style={{ textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .pf-page {
    min-height: 100vh;
    background: #F0F0EA;
    font-family: 'Inter', system-ui, sans-serif;
    color: #20251F;
  }

  .pf-header { background: #12181F; border-bottom: 3px solid #E2570F; }
  .pf-header-inner {
    max-width: 560px; margin: 0 auto;
    padding: 14px 20px;
    display: flex; align-items: center; gap: 12px;
  }
  .pf-logo-img { width: 42px; height: 42px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
  .pf-logo-name { font-size: 1rem; font-weight: 800; color: #fff; letter-spacing: -0.3px; }
  .pf-logo-sub  { font-size: 0.68rem; color: #8c9bc0; margin-top: 2px; }

  .pf-wrap {
    max-width: 560px; margin: 0 auto;
    padding: 20px 16px 40px;
  }

  .pf-card {
    background: #fff; border-radius: 12px;
    padding: 22px 20px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.07);
    border: 1px solid #E0E0D8;
  }

  .pf-title    { font-size: 1.3rem; font-weight: 800; color: #12181F; margin-bottom: 4px; }
  .pf-subtitle { font-size: 0.85rem; color: #79806F; margin-bottom: 20px; }

  .pf-section-label {
    display: flex; align-items: center; gap: 6px;
    font-size: 0.68rem; font-weight: 700; color: #E2570F;
    text-transform: uppercase; letter-spacing: 0.08em;
    margin-bottom: 12px; font-family: monospace;
  }
  .pf-section-top { margin-top: 20px; }

  /* ── Grid responsivo — 2 col desktop, 1 col móvil ── */
  .pf-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 10px;
  }
  @media (max-width: 500px) {
    .pf-row { grid-template-columns: 1fr; gap: 8px; }
    .pf-card { padding: 18px 14px; }
    .pf-header-inner { padding: 12px 14px; }
  }

  .pf-field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
  .pf-row .pf-field { margin-bottom: 0; }

  .pf-label { font-size: 0.78rem; font-weight: 600; color: #4C5249; }

  .pf-input {
    width: 100%;
    padding: 10px 12px;
    border: 1.5px solid #DBDCD0;
    border-radius: 7px;
    font-size: 0.9375rem;
    font-family: inherit;
    color: #20251F;
    background: #FAFAF7;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    -webkit-appearance: none;
    appearance: none;
  }
  .pf-input:focus {
    border-color: #E2570F;
    box-shadow: 0 0 0 3px rgba(226,87,15,0.1);
  }
  .pf-textarea { resize: vertical; min-height: 80px; line-height: 1.5; }

  /* Select personalizado */
  .pf-select-wrap { position: relative; }
  .pf-select { padding-right: 36px; cursor: pointer; }
  .pf-select-icon {
    position: absolute; right: 12px; top: 50%;
    transform: translateY(-50%);
    color: #79806F; pointer-events: none;
  }

  .pf-shipping { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 4px; }
  .pf-ship-btn {
    padding: 9px 14px; border-radius: 7px;
    border: 1.5px solid #DBDCD0; background: #FAFAF7;
    color: #4C5249; font-size: 0.85rem; font-weight: 500;
    cursor: pointer; font-family: inherit;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .pf-ship-btn:hover { border-color: #E2570F; color: #E2570F; }
  .pf-ship-btn.active { background: #E2570F; color: #fff; border-color: #E2570F; font-weight: 700; }

  .pf-warning { font-size: 0.78rem; color: #A66B06; text-align: center; margin-bottom: 8px; }

  .pf-btn-primary {
    width: 100%; padding: 13px 24px;
    background: #E2570F; color: #fff;
    border: none; border-radius: 8px;
    font-size: 1rem; font-weight: 700;
    cursor: pointer; font-family: inherit;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    margin-top: 10px;
    transition: background 0.15s;
  }
  .pf-btn-primary:hover:not(:disabled) { background: #C2470A; }
  .pf-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

  .pf-btn-secondary {
    width: 100%; padding: 11px 24px;
    background: transparent; color: #E2570F;
    border: 1.5px solid #E2570F; border-radius: 8px;
    font-size: 0.9rem; font-weight: 600;
    cursor: pointer; margin-top: 16px; font-family: inherit;
    transition: all 0.15s;
  }
  .pf-btn-secondary:hover { background: #FBEADF; }

  .pf-error {
    background: #F8E7E4; border: 1px solid #EBC2BC;
    color: #C13A2E; padding: 10px 14px; border-radius: 7px;
    font-size: 0.875rem; margin-bottom: 16px;
    display: flex; align-items: center; gap: 8px;
  }

  .pf-summary {
    background: #F6F6F1; border: 1px solid #DBDCD0;
    border-radius: 8px; padding: 14px 16px;
    display: flex; flex-direction: column; gap: 8px;
    margin-bottom: 4px; text-align: left;
  }
  .pf-summary-row {
    display: flex; justify-content: space-between;
    font-size: 0.875rem; color: #20251F; gap: 12px;
  }
  .pf-summary-label { font-weight: 600; color: #79806F; flex-shrink: 0; }

  .pf-footer { text-align: center; font-size: 0.78rem; color: #79806F; margin-top: 16px; }
  .pf-footer a { color: #E2570F; font-weight: 600; text-decoration: none; }

  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;
