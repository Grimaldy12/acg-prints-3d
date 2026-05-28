/* ============================================================
   PrintFlow 3D — Confirm Dialog Component
   ============================================================
   Modal confirmation dialog with warning icon.

   Props:
     isOpen    : boolean
     onConfirm : () => void
     onCancel  : () => void
     title     : string
     message   : string
   ============================================================ */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal.jsx';

export default function ConfirmDialog({ isOpen, onConfirm, onCancel, title, message }) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="" size="sm">
      <div className="confirm-dialog">
        <div className="confirm-icon">
          <AlertTriangle size={28} />
        </div>
        <h3 className="confirm-title">{title || '¿Estás seguro?'}</h3>
        <p className="confirm-message">
          {message || 'Esta acción no se puede deshacer.'}
        </p>
        <div className="confirm-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </Modal>
  );
}
