/* ============================================================
   PrintFlow 3D — Login Component
   ============================================================
   Centered glassmorphism card on gradient background.
   All text in Spanish.
   ============================================================ */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Printer, User, Lock } from 'lucide-react';
import { useAuth } from '../../App.jsx';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img
            src="/logo.jpg"
            alt="ACG PRINTS 3D"
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '12px',
              objectFit: 'cover',
              border: '1px solid var(--line)',
              marginBottom: '16px'
            }}
          />
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0 }}>ACG PRINTS 3D</h1>
          <p style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>Sistema de gestión de ventas</p>
        </div>

        {/* Error */}
        {error && <div className="auth-error">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Usuario</label>
            <div className="form-input-icon">
              <User />
              <input
                type="text"
                className="form-input"
                placeholder="Tu nombre de usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div className="form-input-icon">
              <Lock />
              <input
                type="password"
                className="form-input"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className={`btn btn-primary btn-full btn-lg ${loading ? 'btn-loading' : ''}`}
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            {loading ? '' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="auth-footer">
          ¿No tienes cuenta?{' '}
          <Link to="/register">Regístrate</Link>
        </div>
      </div>
    </div>
  );
}
