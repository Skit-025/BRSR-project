import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, CheckCircle2, Clock, AlertTriangle, AlertCircle,
  Info, TrendingUp, TrendingDown, Layers, Zap, ChevronRight,
  ChevronDown, ArrowRight, ShieldCheck, BarChart3, Filter,
  RefreshCw, ExternalLink, FileText, Check, Lock, X, Search,
  FolderTree, GitCommit, FileCheck, ArrowUpRight, Leaf,
  Folder, Bell, CheckSquare, Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGroupOverview, useGroupOverviewDesign, useOrgPeriods, useOrgNodes } from '../hooks/useApi';
import DataLineageDrawer from '../components/DataLineageDrawer';
import PageHelpButton from '../components/PageHelpButton';

// ── Status Dot Helper ──
function getStatusDotColor(status) {
  const s = (status || '').toUpperCase();
  if (s.includes('APPROV') || s === 'CONSOLIDATED' || s === 'LOCKED') return '#10B981'; // Green
  if (s === 'SUBMITTED' || s.includes('REVIEW') || s === 'IN_PROGRESS') return '#F59E0B'; // Amber
  if (s === 'RETURNED' || s === 'REJECTED') return '#EF4444'; // Red
  return '#94A3B8'; // Slate/Gray
}

// ── SVG Sparkline Component ──
function Sparkline({ color = '#10B981', points = [12, 16, 14, 18, 15, 22, 26], width = 50, height = 20 }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const pathD = points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / range) * (height - 4) - 2;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── SVG Circular Gauge ──
function CircularProgressGauge({ percentage = 0, size = 52, strokeWidth = 5, color = '#10B981', trackColor = '#E2E8F0', showText = true, textColor = '#0F172A', textSize = 13, bold = true }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validPct = Math.min(Math.max(percentage || 0, 0), 100);
  const strokeDashoffset = circumference - (validPct / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      {showText && (
        <span style={{
          position: 'absolute',
          fontSize: textSize,
          fontWeight: bold ? 700 : 600,
          color: textColor,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: '-0.02em'
        }}>
          {Math.round(validPct)}%
        </span>
      )}
    </div>
  );
}

// ── SVG Donut Chart for Emissions ──
function EmissionsDonutChart({ scope1 = 0, scope2 = 0, scope3 = 0, total = 0, size = 130, strokeWidth = 18 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const s1Pct = total > 0 ? (scope1 / total) * 100 : 0;
  const s2Pct = total > 0 ? (scope2 / total) * 100 : 0;
  const s3Pct = total > 0 ? (scope3 / total) * 100 : 0;

  const s1Dash = (s1Pct / 100) * circumference;
  const s2Dash = (s2Pct / 100) * circumference;
  const s3Dash = (s3Pct / 100) * circumference;

  const s1Offset = 0;
  const s2Offset = -s1Dash;
  const s3Offset = -(s1Dash + s2Dash);

  const formattedTotal = total > 0 ? Number(total).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0';

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth={strokeWidth}
        />
        {total > 0 ? (
          <>
            {/* Scope 1: Dark Blue */}
            {s1Dash > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#1E3A8A"
                strokeWidth={strokeWidth}
                strokeDasharray={`${s1Dash} ${circumference - s1Dash}`}
                strokeDashoffset={s1Offset}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            )}
            {/* Scope 2: Blue */}
            {s2Dash > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#3B82F6"
                strokeWidth={strokeWidth}
                strokeDasharray={`${s2Dash} ${circumference - s2Dash}`}
                strokeDashoffset={s2Offset}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            )}
            {/* Scope 3: Sky Blue */}
            {s3Dash > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#93C5FD"
                strokeWidth={strokeWidth}
                strokeDasharray={`${s3Dash} ${circumference - s3Dash}`}
                strokeDashoffset={s3Offset}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            )}
          </>
        ) : (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
          />
        )}
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>
          {formattedTotal}
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748B' }}>
          tCO₂e
        </div>
      </div>
    </div>
  );
}

// ── Trend Line & Area Chart for Emissions Overview ──
function TrendAreaChart({ trendPoints = [] }) {
  const width = 230;
  const height = 95;
  const paddingLeft = 32;
  const paddingBottom = 22;
  const chartW = width - paddingLeft;
  const chartH = height - paddingBottom;

  const values = trendPoints.map(p => p.value);
  const maxVal = Math.max(...values, 100);
  const scaleMax = maxVal > 0 ? maxVal * 1.15 : 100;

  const points = trendPoints.map((pt, i) => {
    const x = paddingLeft + (i / Math.max(trendPoints.length - 1, 1)) * chartW;
    const y = chartH - (pt.value / scaleMax) * (chartH - 10);
    return { x, y, label: pt.quarter, display: pt.display_value };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${chartH} L ${points[0].x} ${chartH} Z`
    : '';

  return (
    <div style={{ width: '100%', maxWidth: width, position: 'relative' }}>
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="emissionsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Y Axis Guide Lines & Labels */}
        {[0, 0.5, 1.0].map((tick, idx) => {
          const y = chartH - tick * (chartH - 10);
          const valNum = tick * scaleMax;
          const valLabel = scaleMax >= 1000 ? `${Math.round(valNum / 1000)}K` : `${Math.round(valNum)}t`;
          return (
            <g key={idx}>
              <line x1={paddingLeft} y1={y} x2={width} y2={y} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
              <text x={paddingLeft - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94A3B8" fontWeight="500">
                {valLabel}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        {areaD && <path d={areaD} fill="url(#emissionsGrad)" />}

        {/* Line */}
        {pathD && <path d={pathD} fill="none" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />}

        {/* Marker Points & Labels */}
        {points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="#1D4ED8" stroke="#FFFFFF" strokeWidth="1.5" />
            <text x={p.x} y={p.y - 7} textAnchor="middle" fontSize="9" fontWeight="700" fill="#1E293B">
              {p.display}
            </text>
            <text x={p.x} y={height - 4} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#64748B">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Main Group Command Center Component ──
export default function GroupCommandCenter() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: periods = [] } = useOrgPeriods();
  const { data: nodes = [] } = useOrgNodes();

  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [timeToggle, setTimeToggle] = useState('THIS_YEAR');

  // Hierarchy expand / collapse state
  const [isGroupExpanded, setIsGroupExpanded] = useState(true);
  const [expandedSubs, setExpandedSubs] = useState({
    // Expand first 2 subsidiaries by default for rich live view
  });
  const [expandedBUs, setExpandedBUs] = useState({});

  // Drawer & detail inspection state
  const [lineageDrawerOpen, setLineageDrawerOpen] = useState(false);
  const [lineageMetricCode, setLineageMetricCode] = useState('ENV-GHG-001');

  // Resolve active period & root node
  const activePeriodId = selectedPeriodId || periods.find(p => p.code === 'FY2025-26-M03')?.id || periods[0]?.id;
  const rootNode = useMemo(() => {
    return nodes.find(n => n.type === 'group' || n.code === 'MEIL-GROUP') || nodes[0];
  }, [nodes]);
  const activeEntityId = selectedEntityId || rootNode?.id;

  // Fetch real database-driven group overview design
  const { data: rawOverview, isLoading, refetch, isFetching } = useGroupOverview(
    activePeriodId,
    activeEntityId
  );

  // Design payload is either in rawOverview.design or rawOverview directly
  const data = rawOverview?.design || rawOverview || {};

  // Safeguard default models to ensure continuous seamless rendering
  const kpiCompletion = data.kpi_completion || { value: 0, label: 'Reporting Completion', subtext: '0 / 0 Entities', trend: '+4%' };
  const kpiEmissions = data.kpi_emissions || { value: '0', label: 'Total Emissions ( tCO₂e )', subtext: 'Scope 1 + 2 + 3', trend: '+6%' };
  const kpiBus = data.kpi_bus || { value: 0, label: 'Business Units', subtext: 'In Group Scope', trend: '+2%' };
  const kpiProjects = data.kpi_projects || { value: 0, label: 'Projects', subtext: 'Across BUs', trend: '+3%' };
  const kpiPending = data.kpi_pending || { value: 0, label: 'Pending Approvals', subtext: 'Across 5 Levels', trend: 'Active' };

  const emissionsOverview = data.emissions_overview || {
    donut: { total_tco2e: 0, scope1: { value: 0, percentage: 0 }, scope2: { value: 0, percentage: 0 }, scope3: { value: 0, percentage: 0 } },
    trend: []
  };

  const completionGauges = data.completion_by_level || [
    { level: 'Group', percentage: 0, completed_count: 0, total_count: 1, color: '#1E3A8A' },
    { level: 'Subsidiary', percentage: 0, completed_count: 0, total_count: 0, color: '#3B82F6' },
    { level: 'BU', percentage: 0, completed_count: 0, total_count: 0, color: '#60A5FA' },
    { level: 'Project', percentage: 0, completed_count: 0, total_count: 0, color: '#F59E0B' },
  ];

  const hierarchy = data.hierarchy || { name: 'Aarohan Group', percentage: 0, completed_count: 0, total_count: 0, subsidiaries: [] };
  const subsidiaryPerf = data.subsidiary_performance || [];
  const pendingActions = data.pending_actions || [];
  const quickInsight = data.quick_insight || { text: 'Group reporting is active with live database synchronization.', status_tone: 'info' };

  const activePeriodCode = data.reporting_period || periods.find(p => p.id === activePeriodId)?.code || 'FY 2025-26 (Mar)';

  const toggleSub = (subId) => {
    setExpandedSubs(prev => ({ ...prev, [subId]: !prev[subId] }));
  };

  const toggleBU = (buId) => {
    setExpandedBUs(prev => ({ ...prev, [buId]: !prev[buId] }));
  };

  return (
    <div style={{
      background: '#F8FAFC',
      minHeight: '100vh',
      padding: '24px 32px 64px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#0F172A'
    }}>
      {/* ── Top Header Bar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20
      }}>
        <div>
          <h1 style={{
            fontSize: 26,
            fontWeight: 800,
            color: '#09090B',
            letterSpacing: '-0.025em',
            margin: 0
          }}>
            Group Overview
          </h1>
          <p style={{
            fontSize: 13.5,
            color: '#64748B',
            margin: '4px 0 0',
            fontWeight: 400
          }}>
            Track reporting progress, emissions and compliance across your group.
          </p>
        </div>

        {/* Right Header Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PageHelpButton title="Group Overview Guide" route="/dashboard" />

          {/* Period Selector Pill Matching Template */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: '6px 12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            gap: 8
          }}>
            <Calendar size={14} color="#64748B" />
            <select
              value={activePeriodId || ''}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              style={{
                appearance: 'none',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 12.5,
                fontWeight: 600,
                color: '#0F172A',
                cursor: 'pointer',
                paddingRight: 16
              }}
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code}
                </option>
              ))}
              {periods.length === 0 && <option value="">FY 2025-26 (Mar)</option>}
            </select>
            <ChevronDown size={14} color="#64748B" style={{ marginLeft: -12, pointerEvents: 'none' }} />
          </div>

          {/* Refresh Sync Button */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh database records"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '7px 11px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontWeight: 600,
              color: '#475569',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            <RefreshCw size={12} className={isFetching ? 'anim-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ── ROW 1: 5 Executive KPI Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 16,
        marginBottom: 20
      }}>
        {/* KPI 1: Reporting Completion */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <CircularProgressGauge
            percentage={kpiCompletion.value || 0}
            size={52}
            strokeWidth={5}
            color="#10B981"
            trackColor="#E2E8F0"
            showText={true}
            textSize={13}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Reporting Completion
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
              {kpiCompletion.subtext}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: kpiCompletion.value > 0 ? '#15803D' : '#64748B',
                background: kpiCompletion.value > 0 ? '#DCFCE7' : '#F1F5F9',
                padding: '2px 8px',
                borderRadius: 12
              }}>
                {kpiCompletion.value > 0 ? `${Math.round(kpiCompletion.value)}% Complete` : 'Baseline (0%)'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Emissions */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#DCFCE7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Leaf size={20} color="#16A34A" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0F172A', lineHeight: 1.2 }}>
              Total Emissions <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>( tCO₂e )</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginTop: 2, letterSpacing: '-0.02em' }}>
              {kpiEmissions.value}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#15803D',
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                padding: '1.5px 7px',
                borderRadius: 12
              }}>
                CEA / BEE Statutory Std
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Business Units */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#EFF6FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Building2 size={20} color="#2563EB" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
              Business Units
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', marginTop: 2, letterSpacing: '-0.02em' }}>
              {kpiBus.value}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: '#1D4ED8',
                background: '#EFF6FF',
                padding: '2px 8px',
                borderRadius: 12
              }}>
                {kpiBus.subtext || 'In Group Scope'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Projects */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#FAF5FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Folder size={20} color="#9333EA" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
              Projects
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', marginTop: 2, letterSpacing: '-0.02em' }}>
              {kpiProjects.value}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: '#7E22CE',
                background: '#FAF5FF',
                padding: '2px 8px',
                borderRadius: 12
              }}>
                {kpiProjects.subtext || 'Across BUs'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 5: Pending Approvals */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '16px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#FEF3C7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Clock size={20} color="#D97706" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
              Pending Approvals
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', marginTop: 2, letterSpacing: '-0.02em' }}>
              {kpiPending.value}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: Number(kpiPending.value) > 0 ? '#B45309' : '#15803D',
                background: Number(kpiPending.value) > 0 ? '#FEF3C7' : '#DCFCE7',
                padding: '2px 8px',
                borderRadius: 12
              }}>
                {kpiPending.subtext || 'Across Hierarchy'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 2: 2 Analytical Panels (Emissions Overview & Reporting Completion by Level) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.45fr 1fr',
        gap: 16,
        marginBottom: 20
      }}>
        {/* Panel A: Emissions Overview */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={17} color="#2563EB" />
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Emissions Overview
              </h2>
            </div>

            {/* Toggle Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setTimeToggle('THIS_YEAR')}
                style={{
                  background: timeToggle === 'THIS_YEAR' ? '#0F172A' : '#FFFFFF',
                  color: timeToggle === 'THIS_YEAR' ? '#FFFFFF' : '#64748B',
                  border: timeToggle === 'THIS_YEAR' ? 'none' : '1px solid #E2E8F0',
                  borderRadius: 6,
                  padding: '4px 12px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                This Year
              </button>
              <button
                onClick={() => setTimeToggle('LAST_YEAR')}
                style={{
                  background: timeToggle === 'LAST_YEAR' ? '#0F172A' : '#FFFFFF',
                  color: timeToggle === 'LAST_YEAR' ? '#FFFFFF' : '#64748B',
                  border: timeToggle === 'LAST_YEAR' ? 'none' : '1px solid #E2E8F0',
                  borderRadius: 6,
                  padding: '4px 12px',
                  fontSize: 11.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3
                }}
              >
                <span>Last Year</span>
                <ChevronDown size={12} />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 1fr',
            gap: 20,
            alignItems: 'center'
          }}>
            {/* Left: Donut Chart & Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <EmissionsDonutChart
                scope1={emissionsOverview.donut?.scope1?.value || 0}
                scope2={emissionsOverview.donut?.scope2?.value || 0}
                scope3={emissionsOverview.donut?.scope3?.value || 0}
                total={emissionsOverview.donut?.total_tco2e || 0}
                size={135}
                strokeWidth={17}
              />

              {/* Legend with exact numbers & % */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {/* Scope 1 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#1E3A8A', display: 'inline-block' }} />
                  <span style={{ color: '#475569', fontWeight: 600, width: 56 }}>Scope 1</span>
                  <span style={{ fontWeight: 700, color: '#0F172A', minWidth: 48 }}>
                    {emissionsOverview.donut?.scope1?.value > 0 ? Number(emissionsOverview.donut.scope1.value).toLocaleString() : '0'}
                  </span>
                  <span style={{ color: '#64748B', fontSize: 11, fontWeight: 500 }}>
                    {emissionsOverview.donut?.scope1?.percentage || 0}%
                  </span>
                </div>

                {/* Scope 2 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#3B82F6', display: 'inline-block' }} />
                  <span style={{ color: '#475569', fontWeight: 600, width: 56 }}>Scope 2</span>
                  <span style={{ fontWeight: 700, color: '#0F172A', minWidth: 48 }}>
                    {emissionsOverview.donut?.scope2?.value > 0 ? Number(emissionsOverview.donut.scope2.value).toLocaleString() : '0'}
                  </span>
                  <span style={{ color: '#64748B', fontSize: 11, fontWeight: 500 }}>
                    {emissionsOverview.donut?.scope2?.percentage || 0}%
                  </span>
                </div>

                {/* Scope 3 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#93C5FD', display: 'inline-block' }} />
                  <span style={{ color: '#475569', fontWeight: 600, width: 56 }}>Scope 3</span>
                  <span style={{ fontWeight: 700, color: '#0F172A', minWidth: 48 }}>
                    {emissionsOverview.donut?.scope3?.value > 0 ? Number(emissionsOverview.donut.scope3.value).toLocaleString() : '0'}
                  </span>
                  <span style={{ color: '#64748B', fontSize: 11, fontWeight: 500 }}>
                    {emissionsOverview.donut?.scope3?.percentage || 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Trend Line Chart */}
            <div style={{
              borderLeft: '1px solid #F1F5F9',
              paddingLeft: 20
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Emissions Trend
              </div>
              <TrendAreaChart trendPoints={emissionsOverview.trend || []} />
            </div>
          </div>
        </div>

        {/* Panel B: Reporting Completion by Level */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <CheckSquare size={17} color="#2563EB" />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Reporting Completion by Level
            </h2>
          </div>

          {/* 4 Circular Gauges in a Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            gap: 12,
            padding: '8px 0 4px'
          }}>
            {completionGauges.map((g, idx) => (
              <div key={idx} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <CircularProgressGauge
                  percentage={g.percentage}
                  size={64}
                  strokeWidth={5.5}
                  color={g.color || '#3B82F6'}
                  trackColor="#F1F5F9"
                  showText={true}
                  textSize={14}
                />
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', marginTop: 8 }}>
                  {g.level}
                </div>
                <div style={{ fontSize: 10.5, color: '#64748B', marginTop: 1 }}>
                  ({g.completed_count} / {g.total_count})
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW 3: 3 Bottom Panels (Hierarchy, Subsidiary Performance, Actions & Insights) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.35fr 1fr 0.85fr',
        gap: 16
      }}>
        {/* Panel 1 (Left): Organizational Hierarchy & Reporting Status */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '20px 22px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <FolderTree size={17} color="#2563EB" />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Organizational Hierarchy & Reporting Status
            </h2>
          </div>

          {/* Root Group Row */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div
                onClick={() => setIsGroupExpanded(!isGroupExpanded)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1, minWidth: 0 }}
              >
                {isGroupExpanded ? <ChevronDown size={15} color="#475569" /> : <ChevronRight size={15} color="#475569" />}
                <Building2 size={16} color="#1E3A8A" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {hierarchy.name}
                </span>
              </div>

              {/* Progress bar in center */}
              <div style={{ width: 110, height: 7, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(hierarchy.percentage || 0, 100)}%`,
                  height: '100%',
                  background: '#3B82F6',
                  borderRadius: 4,
                  transition: 'width 0.4s ease'
                }} />
              </div>

              {/* Status text */}
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>
                {Math.round(hierarchy.percentage || 0)}% Complete • {hierarchy.completed_count} / {hierarchy.total_count} Entities
              </div>
            </div>
          </div>

          {/* Expandable Subsidiaries List */}
          {isGroupExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 310, overflowY: 'auto', paddingRight: 4 }}>
              {(hierarchy.subsidiaries || []).map((sub) => {
                const isSubExp = expandedSubs[sub.id];
                const dotColor = getStatusDotColor(sub.status);

                return (
                  <div key={sub.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Subsidiary Row */}
                    <div
                      onClick={() => toggleSub(sub.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 6,
                        background: isSubExp ? '#EFF6FF' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => { if (!isSubExp) e.currentTarget.style.background = '#F8FAFC'; }}
                      onMouseLeave={(e) => { if (!isSubExp) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                        <ChevronRight
                          size={14}
                          color="#64748B"
                          style={{
                            transform: isSubExp ? 'rotate(90deg)' : 'none',
                            transition: 'transform 0.2s ease'
                          }}
                        />
                        <Building2 size={14} color="#3B82F6" />
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sub.name}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor }} />
                        <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 500 }}>
                          {Math.round(sub.percentage)}% Complete • {sub.completed_count} / {sub.total_count}
                        </span>
                      </div>
                    </div>

                    {/* Child Business Units (Indented) */}
                    {isSubExp && (
                      <div style={{ paddingLeft: 24, borderLeft: '2px solid #DBEAFE', marginLeft: 16, marginTop: 2, marginBottom: 4 }}>
                        {(sub.business_units || []).map((bu) => {
                          const isBuExp = expandedBUs[bu.id];
                          const buDotColor = getStatusDotColor(bu.status);

                          return (
                            <div key={bu.id} style={{ display: 'flex', flexDirection: 'column' }}>
                              <div
                                onClick={() => toggleBU(bu.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '6px 10px',
                                  borderRadius: 5,
                                  cursor: 'pointer',
                                  background: isBuExp ? '#F0FDF4' : 'transparent'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                                  <ChevronRight
                                    size={12}
                                    color="#94A3B8"
                                    style={{
                                      transform: isBuExp ? 'rotate(90deg)' : 'none',
                                      transition: 'transform 0.2s ease'
                                    }}
                                  />
                                  <span style={{ fontSize: 12, fontWeight: 500, color: '#334155' }}>
                                    {bu.name}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: buDotColor }} />
                                  <span style={{ fontSize: 11, color: '#64748B' }}>
                                    {Math.round(bu.percentage)}% Complete • {bu.completed_count} / {bu.total_count}
                                  </span>
                                </div>
                              </div>

                              {/* Child Projects (Indented further) */}
                              {isBuExp && (
                                <div style={{ paddingLeft: 20, borderLeft: '1px dashed #CBD5E1', marginLeft: 14, margin: '2px 0 4px' }}>
                                  {(bu.projects || []).map((prj) => (
                                    <div
                                      key={prj.id}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '4px 8px',
                                        fontSize: 11.5,
                                        color: '#475569'
                                      }}
                                    >
                                      <span>• {prj.name}</span>
                                      <span style={{
                                        fontSize: 10,
                                        fontWeight: 600,
                                        padding: '1px 6px',
                                        borderRadius: 4,
                                        background: prj.status?.includes('APPROV') ? '#DCFCE7' : '#FEF3C7',
                                        color: prj.status?.includes('APPROV') ? '#15803D' : '#B45309'
                                      }}>
                                        {prj.status}
                                      </span>
                                    </div>
                                  ))}
                                  {bu.projects?.length === 0 && (
                                    <div style={{ fontSize: 11, color: '#94A3B8', padding: '4px 8px' }}>
                                      No child projects assigned
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {sub.business_units?.length === 0 && (
                          <div style={{ fontSize: 11.5, color: '#94A3B8', padding: '4px 8px' }}>
                            No business units assigned
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel 2 (Center): Subsidiary Performance */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '20px 22px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={17} color="#2563EB" />
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Subsidiary Performance
              </h2>
            </div>
            <button
              onClick={() => navigate('/workflow')}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563EB',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}
            >
              <span>View All</span>
              <ArrowRight size={12} />
            </button>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#64748B' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#60A5FA' }} />
              <span>Completion %</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#64748B' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#A855F7' }} />
              <span>Emissions (tCO₂e)</span>
            </div>
          </div>

          {/* Combo Chart Visualization */}
          <div style={{ flex: 1, display: 'flex', position: 'relative', minHeight: 210 }}>
            {/* Left Y Axis (% Completion) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              fontSize: 10,
              fontWeight: 500,
              color: '#94A3B8',
              paddingRight: 8,
              paddingBottom: 24
            }}>
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>

            {/* Bars Column Container */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-around',
              borderBottom: '1px solid #E2E8F0',
              paddingBottom: 4,
              paddingRight: 8,
              position: 'relative'
            }}>
              {/* Horizontal Grid lines */}
              {[0, 25, 50, 75, 100].map((pct, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: `${pct}%`,
                    borderTop: '1px dashed #F1F5F9',
                    pointerEvents: 'none'
                  }}
                />
              ))}

              {/* Subsidiary Bars & Emissions Markers */}
              {(() => {
                const maxSubEmiss = Math.max(...(subsidiaryPerf || []).map(s => s.emissions_tco2e || 0), 10);
                const rightAxisMax = maxSubEmiss >= 10000 ? Math.ceil(maxSubEmiss / 10000) * 10000
                                   : maxSubEmiss >= 1000 ? Math.ceil(maxSubEmiss / 1000) * 1000
                                   : maxSubEmiss >= 100 ? Math.ceil(maxSubEmiss / 50) * 50
                                   : Math.ceil(maxSubEmiss / 10) * 10;

                return (subsidiaryPerf.slice(0, 4) || []).map((sub, idx) => {
                  const compHeight = Math.max(sub.completion_percentage, 4);
                  const emissHeight = rightAxisMax > 0 ? Math.min(Math.max((sub.emissions_tco2e / rightAxisMax) * 100, 6), 92) : 6;

                  return (
                    <div
                      key={sub.id || idx}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'relative',
                        width: 48,
                        height: '100%',
                        justifyContent: 'flex-end'
                      }}
                    >
                      {/* Floating Purple Emissions Badge scaled to Right Axis */}
                      <div style={{
                        position: 'absolute',
                        bottom: `calc(${emissHeight}% - 10px)`,
                        background: '#FAF5FF',
                        border: '1px solid #D8B4FE',
                        borderRadius: 10,
                        padding: '1px 6px',
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: '#7E22CE',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        zIndex: 3,
                        boxShadow: '0 1px 3px rgba(126,34,206,0.15)'
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#9333EA' }} />
                        <span>{sub.emissions_badge}</span>
                      </div>

                      {/* Column Bar (Light Blue) scaled to Left Axis */}
                      <div style={{
                        width: 32,
                        height: `${compHeight}%`,
                        background: '#93C5FD',
                        borderRadius: '6px 6px 0 0',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        paddingTop: 4,
                        transition: 'height 0.4s ease'
                      }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#1E3A8A' }}>
                          {Math.round(sub.completion_percentage)}%
                        </span>
                      </div>

                      {/* Short Entity Name below X axis */}
                      <div style={{
                        position: 'absolute',
                        bottom: -22,
                        fontSize: 10,
                        fontWeight: 600,
                        color: '#475569',
                        textAlign: 'center',
                        width: 58,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }} title={sub.name}>
                        {sub.short_name}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Right Y Axis (Emissions dynamically scaled) */}
            {(() => {
              const maxSubEmiss = Math.max(...(subsidiaryPerf || []).map(s => s.emissions_tco2e || 0), 10);
              const rightAxisMax = maxSubEmiss >= 10000 ? Math.ceil(maxSubEmiss / 10000) * 10000
                                 : maxSubEmiss >= 1000 ? Math.ceil(maxSubEmiss / 1000) * 1000
                                 : maxSubEmiss >= 100 ? Math.ceil(maxSubEmiss / 50) * 50
                                 : Math.ceil(maxSubEmiss / 10) * 10;

              const fmtAxis = (val) => {
                if (val >= 1000) return `${Math.round(val / 1000)}K`;
                if (val === 0) return '0';
                return `${Math.round(val)}t`;
              };

              return (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  fontSize: 10,
                  fontWeight: 500,
                  color: '#94A3B8',
                  paddingLeft: 8,
                  paddingBottom: 24
                }}>
                  <span>{fmtAxis(rightAxisMax)}</span>
                  <span>{fmtAxis(rightAxisMax * 0.75)}</span>
                  <span>{fmtAxis(rightAxisMax * 0.5)}</span>
                  <span>{fmtAxis(rightAxisMax * 0.25)}</span>
                  <span>0</span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Panel 3 (Right): Pending Actions & Quick Insights */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '20px 22px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          {/* Top Section: Pending Actions */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={17} color="#2563EB" />
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Pending Actions
                </h2>
              </div>
              <button
                onClick={() => navigate('/workflow')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <span>View All</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {/* Action Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pendingActions.map((act, idx) => {
                const isRed = act.color_type === 'red';
                const isAmber = act.color_type === 'amber';
                const isBlue = act.color_type === 'blue';

                const badgeBg = isRed ? '#FEE2E2' : (isAmber ? '#FEF3C7' : '#DBEAFE');
                const badgeColor = isRed ? '#DC2626' : (isAmber ? '#D97706' : '#2563EB');

                return (
                  <div
                    key={idx}
                    onClick={() => navigate(act.route || '/workflow')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 10px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: badgeBg,
                      color: badgeColor,
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {act.count}
                    </div>
                    <div style={{
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: '#1E293B',
                      lineHeight: 1.3
                    }}>
                      {act.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Section: Quick Insights */}
          <div style={{
            borderTop: '1px solid #F1F5F9',
            paddingTop: 16,
            marginTop: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Info size={12} color="#2563EB" />
              </div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Quick Insights
              </h3>
            </div>

            <p style={{
              fontSize: 12,
              color: '#475569',
              lineHeight: 1.45,
              margin: '0 0 8px'
            }}>
              {quickInsight.text}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => navigate('/reporting')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}
              >
                <span>View Details</span>
                <ArrowRight size={11} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Data Lineage Drawer ── */}
      <DataLineageDrawer
        isOpen={lineageDrawerOpen}
        onClose={() => setLineageDrawerOpen(false)}
        metricCode={lineageMetricCode}
        periodId={activePeriodId}
        entityId={activeEntityId}
      />
    </div>
  );
}
