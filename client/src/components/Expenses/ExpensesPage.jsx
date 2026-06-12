import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Calendar, Filter, Receipt, DollarSign } from 'lucide-react';
import { api } from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { EXPENSE_CATEGORIES, getExpenseCategoryLabel, EXPENSE_CATEGORY_COLORS } from '../../utils/constants';
import { useToast } from '../../App';
import Modal from '../UI/Modal';
import ConfirmDialog from '../UI/ConfirmDialog';
import ExpenseForm from './ExpenseForm';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState(null);

  const toast = useToast();

  useEffect(() => {
    fetchExpenses();
  }, []);

  async function fetchExpenses() {
    setLoading(true);
    try {
      // Setup filter parameters
      let query = `?search=${encodeURIComponent(search)}`;
      if (selectedCategory !== 'all') query += `&category=${selectedCategory}`;
      if (fromDate) query += `&from=${fromDate}`;
      if (toDate) query += `&to=${toDate}`;

      const data = await api.get(`/api/expenses${query}`);
      setExpenses(data.data || data);
    } catch (err) {
      toast.error('Error al cargar gastos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Live search and filter debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchExpenses();
    }, 300);
    return () => clearTimeout(handler);
  }, [search, selectedCategory, fromDate, toDate]);

  async function handleCreateOrUpdate(formData) {
    try {
      if (editingExpense) {
        await api.put(`/api/expenses/${editingExpense.id}`, formData);
        toast.success('Gasto actualizado exitosamente.');
      } else {
        await api.post('/api/expenses', formData);
        toast.success('Gasto registrado exitosamente.');
      }
      setIsFormOpen(false);
      setEditingExpense(null);
      fetchExpenses();
    } catch (err) {
      toast.error('Error al guardar gasto: ' + err.message);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingExpense) return;
    try {
      await api.delete(`/api/expenses/${deletingExpense.id}`);
      toast.success('Gasto eliminado exitosamente.');
      setIsConfirmOpen(false);
      setDeletingExpense(null);
      fetchExpenses();
    } catch (err) {
      toast.error('Error al eliminar gasto: ' + err.message);
    }
  }

  // Calculate totals and category breakdown
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryBreakdown = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});

  const sortedBreakdown = Object.entries(categoryBreakdown)
    .map(([cat, amount]) => ({
      cat,
      amount,
      label: getExpenseCategoryLabel(cat),
      color: EXPENSE_CATEGORY_COLORS[cat] || 'var(--muted)',
      percentage: totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(0) : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="expenses-page page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gastos</h1>
          <p className="page-subtitle">
            Registra egresos de material, mantenimiento de impresoras, electricidad y otros gastos operativos
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingExpense(null);
          setIsFormOpen(true);
        }}>
          <Plus size={18} /> Nuevo Gasto
        </button>
      </div>

      {/* Summary Cards */}
      <div className="expenses-summary-row" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Total Expense Card */}
        <div className="card" style={{
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: 'var(--color-danger)',
            borderRadius: 'var(--radius-full)',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Receipt size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'block' }}>Total de Gastos Filtrados</span>
            <strong style={{ fontSize: '1.75rem', color: 'var(--color-danger)', fontWeight: '700' }}>{formatCurrency(totalAmount)}</strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'block', marginTop: '4px' }}>
              Mostrando {expenses.length} registros
            </span>
          </div>
        </div>

        {/* Breakdown Card */}
        <div className="card" style={{
          backgroundColor: 'var(--color-bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '12px', display: 'block' }}>
            Distribución por Categorías
          </span>
          {sortedBreakdown.length === 0 ? (
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Sin gastos registrados.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedBreakdown.slice(0, 3).map(item => (
                <div key={item.cat} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', flex: '1' }}>{item.label}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-primary)', fontWeight: '600' }}>
                    {formatCurrency(item.amount)} ({item.percentage}%)
                  </span>
                </div>
              ))}
              {sortedBreakdown.length > 3 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'right', display: 'block' }}>
                  y {sortedBreakdown.length - 3} categorías más...
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar" style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center',
        backgroundColor: 'var(--color-surface)',
        padding: '16px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        {/* Search */}
        <div className="filter-item" style={{ flex: '1', minWidth: '200px' }}>
          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '6px' }}>Búsqueda</label>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              className="form-input form-input-sm"
              style={{ paddingLeft: '36px', width: '100%', boxSizing: 'border-box' }}
              placeholder="Buscar descripción..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Category */}
        <div className="filter-item" style={{ minWidth: '160px' }}>
          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '6px' }}>Categoría</label>
          <select
            className="form-select form-select-sm"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="all">Todas</option>
            {EXPENSE_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* From Date */}
        <div className="filter-item" style={{ minWidth: '140px' }}>
          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '6px' }}>Desde</label>
          <input
            type="date"
            className="form-input form-input-sm"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {/* To Date */}
        <div className="filter-item" style={{ minWidth: '140px' }}>
          <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '6px' }}>Hasta</label>
          <input
            type="date"
            className="form-input form-input-sm"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Expenses Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <span className="spin-icon" style={{ fontSize: '24px' }}>⏳</span>
          <span style={{ marginLeft: '12px', color: 'var(--color-text-secondary)' }}>Cargando gastos...</span>
        </div>
      ) : expenses.length === 0 ? (
        <div className="empty-state" style={{
          textAlign: 'center',
          padding: '60px 24px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed rgba(255, 255, 255, 0.1)'
        }}>
          <Receipt size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>No se encontraron gastos</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
            {search || selectedCategory !== 'all' || fromDate || toDate
              ? 'Prueba modificando o limpiando los filtros.'
              : 'Empieza a registrar tus egresos y costos de insumos.'}
          </p>
          {!search && selectedCategory === 'all' && !fromDate && !toDate && (
            <button className="btn btn-primary btn-sm" onClick={() => setIsFormOpen(true)}>
              <Plus size={16} /> Crear Gasto
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                <th style={{ padding: '16px 20px', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Fecha</th>
                <th style={{ padding: '16px 20px', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Categoría</th>
                <th style={{ padding: '16px 20px', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Descripción</th>
                <th style={{ padding: '16px 20px', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Monto</th>
                <th style={{ padding: '16px 20px', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: '600', width: '120px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '16px 20px', color: 'var(--color-text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={14} style={{ color: 'var(--color-text-muted)' }} />
                      {formatDate(e.date)}
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span className="badge" style={{
                      fontSize: '0.75rem',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${EXPENSE_CATEGORY_COLORS[e.category] || 'var(--muted)'}`,
                      color: EXPENSE_CATEGORY_COLORS[e.category] || 'var(--muted)',
                      fontWeight: '600'
                    }}>
                      {getExpenseCategoryLabel(e.category)}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                    {e.description || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Sin descripción</span>}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <strong style={{ fontSize: '1rem', color: 'var(--color-danger)' }}>
                      {formatCurrency(e.amount)}
                    </strong>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button className="btn-icon" title="Editar" onClick={() => {
                        setEditingExpense(e);
                        setIsFormOpen(true);
                      }}>
                        <Edit2 size={15} />
                      </button>
                      <button className="btn-icon danger" title="Eliminar" onClick={() => {
                        setDeletingExpense(e);
                        setIsConfirmOpen(true);
                      }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Expense Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingExpense(null);
        }}
        title={editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
        size="md"
      >
        <ExpenseForm
          expense={editingExpense}
          onSave={handleCreateOrUpdate}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingExpense(null);
          }}
        />
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="¿Eliminar Gasto?"
        message={`¿Estás seguro de que deseas eliminar este gasto de ${deletingExpense ? formatCurrency(deletingExpense.amount) : ''}? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setIsConfirmOpen(false);
          setDeletingExpense(null);
        }}
      />
    </div>
  );
}
