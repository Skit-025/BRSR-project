import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Universal Portal-based Modal component.
 * Mounts directly to document.body via React Portal.
 * Eliminates issues with ancestor transforms, overflow, and scrolling.
 * Always renders centered in the user's active viewport without scrolling.
 */
export default function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = '560px',
  className = '',
  style = {}
}) {
  useEffect(() => {
    if (!isOpen) return;

    // Prevent body scrolling while modal is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Handle ESC key to dismiss
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`modal-dialog anim-scale ${className}`}
        style={{ maxWidth, ...style }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
