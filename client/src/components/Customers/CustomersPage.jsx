import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Users, Phone, Mail, FileText, ChevronDown, ChevronUp, ShoppingBag, Instagram } from 'lucide-react';
import { api } from '../../utils/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../App';
import Modal from '../UI/Modal';
import ConfirmDialog from '../UI/ConfirmDialog';
import CustomerForm from './CustomerForm';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState(null);

  const toast = useToast();

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const data = await api.get(`/api/customers?search=${encodeURIComponent(search)}`);
      setCustomers(data.data || data);
    } catch (err) {
      toast.error('Error al cargar clientes: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Live search debouncing
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  async function fetchPurchaseHistory(customerId) {
    setHistoryLoading(true);
    try {
      const data = await api.get(`/api/customers/${customerId}`);
      // Assuming customer detail route returns purchase history
      setPurchaseHistory(data.sales || data.history || []);
    } catch (err) {
      toast.error('Error al cargar historial: ' + err.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  const handleToggleExpand = (customerId) => {
    if (expandedCustomerId === customerId) {
      setExpandedCustomerId(null);
      setPurchaseHistory([]);
    } else {
      setExpandedCustomerId(customerId);
      fetchPurchaseHistory(customerId);
    }
  };

  async function handleCreateOrUpdate(formData) {
    try {
      if (editingCustomer) {
        await api.put(`/api/customers/${editingCustomer.id}`, formData);
        toast.success('Cliente actualizado exitosamente.');
      } else {
        await api.post('/api/customers', formData);
        toast.success('Cliente registrado exitosamente.');
      }
      setIsFormOpen(false);
      setEditingCustomer(null);
      fetchCustomers();
    } catch (err) {
      toast.error('Error al guardar cliente: ' + err.message);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingCustomer) return;
    try {
      await api.delete(`/api/customers/${deletingCustomer.id}`);
      toast.success('Cliente eliminado exitosamente.');
      setIsConfirmOpen(false);
      setDeletingCustomer(null);
      if (expandedCustomerId === deletingCustomer.id) {
        setExpandedCustomerId(null);
      }
      fetchCustomers();
    } catch (err) {
      toast.error('Error al eliminar cliente: ' + err.message);
    }
  }

  return (
    <div className="customers-page page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">
            Gestiona tus clientes, datos de contacto e historial de compras
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingCustomer(null);
          setIsFormOpen(true);
        }}>
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper" style={{ position: 'relative', flex: '1', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '42px', width: '100%', boxSizing: 'border-box' }}
            placeholder="Buscar por nombre, teléfono o correo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Customers List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <span className="spin-icon" style={{ fontSize: '24px' }}>⏳</span>
          <span style={{ marginLeft: '12px', color: 'var(--color-text-secondary)' }}>Cargando clientes...</span>
        </div>
      ) : customers.length === 0 ? (
        <div className="empty-state" style={{
          textAlign: 'center',
          padding: '60px 24px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed rgba(255, 255, 255, 0.1)'
        }}>
          <Users size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>No se encontraron clientes</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
            {search ? 'Prueba ajustando la búsqueda.' : 'Empieza a registrar tus clientes para llevar un historial de ventas.'}
          </p>
          {!search && (
            <button className="btn btn-primary btn-sm" onClick={() => setIsFormOpen(true)}>
              <Plus size={16} /> Crear Cliente
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                <th style={{ padding: '16px 20px', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Cliente</th>
                <th style={{ padding: '16px 20px', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Contacto</th>
                <th style={{ padding: '16px 20px', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Total Comprado</th>
                <th style={{ padding: '16px 20px', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: '600', width: '250px' }}>Notas</th>
                <th style={{ padding: '16px 20px', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: '600', width: '120px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => {
                const isExpanded = expandedCustomerId === c.id;
                return (
                  <React.Fragment key={c.id}>
                    <tr style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      backgroundColor: isExpanded ? 'rgba(0, 212, 170, 0.02)' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            onClick={() => handleToggleExpand(c.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--color-text-secondary)',
                              display: 'flex',
                              padding: '4px'
                            }}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <div>
                            <strong style={{ display: 'block', color: 'var(--color-text-primary)' }}>{c.name}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Registrado: {formatDate(c.created_at)}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {c.phone && (
                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Phone size={12} style={{ color: 'var(--color-text-muted)' }} /> {c.phone}
                            </span>
                          )}
                          {c.cedula && (
                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.6875rem', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', color: 'var(--color-text-muted)', fontWeight: 600 }}>C.I.</span> {c.cedula}
                            </span>
                          )}
                          {c.instagram && (
                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Instagram size={12} style={{ color: 'var(--color-text-muted)' }} /> {c.instagram}
                            </span>
                          )}
                          {c.email && (
                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Mail size={12} style={{ color: 'var(--color-text-muted)' }} /> {c.email}
                            </span>
                          )}
                          {!c.phone && !c.email && !c.instagram && !c.cedula && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <strong style={{ fontSize: '1rem', color: 'var(--color-accent)' }}>
                          {formatCurrency(c.total_spent || 0)}
                        </strong>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.notes || 'Sin notas'}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button className="btn-icon" title="Editar" onClick={() => {
                            setEditingCustomer(c);
                            setIsFormOpen(true);
                          }}>
                            <Edit2 size={15} />
                          </button>
                          <button className="btn-icon danger" title="Eliminar" onClick={() => {
                            setDeletingCustomer(c);
                            setIsConfirmOpen(true);
                          }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} style={{ padding: '0 20px 20px 48px', backgroundColor: 'rgba(0, 212, 170, 0.01)' }}>
                          <div style={{
                            padding: '16px',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(255,255,255,0.04)',
                            marginTop: '10px'
                          }}>
                            <h4 style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              color: 'var(--color-text-primary)',
                              marginBottom: '12px'
                            }}>
                              <ShoppingBag size={14} style={{ color: 'var(--color-accent)' }} />
                              Historial de Compras
                            </h4>
                            
                            {historyLoading ? (
                              <div style={{ padding: '12px 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                                <span className="spin-icon">⏳</span> Cargando historial de compras...
                              </div>
                            ) : purchaseHistory.length === 0 ? (
                              <div style={{ padding: '12px 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                Este cliente no tiene compras registradas.
                              </div>
                            ) : (
                              <div className="table-container">
                                <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                                  <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'left' }}>
                                      <th style={{ padding: '8px 12px', color: 'var(--color-text-muted)' }}>ID Venta</th>
                                      <th style={{ padding: '8px 12px', color: 'var(--color-text-muted)' }}>Fecha</th>
                                      <th style={{ padding: '8px 12px', color: 'var(--color-text-muted)' }}>Estado</th>
                                      <th style={{ padding: '8px 12px', color: 'var(--color-text-muted)', textAlign: 'right' }}>Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {purchaseHistory.map(sale => (
                                      <tr key={sale.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                                        <td style={{ padding: '8px 12px' }}>#{sale.id}</td>
                                        <td style={{ padding: '8px 12px' }}>{formatDate(sale.created_at)}</td>
                                        <td style={{ padding: '8px 12px' }}>
                                          <span className={`badge ${sale.status}`} style={{ fontSize: '0.75rem', padding: '2px 6px' }}>
                                            {sale.status}
                                          </span>
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600' }}>
                                          {formatCurrency(sale.total)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            
                            {c.notes && (
                              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <strong style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                  <FileText size={12} /> Notas del cliente:
                                </strong>
                                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0, whiteSpace: 'pre-wrap' }}>{c.notes}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCustomer(null);
        }}
        title={editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
        size="md"
      >
        <CustomerForm
          customer={editingCustomer}
          onSave={handleCreateOrUpdate}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingCustomer(null);
          }}
        />
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="¿Eliminar Cliente?"
        message={`¿Estás seguro de que deseas eliminar a "${deletingCustomer?.name}"? Se perderán las referencias en compras y su historial.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setIsConfirmOpen(false);
          setDeletingCustomer(null);
        }}
      />
    </div>
  );
}
