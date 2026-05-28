/* ============================================================
   PrintFlow 3D — Toast Component
   ============================================================
   Auto-dismissing toast notification with slide-in animation.

   Props:
     message : string
     type    : 'success' | 'error' | 'info'
     onClose : () => void
   ============================================================ */

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

export default function Toast({ message, type = 'info', onClose }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onClose, 200); // wait for exit animation
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(onClose, 200);
  };

  const Icon = icons[type] || Info;

  return (
    <div className={`toast toast-${type} ${exiting ? 'toast-exit' : ''}`}>
      <Icon size={20} />
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={handleClose}>
        <X size={16} />
      </button>
    </div>
  );
}
