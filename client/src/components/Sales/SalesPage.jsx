/* ============================================================
   PrintFlow 3D — Sales Page Component
   ============================================================
   Full CRUD for sales with filtering, pagination, and modals.
   ============================================================ */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ShoppingCart,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../utils/api.js';
import { useToast } from '../../App.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { SALE_STATUSES, STATUS_COLORS, getStatusLabel } from '../../utils/constants.js';
import Modal from '../UI/Modal.jsx';
import ConfirmDialog from '../UI/ConfirmDialog.jsx';
import SaleForm from './SaleForm.jsx';

const PAGE_SIZE = 10;

export default function SalesPage() {
  const toast = useToast();

  // Data state
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [page, setPage] = useState(1);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Fetch sales
  const fetchSales = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      const query = params.toString();
      const res = await api.get(`/api/sales${query ? `?${query}` : ''}`);
      setSales(Array.isArray(res) ? res : res?.data || res?.sales || []);
    } catch (err) {
      toast.error('Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, dateFrom, dateTo]);

  // Fetch customers & products for the form
  const fetchFormData = useCallback(async () => {
    try {
      const [cRes, pRes] = await Promise.allSettled([
        api.get('/api/customers'),
        api.get('/api/products'),
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
    fetchSales();
    fetchFormData();
  }, [fetchSales, fetchFormData]);

  // Paginated data
  const totalPages = Math.max(1, Math.ceil(sales.length / PAGE_SIZE));
  const paginatedSales = sales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [statusFilter, search, dateFrom, dateTo]);

  // Handlers
  const handleCreate = () => {
    setEditingSale(null);
    setModalOpen(true);
  };

  const handleEdit = (sale) => {
    setEditingSale(sale);
    setModalOpen(true);
  };

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
    } catch (err) {
      toast.error(err.message || 'Error al eliminar la venta');
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Ventas</h1>
          <p>Gestiona todas tus ventas y pedidos</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}>
          <Plus size={18} />
          Nueva Venta
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search />
          <input
            className="form-input"
            placeholder="Buscar por cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ maxWidth: 180 }}
        >
          <option value="">Todos los estados</option>
          {SALE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <input
          type="date"
          className="form-input"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="Desde"
          style={{ maxWidth: 170 }}
        />
        <input
          type="date"
          className="form-input"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="Hasta"
          style={{ maxWidth: 170 }}
        />
      </div>

      {/* Table or Empty */}
      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : sales.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <ShoppingCart size={36} />
          </div>
          <h3>Sin ventas</h3>
          <p>Aún no tienes ventas registradas. Crea tu primera venta para comenzar.</p>
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
                    ? `${firstItem?.product?.name || firstItem?.productName || 'Producto'} +${itemCount - 1}`
                    : (firstItem?.product?.name || firstItem?.productName || `${itemCount} producto(s)`);

                  return (
                    <tr key={saleId}>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td>{formatDate(sale.date || sale.createdAt)}</td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {sale.customer?.name || sale.customerName || '—'}
                      </td>
                      <td>{productDisplay}</td>
                      <td style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
                        {formatCurrency(sale.total)}
                      </td>
                      <td>
                        <span className={`badge badge-${sale.status}`}>
                          <span className="badge-dot" />
                          {getStatusLabel(sale.status)}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn edit"
                            title="Editar"
                            onClick={() => handleEdit(sale)}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="action-btn delete"
                            title="Eliminar"
                            onClick={() => setDeleteConfirm(sale)}
                          >
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-btn"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`pagination-btn ${p === page ? 'active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="pagination-btn"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingSale(null); }}
        title={editingSale ? 'Editar Venta' : 'Nueva Venta'}
        size="lg"
      >
        <SaleForm
          sale={editingSale}
          onSave={handleSave}
          onCancel={() => { setModalOpen(false); setEditingSale(null); }}
          customers={customers}
          products={products}
        />
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
        title="¿Eliminar venta?"
        message="Esta venta será eliminada permanentemente. Esta acción no se puede deshacer."
      />
    </div>
  );
}
