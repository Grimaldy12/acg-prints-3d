/* ============================================================
   ACG PRINTS 3D — Formulario público de pedidos
   Accesible sin login en /pedido
   ============================================================ */
import { useState } from 'react';
import { Package, User, Phone, CreditCard, Truck, Palette, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const SHIPPING = ['Ferguson', 'Uno Express', 'Retiro en punto de encuentro'];

export default function OrderForm() {
  const [step, setStep]       = useState('form'); // form | success | error
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    customer_name: '',
    customer_lastname: '',
    customer_phone: '',
    customer_cedula: '',
    customer_company: '',
    product_name: '',
    product_color: '',
    description: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  if (step === 'success') {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.successIcon}>
            <CheckCircle size={48} color="#2E7D4F" />
          </div>
          <h2 style={styles.successTitle}>¡Pedido recibido!</h2>
          <p style={styles.successText}>
            Gracias por contactarnos. Revisaremos tu pedido y nos comunicaremos contigo pronto por WhatsApp al número <strong>{form.customer_phone}</strong>.
          </p>
          <div style={styles.successBox}>
            <div style={styles.successRow}><span style={styles.successLabel}>Nombre</span><span>{form.customer_name} {form.customer_lastname}</span></div>
            <div style={styles.successRow}><span style={styles.successLabel}>Producto</span><span>{form.product_name}</span></div>
            {form.product_color && <div style={styles.successRow}><span style={styles.successLabel}>Color</span><span>{form.product_color}</span></div>}
            <div style={styles.successRow}><span style={styles.successLabel}>Envío</span><span>{form.customer_company}</span></div>
          </div>
          <button style={styles.btnSecondary} onClick={() => { setStep('form'); setForm({ customer_name:'', customer_lastname:'', customer_phone:'', customer_cedula:'', customer_company:'', product_name:'', product_color:'', description:'' }); }}>
            Hacer otro pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <img src="/logo.jpg" alt="ACG" style={styles.logoImg} onError={e => { e.target.style.display='none'; }} />
            <div>
              <div style={styles.logoName}>ACG PRINTS 3D</div>
              <div style={styles.logoSub}>Diseños · Personalizados · Impresión 3D</div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div style={styles.formWrap}>
        <div style={styles.card}>
          <h1 style={styles.title}>Realiza tu pedido</h1>
          <p style={styles.subtitle}>Completa el formulario y te contactaremos por WhatsApp</p>

          {step === 'error' && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} />
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Datos personales */}
            <div style={styles.sectionLabel}>
              <User size={14} /> Datos personales
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Nombre *</label>
                <input style={styles.input} type="text" placeholder="Ej. Juan" value={form.customer_name} onChange={e => set('customer_name', e.target.value)} required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Apellido *</label>
                <input style={styles.input} type="text" placeholder="Ej. Pérez" value={form.customer_lastname} onChange={e => set('customer_lastname', e.target.value)} required />
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}><Phone size={13} /> Celular *</label>
                <input style={styles.input} type="tel" placeholder="Ej. 6000-0000" value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}><CreditCard size={13} /> Cédula</label>
                <input style={styles.input} type="text" placeholder="Ej. 8-000-0000" value={form.customer_cedula} onChange={e => set('customer_cedula', e.target.value)} />
              </div>
            </div>

            {/* Envío */}
            <div style={{ ...styles.sectionLabel, marginTop: 20 }}>
              <Truck size={14} /> Compañía de envío
            </div>

            <div style={styles.shippingGrid}>
              {SHIPPING.map(s => (
                <button key={s} type="button"
                  onClick={() => set('customer_company', s)}
                  style={{ ...styles.shippingBtn, ...(form.customer_company === s ? styles.shippingBtnActive : {}) }}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Pedido */}
            <div style={{ ...styles.sectionLabel, marginTop: 20 }}>
              <Package size={14} /> Detalle del pedido
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Producto *</label>
              <input style={styles.input} type="text" placeholder="Ej. Dispensador de Gillette, Maceta hexagonal..." value={form.product_name} onChange={e => set('product_name', e.target.value)} required />
            </div>

            <div style={styles.field}>
              <label style={styles.label}><Palette size={13} /> Color del producto</label>
              <input style={styles.input} type="text" placeholder="Ej. Negro, Rojo, Azul marino..." value={form.product_color} onChange={e => set('product_color', e.target.value)} />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Detalles adicionales</label>
              <textarea style={styles.textarea} placeholder="Cantidad, medidas, referencias de imagen, cualquier detalle importante..." value={form.description} onChange={e => set('description', e.target.value)} rows={3} />
            </div>

            <button type="submit" style={styles.btnPrimary} disabled={loading || !form.customer_company}>
              {loading ? <><Loader size={16} className="spin" /> Enviando...</> : <><Package size={16} /> Enviar pedido</>}
            </button>

            {!form.customer_company && (
              <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#A66B06', marginTop: 8 }}>
                ⚠️ Selecciona una compañía de envío para continuar
              </p>
            )}
          </form>
        </div>

        <p style={styles.footer}>
          ¿Tienes dudas? Escríbenos a{' '}
          <a href="https://wa.me/50762199471" target="_blank" rel="noopener noreferrer" style={{ color: '#E2570F', fontWeight: 600 }}>
            WhatsApp
          </a>
          {' '}· @acgprints3d
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#F0F0EA', fontFamily: "'Inter', system-ui, sans-serif" },
  header: { background: '#12181F', borderBottom: '3px solid #E2570F', padding: '0' },
  headerInner: { maxWidth: 640, margin: '0 auto', padding: '16px 24px' },
  logo: { display: 'flex', alignItems: 'center', gap: 12 },
  logoImg: { width: 44, height: 44, borderRadius: 8, objectFit: 'cover' },
  logoName: { fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' },
  logoSub: { fontSize: '0.72rem', color: '#8c9bc0', marginTop: 2 },
  formWrap: { maxWidth: 640, margin: '0 auto', padding: '28px 16px 40px' },
  card: { background: '#FFFFFF', borderRadius: 12, padding: '28px 28px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #E0E0D8' },
  title: { fontSize: '1.4rem', fontWeight: 800, color: '#12181F', marginBottom: 6, letterSpacing: '-0.3px' },
  subtitle: { fontSize: '0.875rem', color: '#79806F', marginBottom: 24 },
  sectionLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', fontWeight: 700, color: '#E2570F', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontFamily: 'monospace' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: '0.8rem', fontWeight: 600, color: '#4C5249', display: 'flex', alignItems: 'center', gap: 4 },
  input: { padding: '10px 14px', border: '1px solid #DBDCD0', borderRadius: 6, fontSize: '0.9375rem', fontFamily: 'inherit', color: '#20251F', outline: 'none', background: '#FAFAF7', transition: 'border-color 0.15s' },
  textarea: { padding: '10px 14px', border: '1px solid #DBDCD0', borderRadius: 6, fontSize: '0.9375rem', fontFamily: 'inherit', color: '#20251F', outline: 'none', background: '#FAFAF7', resize: 'vertical', lineHeight: 1.5 },
  shippingGrid: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  shippingBtn: { padding: '8px 16px', borderRadius: 6, border: '1px solid #DBDCD0', background: '#FAFAF7', color: '#4C5249', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' },
  shippingBtnActive: { background: '#E2570F', color: '#FFF', borderColor: '#E2570F', fontWeight: 700 },
  btnPrimary: { padding: '12px 24px', background: '#E2570F', color: '#FFF', border: 'none', borderRadius: 8, fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, transition: 'background 0.15s' },
  btnSecondary: { padding: '10px 24px', background: 'transparent', color: '#E2570F', border: '1px solid #E2570F', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', marginTop: 16, width: '100%' },
  errorBox: { background: '#F8E7E4', border: '1px solid #EBC2BC', color: '#C13A2E', padding: '10px 14px', borderRadius: 6, fontSize: '0.875rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 },
  successIcon: { textAlign: 'center', marginBottom: 16 },
  successTitle: { fontSize: '1.4rem', fontWeight: 800, color: '#12181F', textAlign: 'center', marginBottom: 8 },
  successText: { color: '#4C5249', textAlign: 'center', marginBottom: 20, lineHeight: 1.6 },
  successBox: { background: '#F6F6F1', border: '1px solid #DBDCD0', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 },
  successRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#20251F' },
  successLabel: { fontWeight: 600, color: '#79806F' },
  footer: { textAlign: 'center', fontSize: '0.8rem', color: '#79806F', marginTop: 20 },
};
