import { useState, useEffect } from 'react';
import { DollarSign, Tag, Calendar, FileText } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '../../utils/constants';

export default function ExpenseForm({ expense, onSave, onCancel }) {
  const [category, setCategory] = useState('filamento_pla');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  // default date is today in YYYY-MM-DD format
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expense) {
      setCategory(expense.category || 'filamento_pla');
      setAmount(expense.amount || '');
      setDescription(expense.description || '');
      setDate(expense.date || new Date().toISOString().split('T')[0]);
    }
  }, [expense]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!category || !amount || Number(amount) <= 0) return;

    setSaving(true);
    try {
      await onSave({
        category,
        amount: Number(amount),
        description: description.trim(),
        date
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Categoría del Gasto *</label>
          <div style={{ position: 'relative' }}>
            <Tag size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b6b80' }} />
            <select
              className="form-select"
              style={{ paddingLeft: '36px' }}
              value={category}
              onChange={e => setCategory(e.target.value)}
              required
            >
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Monto ($) *</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b6b80', fontSize: '14px' }}>$</span>
            <input
              type="number"
              className="form-input"
              style={{ paddingLeft: '24px' }}
              value={amount}
              onChange={e => setAmount(Math.max(0, parseFloat(e.target.value) || ''))}
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
          <label className="form-label">Fecha *</label>
          <div style={{ position: 'relative' }}>
            <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b6b80' }} />
            <input
              type="date"
              className="form-input"
              style={{ paddingLeft: '36px' }}
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Descripción</label>
        <div style={{ position: 'relative' }}>
          <FileText size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#6b6b80' }} />
          <textarea
            className="form-textarea"
            style={{ paddingLeft: '36px' }}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Especifica el artículo o servicio adquirido (Ej. Filamento Sunlu Negro PLA+, Boquillas de latón)"
            rows={3}
          />
        </div>
      </div>

      <div className="form-actions" style={{ marginTop: '24px' }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <span className="spin-icon">⏳</span> : <DollarSign size={16} />}
          {expense ? 'Guardar Gasto' : 'Registrar Gasto'}
        </button>
      </div>
    </form>
  );
}
