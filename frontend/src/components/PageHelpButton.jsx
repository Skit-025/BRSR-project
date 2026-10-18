import React from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

/**
 * Reusable in-page '?' Help button for feature headers.
 * Clicking it opens the comprehensive SEBI Feature Guide & User Manual for the current page.
 */
export default function PageHelpButton({ title = 'Page Guide', route, style = {} }) {
  const location = useLocation();
  const targetRoute = route || location.pathname;

  const handleOpen = () => {
    window.dispatchEvent(
      new CustomEvent('open-feature-guide', {
        detail: { route: targetRoute }
      })
    );
  };

  return (
    <button
      onClick={handleOpen}
      type="button"
      className="page-help-trigger-btn"
      title={`Open Statutory Guide & Task Manual for this page (?)`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: '#EFF6FF',
        color: '#1D4ED8',
        border: '1px solid #BFDBFE',
        padding: '5px 12px',
        borderRadius: '7px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(29, 78, 216, 0.06)',
        transition: 'all 0.15s ease',
        ...style
      }}
    >
      <div
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: '#2563EB',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10.5px',
          fontWeight: 800,
          flexShrink: 0
        }}
      >
        ?
      </div>
      <span>{title}</span>
    </button>
  );
}
