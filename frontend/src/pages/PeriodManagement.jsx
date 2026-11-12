import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Lock,
  Unlock,
  Plus,
  X,
  Loader2,
  RefreshCw,
  Shield,
  CalendarRange,
  CalendarCheck,
  CalendarX,
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
  Sparkles,
  ChevronRight,
  ArrowLeft,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  useOrgPeriods,
  useOrgFY,
  useCreatePeriod,
  useUpdatePeriod,
  useDeletePeriod,
  useDeleteFY
} from '../hooks/useApi';

const MONTH_NAMES = [
  'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March'
];

export default function PeriodManagement() {
  const navigate = useNavigate();
  const { user, role, hasPermission } = useAuth();
  const isSystemAdmin = role === 'system_admin';
  const isAdmin = isSystemAdmin || role === 'group_admin' || role === 'subsidiary_admin' || hasPermission('period:lock');

  const { data: fyList = [], isLoading: loadingFY, refetch: refetchFY } = useOrgFY();
  const { data: periods = [], isLoading: loadingPeriods, refetch: refetchPeriods } = useOrgPeriods();

  const createPeriodMutation = useCreatePeriod();
  const updatePeriodMutation = useUpdatePeriod();
  const deletePeriodMutation = useDeletePeriod();
  const deleteFYMutation = useDeleteFY();

  const [selectedFY, setSelectedFY] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFYName, setNewFYName] = useState('');
  const [autoGenMonthly, setAutoGenMonthly] = useState(true);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }
  const [feedbackMsg, setFeedbackMsg] = useState(null); // { type: 'success'|'error', text: '' }

  // Unique sorted list of FYs
  const availableFYs = useMemo(() => {
    const set = new Set(fyList);
    periods.forEach(p => {
      if (p.financial_year) set.add(p.financial_year);
    });
    // Add default fallbacks if none exist
    if (set.size === 0) {
      set.add('2024-2025');
      set.add('2025-2026');
    }
    return Array.from(set).sort().reverse();
  }, [fyList, periods]);

  // Active selected FY
  const activeFY = selectedFY || availableFYs[0] || '2025-2026';

  // Filter periods for active FY
  const fyPeriods = useMemo(() => {
    return periods
      .filter(p => p.financial_year === activeFY)
      .sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  }, [periods, activeFY]);

  // Stats for the active FY
  const stats = useMemo(() => {
    const total = fyPeriods.length;
    const locked = fyPeriods.filter(p => p.is_locked).length;
    const open = total - locked;
    return { total, open, locked };
  }, [fyPeriods]);

  // Group periods into Quarters (Q1: Apr-Jun, Q2: Jul-Sep, Q3: Oct-Dec, Q4: Jan-Mar)
  const quarters = useMemo(() => {
    const q1 = [];
    const q2 = [];
    const q3 = [];
    const q4 = [];

    fyPeriods.forEach(p => {
      const code = p.code || '';
      if (code.includes('M01') || code.includes('M02') || code.includes('M03') || p.name?.includes('April') || p.name?.includes('May') || p.name?.includes('June')) {
        q1.push(p);
      } else if (code.includes('M04') || code.includes('M05') || code.includes('M06') || p.name?.includes('July') || p.name?.includes('August') || p.name?.includes('September')) {
        q2.push(p);
      } else if (code.includes('M07') || code.includes('M08') || code.includes('M09') || p.name?.includes('October') || p.name?.includes('November') || p.name?.includes('December')) {
        q3.push(p);
      } else {
        q4.push(p);
      }
    });

    return [
      { id: 'Q1', title: 'Q1 (Apr – Jun)', periods: q1, months: 'M01 – M03' },
      { id: 'Q2', title: 'Q2 (Jul – Sep)', periods: q2, months: 'M04 – M06' },
      { id: 'Q3', title: 'Q3 (Oct – Dec)', periods: q3, months: 'M07 – M09' },
      { id: 'Q4', title: 'Q4 (Jan – Mar)', periods: q4, months: 'M10 – M12' },
    ];
  }, [fyPeriods]);

  // Toggle single period lock
  const handleToggleLock = async (period) => {
    const newLockState = !period.is_locked;
    try {
      await updatePeriodMutation.mutateAsync({
        id: period.id,
        data: { is_locked: newLockState }
      });
      setFeedbackMsg({
        type: 'success',
        text: `Period ${period.code || period.name} is now ${newLockState ? 'LOCKED' : 'OPEN'}.`
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: `Failed to update period: ${err.response?.data?.detail || err.message}`
      });
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  // Bulk lock/unlock for active FY
  const handleBulkLock = (lock) => {
    const targetPeriods = fyPeriods.filter(p => p.is_locked !== lock);
    if (targetPeriods.length === 0) {
      setFeedbackMsg({
        type: 'info',
        text: `All periods in ${activeFY} are already ${lock ? 'locked' : 'open'}.`
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
      return;
    }

    setConfirmModal({
      title: `${lock ? 'Lock' : 'Unlock'} All Periods in FY ${activeFY}?`,
      message: `This will ${lock ? 'lock' : 'unlock'} ${targetPeriods.length} period(s). Locked periods prevent any further project ESG data submissions or modifications.`,
      confirmLabel: lock ? 'Yes, Lock All' : 'Yes, Unlock All',
      confirmColor: lock ? '#EF4444' : '#10B981',
      onConfirm: async () => {
        setConfirmModal(null);
        setBulkActionLoading(true);
        try {
          for (const p of targetPeriods) {
            await updatePeriodMutation.mutateAsync({
              id: p.id,
              data: { is_locked: lock }
            });
          }
          setFeedbackMsg({
            type: 'success',
            text: `Successfully ${lock ? 'locked' : 'unlocked'} ${targetPeriods.length} period(s) for FY ${activeFY}.`
          });
          setTimeout(() => setFeedbackMsg(null), 4000);
        } catch (err) {
          setFeedbackMsg({
            type: 'error',
            text: `Bulk action error: ${err.response?.data?.detail || err.message}`
          });
        } finally {
          setBulkActionLoading(false);
        }
      }
    });
  };

  // Handle single period deletion (System Admin only)
  const handleDeletePeriod = (period) => {
    setConfirmModal({
      title: `Delete Period ${period.code || period.name}?`,
      message: `Are you sure you want to permanently delete reporting period ${period.code || period.name}? This will remove it from active reporting cycles.`,
      confirmLabel: 'Yes, Delete Period',
      confirmColor: '#DC2626',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await deletePeriodMutation.mutateAsync(period.id);
          setFeedbackMsg({
            type: 'success',
            text: `Reporting period ${period.code || period.name} deleted successfully.`
          });
          setTimeout(() => setFeedbackMsg(null), 4000);
          refetchPeriods();
          refetchFY();
        } catch (err) {
          setFeedbackMsg({
            type: 'error',
            text: `Failed to delete period: ${err.response?.data?.detail || err.message}`
          });
        }
      }
    });
  };

  // Handle entire FY deletion (System Admin only)
  const handleDeleteFY = (fyName) => {
    setConfirmModal({
      title: `Delete Entire Financial Year ${fyName}?`,
      message: `Warning: This will delete ALL reporting periods associated with FY ${fyName}. This action is permanent and restricted to System Administrators.`,
      confirmLabel: `Yes, Delete All of FY ${fyName}`,
      confirmColor: '#DC2626',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await deleteFYMutation.mutateAsync(fyName);
          setFeedbackMsg({
            type: 'success',
            text: `Financial Year ${fyName} and all its periods were deleted successfully.`
          });
          setSelectedFY(null);
          setTimeout(() => setFeedbackMsg(null), 4000);
          refetchFY();
          refetchPeriods();
        } catch (err) {
          setFeedbackMsg({
            type: 'error',
            text: `Failed to delete FY: ${err.response?.data?.detail || err.message}`
          });
        }
      }
    });
  };

  // Handle FY Creation
  const handleCreateFY = async (e) => {
    e.preventDefault();
    const cleanName = newFYName.trim();
    if (!cleanName) return;

    try {
      await createPeriodMutation.mutateAsync({
        financial_year: cleanName,
        create_monthly_periods: autoGenMonthly,
        is_locked: false
      });
      setSelectedFY(cleanName);
      setIsCreateModalOpen(false);
      setNewFYName('');
      setFeedbackMsg({
        type: 'success',
        text: `Financial Year ${cleanName} created with ${autoGenMonthly ? '12 monthly periods' : 'default settings'}!`
      });
      setTimeout(() => setFeedbackMsg(null), 4000);
      refetchFY();
      refetchPeriods();
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: `Failed to create FY: ${err.response?.data?.detail || err.message}`
      });
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  // Quick FY suggestions
  const suggestedFYs = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const suggestions = [];
    for (let y = currentYear - 1; y <= currentYear + 2; y++) {
      const fyStr = `${y}-${y + 1}`;
      if (!availableFYs.includes(fyStr)) {
        suggestions.push(fyStr);
      }
    }
    return suggestions;
  }, [availableFYs]);

  // Preview generated codes for new FY
  const previewFYCodes = useMemo(() => {
    const name = newFYName.trim();
    if (!name || !name.includes('-')) return [];
    const parts = name.split('-');
    const startY = parseInt(parts[0], 10);
    const endY = parseInt(parts[1], 10);
    if (isNaN(startY) || isNaN(endY)) return [];

    const shortEnd = String(endY).slice(-2);
    return MONTH_NAMES.map((m, idx) => {
      const mNum = idx + 1;
      const mCode = `M${String(mNum).padStart(2, '0')}`;
      const calYear = idx < 9 ? startY : endY;
      return {
        code: `FY${startY}-${shortEnd}-${mCode}`,
        name: `${m} ${calYear}`,
        month: m,
        year: calYear
      };
    });
  }, [newFYName]);

  if (!isAdmin) {
    return (
      <div style={{
        padding: '60px 24px',
        maxWidth: 640,
        margin: '0 auto',
        textAlign: 'center',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: '#FEE2E2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          color: '#DC2626'
        }}>
          <Shield size={32} />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
          Administrator Access Required
        </h2>
        <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
          Reporting Period &amp; Financial Year governance is restricted to <strong>Group Admins</strong> and <strong>System Admins</strong>. Please contact your ESG Administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="page-content anim-fade-up" style={{
      maxWidth: 1560,
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      {/* ── Top Header Bar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexDirection: 'column' }}>
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              fontSize: 13,
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#475569'; }}
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CalendarRange size={20} />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Period &amp; FY Governance
              </h1>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                background: '#F1F5F9',
                color: '#475569',
                border: '1px solid #E2E8F0'
              }}>
                Indian FY (Apr–Mar)
              </span>
            </div>
            <p style={{ fontSize: 13.5, color: '#64748B', margin: 0 }}>
              Control monthly reporting period locks and schedule new Financial Years for SEBI BRSR compliance.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => { refetchFY(); refetchPeriods(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 8,
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              fontSize: 13,
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            title="Refresh periods"
          >
            <RefreshCw size={14} className={loadingPeriods ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              background: '#0F172A',
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              color: '#FFFFFF',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
              transition: 'background 0.15s'
            }}
          >
            <Plus size={16} />
            <span>Create New FY</span>
          </button>
        </div>
      </div>

      {/* ── Feedback Banner ── */}
      {feedbackMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          borderRadius: 8,
          marginBottom: 20,
          fontSize: 13.5,
          fontWeight: 500,
          background: feedbackMsg.type === 'success' ? '#ECFDF5' : feedbackMsg.type === 'error' ? '#FEF2F2' : '#F0F9FF',
          border: `1px solid ${feedbackMsg.type === 'success' ? '#A7F3D0' : feedbackMsg.type === 'error' ? '#FECACA' : '#BAE6FD'}`,
          color: feedbackMsg.type === 'success' ? '#065F46' : feedbackMsg.type === 'error' ? '#991B1B' : '#0369A1'
        }}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span style={{ flex: 1 }}>{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 2 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Main Layout: FY Selector Sidebar + Content Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}>
        {/* ── FY Sidebar ── */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            color: '#94A3B8',
            letterSpacing: '0.05em',
            marginBottom: 12,
            paddingLeft: 4
          }}>
            Financial Years
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {availableFYs.map(fy => {
              const isSelected = fy === activeFY;
              const fyItemCount = periods.filter(p => p.financial_year === fy).length;
              const fyLockedCount = periods.filter(p => p.financial_year === fy && p.is_locked).length;

              return (
                <button
                  key={fy}
                  onClick={() => setSelectedFY(fy)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: isSelected ? '#F1F5F9' : 'transparent',
                    border: isSelected ? '1px solid #CBD5E1' : '1px solid transparent',
                    color: isSelected ? '#0F172A' : '#475569',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: 13,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={15} color={isSelected ? '#4F46E5' : '#94A3B8'} />
                    <span>FY {fy}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {fyLockedCount === fyItemCount && fyItemCount > 0 ? (
                      <span title="All periods locked" style={{ color: '#EF4444' }}>
                        <Lock size={12} />
                      </span>
                    ) : fyLockedCount > 0 ? (
                      <span style={{ fontSize: 11, color: '#F59E0B', fontFamily: 'monospace' }}>
                        {fyLockedCount}/{fyItemCount}
                      </span>
                    ) : (
                      <span title="All periods open" style={{ color: '#10B981' }}>
                        <Unlock size={12} />
                      </span>
                    )}
                    <ChevronRight size={13} color={isSelected ? '#0F172A' : '#CBD5E1'} />
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 10px',
                borderRadius: 7,
                border: '1px dashed #CBD5E1',
                background: '#F8FAFC',
                color: '#475569',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Plus size={13} />
              <span>Add Another FY</span>
            </button>
          </div>
        </div>

        {/* ── Period Management Panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Active FY Stats & Bulk Controls Bar */}
          <div style={{
            background: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E2E8F0',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Governance Scope
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                Financial Year {activeFY}
              </div>
              <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>
                Standard: 1 April {activeFY.split('-')[0]} – 31 March {activeFY.split('-')[1] || parseInt(activeFY.split('-')[0]) + 1}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              {/* Stat Counters */}
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'center', minWidth: 60 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', fontFamily: 'JetBrains Mono, monospace' }}>
                    {stats.total}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Total</div>
                </div>
                <div style={{ height: 32, width: 1, background: '#E2E8F0' }} />
                <div style={{ textAlign: 'center', minWidth: 60 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#10B981', fontFamily: 'JetBrains Mono, monospace' }}>
                    {stats.open}
                  </div>
                  <div style={{ fontSize: 11, color: '#059669', fontWeight: 600 }}>Open</div>
                </div>
                <div style={{ height: 32, width: 1, background: '#E2E8F0' }} />
                <div style={{ textAlign: 'center', minWidth: 60 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#EF4444', fontFamily: 'JetBrains Mono, monospace' }}>
                    {stats.locked}
                  </div>
                  <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>Locked</div>
                </div>
              </div>

              {/* Bulk Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderLeft: '1px solid #E2E8F0', paddingLeft: 20 }}>
                <button
                  disabled={bulkActionLoading || stats.total === 0}
                  onClick={() => handleBulkLock(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 12px',
                    borderRadius: 7,
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: bulkActionLoading || stats.total === 0 ? 'not-allowed' : 'pointer',
                    opacity: bulkActionLoading || stats.total === 0 ? 0.6 : 1
                  }}
                  title="Lock all monthly reporting periods in this FY"
                >
                  <Lock size={13} />
                  <span>Lock All FY</span>
                </button>

                <button
                  disabled={bulkActionLoading || stats.total === 0}
                  onClick={() => handleBulkLock(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 12px',
                    borderRadius: 7,
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    color: '#059669',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: bulkActionLoading || stats.total === 0 ? 'not-allowed' : 'pointer',
                    opacity: bulkActionLoading || stats.total === 0 ? 0.6 : 1
                  }}
                  title="Unlock all monthly reporting periods in this FY"
                >
                  <Unlock size={13} />
                  <span>Unlock All FY</span>
                </button>

                {isSystemAdmin && (
                  <button
                    disabled={bulkActionLoading || stats.total === 0}
                    onClick={() => handleDeleteFY(activeFY)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 12px',
                      borderRadius: 7,
                      background: '#FFF1F2',
                      border: '1px solid #FECDD3',
                      color: '#E11D48',
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: bulkActionLoading || stats.total === 0 ? 'not-allowed' : 'pointer',
                      opacity: bulkActionLoading || stats.total === 0 ? 0.6 : 1
                    }}
                    title={`Permanently delete entire Financial Year ${activeFY} and all its periods`}
                  >
                    <Trash2 size={13} />
                    <span>Delete FY</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quarter-Grouped Grid */}
          {loadingPeriods ? (
            <div style={{
              padding: 48,
              textAlign: 'center',
              background: '#FFFFFF',
              borderRadius: 12,
              border: '1px solid #E2E8F0',
              color: '#64748B'
            }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px' }} />
              <div>Loading reporting periods for FY {activeFY}...</div>
            </div>
          ) : fyPeriods.length === 0 ? (
            <div style={{
              padding: '40px 24px',
              textAlign: 'center',
              background: '#FFFFFF',
              borderRadius: 12,
              border: '1px dashed #CBD5E1'
            }}>
              <CalendarX size={36} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
                No Reporting Periods Found for FY {activeFY}
              </h3>
              <p style={{ fontSize: 13, color: '#64748B', maxWidth: 440, margin: '0 auto 16px' }}>
                This Financial Year does not have any monthly periods configured yet. Generate the standard 12 Indian FY monthly periods in one click.
              </p>
              <button
                onClick={() => {
                  setNewFYName(activeFY);
                  setAutoGenMonthly(true);
                  setIsCreateModalOpen(true);
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Auto-Generate 12 Months for FY {activeFY}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {quarters.map(q => {
                if (q.periods.length === 0) return null;
                return (
                  <div
                    key={q.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 12,
                      border: '1px solid #E2E8F0',
                      overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    {/* Quarter Header */}
                    <div style={{
                      padding: '12px 20px',
                      background: '#F8FAFC',
                      borderBottom: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 5,
                          background: '#E2E8F0',
                          color: '#0F172A',
                          fontFamily: 'JetBrains Mono, monospace'
                        }}>
                          {q.id}
                        </span>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0F172A' }}>
                          {q.title}
                        </span>
                        <span style={{ fontSize: 11.5, color: '#64748B' }}>
                          ({q.periods.length} {q.periods.length === 1 ? 'period' : 'periods'})
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        {q.periods.every(p => p.is_locked) ? (
                          <span style={{ color: '#DC2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Lock size={12} /> Quarter Locked
                          </span>
                        ) : q.periods.every(p => !p.is_locked) ? (
                          <span style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Unlock size={12} /> Quarter Open
                          </span>
                        ) : (
                          <span style={{ color: '#D97706', fontWeight: 600 }}>
                            Partially Locked
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quarter Period Cards Grid */}
                    <div style={{
                      padding: 16,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: 12
                    }}>
                      {q.periods.map(period => {
                        const isLocked = period.is_locked;
                        return (
                          <div
                            key={period.id}
                            style={{
                              padding: '14px 16px',
                              borderRadius: 10,
                              background: isLocked ? '#FDF8F8' : '#F8FAFC',
                              border: `1px solid ${isLocked ? '#FECACA' : '#E2E8F0'}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{
                                  fontSize: 12,
                                  fontWeight: 800,
                                  fontFamily: 'JetBrains Mono, monospace',
                                  color: '#0F172A'
                                }}>
                                  {period.code || 'M--'}
                                </span>
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  background: isLocked ? '#FEE2E2' : '#DCFCE7',
                                  color: isLocked ? '#991B1B' : '#166534',
                                  textTransform: 'uppercase'
                                }}>
                                  {isLocked ? 'Locked' : 'Open'}
                                </span>
                              </div>

                              <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                                {period.name || 'Monthly Period'}
                              </div>

                              {(period.start_date || period.end_date) && (
                                <div style={{ fontSize: 11, color: '#64748B', marginTop: 3, fontFamily: 'monospace' }}>
                                  {period.start_date || '—'} → {period.end_date || '—'}
                                </div>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <button
                                onClick={() => handleToggleLock(period)}
                                disabled={updatePeriodMutation.isLoading}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '6px 12px',
                                  borderRadius: 7,
                                  background: '#FFFFFF',
                                  border: `1px solid ${isLocked ? '#FCA5A5' : '#86EFAC'}`,
                                  color: isLocked ? '#DC2626' : '#059669',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = isLocked ? '#FEF2F2' : '#ECFDF5';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#FFFFFF';
                                }}
                                title={isLocked ? 'Click to Unlock period for data entry' : 'Click to Lock period to prevent changes'}
                              >
                                {isLocked ? (
                                  <>
                                    <Unlock size={13} />
                                    <span>Unlock</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock size={13} />
                                    <span>Lock</span>
                                  </>
                                )}
                              </button>

                              {isSystemAdmin && (
                                <button
                                  onClick={() => handleDeletePeriod(period)}
                                  disabled={deletePeriodMutation.isLoading}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '6px 8px',
                                    borderRadius: 7,
                                    background: '#FFFFFF',
                                    border: '1px solid #FECACA',
                                    color: '#DC2626',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#FEF2F2';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#FFFFFF';
                                  }}
                                  title={`Permanently delete ${period.code || period.name}`}
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Create New FY Modal ── */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 14,
            width: '100%',
            maxWidth: 620,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            padding: '24px 28px',
            position: 'relative'
          }}>
            <button
              onClick={() => setIsCreateModalOpen(false)}
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8',
                padding: 4
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CalendarRange size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Create Financial Year
                </h3>
                <p style={{ fontSize: 12.5, color: '#64748B', margin: 0 }}>
                  Configure a new fiscal reporting cycle for your organization
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateFY} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* FY Name Input */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Financial Year Name (Format: YYYY-YYYY)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2026-2027"
                  value={newFYName}
                  onChange={(e) => setNewFYName(e.target.value)}
                  pattern="[0-9]{4}-[0-9]{4}"
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                    fontFamily: 'JetBrains Mono, monospace',
                    fontWeight: 600,
                    color: '#0F172A',
                    boxSizing: 'border-box'
                  }}
                />

                {/* Quick suggestions */}
                {suggestedFYs.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Quick Select:</span>
                    {suggestedFYs.map(s => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setNewFYName(s)}
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #E2E8F0',
                          padding: '3px 8px',
                          borderRadius: 5,
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#475569',
                          cursor: 'pointer'
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Explanatory Info Card */}
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '12px 14px',
                display: 'flex',
                gap: 10,
                fontSize: 12.5,
                color: '#475569',
                lineHeight: 1.5
              }}>
                <Info size={18} color="#6366F1" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong>Standard Indian Fiscal Year:</strong> Begins on <strong>1 April</strong> and ends on <strong>31 March</strong> the following year. This aligns with SEBI BRSR Core and MCA statutory filing periods.
                </div>
              </div>

              {/* Auto-generate monthly periods toggle */}
              <div style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
                onClick={() => setAutoGenMonthly(p => !p)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    checked={autoGenMonthly}
                    onChange={(e) => setAutoGenMonthly(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#16A34A', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                      Auto-generate all 12 monthly periods (Recommended)
                    </div>
                    <div style={{ fontSize: 11.5, color: '#15803D' }}>
                      Creates FY codes (FY{newFYName ? newFYName.slice(0, 4) + '-' + newFYName.slice(7) : 'YYYY-YY'}-M01 to M12) with accurate start &amp; end calendar dates.
                    </div>
                  </div>
                </div>
                <Sparkles size={18} color="#16A34A" />
              </div>

              {/* Preview of 12 generated periods */}
              {autoGenMonthly && previewFYCodes.length === 12 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8 }}>
                    Period Preview ({previewFYCodes.length} periods will be initialized):
                  </div>
                  <div style={{
                    maxHeight: 160,
                    overflowY: 'auto',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: 8,
                    background: '#FAFAFA',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 6
                  }}>
                    {previewFYCodes.map(p => (
                      <div key={p.code} style={{
                        padding: '5px 8px',
                        background: '#FFFFFF',
                        borderRadius: 5,
                        border: '1px solid #E2E8F0',
                        fontSize: 11,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#0F172A' }}>{p.code}</span>
                        <span style={{ color: '#64748B' }}>{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPeriodMutation.isLoading || !newFYName.trim()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    borderRadius: 8,
                    background: '#0F172A',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#FFFFFF',
                    cursor: createPeriodMutation.isLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {createPeriodMutation.isLoading && <Loader2 size={14} className="animate-spin" />}
                  <span>Initialize Financial Year</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      {confirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: 20
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 12,
            width: '100%',
            maxWidth: 480,
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            position: 'relative'
          }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
              {confirmModal.title}
            </h3>
            <p style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.5, margin: '0 0 20px' }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 7,
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                style={{
                  padding: '8px 16px',
                  borderRadius: 7,
                  background: confirmModal.confirmColor || '#0F172A',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#FFFFFF',
                  cursor: 'pointer'
                }}
              >
                {confirmModal.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
