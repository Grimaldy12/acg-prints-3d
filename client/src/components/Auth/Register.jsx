/* ============================================================
   PrintFlow 3D — Register Component
   ============================================================ */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Printer, User, Lock, UserPlus } from 'lucide-react';
import { useAuth } from '../../App.jsx';

export default function Register() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !username.trim() || !password || !confirmPassword) {
      setError('Por favor completa todos los campos.');
      return;
    }

    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await register(name.trim(), username.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta. Intenta con otro nombre de usuario.');
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
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid rgba(0, 212, 170, 0.4)',
              boxShadow: '0 0 20px rgba(0, 212, 170, 0.3)',
              marginBottom: '16px'
            }}
          />
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: 0 }}>ACG PRINTS 3D</h1>
          <p style={{ marginTop: '4px', color: 'var(--text-secondary)' }}>Crea tu cuenta para comenzar</p>
        </div>

        {/* Error */}
        {error && <div className="auth-error">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre completo</label>
            <div className="form-input-icon">
              <UserPlus />
              <input
                type="text"
                className="form-input"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Usuario</label>
            <div className="form-input-icon">
              <User />
              <input
                type="text"
                className="form-input"
                placeholder="Elige un nombre de usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
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
                placeholder="Crea una contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirmar contraseña</label>
            <div className="form-input-icon">
              <Lock />
              <input
                type="password"
                className="form-input"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className={`btn btn-primary btn-full btn-lg ${loading ? 'btn-loading' : ''}`}
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            {loading ? '' : 'Crear Cuenta'}
          </button>
        </form>

        <div className="auth-footer">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login">Inicia sesión</Link>
        </div>
      </div>
    </div>
  );
}
