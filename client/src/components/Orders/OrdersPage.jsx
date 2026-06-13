/* ============================================================
   ACG PRINTS 3D — Orders Page (Kanban rediseñado)
   ============================================================ */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Edit2, Trash2, Calendar, Phone, MessageSquare,
  ChevronRight, ClipboardList, Printer, CheckCircle, LayoutGrid,
  List, FileText, Package,
} from 'lucide-react';
import { generateReceiptPDF } from '../../utils/receipt.js';
import { api } from '../../utils/api.js';
import { useToast } from '../../App.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import Modal from '../UI/Modal.jsx';
import ConfirmDialog from '../UI/ConfirmDialog.jsx';

const ORDER_STATUSES = [
  { value: 'cola',        label: 'En Cola',     color: '#6D4BBE' },
  { value: 'imprimiendo', label: 'Imprimiendo',  color: '#E2570F' },
  { value: 'terminado',   label: 'Terminado',    color: '#B83A74' },
  { value: 'entregado',   label: 'Entregado',    color: '#2E7D4F' },
];

const STATUS_ICONS = {
  cola:        <ClipboardList size={15} />,
  imprimiendo: <Printer size={15} />,
  terminado:   <CheckCircle size={15} />,
  entregado:   <CheckCircle size={15} />,
};

export default function OrdersPage() {
  const toast = useToast();

  const [orders, setOrders]       = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);

  const [viewType, setViewType]       = useState('board');
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [modalOpen, setModalOpen]       = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName]   = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCedula, setCustomerCedula] = useState('');
  const [description, setDescription]   = useState('');
  const [totalPrice, setTotalPrice]     = useState(0);
  const [deposit, setDeposit]           = useState(0);
  const [orderItems, setOrderItems]     = useState([]);
  const [status, setStatus]             = useState('cola');
  const [deadline, setDeadline]         = useState('');

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

  const fetchFormData = useCallback(async () => {
    try {
      const [cRes, pRes] = await Promise.allSettled([
        api.get('/api/customers'), api.get('/api/products'),
      ]);
      if (cRes.status === 'fulfilled') setCustomers(Array.isArray(cRes.value) ? cRes.value : cRes.value?.data || []);
      if (pRes.status === 'fulfilled') setProducts(Array.isArray(pRes.value) ? pRes.value : pRes.value?.data || []);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchOrders(); fetchFormData(); }, [fetchOrders, fetchFormData]);

  const handleTransition = async (order, nextStatus) => {
    try {
      await api.put(`/api/orders/${order.id || order._id}`, { status: nextStatus });
      toast.success(`Pedido movido a ${ORDER_STATUSES.find(s => s.value === nextStatus)?.label}`);
      fetchOrders();
    } catch { toast.error('Error al actualizar estado'); }
  };

  const handleCreate = () => {
    setEditingOrder(null);
    setSelectedCustomerId(''); setCustomerName(''); setCustomerPhone('');
    setCustomerCedula(''); setDescription(''); setTotalPrice(0);
    setDeposit(0); setOrderItems([]); setStatus('cola');
    setDeadline(new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]);
    setModalOpen(true);
  };

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
    setOrderItems((order.items || []).map(i => ({ product_id: i.product_id || '', quantity: i.quantity || 1, unit_price: i.unit_price || 0 })));
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!customerName && !selectedCustomerId) { toast.error('Debe especificar un cliente'); return; }
    const payload = {
      customer_id: selectedCustomerId || null, customer_name: customerName,
      customer_phone: customerPhone, customer_cedula: customerCedula,
      description, total_price: Number(totalPrice) || 0,
      deposit: Number(deposit) || 0, status, deadline,
      items: orderItems.filter(i => i.product_id),
    };
    try {
      if (editingOrder) {
        await api.put(`/api/orders/${editingOrder.id || editingOrder._id}`, payload);
        toast.success('Pedido actualizado');
      } else {
        await api.post('/api/orders', payload);
        toast.success('Pedido creado');
      }
      setModalOpen(false); fetchOrders();
    } catch (err) { toast.error(err.message || 'Error al guardar'); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/api/orders/${deleteConfirm.id || deleteConfirm._id}`);
      toast.success('Pedido eliminado'); setDeleteConfirm(null); fetchOrders();
    } catch { toast.error('Error al eliminar'); }
  };

  const handleCustomerChange = (cid) => {
    setSelectedCustomerId(cid);
    if (cid) {
      const c = customers.find(c => (c.id || c._id) === cid);
      if (c) { setCustomerName(c.name); setCustomerPhone(c.phone || ''); setCustomerCedula(c.cedula || ''); }
    } else { setCustomerName(''); setCustomerPhone(''); setCustomerCedula(''); }
  };

  const handleAddItem = () => setOrderItems([...orderItems, { product_id: '', quantity: 1, unit_price: 0 }]);
  const handleRemoveItem = (i) => { const u = orderItems.filter((_, idx) => idx !== i); setOrderItems(u); recalc(u); };
  const handleItemProductChange = (i, pid) => {
    const u = [...orderItems]; u[i].product_id = pid;
    const prod = products.find(p => (p.id || p._id) === pid);
    if (prod) u[i].unit_price = prod.sale_price || 0;
    setOrderItems(u); recalc(u);
  };
  const handleItemQtyChange   = (i, v) => { const u = [...orderItems]; u[i].quantity = Number(v)||1; setOrderItems(u); recalc(u); };
  const handleItemPriceChange = (i, v) => { const u = [...orderItems]; u[i].unit_price = Number(v)||0; setOrderItems(u); recalc(u); };
  const recalc = (items) => setTotalPrice(items.reduce((s, it) => s + (it.product_id ? it.quantity * it.unit_price : 0), 0));

  const getDeadlineInfo = (dl) => {
    if (!dl) return { label: 'Sin fecha', cls: 'normal' };
    const d = new Date(dl); d.setHours(0,0,0,0);
    const t = new Date(); t.setHours(0,0,0,0);
    const days = Math.round((d - t) / 86400000);
    if (days < 0)  return { label: `Atrasado ${Math.abs(days)}d`, cls: 'danger' };
    if (days === 0) return { label: 'Entrega HOY', cls: 'danger' };
    if (days === 1) return { label: 'Mañana', cls: 'warning' };
    return { label: `${days} días`, cls: 'normal' };
  };

  const getWhatsAppLink = (order, type) => {
    const phone = (order.customer_phone || '').replace(/\D/g, '');
    if (!phone) return null;
    const name = order.customer_name || 'Cliente';
    const balance = order.total_price - order.deposit;
    const msg = type === 'registered'
      ? `Hola ${name}, te escribimos de *ACG PRINTS 3D* 🚀. Confirmamos tu pedido: "${order.description || ''}". Te avisaremos cuando esté listo 🛠️`
      : `Hola ${name}, de *ACG PRINTS 3D* 🎉. ¡Tu pedido está listo! Puedes pasar a retirarlo.\n💳 Saldo pendiente: ${formatCurrency(balance)}`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  const handleReceipt = (order, e) => {
    e?.stopPropagation();
    try { generateReceiptPDF(order, 'order'); toast.success('Recibo generado'); }
    catch { toast.error('Error al generar recibo'); }
  };

  const filteredOrders = orders.filter(o => {
    const q = search.toLowerCase();
    return ((o.customer_name||'').toLowerCase().includes(q) || (o.description||'').toLowerCase().includes(q))
      && (!statusFilter || o.status === statusFilter);
  });

  const columns = {
    cola:        filteredOrders.filter(o => o.status === 'cola'),
    imprimiendo: filteredOrders.filter(o => o.status === 'imprimiendo'),
    terminado:   filteredOrders.filter(o => o.status === 'terminado'),
    entregado:   filteredOrders.filter(o => o.status === 'entregado'),
  };

  return (
    <div className="animate-fadeIn">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Pedidos</h1>
          <p>Control de producción, entregas y adelantos</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Toggle vista */}
          <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: 2 }}>
            {[['board', LayoutGrid], ['list', List]].map(([v, Icon]) => (
              <button key={v}
                onClick={() => setViewType(v)}
                style={{
                  padding: '6px 12px', border: 'none', borderRadius: 'var(--radius-sm)',
                  background: viewType === v ? 'var(--accent)' : 'transparent',
                  color: viewType === v ? '#fff' : 'var(--muted)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', transition: 'all 0.15s',
                }}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} /> Nuevo Pedido
          </button>
        </div>
      </div>

      {/* ── Filtros ─────────────────────────────────────────── */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search />
          <input className="form-input" placeholder="Buscar cliente o pedido..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {viewType === 'list' && (
          <select className="form-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">Todos los estados</option>
            {ORDER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        )}
      </div>

      {/* ── Contenido ───────────────────────────────────────── */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><ClipboardList size={36} /></div>
          <h3>Sin pedidos</h3>
          <p>No hay pedidos que coincidan. Crea el primero.</p>
          <button className="btn btn-primary" onClick={handleCreate} style={{ marginTop: 16 }}>
            <Plus size={18} /> Nuevo Pedido
          </button>
        </div>
      ) : viewType === 'board' ? (

        /* ── KANBAN ─────────────────────────────────────────── */
        <div style={{ margin: '0 -16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, alignItems: 'start', padding: '0 16px' }}>
          {ORDER_STATUSES.map(col => {
            const colOrders = columns[col.value] || [];
            return (
              <div key={col.value} style={{
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderTop: `3px solid ${col.color}`,
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                minWidth: 0,
              }}>
                {/* Cabecera columna */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', borderBottom: '1px solid var(--line)',
                  background: 'var(--surface)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.07em', color: col.color }}>
                    {STATUS_ICONS[col.value]}
                    {col.label}
                  </div>
                  <span style={{ background: 'var(--surface)', border: `1px solid ${col.color}40`, borderRadius: 'var(--radius-sm)', padding: '1px 8px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: col.color }}>
                    {colOrders.length}
                  </span>
                </div>

                {/* Tarjetas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, maxHeight: '72vh', overflowY: 'auto' }}>
                  {colOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--faint)', fontSize: '0.8rem' }}>
                      Sin pedidos
                    </div>
                  ) : colOrders.map(order => {
                    const dl = getDeadlineInfo(order.deadline);
                    const balance = (order.total_price || 0) - (order.deposit || 0);
                    const waReg = getWhatsAppLink(order, 'registered');
                    const waFin = getWhatsAppLink(order, 'finished');

                    return (
                      <div key={order.id || order._id}
                        onClick={() => handleEdit(order)}
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--line)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          display: 'flex', flexDirection: 'column', gap: 6,
                          boxShadow: 'none',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = col.color; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
                      >
                        {/* Cliente */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--ink)' }}>
                              {order.customer_name || 'Sin cliente'}
                            </div>
                            {order.customer_phone && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                                <Phone size={10} /> {order.customer_phone}
                              </div>
                            )}
                          </div>
                          {/* Fecha límite */}
                          {order.deadline && (
                            <span style={{
                              fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                              padding: '2px 7px', borderRadius: 'var(--radius-sm)',
                              background: dl.cls === 'danger' ? 'var(--red-soft)' : dl.cls === 'warning' ? 'var(--amber-soft)' : 'var(--surface-soft)',
                              color: dl.cls === 'danger' ? 'var(--red)' : dl.cls === 'warning' ? 'var(--amber)' : 'var(--muted)',
                              display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap',
                            }}>
                              <Calendar size={10} /> {dl.label}
                            </span>
                          )}
                        </div>

                        {/* Descripción */}
                        {order.description && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', lineHeight: 1.35, fontWeight: 500 }}>
                            {order.description}
                          </div>
                        )}

                        {/* Productos */}
                        {order.items?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {order.items.map((it, i) => (
                              <span key={i} style={{
                                fontSize: '0.7rem', padding: '2px 7px', borderRadius: 'var(--radius-sm)',
                                background: 'var(--surface-soft)', border: '1px solid var(--line)',
                                color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)',
                              }}>
                                {it.product_name} ×{it.quantity}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Dinero */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px dashed var(--line)' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                              {formatCurrency(order.total_price)}
                            </div>
                            {order.deposit > 0 && (
                              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                                Saldo: {formatCurrency(balance)}
                              </div>
                            )}
                          </div>

                          {/* Acciones */}
                          <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                            {/* WhatsApp */}
                            {order.customer_phone && order.status === 'cola' && waReg && (
                              <a href={waReg} target="_blank" rel="noopener noreferrer" className="btn-whatsapp" title="WhatsApp confirmación">
                                <MessageSquare size={13} />
                              </a>
                            )}
                            {order.customer_phone && order.status === 'terminado' && waFin && (
                              <a href={waFin} target="_blank" rel="noopener noreferrer" className="btn-whatsapp" title="WhatsApp pedido listo">
                                <MessageSquare size={13} />
                              </a>
                            )}

                            {/* Recibo */}
                            <button onClick={e => handleReceipt(order, e)} title="Recibo PDF"
                              style={{ padding: 5, borderRadius: 'var(--radius-sm)', background: 'var(--accent-soft)', color: 'var(--accent-deep)', border: '1px solid var(--accent-line)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-soft)'; e.currentTarget.style.color = 'var(--accent-deep)'; }}
                            >
                              <FileText size={13} />
                            </button>

                            {/* Transición */}
                            {order.status === 'cola' && (
                              <button onClick={() => handleTransition(order, 'imprimiendo')}
                                style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--violet-soft)', color: 'var(--violet)', border: '1px solid #D6CCEE', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'var(--font-mono)', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--violet)'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--violet-soft)'; e.currentTarget.style.color = 'var(--violet)'; }}
                              >
                                Imprimir <ChevronRight size={11} />
                              </button>
                            )}
                            {order.status === 'imprimiendo' && (
                              <button onClick={() => handleTransition(order, 'terminado')}
                                style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-soft)', color: 'var(--accent-deep)', border: '1px solid var(--accent-line)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'var(--font-mono)', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-soft)'; e.currentTarget.style.color = 'var(--accent-deep)'; }}
                              >
                                Terminar <ChevronRight size={11} />
                              </button>
                            )}
                            {order.status === 'terminado' && (
                              <button onClick={() => handleTransition(order, 'entregado')}
                                style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--green-soft)', color: 'var(--green)', border: '1px solid #C2DECB', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'var(--font-mono)', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--green)'; e.currentTarget.style.color = '#fff'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--green-soft)'; e.currentTarget.style.color = 'var(--green)'; }}
                              >
                                Entregar <ChevronRight size={11} />
                              </button>
                            )}
                            {order.status === 'entregado' && (
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-mono)' }}>
                                <CheckCircle size={12} /> OK
                              </span>
                            )}

                            {/* Eliminar */}
                            <button onClick={e => { e.stopPropagation(); setDeleteConfirm(order); }}
                              style={{ padding: 5, borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--muted)', border: '1px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-soft)'; e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = '#EBC2BC'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'transparent'; }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      ) : (
        /* ── LISTA ──────────────────────────────────────────── */
        <div className="table-container animate-fadeIn">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Detalles</th>
                <th>Fecha entrega</th>
                <th>Total</th>
                <th>Adelanto</th>
                <th>Saldo</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => {
                const balance = (order.total_price||0) - (order.deposit||0);
                const dl = getDeadlineInfo(order.deadline);
                return (
                  <tr key={order.id || order._id} onClick={() => handleEdit(order)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{order.customer_name}</div>
                      {order.customer_phone && <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{order.customer_phone}</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{order.description || '—'}</div>
                      {order.items?.length > 0 && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 3 }}>
                          {order.items.map(it => `${it.product_name} ×${it.quantity}`).join(', ')}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-mono)',
                        padding: '2px 7px', borderRadius: 'var(--radius-sm)',
                        background: dl.cls === 'danger' ? 'var(--red-soft)' : dl.cls === 'warning' ? 'var(--amber-soft)' : 'var(--surface-soft)',
                        color: dl.cls === 'danger' ? 'var(--red)' : dl.cls === 'warning' ? 'var(--amber)' : 'var(--muted)',
                      }}>
                        {dl.label}
                      </span>
                    </td>
                    <td className="money">{formatCurrency(order.total_price)}</td>
                    <td style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(order.deposit)}</td>
                    <td style={{ color: balance > 0 ? 'var(--amber)' : 'var(--muted)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(balance)}</td>
                    <td>
                      <span className={`badge badge-${order.status}`}>
                        <span className="badge-dot" />
                        {ORDER_STATUSES.find(s => s.value === order.status)?.label || order.status}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="action-buttons">
                        <button className="action-btn edit" onClick={() => handleEdit(order)}><Edit2 size={15} /></button>
                        <button className="action-btn" onClick={e => handleReceipt(order, e)} style={{ color: 'var(--accent-deep)' }}><FileText size={15} /></button>
                        <button className="action-btn delete" onClick={() => setDeleteConfirm(order)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal crear/editar ───────────────────────────────── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="lg">
        <form onSubmit={handleSave}>
          <div className="modal-header">
            <h2 className="modal-title">{editingOrder ? 'Editar Pedido' : 'Nuevo Pedido'}</h2>
          </div>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Cliente registrado</label>
                <select className="form-select" value={selectedCustomerId} onChange={e => handleCustomerChange(e.target.value)}>
                  <option value="">-- Seleccionar --</option>
                  {customers.map(c => <option key={c.id||c._id} value={c.id||c._id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Nombre del cliente *</label>
                <input type="text" className="form-input" value={customerName} onChange={e => setCustomerName(e.target.value)} required placeholder="Nombre o alias" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input type="text" className="form-input" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Ej. 6000-0000" />
              </div>
              <div className="form-group">
                <label className="form-label">Cédula</label>
                <input type="text" className="form-input" value={customerCedula} onChange={e => setCustomerCedula(e.target.value)} placeholder="Ej. 8-000-000" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Fecha límite de entrega *</label>
              <input type="date" className="form-input" value={deadline} onChange={e => setDeadline(e.target.value)} required />
            </div>

            <div className="form-group">
              <label className="form-label">Detalles del pedido</label>
              <textarea className="form-textarea" rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej. Dos dispensadores de Gillette, color negro y rojo" />
            </div>

            {/* Productos */}
            <div style={{ background: 'var(--surface-soft)', border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Package size={15} /> Productos del catálogo
                </span>
                <button type="button" className="btn btn-sm btn-secondary" onClick={handleAddItem}>+ Agregar</button>
              </div>
              {orderItems.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem', padding: '10px 0' }}>
                  Sin productos vinculados. El total se puede ingresar manualmente.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {orderItems.map((item, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                      <select className="form-select" value={item.product_id} onChange={e => handleItemProductChange(i, e.target.value)} required>
                        <option value="">-- Producto --</option>
                        {products.map(p => <option key={p.id||p._id} value={p.id||p._id}>{p.name} ({formatCurrency(p.sale_price)})</option>)}
                      </select>
                      <input type="number" className="form-input" placeholder="Cant." min={1} value={item.quantity} onChange={e => handleItemQtyChange(i, e.target.value)} required />
                      <input type="number" className="form-input" placeholder="Precio" step="0.01" value={item.unit_price} onChange={e => handleItemPriceChange(i, e.target.value)} required />
                      <button type="button" onClick={() => handleRemoveItem(i)} style={{ padding: 6, borderRadius: 'var(--radius-sm)', background: 'var(--red-soft)', color: 'var(--red)', border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financiero */}
            <div className="form-row form-row-3col">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Total ($)</label>
                <input type="number" step="0.01" className="form-input" value={totalPrice} onChange={e => setTotalPrice(Number(e.target.value)||0)} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Adelanto ($)</label>
                <input type="number" step="0.01" className="form-input" value={deposit} onChange={e => setDeposit(Number(e.target.value)||0)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Saldo pendiente</label>
                <div className="form-calculated" style={{ color: (totalPrice-deposit) > 0 ? 'var(--amber)' : 'var(--green)' }}>
                  {formatCurrency(totalPrice - deposit)}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Estado</label>
              <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                {ORDER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn btn-primary">Guardar Pedido</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="¿Eliminar pedido?"
        message={`¿Eliminar el pedido de ${deleteConfirm?.customer_name}? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
