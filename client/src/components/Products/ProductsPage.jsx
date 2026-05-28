import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Package, Filter, Clock, DollarSign, Layers } from 'lucide-react';
import { api } from '../../utils/api';
import { formatCurrency } from '../../utils/formatters';
import { PRODUCT_CATEGORIES, getCategoryLabel } from '../../utils/constants';
import { useToast } from '../../App';
import Modal from '../UI/Modal';
import ConfirmDialog from '../UI/ConfirmDialog';
import ProductForm from './ProductForm';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(null);

  const toast = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
      // Query parameters could be implemented later, but let's do simple list and filter client-side or build query
      const url = selectedCategory !== 'all' 
        ? `/api/products?search=${encodeURIComponent(search)}` 
        : `/api/products?search=${encodeURIComponent(search)}`;
      const data = await api.get(url);
      setProducts(data.data || data);
    } catch (err) {
      toast.error('Error al cargar productos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Reload when search or category filters change
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  async function handleCreateOrUpdate(formData) {
    try {
      if (editingProduct) {
        await api.put(`/api/products/${editingProduct.id}`, formData);
        toast.success('Producto actualizado exitosamente.');
      } else {
        await api.post('/api/products', formData);
        toast.success('Producto registrado exitosamente.');
      }
      setIsFormOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      toast.error('Error al guardar producto: ' + err.message);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingProduct) return;
    try {
      await api.delete(`/api/products/${deletingProduct.id}`);
      toast.success('Producto eliminado exitosamente.');
      setIsConfirmOpen(false);
      setDeletingProduct(null);
      fetchProducts();
    } catch (err) {
      toast.error('Error al eliminar producto: ' + err.message);
    }
  }

  // Filter products client-side for category if not already filtered
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesCategory;
  });

  return (
    <div className="products-page page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Productos</h1>
          <p className="page-subtitle">
            Gestiona tu catálogo, costos de filamento y precios de venta
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingProduct(null);
          setIsFormOpen(true);
        }}>
          <Plus size={18} /> Nuevo Producto
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar" style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div className="search-input-wrapper" style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '42px', width: '100%', boxSizing: 'border-box' }}
            placeholder="Buscar por nombre o descripción..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="category-select-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} style={{ color: 'var(--color-text-muted)' }} />
          <select
            className="form-select"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{ minWidth: '160px' }}
          >
            <option value="all">Todas las categorías</option>
            {PRODUCT_CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <span className="spin-icon" style={{ fontSize: '24px' }}>⏳</span>
          <span style={{ marginLeft: '12px', color: 'var(--color-text-secondary)' }}>Cargando catálogo de productos...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state" style={{
          textAlign: 'center',
          padding: '60px 24px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed rgba(255, 255, 255, 0.1)'
        }}>
          <Package size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>No se encontraron productos</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
            {search || selectedCategory !== 'all' 
              ? 'Prueba ajustando los filtros de búsqueda.'
              : 'Empieza agregando tu primer diseño 3D al catálogo.'}
          </p>
          {!search && selectedCategory === 'all' && (
            <button className="btn btn-primary btn-sm" onClick={() => setIsFormOpen(true)}>
              <Plus size={16} /> Crear Producto
            </button>
          )}
        </div>
      ) : (
        <div className="product-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {filteredProducts.map(p => {
            const margin = p.sale_price > 0 
              ? (((p.sale_price - p.material_cost) / p.sale_price) * 100).toFixed(0)
              : 0;
            return (
              <div key={p.id} className="product-card card" style={{
                backgroundColor: 'var(--color-bg-card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s, box-shadow 0.2s',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span className="badge" style={{
                    fontSize: '0.75rem',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'rgba(0, 212, 170, 0.1)',
                    color: 'var(--color-accent)',
                    fontWeight: '600'
                  }}>
                    {getCategoryLabel(p.category)}
                  </span>
                  
                  {p.stock > 0 ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Layers size={14} /> Stock: <strong>{p.stock}</strong>
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-danger)', fontWeight: '600' }}>
                      Sin stock
                    </span>
                  )}
                </div>

                <div style={{ flex: '1', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-text-primary)', marginBottom: '6px' }}>{p.name}</h3>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', lineHeight: '1.4', minHeight: '38px' }}>
                    {p.description || 'Sin descripción'}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>Costo Material</span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--color-text-secondary)' }}>
                        {formatCurrency(p.material_cost)}
                        {p.weight_g > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: '400', marginLeft: '4px' }}>({p.weight_g}g)</span>}
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>Margen (Ganancia)</span>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--color-success)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span>+{formatCurrency(p.sale_price - p.material_cost)}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: '500', color: Number(margin) >= 50 ? 'var(--color-success)' : 'var(--color-warning)' }}>({margin}% margen)</span>
                      </strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px dashed rgba(255,255,255,0.03)', paddingTop: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>Tiempo Impresión</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} style={{ color: 'var(--color-text-muted)' }} /> {p.print_time_minutes ? `${Math.floor(p.print_time_minutes / 60)}h ${p.print_time_minutes % 60}m` : '—'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>Precio Venta</span>
                      <strong style={{ fontSize: '1.25rem', color: 'var(--color-accent)', fontWeight: '700' }}>{formatCurrency(p.sale_price)}</strong>
                    </div>
                  </div>
                </div>

                <div className="card-actions" style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  paddingTop: '12px'
                }}>
                  <button className="btn-icon" title="Editar" onClick={() => {
                    setEditingProduct(p);
                    setIsFormOpen(true);
                  }}>
                    <Edit2 size={15} />
                  </button>
                  <button className="btn-icon danger" title="Eliminar" onClick={() => {
                    setDeletingProduct(p);
                    setIsConfirmOpen(true);
                  }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProduct(null);
        }}
        title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
        size="md"
      >
        <ProductForm
          product={editingProduct}
          onSave={handleCreateOrUpdate}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingProduct(null);
          }}
        />
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="¿Eliminar Producto?"
        message={`¿Estás seguro de que quieres eliminar el producto "${deletingProduct?.name}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setIsConfirmOpen(false);
          setDeletingProduct(null);
        }}
      />
    </div>
  );
}
