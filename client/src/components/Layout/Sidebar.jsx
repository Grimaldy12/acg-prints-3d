import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Printer, LayoutDashboard, ShoppingCart, Package,
  Users, Receipt, LogOut, ClipboardList, Sun, Moon, FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../../App.jsx';
import { useTheme } from '../../App.jsx';

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard',  end: true },
  { to: '/pedidos',   icon: ClipboardList,   label: 'Pedidos' },
  { to: '/ventas',    icon: ShoppingCart,    label: 'Ventas' },
  { to: '/productos', icon: Package,         label: 'Productos' },
  { to: '/clientes',  icon: Users,           label: 'Clientes' },
  { to: '/gastos',    icon: Receipt,         label: 'Gastos' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : 'AP';

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <img src="/logo.jpg" alt="ACG PRINTS 3D" />
          <div>
            <div className="sidebar-logo-text">ACG PRINTS 3D</div>
            <div className="sidebar-logo-sub">Gestor de Ventas</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">Menú principal</div>
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Toggle tema */}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          <span>{theme === 'light' ? 'Modo oscuro' : 'Modo claro'}</span>
        </button>

        {/* Usuario */}
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || 'Usuario'}</div>
            <div className="sidebar-user-role">Administrador</div>
          </div>
          <button className="sidebar-logout" onClick={logout} title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
