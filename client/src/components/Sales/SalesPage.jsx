import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Edit2, Trash2, ShoppingCart,
  ChevronLeft, ChevronRight, TrendingUp, DollarSign,
  Clock, CheckCircle, BarChart2, FileText,
} from 'lucide-react';
import { api } from '../../utils/api.js';
import { useToast } from '../../App.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { SALE_STATUSES, getStatusLabel } from '../../utils/constants.js';
import { generateReceiptPDF } from '../../utils/receipt.js';
import Modal from '../UI/Modal.jsx';
import ConfirmDialog from '../UI/ConfirmDialog.jsx';
import SaleForm from './SaleForm.jsx';

const PAGE_SIZE = 10;

function SummaryCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="stat-card" style={{ '--card-accent': color }}>
      <div className="stat-icon" style={{ background: `${color}1A`, color }}>
        <Icon size={20} />
      </div>
      <div className="stat-info">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
        {sub && <span className="stat-trend" style={{ color: 'var(--muted)' }}>{sub}</span>}
      </div>
    </div>
  );
}

export default function SalesPage() {
  const toast = useToast();

  const [sales, setSales]         = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [summary, setSummary]     = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch]             = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [page, setPage]                 = useState(1);

  const [modalOpen, setModalOpen]         = useState(false);
  const [editingSale, setEditingSale]     = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const res = await api.get('/api/sales/summary');
      setSummary(res?.data || res);
    } catch (_) {} finally { setSummaryLoading(false); }
  }, []);

  const fetchSales = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search)       params.append('search', search);
      if (dateFrom)     params.append('from', dateFrom);
      if (dateTo)       params.append('to', dateTo);
      const q = params.toString();
      const res = await api.get(`/api/sales${q ? `?${q}` : ''}`);
      setSales(Array.isArray(res) ? res : res?.data || res?.sales || []);
    } catch (err) {
      toast.error('Error al cargar ventas');
    } finally { setLoading(false); }
  }, [statusFilter, search, dateFrom, dateTo]);

  const fetchFormData = useCallback(async () => {
    try {
      const [cRes, pRes] = await Promise.allSettled([
        api.get('/api/customers'), api.get('/api/products'),
      ]);
      if (cRes.status === 'fulfilled') setCustomers(Array.isArray(cRes.value) ? cRes.value : cRes.value?.data || []);
      if (pRes.status === 'fulfilled') setProducts(Array.isArray(pRes.value) ? pRes.value : pRes.value?.data || []);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchSummary(); fetchSales(); fetchFormData(); }, [fetchSummary, fetchSales, fetchFormData]);
  useEffect(() => { setPage(1); }, [statusFilter, search, dateFrom, dateTo]);

  const totalPages     = Math.max(1, Math.ceil(sales.length / PAGE_SIZE));
  const paginatedSales = sales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCreate = () => { setEditingSale(null); setModalOpen(true); };
  const handleEdit   = (sale) => { setEditingSale(sale); setModalOpen(true); };

  const handleSave = async (saleData) => {
    try {
      if (editingSale) {
        await api.put(`/api/sales/${editingSale._id || editingSale.id}`, saleData);
        toast.success('Venta actualizada correctamente');
      } else {
        await api.post('/api/sales', saleData);
        toast.success('Venta creada correctamente');
      }
      setModalOpen(false);
      setEditingSale(null);
      fetchSales();
      fetchSummary();
    } catch (err) {
      toast.error(err.message || 'Error al guardar la venta');
      throw err;
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/api/sales/${deleteConfirm._id || deleteConfirm.id}`);
      toast.success('Venta eliminada');
      setDeleteConfirm(null);
      fetchSales();
      fetchSummary();
    } catch (err) {
      toast.error(err.message || 'Error al eliminar la venta');
    }
  };

  const handleReceipt = (sale) => {
    try {
      generateReceiptPDF(sale, 'sale');
      toast.success('Recibo generado');
    } catch (err) {
      toast.error('Error al generar el recibo');
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="page-header">
        <div>
          <h1>Ventas</h1>
          <p>Gestiona todas tus ventas y pedidos</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}>
          <Plus size={18} /> Nueva Venta
        </button>
      </div>

      {/* Resumen histórico */}
      {!summaryLoading && summary && (
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{
            fontSize: '0.72rem', fontWeight: 600, color: 'var(--muted)',
            fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
            letterSpacing: '0.1em', marginBottom: '12px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <BarChart2 size={14} style={{ color: 'var(--accent)' }} />
            Histórico total de ventas
          </h2>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <SummaryCard icon={TrendingUp}   label="Total recaudado"           value={formatCurrency(summary.total_recaudado)} color="#E2570F" sub={`${summary.total_ventas} ventas en total`} />
            <SummaryCard icon={CheckCircle}  label="Cobrado (pagado+entregado)" value={formatCurrency(summary.total_pagado)}    color="#2E7D4F" sub={`${summary.total_entregado} entregadas`} />
            <SummaryCard icon={Clock}        label="Por cobrar"                  value={formatCurrency(summary.total_pendiente)} color="#A66B06" sub="Ventas pendientes" />
            <SummaryCard icon={DollarSign}   label="Ticket promedio"             value={formatCurrency(summary.ticket_promedio)} color="#6D4BBE" sub="Excluye canceladas" />
          </div>
        </div>
      )}
      {summaryLoading && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '28px' }}>
          {[0,1,2,3].map(i => <div key={i} className="skeleton skeleton-card" />)}
        </div>
      )}

      {/* Filtros */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search />
          <input className="form-input" placeholder="Buscar por cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">Todos los estados</option>
          {SALE_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input type="date" className="form-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ maxWidth: 170 }} />
        <input type="date" className="form-input" value={dateTo}   onChange={e => setDateTo(e.target.value)}   style={{ maxWidth: 170 }} />
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : sales.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><ShoppingCart size={36} /></div>
          <h3>Sin ventas</h3>
          <p>Aún no tienes ventas registradas.</p>
          <button className="btn btn-primary" onClick={handleCreate} style={{ marginTop: 16 }}>
            <Plus size={18} /> Nueva Venta
          </button>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Recibo</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Productos</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSales.map((sale, idx) => {
                  const saleId = sale._id || sale.id;
                  const itemCount = sale.items?.length || 0;
                  const firstItem = sale.items?.[0];
                  const productDisplay = itemCount > 1
                    ? `${firstItem?.product_name || 'Producto'} +${itemCount - 1}`
                    : (firstItem?.product_name || `${itemCount} producto(s)`);
                  return (
                    <tr key={saleId}>
                      <td style={{ color: 'var(--muted)' }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="mono" style={{ color: 'var(--accent-deep)', fontWeight: 600 }}>{sale.receipt_number ? `#${sale.receipt_number}` : '—'}</td>
                      <td className="mono">{formatDate(sale.date || sale.created_at)}</td>
                      <td style={{ color: 'var(--ink)', fontWeight: 500 }}>{sale.customer_name || '—'}</td>
                      <td>{productDisplay}</td>
                      <td className="money">{formatCurrency(sale.total)}</td>
                      <td>
                        <span className={`badge badge-${sale.status}`}>
                          <span className="badge-dot" />{getStatusLabel(sale.status)}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="action-btn" title="Descargar recibo" onClick={() => handleReceipt(sale)}
                            style={{ color: 'var(--muted)' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-soft)'; e.currentTarget.style.color = 'var(--accent-deep)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--muted)'; }}
                          >
                            <FileText size={16} />
                          </button>
                          <button className="action-btn edit" title="Editar" onClick={() => handleEdit(sale)}>
                            <Edit2 size={16} />
                          </button>
                          <button className="action-btn delete" title="Eliminar" onClick={() => setDeleteConfirm(sale)}>
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

          {sales.length > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
              gap: '24px', padding: '12px 16px',
              borderTop: '1px solid var(--line)', background: 'var(--surface-soft)',
              borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
              fontSize: '0.8125rem', color: 'var(--muted)',
            }}>
              <span>{statusFilter || search || dateFrom || dateTo ? 'Filtrado:' : 'Total:'}{' '}
                <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{sales.length} ventas</strong>
              </span>
              <span>Suma:{' '}
                <strong style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                  {formatCurrency(sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0))}
                </strong>
              </span>
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination">
              <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={`pagination-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="pagination-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
            </div>
          )}
        </>
      )}

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditingSale(null); }} title={editingSale ? 'Editar Venta' : 'Nueva Venta'} size="lg">
        <SaleForm sale={editingSale} onSave={handleSave} onCancel={() => { setModalOpen(false); setEditingSale(null); }} customers={customers} products={products} />
      </Modal>

      <ConfirmDialog isOpen={!!deleteConfirm} onConfirm={handleDeleteConfirm} onCancel={() => setDeleteConfirm(null)}
        title="¿Eliminar venta?" message="Esta venta será eliminada permanentemente." />
    </div>
  );
}
