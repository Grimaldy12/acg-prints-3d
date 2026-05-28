import { useState, useEffect } from 'react';
import { User, Phone, Mail, FileText, Instagram } from 'lucide-react';

export default function CustomerForm({ customer, onSave, onCancel }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setPhone(customer.phone || '');
      setInstagram(customer.instagram || '');
      setEmail(customer.email || '');
      setNotes(customer.notes || '');
    }
  }, [customer]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim(),
        instagram: instagram.trim(),
        email: email.trim(),
        notes: notes.trim()
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="customer-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Nombre Completo *</label>
        <div style={{ position: 'relative' }}>
          <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b6b80' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px' }}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej. Juan Pérez"
            required
            autoFocus
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Teléfono / WhatsApp</label>
          <div style={{ position: 'relative' }}>
            <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b6b80' }} />
            <input
              type="tel"
              className="form-input"
              style={{ paddingLeft: '36px' }}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Ej. +1 555-0199"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Instagram</label>
          <div style={{ position: 'relative' }}>
            <Instagram size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b6b80' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '36px' }}
              value={instagram}
              onChange={e => setInstagram(e.target.value)}
              placeholder="Ej. @usuario"
            />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Correo Electrónico</label>
        <div style={{ position: 'relative' }}>
          <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b6b80' }} />
          <input
            type="email"
            className="form-input"
            style={{ paddingLeft: '36px' }}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Ej. juan@gmail.com"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Notas / Comentarios</label>
        <div style={{ position: 'relative' }}>
          <FileText size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6b6b80' }} />
          <textarea
            className="form-textarea"
            style={{ paddingLeft: '36px' }}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Información adicional (Ej. prefiere entregas los fines de semana)"
            rows={3}
          />
        </div>
      </div>

      <div className="form-actions" style={{ marginTop: '24px' }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spin-icon">⏳</span> : <User size={16} />}
          {customer ? 'Guardar Cambios' : 'Crear Cliente'}
        </button>
      </div>
    </form>
  );
}
