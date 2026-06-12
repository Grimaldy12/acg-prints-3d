/* ============================================================
   PrintFlow 3D — Orders Page Component
   ============================================================
   State-of-the-art Kanban board & list view for order tracking,
   deposit (seña) accounting, WhatsApp status messages,
   and custom print parameter specifications.
   ============================================================ */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  Phone,
  MessageSquare,
  ChevronRight,
  ClipboardList,
  Printer,
  CheckCircle,
  XCircle,
  LayoutGrid,
  List,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { generateReceiptPDF } from '../../utils/receipt.js';
import { api } from '../../utils/api.js';
import { useToast } from '../../App.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import Modal from '../UI/Modal.jsx';
import ConfirmDialog from '../UI/ConfirmDialog.jsx';

const ORDER_STATUSES = [
  { value: 'cola', label: 'En Cola', color: '#6D4BBE' },
  { value: 'imprimiendo', label: 'Imprimiendo', color: '#E2570F' },
  { value: 'terminado', label: 'Terminado', color: '#B83A74' },
  { value: 'entregado', label: 'Entregado', color: '#2E7D4F' }
];

export default function OrdersPage() {
  const toast = useToast();

  // Data states
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & view states
  const [viewType, setViewType] = useState('board'); // 'board' or 'list'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Form fields
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCedula, setCustomerCedula] = useState('');
  const [description, setDescription] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [orderItems, setOrderItems] = useState([]); // Array of { product_id, quantity, unit_price }
  const [status, setStatus] = useState('cola');
  const [deadline, setDeadline] = useState('');

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/orders');
      setOrders(Array.isArray(res) ? res : res?.data || []);
    } catch (err) {
      toast.error('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch catalog data
  const fetchFormData = useCallback(async () => {
    try {
      const [cRes, pRes] = await Promise.allSettled([
        api.get('/api/customers'),
        api.get('/api/products')
      ]);
      if (cRes.status === 'fulfilled') {
        setCustomers(Array.isArray(cRes.value) ? cRes.value : cRes.value?.data || []);
      }
      if (pRes.status === 'fulfilled') {
        setProducts(Array.isArray(pRes.value) ? pRes.value : pRes.value?.data || []);
      }
    } catch (_) { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchFormData();
  }, [fetchOrders, fetchFormData]);

  // Handlers for status transitions
  const handleTransition = async (order, nextStatus) => {
    try {
      const orderId = order.id || order._id;
      await api.put(`/api/orders/${orderId}`, { status: nextStatus });
      toast.success(`Pedido movido a ${ORDER_STATUSES.find(s => s.value === nextStatus)?.label}`);
      fetchOrders();
    } catch (err) {
      toast.error('Error al actualizar estado del pedido');
    }
  };

  // Open modal for creating new order
  const handleCreate = () => {
    setEditingOrder(null);
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerCedula('');
    setDescription('');
    setTotalPrice(0);
    setDeposit(0);
    setOrderItems([]);
    setStatus('cola');
    setDeadline(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Default 3 days deadline
    setModalOpen(true);
  };

  // Open modal for editing order
  const handleEdit = (order) => {
    setEditingOrder(order);
    setSelectedCustomerId(order.customer_id || '');
    setCustomerName(order.customer_name || '');
    setCustomerPhone(order.customer_phone || '');
    setCustomerCedula(order.customer_cedula || '');
    setDescription(order.description || '');
    setTotalPrice(order.total_price || 0);
    setDeposit(order.deposit || 0);
    setStatus(order.status || 'cola');
    setDeadline(order.deadline ? order.deadline.split('T')[0] : '');
    
    // Format items for the editor
    const formattedItems = (order.items || []).map(item => ({
      product_id: item.product_id || '',
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0
    }));
    setOrderItems(formattedItems);
    
    setModalOpen(true);
  };

  // Save order (Create or Update)
  const handleSave = async (e) => {
    e.preventDefault();

    if (!customerName && !selectedCustomerId) {
      toast.error('Debe especificar un cliente');
      return;
    }

    const orderPayload = {
      customer_id: selectedCustomerId || null,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_cedula: customerCedula,
      description,
      total_price: Number(totalPrice) || 0,
      deposit: Number(deposit) || 0,
      status,
      deadline,
      items: orderItems.filter(item => item.product_id)
    };

    try {
      if (editingOrder) {
        const orderId = editingOrder.id || editingOrder._id;
        await api.put(`/api/orders/${orderId}`, orderPayload);
        toast.success('Pedido actualizado correctamente');
      } else {
        await api.post('/api/orders', orderPayload);
        toast.success('Pedido creado correctamente');
      }
      setModalOpen(false);
      fetchOrders();
    } catch (err) {
      toast.error(err.message || 'Error al guardar el pedido');
    }
  };

  const handleDeleteClick = (order, e) => {
    e.stopPropagation();
    setDeleteConfirm(order);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      const orderId = deleteConfirm.id || deleteConfirm._id;
      await api.delete(`/api/orders/${orderId}`);
      toast.success('Pedido eliminado');
      setDeleteConfirm(null);
      fetchOrders();
    } catch (err) {
      toast.error('Error al eliminar pedido');
    }
  };

  // Handle customer selection change
  const handleCustomerChange = (cid) => {
    setSelectedCustomerId(cid);
    if (cid) {
      const found = customers.find(c => (c.id || c._id) === cid);
      if (found) {
        setCustomerName(found.name);
        setCustomerPhone(found.phone || '');
        setCustomerCedula(found.cedula || '');
      }
    } else {
      setCustomerName('');
      setCustomerPhone('');
      setCustomerCedula('');
    }
  };

  // Item additions in form
  const handleAddItem = () => {
    setOrderItems([...orderItems, { product_id: '', quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveItem = (index) => {
    const updated = [...orderItems];
    updated.splice(index, 1);
    setOrderItems(updated);
    recalculateTotalPrice(updated);
  };

  const handleItemProductChange = (index, pid) => {
    const updated = [...orderItems];
    updated[index].product_id = pid;
    
    // Prefill unit price
    if (pid) {
      const prod = products.find(p => (p.id || p._id) === pid);
      if (prod) {
        updated[index].unit_price = prod.sale_price || 0;
      }
    }
    
    setOrderItems(updated);
    recalculateTotalPrice(updated);
  };

  const handleItemQuantityChange = (index, qty) => {
    const updated = [...orderItems];
    updated[index].quantity = Number(qty) || 1;
    setOrderItems(updated);
    recalculateTotalPrice(updated);
  };

  const handleItemPriceChange = (index, price) => {
    const updated = [...orderItems];
    updated[index].unit_price = Number(price) || 0;
    setOrderItems(updated);
    recalculateTotalPrice(updated);
  };

  const recalculateTotalPrice = (items) => {
    const total = items.reduce((sum, item) => {
      if (!item.product_id) return sum;
      return sum + (item.quantity * item.unit_price);
    }, 0);
    setTotalPrice(total);
  };

  // Get date indicator style
  const getDeadlineIndicator = (deadlineStr) => {
    if (!deadlineStr) return { label: 'Sin fecha', class: 'normal' };
    const dl = new Date(deadlineStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dl.setHours(0, 0, 0, 0);

    const diffTime = dl.getTime() - today.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays < 0) {
      return { label: `Atrasado por ${Math.abs(diffDays)} d`, class: 'danger' };
    } else if (diffDays === 0) {
      return { label: 'Entrega HOY', class: 'danger' };
    } else if (diffDays === 1) {
      return { label: 'Entrega Mañana', class: 'warning' };
    } else {
      return { label: `Faltan ${diffDays} días`, class: 'normal' };
    }
  };

  // Generate WhatsApp status text links
  const getWhatsAppLink = (order, type) => {
    const name = order.customer_name || 'Cliente';
    const phone = order.customer_phone ? order.customer_phone.replace(/\D/g, '') : '';
    if (!phone) return null;

    let message = '';
    const balance = order.total_price - order.deposit;

    if (type === 'registered') {
      message = `Hola ${name}, te escribimos de *ACG PRINTS 3D* 🚀. Queremos confirmarte que hemos registrado tu pedido: "${order.description || 'Detalles en notas'}".\n\nPor favor, ayúdanos a confirmar tus datos de facturación y entrega:\n📌 *Nombre completo:* ${name}\n📌 *Cédula de Identidad:* ${order.customer_cedula || '(Por favor, respóndenos con tu número de cédula)'}\n📌 *Número de contacto:* ${order.customer_phone || ''}\n📌 *Confirmación del color a requerir:* ?\n📌 *Si no eres la persona que va a retirar coloca el nombre de la persona aquí:*\n\n¡Te avisaremos apenas tu pedido esté listo en nuestras impresoras 3D! 🛠️`;
    } else if (type === 'finished') {
      message = `Hola ${name}, te escribimos de *ACG PRINTS 3D* 🎉. ¡Tu pedido está listo y terminado! Puedes pasar a retirarlo cuando gustes.\n\n💳 *Saldo Pendiente a abonar:* ${formatCurrency(balance)}\n\n¡Gracias por tu confianza! 🌟`;
    }

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  // Filter orders based on search and status
  const filteredOrders = orders.filter(order => {
    const nameMatch = (order.customer_name || '').toLowerCase().includes(search.toLowerCase());
    const descMatch = (order.description || '').toLowerCase().includes(search.toLowerCase());
    const statusMatch = !statusFilter || order.status === statusFilter;
    return (nameMatch || descMatch) && statusMatch;
  });

  // Split orders by status for Kanban Columns
  const columns = {
    cola: filteredOrders.filter(o => o.status === 'cola'),
    imprimiendo: filteredOrders.filter(o => o.status === 'imprimiendo'),
    terminado: filteredOrders.filter(o => o.status === 'terminado'),
    entregado: filteredOrders.filter(o => o.status === 'entregado')
  };

  const handleReceipt = (order) => {
    try {
      generateReceiptPDF(order, 'order');
      toast.success('Recibo generado');
    } catch (err) {
      toast.error('Error al generar el recibo');
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Control de Pedidos</h1>
          <p>Supervisa la producción en cola, impresiones activas, adelantos y entregas</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="btn-group" style={{ display: 'inline-flex', background: 'var(--bg-surface)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '2px' }}>
            <button
              className={`btn btn-sm ${viewType === 'board' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewType('board')}
              style={{ padding: '6px 12px', borderRadius: '4px' }}
              title="Vista Kanban"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`btn btn-sm ${viewType === 'list' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setViewType('list')}
              style={{ padding: '6px 12px', borderRadius: '4px' }}
              title="Vista de Lista"
            >
              <List size={16} />
            </button>
          </div>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} />
            Nuevo Pedido
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search />
          <input
            className="form-input"
            placeholder="Buscar por cliente o detalles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {viewType === 'list' && (
          <select
            className="form-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ maxWidth: 200 }}
          >
            <option value="">Todos los estados</option>
            {ORDER_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <ClipboardList size={36} />
          </div>
          <h3>Sin pedidos</h3>
          <p>No se encontraron pedidos que coincidan con tu búsqueda. Crea uno nuevo para comenzar.</p>
          <button className="btn btn-primary" onClick={handleCreate} style={{ marginTop: 16 }}>
            <Plus size={18} /> Registrar Pedido
          </button>
        </div>
      ) : viewType === 'board' ? (
        /* KANBAN BOARD VIEW */
        <div className="kanban-board">
          {ORDER_STATUSES.map(col => {
            const colOrders = columns[col.value] || [];
            return (
              <div key={col.value} className={`kanban-column ${col.value}`}>
                <div className="kanban-column-header">
                  <div className="kanban-column-title">
                    {col.value === 'cola' && <ClipboardList size={16} />}
                    {col.value === 'imprimiendo' && <Printer size={16} />}
                    {col.value === 'terminado' && <CheckCircle size={16} />}
                    {col.value === 'entregado' && <CheckCircle size={16} />}
                    <span>{col.label}</span>
                  </div>
                  <span className="kanban-column-count">{colOrders.length}</span>
                </div>

                {colOrders.map(order => {
                  const deadlineInfo = getDeadlineIndicator(order.deadline);
                  const balance = order.total_price - order.deposit;
                  const waRegistered = getWhatsAppLink(order, 'registered');
                  const waFinished = getWhatsAppLink(order, 'finished');

                  return (
                    <div
                      key={order.id || order._id}
                      className="kanban-card"
                      onClick={() => handleEdit(order)}
                    >
                      <div className="kanban-card-client">
                        <span>{order.customer_name || 'Sin cliente'}</span>
                        {order.customer_phone && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                            <Phone size={10} /> {order.customer_phone}
                          </span>
                        )}
                      </div>

                      <div className="kanban-card-title">
                        {order.description || 'Sin notas adicionales'}
                      </div>

                      {order.items && order.items.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {order.items.map((it, i) => (
                            <span key={i} style={{ background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px' }}>
                              {it.product_name} x{it.quantity}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="kanban-card-meta">
                        {order.deadline && (
                          <span className={`deadline-badge ${deadlineInfo.class}`}>
                            <Calendar size={11} />
                            {deadlineInfo.label}
                          </span>
                        )}
                      </div>

                      <div className="kanban-card-footer">
                        <div className="kanban-card-money">
                          <span className="kanban-card-price">{formatCurrency(order.total_price)}</span>
                          {order.deposit > 0 && (
                            <span className="kanban-card-deposit">
                              Adelanto: {formatCurrency(order.deposit)} (Sald: {formatCurrency(balance)})
                            </span>
                          )}
                        </div>

                        <div className="kanban-card-actions" onClick={e => e.stopPropagation()}>
                          {/* WhatsApp alerts */}
                          {order.customer_phone && order.status === 'cola' && waRegistered && (
                            <a
                              href={waRegistered}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-whatsapp"
                              title="Enviar confirmación de pedido por WhatsApp"
                            >
                              <MessageSquare size={13} />
                            </a>
                          )}
                          
                          {order.customer_phone && order.status === 'terminado' && waFinished && (
                            <a
                              href={waFinished}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-whatsapp"
                              title="Notificar por WhatsApp que el pedido está terminado"
                            >
                              <MessageSquare size={13} />
                            </a>
                          )}

                          {/* Transition Actions */}
                          {order.status === 'cola' && (
                            <button
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                              onClick={() => handleTransition(order, 'imprimiendo')}
                            >
                              Imprimir <ChevronRight size={12} />
                            </button>
                          )}
                          {order.status === 'imprimiendo' && (
                            <button
                              className="btn btn-sm btn-primary"
                              style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#000' }}
                              onClick={() => handleTransition(order, 'terminado')}
                            >
                              Terminar <ChevronRight size={12} />
                            </button>
                          )}
                          {order.status === 'terminado' && (
                            <button
                              className="btn btn-sm btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.7rem', borderColor: '#2E7D4F', color: '#2E7D4F' }}
                              onClick={() => handleTransition(order, 'entregado')}
                            >
                              Entregar <ChevronRight size={12} />
                            </button>
                          )}
                          {order.status === 'entregado' && (
                            <span style={{ color: '#2E7D4F', fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <CheckCircle size={12} /> Entregado
                            </span>
                          )}

                          <button
                            className="btn btn-ghost btn-icon"
                            style={{ padding: '4px', opacity: 0.6 }}
                            onClick={(e) => handleDeleteClick(order, e)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        /* STANDARD LIST VIEW */
        <div className="table-container animate-fadeIn">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Detalles / Impresión</th>
                <th>Fecha Entrega</th>
                <th>Total</th>
                <th>Adelanto Recibido</th>
                <th>Saldo Pendiente</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => {
                const balance = order.total_price - order.deposit;
                const deadlineInfo = getDeadlineIndicator(order.deadline);
                const orderId = order.id || order._id;

                return (
                  <tr key={orderId} onClick={() => handleEdit(order)} style={{ cursor: 'pointer' }}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      <div>{order.customer_name}</div>
                      {order.customer_phone && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{order.customer_phone}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{order.description || '—'}</div>
                      {order.items && order.items.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {order.items.map(it => `${it.product_name} x${it.quantity}`).join(', ')}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`deadline-badge ${deadlineInfo.class}`}>
                        {deadlineInfo.label}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {formatCurrency(order.total_price)}
                    </td>
                    <td style={{ color: 'var(--color-success)' }}>
                      {formatCurrency(order.deposit)}
                    </td>
                    <td style={{ color: balance > 0 ? 'var(--accent-gold)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {formatCurrency(balance)}
                    </td>
                    <td>
                      <span className={`badge badge-${order.status}`}>
                        <span className="badge-dot" />
                        {ORDER_STATUSES.find(s => s.value === order.status)?.label || order.status}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="action-buttons">
                        <button className="btn btn-ghost btn-icon" onClick={() => handleEdit(order)}>
                          <Edit2 size={16} />
                        </button>
                        <button className="btn btn-ghost btn-icon" onClick={(e) => handleDeleteClick(order, e)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE/EDIT MODAL DIALOG */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="lg">
        <form onSubmit={handleSave}>
          <div className="modal-header">
            <h2 className="modal-title">
              {editingOrder ? 'Editar Pedido' : 'Registrar Nuevo Pedido'}
            </h2>
          </div>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Customer Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Cliente Registrado (Opcional)</label>
                <select
                  className="form-select"
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                >
                  <option value="">-- Seleccionar cliente --</option>
                  {customers.map(c => (
                    <option key={c.id || c._id} value={c.id || c._id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nombre del Cliente (Obligatorio)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nombre o alias"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Teléfono de Contacto</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: +54911223344"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cédula de Identidad / RIF</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ej: V-12345678 o 12.345.678"
                  value={customerCedula}
                  onChange={(e) => setCustomerCedula(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Fecha Límite de Entrega</label>
              <input
                type="date"
                className="form-input"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </div>

            {/* Description / Custom parameters */}
            <div className="form-group">
              <label className="form-label">Detalles del Pedido / Especificaciones de Impresión (Recomendado)</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="Ej: Llaveros de Dragon Ball, color rojo, filamento PLA, escala 15cm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Catalog Items Grid */}
            <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyalign: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Artículos del Catálogo en este pedido
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={handleAddItem}
                  style={{ padding: '4px 10px' }}
                >
                  + Agregar Producto
                </button>
              </div>

              {orderItems.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '12px 0' }}>
                  Ningún producto del catálogo seleccionado. Puedes especificar el total directamente abajo, o vincular productos.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Fila de títulos para las columnas */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', paddingBottom: '4px', borderBottom: '1px dashed rgba(255,255,255,0.06)', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Producto</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Cantidad</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Precio Unit.</span>
                    <span style={{ width: '28px' }}></span>
                  </div>
                  {orderItems.map((item, index) => (
                    <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'center' }}>
                      <select
                        className="form-select"
                        value={item.product_id}
                        onChange={(e) => handleItemProductChange(index, e.target.value)}
                        required
                      >
                        <option value="">-- Seleccionar producto --</option>
                        {products.map(p => (
                          <option key={p.id || p._id} value={p.id || p._id}>
                            {p.name} ({formatCurrency(p.sale_price)})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="Cant."
                        value={item.quantity}
                        min={1}
                        onChange={(e) => handleItemQuantityChange(index, e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        placeholder="Precio Unit."
                        value={item.unit_price}
                        onChange={(e) => handleItemPriceChange(index, e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        onClick={() => handleRemoveItem(index)}
                        style={{ color: 'var(--color-error)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financial Panel */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Precio Total ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={totalPrice}
                  onChange={(e) => setTotalPrice(Number(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Adelanto Recibido ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value) || 0)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Saldo Pendiente a Cobrar</label>
                <div
                  className="form-calculated"
                  style={{
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderStyle: 'solid',
                    borderColor: 'rgba(255,255,255,0.08)',
                    fontSize: '1rem',
                    color: (totalPrice - deposit) > 0 ? 'var(--accent-gold)' : 'var(--color-success)'
                  }}
                >
                  {formatCurrency(totalPrice - deposit)}
                </div>
              </div>
            </div>

            {/* Status Selector */}
            <div className="form-group">
              <label className="form-label">Estado del Pedido</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {ORDER_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ color: '#000' }}>
              Guardar Pedido
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="¿Eliminar pedido?"
        message={`¿Estás seguro de que deseas eliminar el pedido de ${deleteConfirm?.customer_name}? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
