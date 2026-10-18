import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, ChevronRight, Plus, Calendar, Layers, 
  Globe, AlertCircle, CheckCircle2, X, RefreshCw, Filter, Search, Lock, Unlock,
  Info, Eye, ExternalLink, ShieldCheck, Clock, FileText, Edit3, ShieldAlert, Sparkles,
  Trash2, User, ArrowRight, ArrowLeft, Factory, HardHat, MapPin, Check, PenLine
} from 'lucide-react';
import { useOrgNodes, useOrgPeriods, useCreateNode, useCreatePeriod, useUpdateNode, useUpdatePeriod, useDeleteNode } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';
import Modal from '../components/Modal';
import PageHelpButton from '../components/PageHelpButton';

const NODE_TYPES = [
  { value: 'group', label: 'Group (Level 1 Root)', cls: 'badge-brand', tier: 1 },
  { value: 'subsidiary', label: 'Subsidiary (Level 2)', cls: 'badge-emerald', tier: 2 },
  { value: 'company', label: 'Subsidiary Company (Level 2)', cls: 'badge-emerald', tier: 2 },
  { value: 'business_unit', label: 'Business Unit / BU (Level 3)', cls: 'badge-indigo', tier: 3 },
  { value: 'project', label: 'Project (Level 4 - Operational)', cls: 'badge-purple', tier: 4 },
];

const MEIL_SUBSIDIARY_TYPES = [
  { value: 'ev_mobility', label: 'Electric Mobility & EV Buses (Olectra Greentech)' },
  { value: 'hydrocarbon_cgd', label: 'Hydrocarbons & City Gas Distribution (Megha City Gas / Drillmec / Petreven)' },
  { value: 'water_irrigation', label: 'Water Infrastructure & Lift Irrigation (Kaleshwaram / Mission Bhagiratha)' },
  { value: 'renewable_energy', label: 'Renewable Energy, Solar PV & Wind Power' },
  { value: 'transport_infra', label: 'Highways, Roads & High-Altitude Tunnels (Zojila Tunnel / Char Dham)' },
  { value: 'telecom_defence', label: 'Telecom Networks & Defence Systems (Icomm Tele)' },
  { value: 'heavy_engineering', label: 'Heavy Engineering & Industrial Manufacturing' },
  { value: 'corporate_holding', label: 'Corporate Holding & Infrastructure Services' },
];

const BU_SECTORS = [
  { value: 'irrigation', label: 'Lift Irrigation & Water Supply Systems' },
  { value: 'hydrocarbon', label: 'Hydrocarbons, CGD & Drilling Operations' },
  { value: 'solar', label: 'Solar PV & Renewable Generation' },
  { value: 'road', label: 'Expressways & Road Works' },
  { value: 'tunnel', label: 'Underground & High-Altitude Tunnels' },
  { value: 'ev_bus', label: 'Electric Mobility & Fleet Depots' },
  { value: 'telecom', label: 'Telecom & Defense Systems' },
  { value: 'corporate', label: 'Corporate & Administrative Operations' },
];

const PROJECT_TYPES = [
  { value: 'irrigation', label: 'Lift Irrigation & Water' },
  { value: 'hydrocarbon', label: 'Hydrocarbon & Refinery' },
  { value: 'solar', label: 'Solar & Renewable Power' },
  { value: 'road', label: 'Roads & Highways' },
  { value: 'tunnel', label: 'High Altitude Tunnels' },
  { value: 'ev_bus', label: 'Electric Mobility (EV Buses)' },
  { value: 'corporate', label: 'Corporate Office' },
];

export default function OrgHierarchy() {
  const navigate = useNavigate();
  const { data: nodes = [], isLoading: loadN, refetch: refetchNodes } = useOrgNodes();
  const { data: periods = [], isLoading: loadP, refetch: refetchPeriods } = useOrgPeriods();
  const nodeList = Array.isArray(nodes) ? nodes : [];
  const periodList = Array.isArray(periods) ? periods : [];
  const { user, isAdmin, isProjectAdmin, canWriteOrg, hasPermission } = useAuth();
  const canCreateUnits = user?.role === 'system_admin' || user?.role === 'group_admin' || user?.role === 'subsidiary_admin';
  const canManagePeriods = ['system_admin', 'group_admin', 'subsidiary_admin'].includes(user?.role) || hasPermission('period:lock');
  const createNode = useCreateNode();
  const updateNode = useUpdateNode();
  const deleteNode = useDeleteNode();
  const createPeriod = useCreatePeriod();
  const updatePeriod = useUpdatePeriod();

  // Modals & Detail states
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [selectedPeriodDetail, setSelectedPeriodDetail] = useState(null);
  const [showAllPeriodsModal, setShowAllPeriodsModal] = useState(false);
  const [selectedNodeDetail, setSelectedNodeDetail] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Admin Edit Unit & Period States
  const [editingNode, setEditingNode] = useState(null);
  const [editNodeForm, setEditNodeForm] = useState({});
  const [adminPasswordForNode, setAdminPasswordForNode] = useState('');
  const [nodeUpdateError, setNodeUpdateError] = useState('');
  const [updatingNodePending, setUpdatingNodePending] = useState(false);

  // Soft Delete to Trash Can states
  const [deletingNode, setDeletingNode] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteAdminPassword, setDeleteAdminPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeletingPending, setIsDeletingPending] = useState(false);

  // Interactive Drill-Down Navigation states
  const [selectedSubsidiary, setSelectedSubsidiary] = useState(null);
  const [selectedBU, setSelectedBU] = useState(null);
  const [drillSearch, setDrillSearch] = useState('');
  const [activeHierarchyView, setActiveHierarchyView] = useState('drilldown'); // 'drilldown' | 'table'

  // Allowed Hierarchy Level options (Strict 1-level down rule)
  const allowedLevelOptions = useMemo(() => {
    if (user?.role === 'group_admin') {
      return [{ value: 'subsidiary', label: 'Subsidiary (Level 2)' }];
    }
    if (user?.role === 'subsidiary_admin') {
      return [{ value: 'business_unit', label: 'Business Unit / BU (Level 3)' }];
    }
    if (user?.role === 'system_admin') {
      return [
        { value: 'group', label: 'Group (Level 1 Root)' },
        { value: 'subsidiary', label: 'Subsidiary (Level 2)' },
        { value: 'business_unit', label: 'Business Unit / BU (Level 3)' },
      ];
    }
    return [];
  }, [user?.role]);

  const [notice, setNotice] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [searchNode, setSearchNode] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Node form
  const [nodeForm, setNodeForm] = useState({
    code: '',
    name: '',
    type: 'subsidiary',
    parent_id: '',
    ownership_pct: 100.0,
    control_type: 'operational_control',
    boundary: true,
    project_type: 'corporate',
    project_description: '',
    location_state: '',
    location_country: 'India',
  });

  const [classificationResult, setClassificationResult] = useState(null);

  const runClassifier = (text) => {
    if (!text || !text.trim()) return;
    const lower = text.toLowerCase();
    let matchedType = 'corporate';
    let template = 'GENERAL_OPERATIONS_V1';
    let activities = ['Office operations', 'IT equipment', 'Business travel'];
    let params = 8;

    if (lower.includes('tunnel') || lower.includes('boring') || lower.includes('shotcrete') || lower.includes('underground')) {
      matchedType = 'tunnel';
      template = 'HIGHWAY_TUNNEL_CONSTRUCTION_V1';
      activities = ['Tunnel Boring', 'Shotcrete', 'Heavy Diesel Excavators', 'Rock Blasting', 'Ventilation'];
      params = 14;
    } else if (lower.includes('irrigation') || lower.includes('canal') || lower.includes('pump') || lower.includes('lift')) {
      matchedType = 'irrigation';
      template = 'LIFT_IRRIGATION_V1';
      activities = ['Canal Excavation', 'Pumping Station', 'High-Voltage Grid', 'Earthworks'];
      params = 12;
    } else if (lower.includes('solar') || lower.includes('pv') || lower.includes('inverter') || lower.includes('renewable')) {
      matchedType = 'solar';
      template = 'SOLAR_PLANT_OPS_V1';
      activities = ['Module Cleaning (Water)', 'Grid Inverters', 'Vegetation Control', 'Substation'];
      params = 9;
    } else if (lower.includes('road') || lower.includes('highway') || lower.includes('expressway') || lower.includes('paving') || lower.includes('bridge')) {
      matchedType = 'road';
      template = 'ROAD_CONSTRUCTION_V1';
      activities = ['Earthmoving', 'Hot Mix Asphalt', 'Compaction', 'Water Spraying'];
      params = 13;
    } else if (lower.includes('bus') || lower.includes('ev') || lower.includes('fleet') || lower.includes('depot')) {
      matchedType = 'ev_bus';
      template = 'EV_BUS_MOBILITY_V1';
      activities = ['EV Fleet Charging', 'Depot Maintenance', 'Battery Handling', 'Driver Training'];
      params = 10;
    } else if (lower.includes('oil') || lower.includes('gas') || lower.includes('lng') || lower.includes('refinery') || lower.includes('hydrocarbon')) {
      matchedType = 'hydrocarbon';
      template = 'HYDROCARBON_OPS_V1';
      activities = ['Drilling', 'Pipeline', 'Flaring / Venting', 'Fuel Storage', 'Effluent Treatment'];
      params = 18;
    }

    setClassificationResult({
      project_type: matchedType,
      template,
      activities,
      params
    });

    setNodeForm(prev => ({
      ...prev,
      project_type: matchedType,
      project_description: text.trim(),
    }));
  };

  // Period form
  const [periodForm, setPeriodForm] = useState({
    code: '',
    financial_year: '2025-2026',
    period_type: 'month',
    month: 4,
    quarter: 1,
    start_date: '2025-04-01',
    end_date: '2025-04-30',
    status: 'OPEN',
  });

  const handleCreateNode = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!nodeForm.code.trim() || !nodeForm.name.trim()) {
      setErrorMsg('Entity Code and Name are required.');
      return;
    }

    if (['project', 'site'].includes(nodeForm.type)) {
      const cleanName = nodeForm.name.trim().toUpperCase();
      const cleanLoc = (nodeForm.location_state || '').trim().toLowerCase();
      const dup = nodeList.find(n =>
        (n.type === 'project' || n.type === 'site') &&
        (n.name || '').trim().toUpperCase() === cleanName &&
        (n.location_state || '').trim().toLowerCase() === cleanLoc
      );
      if (dup) {
        setErrorMsg(`Duplicate project: "${cleanName}" already exists in "${nodeForm.location_state || 'the specified location'}".`);
        return;
      }
    }

    try {
      let parentId = nodeForm.parent_id;
      if (!parentId) {
        if (user?.role === 'subsidiary_admin') {
          parentId = user?.org_node_id || null;
        } else if (user?.role === 'group_admin') {
          parentId = user?.org_node_id || (nodeList.find(n => n.type === 'group')?.id || null);
        }
      }

      const finalName = ['project', 'site'].includes(nodeForm.type)
        ? nodeForm.name.trim().toUpperCase()
        : nodeForm.name.trim();

      await createNode.mutateAsync({
        code: nodeForm.code.trim().toUpperCase(),
        name: finalName,
        type: nodeForm.type,
        parent_id: parentId || null,
        ownership_pct: parseFloat(nodeForm.ownership_pct) || 100.0,
        control_type: nodeForm.control_type,
        boundary: Boolean(nodeForm.boundary),
        project_type: nodeForm.project_type,
        location_state: nodeForm.location_state || null,
        location_country: nodeForm.location_country || 'India',
      });

      setNotice({ type: 'success', text: `Entity '${nodeForm.name}' successfully added to hierarchy.` });
      setShowNodeModal(false);
      setNodeForm({
        code: '',
        name: '',
        type: user?.role === 'subsidiary_admin' ? 'business_unit' : 'subsidiary',
        parent_id: '',
        ownership_pct: 100.0,
        control_type: 'operational_control',
        boundary: true,
        project_type: user?.role === 'group_admin' ? 'water_irrigation' : 'irrigation',
        location_state: '',
        location_country: 'India',
      });
      refetchNodes();
    } catch (err) {
      const msg = err.response?.data?.detail || err.friendlyMessage || err.message || 'Failed to create organization node.';
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!periodForm.code.trim() || !periodForm.financial_year.trim()) {
      setErrorMsg('Period Code and Financial Year are required.');
      return;
    }

    try {
      await createPeriod.mutateAsync({
        code: periodForm.code.trim(),
        financial_year: periodForm.financial_year.trim(),
        period_type: periodForm.period_type,
        month: periodForm.period_type === 'month' ? parseInt(periodForm.month) : null,
        quarter: periodForm.period_type === 'quarter' ? parseInt(periodForm.quarter) : null,
        start_date: periodForm.start_date,
        end_date: periodForm.end_date,
        status: periodForm.status,
      });

      setNotice({ type: 'success', text: `Reporting Period '${periodForm.code}' successfully created.` });
      setShowPeriodModal(false);
      setPeriodForm({
        code: '',
        financial_year: '2025-2026',
        period_type: 'month',
        month: 5,
        quarter: 1,
        start_date: '2025-05-01',
        end_date: '2025-05-31',
        status: 'OPEN',
      });
      refetchPeriods();
    } catch (err) {
      const msg = err.response?.data?.detail || err.friendlyMessage || err.message || 'Failed to create reporting period.';
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  // ── Admin Edit Functions ──
  const handleOpenEditNode = (node) => {
    setEditingNode(node);
    setEditNodeForm({
      name: node.name || '',
      code: node.code || '',
      boundary: node.boundary !== undefined ? node.boundary : true,
      ownership_pct: node.ownership_pct !== undefined ? node.ownership_pct : 100,
      project_type: node.project_type || 'corporate',
      location_state: node.location_state || '',
    });
    setAdminPasswordForNode('');
    setNodeUpdateError('');
  };

  const handleSaveEditNode = async (e) => {
    e.preventDefault();
    setNodeUpdateError('');
    setUpdatingNodePending(true);
    try {
      if (isAdmin) {
        if (!adminPasswordForNode.trim()) {
          throw new Error('Please enter your Administrator password to authorize this modification.');
        }
        await authApi.verifyPassword(adminPasswordForNode.trim());
      }
      await updateNode.mutateAsync({
        id: editingNode.id,
        data: editNodeForm
      });
      setNotice({ type: 'success', text: `Unit "${editNodeForm.name}" updated successfully.` });
      setEditingNode(null);
      if (selectedNodeDetail && selectedNodeDetail.id === editingNode.id) {
        setSelectedNodeDetail({ ...selectedNodeDetail, ...editNodeForm });
      }
      refetchNodes();
    } catch (err) {
      const msg = err.response?.data?.detail || err.friendlyMessage || err.message || 'Failed to update unit.';
      setNodeUpdateError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setUpdatingNodePending(false);
    }
  };

  const handleTogglePeriodStatus = async (period) => {
    const newStatus = period.status === 'LOCKED' ? 'OPEN' : 'LOCKED';
    try {
      await updatePeriod.mutateAsync({
        id: period.id,
        data: { status: newStatus }
      });
      setNotice({ type: 'success', text: `Reporting period ${period.code} is now ${newStatus}.` });
      if (selectedPeriodDetail && selectedPeriodDetail.id === period.id) {
        setSelectedPeriodDetail({ ...selectedPeriodDetail, status: newStatus });
      }
      refetchPeriods();
    } catch (err) {
      const msg = err.response?.data?.detail || err.friendlyMessage || err.message || 'Failed to update period.';
      setErrorMsg(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const handleOpenAddModal = () => {
    setErrorMsg('');
    const defaultType = user?.role === 'subsidiary_admin' ? 'business_unit' : 'subsidiary';
    let defaultParent = '';
    if (user?.role === 'subsidiary_admin') {
      defaultParent = user?.org_node_id || '';
    } else if (user?.role === 'group_admin') {
      defaultParent = user?.org_node_id || (nodeList.find(n => n.type === 'group')?.id || '');
    }
    setNodeForm({
      code: '',
      name: '',
      type: defaultType,
      parent_id: defaultParent,
      ownership_pct: 100.0,
      control_type: 'operational_control',
      boundary: true,
      project_type: user?.role === 'group_admin' ? 'water_irrigation' : 'irrigation',
      location_state: '',
      location_country: 'India',
    });
    setShowNodeModal(true);
  };

  const handleConfirmDeleteNode = async (e) => {
    e.preventDefault();
    setDeleteError('');
    if (!deleteReason.trim()) {
      setDeleteError('A mandatory reason is required for unit deletion.');
      return;
    }
    if (!deleteAdminPassword.trim()) {
      setDeleteError('Please enter your administrator password to authorize deletion.');
      return;
    }
    setIsDeletingPending(true);
    try {
      await deleteNode.mutateAsync({
        id: deletingNode.id,
        adminPassword: deleteAdminPassword.trim(),
        reason: deleteReason.trim(),
      });
      setNotice({
        type: 'success',
        text: `Unit "${deletingNode.name}" (${deletingNode.code}) was soft-deleted and moved to the Trash Can.`
      });
      setDeletingNode(null);
      setDeleteReason('');
      setDeleteAdminPassword('');
      refetchNodes();
    } catch (err) {
      const msg = err.response?.data?.detail || err.friendlyMessage || err.message || 'Failed to delete unit.';
      setDeleteError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setIsDeletingPending(false);
    }
  };

  // Scoped nodes for Org Hierarchy View (strict isolation)
  const scopedNodes = useMemo(() => {
    if (user?.role === 'system_admin') {
      return nodeList;
    }
    if (user?.role === 'group_admin') {
      return nodeList;
    }
    if (user?.role === 'subsidiary_admin') {
      const subId = user?.org_node_id ? String(user.org_node_id) : null;
      const mySub = subId ? nodeList.find(n => String(n.id) === subId) : nodeList.find(n => n.type === 'subsidiary' || n.type === 'company');
      const mySubId = mySub ? String(mySub.id) : subId;
      const mySubCode = mySub ? mySub.code : null;
      const mySubPath = mySub ? mySub.path : null;

      // Find BUs belonging to this subsidiary
      const bus = nodeList.filter(n => {
        if (n.type !== 'business_unit' && n.type !== 'bu') return false;
        if (mySubId && String(n.parent_id) === mySubId) return true;
        if (mySubPath && n.path && n.path.startsWith(mySubPath + '.')) return true;
        if (mySubCode && n.path && n.path.includes(mySubCode)) return true;
        return false;
      });
      const buIds = new Set(bus.map(b => String(b.id)));
      const buPaths = bus.map(b => b.path).filter(Boolean);
      const buCodes = bus.map(b => b.code).filter(Boolean);

      // Find projects belonging to those BUs (or directly under this subsidiary)
      const projects = nodeList.filter(n => {
        if (n.type !== 'project' && n.type !== 'site') return false;
        if (n.parent_id && buIds.has(String(n.parent_id))) return true;
        if (mySubId && String(n.parent_id) === mySubId) return true;
        if (buPaths.some(bp => n.path && n.path.startsWith(bp + '.'))) return true;
        if (buCodes.some(bc => n.path && n.path.includes(bc))) return true;
        if (mySubPath && n.path && n.path.startsWith(mySubPath + '.')) return true;
        if (mySubCode && n.path && n.path.includes(mySubCode)) return true;
        return false;
      });

      const result = [];
      if (mySub) result.push(mySub);
      result.push(...bus);
      result.push(...projects);
      return result.length > 0 ? result : nodeList;
    }
    if (user?.role === 'project_admin') {
      return nodeList;
    }
    return nodeList;
  }, [nodeList, user]);

  const canDeleteNode = (node) => {
    if (user?.role === 'system_admin') {
      return node.type !== 'group';
    }
    if (user?.role === 'group_admin') {
      return (node.type === 'subsidiary' || node.type === 'company');
    }
    if (user?.role === 'subsidiary_admin') {
      return (node.type === 'business_unit' || node.type === 'bu');
    }
    return false;
  };

  // Filtered nodes
  const filteredNodes = scopedNodes.filter((n) => {
    const matchType = filterType === 'ALL' || n.type === filterType;
    const term = (searchNode || '').toLowerCase();
    const matchSearch = !term || 
      (n.name && n.name.toLowerCase().includes(term)) || 
      (n.code && n.code.toLowerCase().includes(term)) ||
      (n.path && n.path.toLowerCase().includes(term));
    return matchType && matchSearch;
  });

  // Sort periods newest first and slice to latest 5
  const sortedPeriods = useMemo(() => {
    return [...periodList].sort((a, b) => {
      const ta = a.start_date ? new Date(a.start_date).getTime() : 0;
      const tb = b.start_date ? new Date(b.start_date).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return (b.code || '').localeCompare(a.code || '');
    });
  }, [periodList]);

  const latestPeriods = useMemo(() => sortedPeriods.slice(0, 5), [sortedPeriods]);

  // Executive Hierarchy & Compliance Stats
  const hierarchyStats = useMemo(() => {
    const totalUnits = scopedNodes.length;
    const subsidiaries = scopedNodes.filter(n => n.type === 'subsidiary' || n.type === 'company').length;
    const bus = scopedNodes.filter(n => n.type === 'business_unit' || n.type === 'bu').length;
    const projects = scopedNodes.filter(n => n.type === 'project' || n.type === 'site').length;
    const openPeriods = periodList.filter(p => p.status === 'OPEN').length;
    const latestFY = sortedPeriods[0]?.financial_year || '2025-2026';
    return { totalUnits, subsidiaries, bus, projects, openPeriods, latestFY };
  }, [scopedNodes, periodList, sortedPeriods]);

  // ─── Drill-Down Derivations ───────────────────────────────────
  // All subsidiaries in scope
  const scopedSubsidiaries = useMemo(() => {
    return scopedNodes.filter(n => n.type === 'subsidiary' || n.type === 'company');
  }, [scopedNodes]);

  // Primary subsidiary for subsidiary_admin
  const primarySubsidiary = useMemo(() => {
    if (user?.role === 'subsidiary_admin') {
      const subId = user?.org_node_id ? String(user.org_node_id) : null;
      return (subId && scopedNodes.find(n => String(n.id) === subId)) 
        || scopedSubsidiaries[0] 
        || null;
    }
    return null;
  }, [user, scopedNodes, scopedSubsidiaries]);

  // Currently active subsidiary
  const currentSubsidiary = useMemo(() => {
    if (selectedSubsidiary) return selectedSubsidiary;
    if (user?.role === 'subsidiary_admin') return primarySubsidiary;
    return null;
  }, [selectedSubsidiary, user, primarySubsidiary]);

  // BUs under current subsidiary
  const busUnderCurrentSub = useMemo(() => {
    const allBUs = scopedNodes.filter(n => n.type === 'business_unit' || n.type === 'bu');
    if (!currentSubsidiary) return allBUs;
    const subId = String(currentSubsidiary.id);
    const subPath = currentSubsidiary.path;
    const subCode = currentSubsidiary.code;
    return allBUs.filter(bu => {
      if (bu.parent_id && String(bu.parent_id) === subId) return true;
      if (subPath && bu.path && bu.path.startsWith(subPath + '.')) return true;
      if (subCode && bu.path && bu.path.includes(subCode)) return true;
      return false;
    });
  }, [scopedNodes, currentSubsidiary]);

  // Projects under selected BU
  const projectsUnderSelectedBU = useMemo(() => {
    const allProjects = scopedNodes.filter(n => n.type === 'project' || n.type === 'site');
    if (!selectedBU) return [];
    const buId = String(selectedBU.id);
    const buPath = selectedBU.path;
    const buCode = selectedBU.code;
    return allProjects.filter(prj => {
      if (prj.parent_id && String(prj.parent_id) === buId) return true;
      if (buPath && prj.path && prj.path.startsWith(buPath + '.')) return true;
      if (buCode && prj.path && prj.path.includes(buCode)) return true;
      return false;
    });
  }, [scopedNodes, selectedBU]);

  const getProjectsCountForBU = (bu) => {
    const buId = String(bu.id);
    const buPath = bu.path;
    const buCode = bu.code;
    return scopedNodes.filter(n => (n.type === 'project' || n.type === 'site') && (
      (n.parent_id && String(n.parent_id) === buId) ||
      (buPath && n.path && n.path.startsWith(buPath + '.')) ||
      (buCode && n.path && n.path.includes(buCode))
    )).length;
  };

  const getCountsForSubsidiary = (sub) => {
    const subId = String(sub.id);
    const subPath = sub.path;
    const subCode = sub.code;
    const bus = scopedNodes.filter(n => (n.type === 'business_unit' || n.type === 'bu') && (
      (n.parent_id && String(n.parent_id) === subId) ||
      (subPath && n.path && n.path.startsWith(subPath + '.')) ||
      (subCode && n.path && n.path.includes(subCode))
    ));
    const buIds = new Set(bus.map(b => String(b.id)));
    const buPaths = bus.map(b => b.path).filter(Boolean);
    const buCodes = bus.map(b => b.code).filter(Boolean);

    const projects = scopedNodes.filter(n => (n.type === 'project' || n.type === 'site') && (
      (n.parent_id && buIds.has(String(n.parent_id))) ||
      (n.parent_id && String(n.parent_id) === subId) ||
      buPaths.some(bp => n.path && n.path.startsWith(bp + '.')) ||
      buCodes.some(bc => n.path && n.path.includes(bc)) ||
      (subPath && n.path && n.path.startsWith(subPath + '.')) ||
      (subCode && n.path && n.path.includes(subCode))
    ));
    return { buCount: bus.length, projectCount: projects.length };
  };

  const filteredSubsidiaries = useMemo(() => {
    if (!drillSearch) return scopedSubsidiaries;
    const q = drillSearch.toLowerCase();
    return scopedSubsidiaries.filter(s => 
      s.name?.toLowerCase().includes(q) || 
      s.code?.toLowerCase().includes(q)
    );
  }, [scopedSubsidiaries, drillSearch]);

  const filteredBUs = useMemo(() => {
    if (!drillSearch) return busUnderCurrentSub;
    const q = drillSearch.toLowerCase();
    return busUnderCurrentSub.filter(b => 
      b.name?.toLowerCase().includes(q) || 
      b.code?.toLowerCase().includes(q) ||
      b.project_type?.toLowerCase().includes(q)
    );
  }, [busUnderCurrentSub, drillSearch]);

  const filteredProjects = useMemo(() => {
    if (!drillSearch) return projectsUnderSelectedBU;
    const q = drillSearch.toLowerCase();
    return projectsUnderSelectedBU.filter(p => 
      p.name?.toLowerCase().includes(q) || 
      p.code?.toLowerCase().includes(q) ||
      p.project_type?.toLowerCase().includes(q) ||
      p.project_admin_name?.toLowerCase().includes(q) ||
      p.location_state?.toLowerCase().includes(q)
    );
  }, [projectsUnderSelectedBU, drillSearch]);

  if (user?.role === 'bu_admin' || user?.role === 'project_admin') {
    return (
      <div className="page-content anim-fade-up">
        <div className="card" style={{ padding: '48px 32px', textAlign: 'center', maxWidth: 640, margin: '60px auto' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Layers size={32} color="#3b82f6" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
            {user?.role === 'project_admin' ? 'Projects Hub Dedicated Workspace' : 'Projects Console Dedicated Workspace'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, marginBottom: 24 }}>
            {user?.role === 'project_admin'
              ? 'Project Administrators manage data collection and operational metrics directly within the Projects hub. The 4-Tier Org Hierarchy administration is reserved for Group and Subsidiary Admins.'
              : 'Business Unit Admins create and manage operational projects directly from the Projects feature. The 4-Tier Org Hierarchy administration is reserved for Group and Subsidiary Admins.'
            }
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.href = '/projects'}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', margin: '0 auto' }}
          >
            <span>Proceed to Projects Hub</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content anim-fade-up">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="status-beacon-live" style={{ marginRight: 2 }} />
            ENTERPRISE STRUCTURE &amp; AUDIT BOUNDARY
          </div>
          <h1 className="page-title">4-Tier Organization Hierarchy &amp; Reporting Periods</h1>
          <p className="page-subtitle">
            Define corporate nodes, subsidiaries, business units, and operational reporting periods across MEIL Group.
          </p>
        </div>
        <div className="header-actions">
          <PageHelpButton title="Hierarchy Guide" route="/org" />
          <button 
            className="btn btn-secondary" 
            onClick={async () => {
              setIsRefreshing(true);
              try {
                await Promise.all([refetchNodes(), refetchPeriods()]);
              } finally {
                setTimeout(() => setIsRefreshing(false), 700);
              }
            }}
            disabled={isRefreshing || loadN || loadP}
          >
            <RefreshCw size={14} className={isRefreshing || loadN || loadP ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          {canManagePeriods && (
            <button className="btn btn-secondary" onClick={() => { setShowPeriodModal(true); setErrorMsg(''); }}>
              <Calendar size={14} />
              <span>+ New Period</span>
            </button>
          )}
          {canCreateUnits && (
            <button className="btn btn-primary" onClick={handleOpenAddModal}>
              <Plus size={15} />
              <span>+ Add Entity Unit</span>
            </button>
          )}
        </div>
      </div>

      {/* Notice Alert */}
      {notice && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          background: notice.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: notice.type === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${notice.type === 'success' ? '#10b981' : '#ef4444'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{typeof notice.text === 'object' ? JSON.stringify(notice.text) : (notice.text || notice.message || notice.msg)}</span>
          <button className="icon-btn" onClick={() => setNotice(null)} style={{ width: 24, height: 24 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Role-Specific Executive Governance Banner ── */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '12px',
            background: user?.role === 'system_admin' ? '#FEF2F2' : user?.role === 'group_admin' ? '#F5F3FF' : '#ECFDF5',
            border: `1px solid ${user?.role === 'system_admin' ? '#FECACA' : user?.role === 'group_admin' ? '#DDD6FE' : '#A7F3D0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px'
          }}>
            {user?.role === 'system_admin' ? '🛡️' : user?.role === 'group_admin' ? '🏛️' : user?.role === 'subsidiary_admin' ? '🏢' : '🏗️'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                {user?.role === 'system_admin'
                  ? 'System Administrator — Platform Root Governance'
                  : user?.role === 'group_admin'
                  ? 'Group Administrator — Enterprise Consolidation'
                  : user?.role === 'subsidiary_admin'
                  ? 'Subsidiary Administrator — Corporate Governance'
                  : 'Project Administrator — Operational Data & Site Governance'}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                background: user?.role === 'system_admin' ? '#FEF2F2' : user?.role === 'group_admin' ? '#EEF2FF' : user?.role === 'subsidiary_admin' ? '#ECFDF5' : '#F5F3FF',
                color: user?.role === 'system_admin' ? '#DC2626' : user?.role === 'group_admin' ? '#4F46E5' : user?.role === 'subsidiary_admin' ? '#059669' : '#7C3AED',
                border: `1px solid ${user?.role === 'system_admin' ? '#FECACA' : user?.role === 'group_admin' ? '#C7D2FE' : user?.role === 'subsidiary_admin' ? '#A7F3D0' : '#DDD6FE'}`
              }}>
                {user?.role?.toUpperCase().replace('_', ' ')}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              {user?.role === 'system_admin'
                ? 'Root sovereignty across all 4 tiers (Group, Subsidiary, BU, Projects). Authority to lock/unlock periods, create FY schedules, and manage deletion.'
                : user?.role === 'group_admin'
                ? 'Corporate oversight across MEIL Group and its operating subsidiaries. Authorized to lock reporting periods, create FY cycles, and configure entities.'
                : user?.role === 'subsidiary_admin'
                ? 'Scoped authority over assigned subsidiary entities and associated Business Units. Can create BUs, lock reporting periods, and monitor project reporting compliance.'
                : 'Operational authority over assigned projects and site boundaries. Explore your assigned subsidiaries, business units, and operational project nodes below.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/periods')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', fontWeight: 600 }}
          >
            <Calendar size={14} color="#4F46E5" />
            <span>FY &amp; Periods Console</span>
          </button>
          {canCreateUnits && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleOpenAddModal}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} />
              <span>+ Add Unit</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Executive Summary Metrics Bar ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        <div className="card" style={{ padding: '16px 20px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Entities in Scope
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginTop: '4px', fontFamily: 'JetBrains Mono' }}>
            {hierarchyStats.totalUnits}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            Active organizational units
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Subsidiaries (Tier 2)
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '4px', fontFamily: 'JetBrains Mono' }}>
            {hierarchyStats.subsidiaries}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            Corporate entities
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Business Units (Tier 3)
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284C7', marginTop: '4px', fontFamily: 'JetBrains Mono' }}>
            {hierarchyStats.bus}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            Operating divisions
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Projects (Tier 4)
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#D97706', marginTop: '4px', fontFamily: 'JetBrains Mono' }}>
            {hierarchyStats.projects}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            Operational sites
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Current FY Cycle
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#7C3AED', marginTop: '4px', fontFamily: 'JetBrains Mono' }}>
            FY {hierarchyStats.latestFY}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
            {hierarchyStats.openPeriods} open submission window(s)
          </div>
        </div>
      </div>

      {/* ── Reporting Periods: Displays Latest 5 Periods with See in Details ── */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '20px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '16px' }}>
              <Calendar size={18} color="var(--brand-400)" />
              <span>Reporting Periods &amp; Statutory Windows</span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: '#EEF2FF',
                color: '#4F46E5',
                border: '1px solid #C7D2FE'
              }}>
                Showing Latest 5 of {periodList.length}
              </span>
            </div>
            <div className="card-subtitle text-muted text-sm" style={{ marginTop: '2px' }}>
              Latest 5 reporting cycles shown below. Use the dedicated console to view and manage all Financial Years.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/periods')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, borderColor: 'var(--brand-400)', color: 'var(--brand-400)' }}
            >
              <Eye size={13} />
              <span>See in Details (All FYs &amp; Periods)</span>
              <ChevronRight size={13} />
            </button>
            {canManagePeriods && (
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => { setShowPeriodModal(true); setErrorMsg(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={13} />
                <span>+ Add Period</span>
              </button>
            )}
          </div>
        </div>

        {/* Latest 5 Periods Grid */}
        <div 
          style={{ 
            padding: '20px 24px', 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: '14px',
            background: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            borderBottom: '1px solid #E2E8F0'
          }}
        >
          {loadP ? (
            <div style={{ padding: '30px', color: 'var(--text-muted)', gridColumn: '1 / -1', textAlign: 'center' }}>
              <RefreshCw size={20} className="spin" style={{ margin: '0 auto 8px', display: 'block' }} />
              Loading reporting periods...
            </div>
          ) : latestPeriods.length === 0 ? (
            <div style={{ padding: '36px 20px', color: '#64748B', gridColumn: '1 / -1', textAlign: 'center', background: '#FFFFFF', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
              <Calendar size={28} color="#4F46E5" style={{ margin: '0 auto 8px', display: 'block' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>No Reporting Periods Configured</div>
              <p style={{ fontSize: '12px', color: '#475569', maxWidth: 420, margin: '0 auto 12px' }}>
                Create a reporting period (e.g. FY 2025-26) to establish statutory collection cycles and enable ESG data submissions.
              </p>
              <button 
                type="button" 
                className="btn btn-primary btn-sm"
                onClick={() => { setShowPeriodModal(true); setErrorMsg(''); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} />
                <span>+ Create First Period</span>
              </button>
            </div>
          ) : (
            latestPeriods.map((p) => {
              const isLocked = p.status === 'LOCKED';
              return (
                <div 
                  key={p.id} 
                  style={{
                    background: '#FFFFFF',
                    border: `1px solid ${isLocked ? '#FECACA' : '#BBF7D0'}`,
                    borderRadius: '8px',
                    padding: '14px 16px',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: isLocked ? 'var(--rose-500)' : 'var(--emerald-500)'
                  }} />

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A', fontFamily: 'JetBrains Mono', letterSpacing: '-0.2px' }}>
                        {p.code}
                      </span>
                      {isLocked ? (
                        <span className="badge badge-rose" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '10px' }}>
                          <Lock size={10} /> Locked
                        </span>
                      ) : (
                        <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '10px' }}>
                          <Unlock size={10} /> Open
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className="badge badge-brand" style={{ fontSize: '10px' }}>
                        FY {p.financial_year}
                      </span>
                      <span className="badge badge-indigo" style={{ fontSize: '10px' }}>
                        {p.period_type?.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} color="var(--brand-400)" />
                    <span>{p.start_date || '—'}</span>
                    <span style={{ color: 'var(--text-muted)' }}>→</span>
                    <span>{p.end_date || '—'}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => setSelectedPeriodDetail(p)} 
                      style={{ flex: 1, justifyContent: 'center', gap: '4px', fontSize: '11px', padding: '4px 8px' }}
                      title="Inspect complete statutory details"
                    >
                      <Info size={12} color="var(--brand-400)" />
                      <span>Details</span>
                    </button>
                    {canManagePeriods && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleTogglePeriodStatus(p)}
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        title={isLocked ? 'Unlock period' : 'Lock period'}
                      >
                        {isLocked ? <Unlock size={12} color="#10b981" /> : <Lock size={12} color="#ef4444" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Banner with link to full detailed view */}
        <div style={{
          padding: '12px 24px',
          background: '#FFFFFF',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10
        }}>
          <span style={{ fontSize: '12px', color: '#475569' }}>
            Showing <strong>{latestPeriods.length}</strong> of <strong>{periodList.length}</strong> statutory reporting periods. Complete calendar &amp; quarterly groups available in the dedicated console.
          </span>
          <button
            onClick={() => navigate('/periods')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--brand-400)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span>See in Details: Open FY Calendar &amp; All Periods</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>


      {/* ── View Switcher: Interactive Drill-Down Explorer vs All Units Data Table ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{
          display: 'inline-flex',
          background: '#F1F5F9',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid #E2E8F0'
        }}>
          <button
            type="button"
            onClick={() => setActiveHierarchyView('drilldown')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: activeHierarchyView === 'drilldown' ? 700 : 500,
              background: activeHierarchyView === 'drilldown' ? '#FFFFFF' : 'transparent',
              color: activeHierarchyView === 'drilldown' ? '#0F172A' : '#64748B',
              boxShadow: activeHierarchyView === 'drilldown' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Layers size={15} color={activeHierarchyView === 'drilldown' ? '#4F46E5' : '#64748B'} />
            <span>Interactive Drill-Down Explorer</span>
            <span style={{
              fontSize: '10.5px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              background: activeHierarchyView === 'drilldown' ? '#EEF2FF' : '#E2E8F0',
              color: activeHierarchyView === 'drilldown' ? '#4F46E5' : '#64748B'
            }}>
              {user?.role === 'subsidiary_admin' ? 'BUs → Projects' : 'Subsidiaries → BUs → Projects'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveHierarchyView('table')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: activeHierarchyView === 'table' ? 700 : 500,
              background: activeHierarchyView === 'table' ? '#FFFFFF' : 'transparent',
              color: activeHierarchyView === 'table' ? '#0F172A' : '#64748B',
              boxShadow: activeHierarchyView === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Building2 size={15} color={activeHierarchyView === 'table' ? '#4F46E5' : '#64748B'} />
            <span>All Units Data Table</span>
            <span style={{
              fontSize: '10.5px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              background: activeHierarchyView === 'table' ? '#EEF2FF' : '#E2E8F0',
              color: activeHierarchyView === 'table' ? '#4F46E5' : '#64748B'
            }}>
              {scopedNodes.length}
            </span>
          </button>
        </div>

        {activeHierarchyView === 'drilldown' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(selectedSubsidiary || selectedBU) && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSelectedSubsidiary(null);
                  setSelectedBU(null);
                  setDrillSearch('');
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', fontWeight: 600 }}
              >
                <RefreshCw size={12} />
                <span>Reset View to Root</span>
              </button>
            )}
            {canCreateUnits && (
              <button 
                className="btn btn-primary btn-sm" 
                onClick={handleOpenAddModal}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Plus size={14} />
                <span>+ Add Unit</span>
              </button>
            )}
          </div>
        )}
      </div>

      {activeHierarchyView === 'drilldown' ? (
        <div className="card" style={{ padding: '0', overflow: 'hidden', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', marginBottom: '24px' }}>
          {/* Breadcrumb Navigation Header */}
          <div style={{
            padding: '16px 24px',
            background: '#F8FAFC',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}>
            {/* Interactive Breadcrumbs */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: '13px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>
                Hierarchy Navigation:
              </span>

              {user?.role === 'subsidiary_admin' ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setSelectedBU(null); setDrillSearch(''); }}
                    style={{
                      background: selectedBU ? '#FFFFFF' : '#0F172A',
                      color: selectedBU ? '#0F172A' : '#FFFFFF',
                      border: selectedBU ? '1px solid #CBD5E1' : 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: selectedBU ? 'pointer' : 'default',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Building2 size={13} color={selectedBU ? '#059669' : '#34D399'} />
                    <span>{currentSubsidiary?.name || 'Subsidiary Entity'}</span>
                  </button>
                  {selectedBU && (
                    <>
                      <ChevronRight size={14} color="#94A3B8" />
                      <span style={{
                        background: '#0F172A',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <Layers size={13} color="#818CF8" />
                        <span>{selectedBU.name}</span>
                        <span style={{ fontSize: '10px', background: '#312E81', color: '#C7D2FE', padding: '1px 6px', borderRadius: '4px' }}>
                          Level 3 BU
                        </span>
                      </span>
                    </>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setSelectedSubsidiary(null); setSelectedBU(null); setDrillSearch(''); }}
                    style={{
                      background: (!selectedSubsidiary && !selectedBU) ? '#0F172A' : '#FFFFFF',
                      color: (!selectedSubsidiary && !selectedBU) ? '#FFFFFF' : '#0F172A',
                      border: (!selectedSubsidiary && !selectedBU) ? 'none' : '1px solid #CBD5E1',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: (selectedSubsidiary || selectedBU) ? 'pointer' : 'default',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Building2 size={13} color={(!selectedSubsidiary && !selectedBU) ? '#34D399' : '#059669'} />
                    <span>Subsidiaries</span>
                    <span style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: (!selectedSubsidiary && !selectedBU) ? '#064E3B' : '#ECFDF5',
                      color: (!selectedSubsidiary && !selectedBU) ? '#A7F3D0' : '#059669'
                    }}>
                      {scopedSubsidiaries.length}
                    </span>
                  </button>

                  {selectedSubsidiary && (
                    <>
                      <ChevronRight size={14} color="#94A3B8" />
                      <button
                        type="button"
                        onClick={() => { setSelectedBU(null); setDrillSearch(''); }}
                        style={{
                          background: selectedBU ? '#FFFFFF' : '#0F172A',
                          color: selectedBU ? '#0F172A' : '#FFFFFF',
                          border: selectedBU ? '1px solid #CBD5E1' : 'none',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: selectedBU ? 'pointer' : 'default',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Building2 size={13} color={selectedBU ? '#059669' : '#34D399'} />
                        <span>{selectedSubsidiary.name}</span>
                      </button>
                    </>
                  )}

                  {selectedBU && (
                    <>
                      <ChevronRight size={14} color="#94A3B8" />
                      <span style={{
                        background: '#0F172A',
                        color: '#FFFFFF',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <Layers size={13} color="#818CF8" />
                        <span>{selectedBU.name}</span>
                        <span style={{ fontSize: '10px', background: '#312E81', color: '#C7D2FE', padding: '1px 6px', borderRadius: '4px' }}>
                          Level 3 BU
                        </span>
                      </span>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Quick Drill Search */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, color: '#94A3B8' }} />
              <input
                type="text"
                placeholder={
                  selectedBU 
                    ? "Filter projects in BU..." 
                    : currentSubsidiary 
                    ? "Filter business units..." 
                    : "Filter subsidiaries..."
                }
                className="form-control"
                style={{ paddingLeft: 30, width: 220, height: 32, fontSize: '12px', background: '#FFFFFF', border: '1px solid #CBD5E1' }}
                value={drillSearch}
                onChange={(e) => setDrillSearch(e.target.value)}
              />
              {drillSearch && (
                <button
                  type="button"
                  onClick={() => setDrillSearch('')}
                  style={{ position: 'absolute', right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Drill-down Body Content */}
          <div style={{ padding: '24px' }}>
            {/* VIEW 1: PROJECTS UNDER SELECTED BU */}
            {selectedBU ? (
              <div>
                {/* Level Title & Action Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginBottom: '20px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #E2E8F0'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => { setSelectedBU(null); setDrillSearch(''); }}
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#0F172A',
                          cursor: 'pointer'
                        }}
                      >
                        <ArrowLeft size={13} />
                        <span>Back to Business Units</span>
                      </button>
                      <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        Projects under "{selectedBU.name}"
                      </h2>
                      <span style={{
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace',
                        background: '#EEF2FF',
                        color: '#4F46E5',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        border: '1px solid #C7D2FE'
                      }}>
                        {selectedBU.code}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0 0' }}>
                      Showing <strong>{filteredProjects.length}</strong> operational projects configured under this Business Unit. Inspect reporting status, boundaries, and assigned project administrators.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: '#F5F3FF',
                      color: '#7C3AED',
                      border: '1px solid #DDD6FE'
                    }}>
                      ⚡ {projectsUnderSelectedBU.length} Total Projects in BU
                    </span>
                  </div>
                </div>

                {/* Projects Grid */}
                {filteredProjects.length === 0 ? (
                  <div style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                    background: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px dashed #CBD5E1'
                  }}>
                    <Layers size={36} color="#94A3B8" style={{ margin: '0 auto 10px', display: 'block' }} />
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                      {drillSearch ? 'No Matching Projects Found' : 'No Operational Projects Configured in this BU'}
                    </div>
                    <p style={{ fontSize: '13px', color: '#475569', maxWidth: 440, margin: '0 auto 16px', lineHeight: 1.5 }}>
                      {drillSearch
                        ? `No projects matching "${drillSearch}" were found in this Business Unit.`
                        : 'Operational projects under this Business Unit can be created from the Projects console or assigned by corporate administration.'}
                    </p>
                    {drillSearch && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setDrillSearch('')}
                      >
                        Clear Project Search
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: '16px'
                  }}>
                    {filteredProjects.map((prj) => (
                      <div
                        key={prj.id}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '18px 20px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '14px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div>
                          {/* Card Top Pill Row */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: 34,
                                height: 34,
                                borderRadius: '8px',
                                background: '#F5F3FF',
                                border: '1px solid #DDD6FE',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <Layers size={18} color="#7C3AED" />
                              </div>
                              <div>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  fontFamily: 'JetBrains Mono, monospace',
                                  color: '#475569',
                                  background: '#F1F5F9',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #E2E8F0'
                                }}>
                                  {prj.code}
                                </span>
                              </div>
                            </div>
                            <span style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              background: prj.boundary ? '#ECFDF5' : '#FEF2F2',
                              color: prj.boundary ? '#059669' : '#DC2626',
                              border: `1px solid ${prj.boundary ? '#A7F3D0' : '#FECACA'}`
                            }}>
                              {prj.boundary ? 'In Boundary' : 'Excluded'}
                            </span>
                          </div>

                          {/* Project Name */}
                          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px', lineHeight: 1.4, textTransform: 'uppercase' }}>
                            {(prj.name || '').toUpperCase()}
                          </h3>

                          {/* Metadata Grid */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px',
                            background: '#F8FAFC',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0',
                            fontSize: '12px'
                          }}>
                            <div>
                              <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                                Sector / Type
                              </span>
                              <span style={{ color: '#0F172A', fontWeight: 600 }}>
                                {prj.project_type || 'Infrastructure'}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                                Region / State
                              </span>
                              <span style={{ color: '#0F172A', fontWeight: 600 }}>
                                {prj.location_state || 'Telangana, India'}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                                Control
                              </span>
                              <span style={{ color: '#0F172A', fontWeight: 600 }}>
                                {prj.control_type === 'operational_control' ? 'Operational' : (prj.control_type || '100% MEIL')}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                                Ownership
                              </span>
                              <span style={{ color: '#0F172A', fontWeight: 700 }}>
                                {prj.ownership_pct ? `${prj.ownership_pct}%` : '100%'}
                              </span>
                            </div>
                          </div>

                          {/* Assigned Project Admin Card */}
                          <div style={{
                            marginTop: '10px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: prj.project_admin_name ? '#F0FDF4' : '#F8FAFC',
                            border: `1px solid ${prj.project_admin_name ? '#BBF7D0' : '#E2E8F0'}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10
                          }}>
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: prj.project_admin_name ? '#DCFCE7' : '#E2E8F0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <User size={14} color={prj.project_admin_name ? '#16A34A' : '#64748B'} />
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block' }}>
                                Assigned Project Admin
                              </span>
                              {prj.project_admin_name ? (
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#15803D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {prj.project_admin_name}{' '}
                                  <span style={{ fontWeight: 400, color: '#475569', fontSize: '11px' }}>
                                    ({prj.project_admin_email || 'Active'})
                                  </span>
                                </div>
                              ) : (
                                <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B', fontStyle: 'italic' }}>
                                  Not assigned yet
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Card Bottom Actions */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          paddingTop: '12px',
                          borderTop: '1px solid #E2E8F0'
                        }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-xs"
                            onClick={() => setSelectedNodeDetail(prj)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '11.5px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', fontWeight: 600 }}
                          >
                            <Eye size={13} color="#4F46E5" />
                            <span>View Full Details</span>
                          </button>

                          {user?.role === 'project_admin' ? (
                            <button
                              type="button"
                              className="btn btn-primary btn-xs"
                              onClick={() => navigate('/collection')}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '11.5px' }}
                            >
                              <PenLine size={13} />
                              <span>Data Entry</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary btn-xs"
                              onClick={() => setSelectedNodeDetail(prj)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '11.5px', background: '#F8FAFC', border: '1px solid #CBD5E1', color: '#0F172A', fontWeight: 600 }}
                            >
                              <span>View Project Details</span>
                              <ChevronRight size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : currentSubsidiary ? (
              /* VIEW 2: BUSINESS UNITS UNDER CURRENT SUBSIDIARY */
              <div>
                {/* Level Title & Action Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginBottom: '20px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #E2E8F0'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {user?.role !== 'subsidiary_admin' && (
                        <button
                          type="button"
                          onClick={() => { setSelectedSubsidiary(null); setDrillSearch(''); }}
                          style={{
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#0F172A',
                            cursor: 'pointer'
                          }}
                        >
                          <ArrowLeft size={13} />
                          <span>Back to Subsidiaries</span>
                        </button>
                      )}
                      <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        Business Units under "{currentSubsidiary.name}"
                      </h2>
                      <span style={{
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace',
                        background: '#ECFDF5',
                        color: '#059669',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 700,
                        border: '1px solid #A7F3D0'
                      }}>
                        {currentSubsidiary.code}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0 0' }}>
                      Showing <strong>{filteredBUs.length}</strong> operating division(s). Click any Business Unit card below to see all operational projects under it.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {canCreateUnits && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleOpenAddModal}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                      >
                        <Plus size={14} />
                        <span>+ Add Business Unit</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Business Units Grid */}
                {filteredBUs.length === 0 ? (
                  <div style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                    background: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px dashed #CBD5E1'
                  }}>
                    <Building2 size={36} color="#94A3B8" style={{ margin: '0 auto 10px', display: 'block' }} />
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                      {drillSearch ? 'No Matching Business Units Found' : 'No Business Units Configured Yet'}
                    </div>
                    <p style={{ fontSize: '13px', color: '#475569', maxWidth: 440, margin: '0 auto 16px', lineHeight: 1.5 }}>
                      {drillSearch
                        ? `No Business Units matching "${drillSearch}" were found in this subsidiary.`
                        : 'Create a Business Unit (Level 3) under this subsidiary to organize your operational projects.'}
                    </p>
                    {canCreateUnits && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleOpenAddModal}
                      >
                        <Plus size={14} />
                        <span>Create Business Unit</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '16px'
                  }}>
                    {filteredBUs.map((bu) => {
                      const prjCount = getProjectsCountForBU(bu);
                      return (
                        <div
                          key={bu.id}
                          onClick={() => { setSelectedBU(bu); setDrillSearch(''); }}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '12px',
                            padding: '20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#4F46E5';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(79, 70, 229, 0.08)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#E2E8F0';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <div>
                            {/* Card Top Pill Row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: '10px',
                                  background: '#EEF2FF',
                                  border: '1px solid #C7D2FE',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <Building2 size={18} color="#4F46E5" />
                                </div>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  fontFamily: 'JetBrains Mono, monospace',
                                  color: '#475569',
                                  background: '#F1F5F9',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #E2E8F0'
                                }}>
                                  {bu.code}
                                </span>
                              </div>
                              <span style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                background: '#EEF2FF',
                                color: '#4F46E5',
                                border: '1px solid #C7D2FE'
                              }}>
                                Level 3 BU
                              </span>
                            </div>

                            {/* BU Name */}
                            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px', lineHeight: 1.4 }}>
                              {bu.name}
                            </h3>

                            {/* Metadata */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '6px',
                              background: '#F8FAFC',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #E2E8F0',
                              fontSize: '12px',
                              marginBottom: 10
                            }}>
                              <div>
                                <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                                  Sector
                                </span>
                                <span style={{ color: '#0F172A', fontWeight: 600 }}>
                                  {bu.project_type || 'Operations'}
                                </span>
                              </div>
                              <div>
                                <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                                  Location
                                </span>
                                <span style={{ color: '#0F172A', fontWeight: 600 }}>
                                  {bu.location_state || 'India'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Footer with Project Count & CTA */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '12px',
                            borderTop: '1px solid #E2E8F0'
                          }}>
                            <span style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              background: '#F5F3FF',
                              color: '#7C3AED',
                              border: '1px solid #DDD6FE',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              ⚡ {prjCount} {prjCount === 1 ? 'Project' : 'Projects'}
                            </span>

                            <span style={{
                              fontSize: '12.5px',
                              fontWeight: 700,
                              color: '#4F46E5',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <span>View Projects</span>
                              <ChevronRight size={15} />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* VIEW 3: SUBSIDIARIES GRID (FOR PROJECT ADMIN / GROUP ADMIN / SYSTEM ADMIN) */
              <div>
                {/* Level Title & Action Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                  marginBottom: '20px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #E2E8F0'
                }}>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Assigned Subsidiaries &amp; Corporate Entities
                    </h2>
                    <p style={{ fontSize: '13px', color: '#475569', margin: '4px 0 0' }}>
                      Showing <strong>{filteredSubsidiaries.length}</strong> corporate subsidiary entity(ies) in your scope. Click any subsidiary to view the Business Units under it.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: '#ECFDF5',
                      color: '#059669',
                      border: '1px solid #A7F3D0'
                    }}>
                      🏢 {scopedSubsidiaries.length} Total Subsidiaries
                    </span>
                  </div>
                </div>

                {/* Subsidiaries Grid */}
                {filteredSubsidiaries.length === 0 ? (
                  <div style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                    background: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px dashed #CBD5E1'
                  }}>
                    <Building2 size={36} color="#94A3B8" style={{ margin: '0 auto 10px', display: 'block' }} />
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                      {drillSearch ? 'No Matching Subsidiaries Found' : 'No Subsidiaries in Current Scope'}
                    </div>
                    <p style={{ fontSize: '13px', color: '#475569', maxWidth: 440, margin: '0 auto', lineHeight: 1.5 }}>
                      No corporate subsidiary units were found matching your current filter.
                    </p>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '16px'
                  }}>
                    {filteredSubsidiaries.map((sub) => {
                      const counts = getCountsForSubsidiary(sub);
                      return (
                        <div
                          key={sub.id}
                          onClick={() => { setSelectedSubsidiary(sub); setSelectedBU(null); setDrillSearch(''); }}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '12px',
                            padding: '20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#059669';
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(5, 150, 105, 0.08)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#E2E8F0';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <div>
                            {/* Card Top Pill Row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: '10px',
                                  background: '#ECFDF5',
                                  border: '1px solid #A7F3D0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <Building2 size={18} color="#059669" />
                                </div>
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  fontFamily: 'JetBrains Mono, monospace',
                                  color: '#475569',
                                  background: '#F1F5F9',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid #E2E8F0'
                                }}>
                                  {sub.code}
                                </span>
                              </div>
                              <span style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                background: '#ECFDF5',
                                color: '#059669',
                                border: '1px solid #A7F3D0'
                              }}>
                                Level 2 Subsidiary
                              </span>
                            </div>

                            {/* Subsidiary Name */}
                            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px', lineHeight: 1.4 }}>
                              {sub.name}
                            </h3>

                            {/* Metadata */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '6px',
                              background: '#F8FAFC',
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: '1px solid #E2E8F0',
                              fontSize: '12px'
                            }}>
                              <div>
                                <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                                  Ownership
                                </span>
                                <span style={{ color: '#0F172A', fontWeight: 700 }}>
                                  {sub.ownership_pct ? `${sub.ownership_pct}% MEIL` : '100% MEIL'}
                                </span>
                              </div>
                              <div>
                                <span style={{ color: '#64748B', display: 'block', fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                                  Location
                                </span>
                                <span style={{ color: '#0F172A', fontWeight: 600 }}>
                                  {sub.location_state || 'Corporate HQ'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Footer with BU Count, Project Count & CTA */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '12px',
                            borderTop: '1px solid #E2E8F0'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: '#EEF2FF',
                                color: '#4F46E5',
                                border: '1px solid #C7D2FE'
                              }}>
                                🏢 {counts.buCount} BUs
                              </span>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: '#F5F3FF',
                                color: '#7C3AED',
                                border: '1px solid #DDD6FE'
                              }}>
                                ⚡ {counts.projectCount} Projects
                              </span>
                            </div>

                            <span style={{
                              fontSize: '12.5px',
                              fontWeight: 700,
                              color: '#059669',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <span>View BUs</span>
                              <ChevronRight size={15} />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
      /* Org Hierarchy Table Card */
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={16} color="var(--brand-400)" />
              <span>4-Tier Organizational Boundary ({filteredNodes.length} Units)</span>
            </div>
            <div className="card-subtitle text-muted text-sm">
              Tree path mapping with PostgreSQL ltree resolution and automatic applicability derivation
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search name, code, path..."
                className="form-control"
                style={{ paddingLeft: 30, width: 220, height: 32, fontSize: '12px' }}
                value={searchNode}
                onChange={(e) => setSearchNode(e.target.value)}
              />
            </div>

            {/* Filter by Type */}
            <select
              className="form-control"
              style={{ width: 170, height: 32, fontSize: '12px' }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="ALL">All Hierarchy Levels</option>
              {NODE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            {canCreateUnits && (
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleOpenAddModal}
              >
                <Plus size={13} /> Add Unit
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Pill Tabs */}
        <div style={{
          padding: '10px 24px',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto'
        }}>
          {[
            { id: 'ALL', label: `All Units (${scopedNodes.length})` },
            { id: 'group', label: 'Group Root' },
            { id: 'subsidiary', label: `Subsidiaries (${hierarchyStats.subsidiaries})` },
            { id: 'business_unit', label: `Business Units (${hierarchyStats.bus})` },
            { id: 'project', label: `Projects (${hierarchyStats.projects})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              style={{
                padding: '4px 12px',
                borderRadius: '9999px',
                border: filterType === tab.id ? '1px solid #4F46E5' : '1px solid #E2E8F0',
                background: filterType === tab.id ? '#0F172A' : '#FFFFFF',
                color: filterType === tab.id ? '#FFFFFF' : '#475569',
                fontSize: '11.5px',
                fontWeight: filterType === tab.id ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Table Container */}
        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Entity / Unit Name</th>
                <th>Code</th>
                <th>Hierarchy Level</th>
                <th>ltree Path</th>
                <th>Boundary</th>
                <th>Project Sector</th>
                <th>Ownership</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loadN ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    Loading organization nodes...
                  </td>
                </tr>
              ) : filteredNodes.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ maxWidth: 440, margin: '0 auto' }}>
                      <Building2 size={32} color="var(--brand-400)" style={{ margin: '0 auto 10px', display: 'block' }} />
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                        {nodeList.length === 0 ? 'No Organization Units Configured' : 'No Matching Units Found'}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                        {nodeList.length === 0 
                          ? 'Start by creating your Root Group Entity (e.g. MEIL-GROUP) or subsidiary units to establish statutory audit boundaries.'
                          : 'Try changing your search term or filtering options.'}
                      </p>
                      {nodeList.length === 0 && canCreateUnits && (
                        <button 
                          type="button" 
                          className="btn btn-primary btn-sm"
                          onClick={() => { setShowNodeModal(true); setErrorMsg(''); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <Plus size={14} />
                          <span>+ Add Root Group Unit</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredNodes.map((node) => {
                  const depth = (node.path || '').split('.').length - 1;
                  const typeObj = NODE_TYPES.find(t => t.value === node.type) || { label: node.type, cls: 'badge-gray' };
                  const projObj = PROJECT_TYPES.find(p => p.value === node.project_type);

                  return (
                    <tr key={node.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {Array(Math.max(0, depth)).fill(null).map((_, i) => (
                            <span 
                              key={i} 
                              style={{ 
                                width: 14, 
                                display: 'inline-block', 
                                borderLeft: '1px dashed var(--border-default)', 
                                height: 16 
                              }} 
                            />
                          ))}
                          {depth > 0 && <ChevronRight size={12} color="var(--text-muted)" />}
                          <Building2 size={14} color="var(--brand-400)" />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', textTransform: ['project', 'site'].includes(node.type) ? 'uppercase' : 'none' }}>
                              {['project', 'site'].includes(node.type) ? (node.name || '').toUpperCase() : node.name}
                            </span>
                            {(node.type === 'project' || node.type === 'site') && node.project_admin_name && (
                              <span style={{ fontSize: '11px', color: '#4F46E5', display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                                <span>👤 Admin:</span>
                                <strong>{node.project_admin_name}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--brand-400)' }}>
                          {node.code}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${typeObj.cls}`}>
                          {typeObj.label}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {node.path}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${node.boundary ? 'badge-emerald' : 'badge-gray'}`}>
                          {node.boundary ? 'In Boundary' : 'Excluded'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {projObj?.label || node.project_type}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {node.ownership_pct}% ({node.control_type?.replace('_', ' ')})
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedNodeDetail(node)}
                            style={{ padding: '4px 10px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            title="Show unit details"
                          >
                            <Eye size={12} color="var(--brand-400)" />
                            <span>Details</span>
                          </button>
                          {canDeleteNode(node) && (
                            <button
                              className="btn btn-sm"
                              onClick={() => {
                                setDeletingNode(node);
                                setDeleteReason('');
                                setDeleteAdminPassword('');
                                setDeleteError('');
                              }}
                              style={{
                                padding: '4px 10px', fontSize: '11px',
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-sm)'
                              }}
                              title="Delete this unit (to Trash Can)"
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Modal: Add Org Unit */}
      <Modal 
        isOpen={showNodeModal} 
        onClose={() => setShowNodeModal(false)} 
        maxWidth="560px"
      >
        <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="modal-header-icon">
                  <Building2 size={18} color="var(--brand-400)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', color: '#0F172A' }}>Add Organization Unit</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Create a new node within MEIL's 4-tier hierarchy structure
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowNodeModal(false)}>
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="login-error-banner" style={{ margin: '16px 24px 0' }}>
                <AlertCircle size={16} />
                <span>{typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}</span>
              </div>
            )}

            <form onSubmit={handleCreateNode} className="modal-body">
              <div className="form-group">
                <label>Unit Code <span className="text-rose">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. SUB-OLECTRA, PRJ-SOLAR-PARK, SITE-04"
                  value={nodeForm.code}
                  onChange={(e) => setNodeForm({ ...nodeForm, code: e.target.value })}
                  required
                />
                <span className="form-help">Unique uppercase identifier used for PostgreSQL ltree materialized path.</span>
              </div>

              <div className="form-group">
                <label>Unit Name <span className="text-rose">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Dhamra LNG Terminal Phase 2, Kaleshwaram Unit 4"
                  value={nodeForm.name}
                  onChange={(e) => setNodeForm({ ...nodeForm, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label>Hierarchy Level</label>
                  {allowedLevelOptions.length === 1 ? (
                    <div style={{
                      padding: '8px 12px', borderRadius: 6,
                      background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)',
                      fontSize: '13px', color: 'var(--brand-400)', fontWeight: 600
                    }}>
                      {allowedLevelOptions[0].label}
                    </div>
                  ) : (
                    <select
                      className="form-control"
                      value={nodeForm.type}
                      onChange={(e) => setNodeForm({ ...nodeForm, type: e.target.value })}
                    >
                      {allowedLevelOptions.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label>Parent Entity Unit</label>
                  {user?.role === 'group_admin' || user?.role === 'subsidiary_admin' ? (
                    <div style={{
                      padding: '8px 12px', borderRadius: 6,
                      background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                      fontSize: '12px', color: 'var(--text-secondary)'
                    }}>
                      {nodeList.find(n => String(n.id) === String(nodeForm.parent_id))?.name || 'Auto-assigned from your scope'}
                    </div>
                  ) : (
                    <select
                      className="form-control"
                      value={nodeForm.parent_id}
                      onChange={(e) => setNodeForm({ ...nodeForm, parent_id: e.target.value })}
                    >
                      <option value="">None (Root Node)</option>
                      {nodeList.map(n => (
                        <option key={n.id} value={n.id}>[{n.type.toUpperCase()}] {n.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {(nodeForm.type === 'project' || nodeForm.type === 'site') && (
                <div style={{
                  margin: '14px 0', padding: '14px 16px', background: 'linear-gradient(135deg, #f8faff, #f0fdf4)',
                  border: '1px solid #c7d2fe', borderRadius: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#4338ca' }}>
                      <Sparkles size={14} />
                      <span>Smart Project Classification Engine (Spec §6)</span>
                    </div>
                    <span style={{ fontSize: 10, color: '#6366f1', fontWeight: 600 }}>AI / Rule-Assisted</span>
                  </div>
                  <div className="form-group" style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 11 }}>Project Operational Activities</label>
                    <textarea
                      rows={2}
                      className="form-control"
                      placeholder="e.g. 14km high-altitude twin tube tunnel excavation, shotcrete, rock blasting with DG sets..."
                      value={nodeForm.project_description || ''}
                      onChange={(e) => {
                        setNodeForm({ ...nodeForm, project_description: e.target.value });
                        runClassifier(e.target.value);
                      }}
                    />
                    <span className="form-help">Type project activities to automatically match templates and pre-select applicable ESG indicators.</span>
                  </div>
                  {classificationResult && (
                    <div style={{
                      padding: '10px 14px', background: '#ffffff', borderRadius: 8,
                      border: '1px solid #e0e7ff', fontSize: 12
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, color: '#059669' }}>
                          ✓ Matched Template: <code>{classificationResult.template}</code>
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#4338ca', background: '#e0e7ff', padding: '1px 6px', borderRadius: 99 }}>
                          {classificationResult.params} parameters
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {classificationResult.activities.map((act, i) => (
                          <span key={i} style={{
                            fontSize: 10, padding: '2px 6px', borderRadius: 4,
                            background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontWeight: 600
                          }}>
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label>
                    {user?.role === 'group_admin' ? 'Subsidiary Portfolio Type' :
                     user?.role === 'subsidiary_admin' ? 'BU Operational Sector' :
                     'Project Sector'}
                  </label>
                  <select
                    className="form-control"
                    value={nodeForm.project_type}
                    onChange={(e) => setNodeForm({ ...nodeForm, project_type: e.target.value })}
                  >
                    {user?.role === 'group_admin'
                      ? MEIL_SUBSIDIARY_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)
                      : user?.role === 'subsidiary_admin'
                      ? BU_SECTORS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)
                      : PROJECT_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)
                    }
                  </select>
                </div>

                <div className="form-group">
                  <label>Ownership %</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="form-control"
                    value={nodeForm.ownership_pct}
                    onChange={(e) => setNodeForm({ ...nodeForm, ownership_pct: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label>Control Type</label>
                  <select
                    className="form-control"
                    value={nodeForm.control_type}
                    onChange={(e) => setNodeForm({ ...nodeForm, control_type: e.target.value })}
                  >
                    <option value="operational_control">Operational Control</option>
                    <option value="financial_control">Financial Control</option>
                    <option value="equity_share">Equity Share</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>State / Region</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Telangana, Odisha, Gujarat"
                    value={nodeForm.location_state}
                    onChange={(e) => setNodeForm({ ...nodeForm, location_state: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowNodeModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createNode.isPending}
                >
                  {createNode.isPending ? 'Creating...' : 'Save Entity Unit'}
                </button>
              </div>
            </form>
      </Modal>

      {/* Modal: New Reporting Period */}
      <Modal 
        isOpen={showPeriodModal} 
        onClose={() => setShowPeriodModal(false)} 
        maxWidth="560px"
      >
        <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="modal-header-icon">
                  <Calendar size={18} color="var(--brand-400)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', color: '#0F172A' }}>Create Reporting Period</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Open a new monthly or quarterly ESG submission window
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowPeriodModal(false)}>
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="login-error-banner" style={{ margin: '16px 24px 0' }}>
                <AlertCircle size={16} />
                <span>{typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}</span>
              </div>
            )}

            <form onSubmit={handleCreatePeriod} className="modal-body">
              <div className="form-group">
                <label>Period Code <span className="text-rose">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. FY2025-26-M06, FY2025-26-Q2"
                  value={periodForm.code}
                  onChange={(e) => setPeriodForm({ ...periodForm, code: e.target.value })}
                  required
                />
                <span className="form-help">Unique reporting window code.</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label>Financial Year <span className="text-rose">*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 2025-2026"
                    value={periodForm.financial_year}
                    onChange={(e) => setPeriodForm({ ...periodForm, financial_year: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Period Type</label>
                  <select
                    className="form-control"
                    value={periodForm.period_type}
                    onChange={(e) => setPeriodForm({ ...periodForm, period_type: e.target.value })}
                  >
                    <option value="month">Monthly Entry</option>
                    <option value="quarter">Quarterly Review</option>
                    <option value="financial_year">Annual BRSR</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label>Start Date <span className="text-rose">*</span></label>
                  <input
                    type="date"
                    className="form-control"
                    value={periodForm.start_date}
                    onChange={(e) => setPeriodForm({ ...periodForm, start_date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Date <span className="text-rose">*</span></label>
                  <input
                    type="date"
                    className="form-control"
                    value={periodForm.end_date}
                    onChange={(e) => setPeriodForm({ ...periodForm, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPeriodModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createPeriod.isPending}
                >
                  {createPeriod.isPending ? 'Creating...' : 'Create Period'}
                </button>
              </div>
            </form>
      </Modal>

      {/* Modal: Period Details Inspector */}
      {selectedPeriodDetail && (
        <Modal 
          isOpen={Boolean(selectedPeriodDetail)} 
          onClose={() => setSelectedPeriodDetail(null)} 
          maxWidth="640px"
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="modal-header-icon">
                <Calendar size={18} color="var(--brand-400)" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', color: '#0F172A' }}>Reporting Period Details</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Statutory configuration & SEBI compliance window for {selectedPeriodDetail?.code}
                </p>
              </div>
            </div>
            <button className="icon-btn" onClick={() => setSelectedPeriodDetail(null)}>
              <X size={18} />
            </button>
          </div>

          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Highlight Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Period Code</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--brand-400)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
                  {selectedPeriodDetail?.code}
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Status & Security</div>
                <div style={{ marginTop: 4 }}>
                  {selectedPeriodDetail?.status === 'LOCKED' ? (
                    <span className="badge badge-rose" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Lock size={11} /> LOCKED (Audit Frozen)
                    </span>
                  ) : (
                    <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Unlock size={11} /> OPEN (Submissions Active)
                    </span>
                  )}
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Financial Year</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  FY {selectedPeriodDetail?.financial_year}
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Period Granularity</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {selectedPeriodDetail?.period_type?.toUpperCase()} PACK {selectedPeriodDetail?.month ? `(Month ${selectedPeriodDetail.month})` : selectedPeriodDetail?.quarter ? `(Q${selectedPeriodDetail.quarter})` : ''}
                </div>
              </div>
            </div>

            {/* Date Window */}
            <div style={{ background: 'var(--bg-elevated)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Clock size={14} color="var(--brand-400)" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Calendar Collection Window</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span><strong>Start:</strong> {selectedPeriodDetail?.start_date}</span>
                <span style={{ color: 'var(--text-muted)' }}>→</span>
                <span><strong>End:</strong> {selectedPeriodDetail?.end_date}</span>
              </div>
            </div>

            {/* SEBI Compliance Scope */}
            <div style={{ background: 'rgba(99, 102, 241, 0.08)', padding: '14px 18px', borderRadius: '8px', border: '1px solid var(--border-brand)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <ShieldCheck size={15} color="var(--brand-400)" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>SEBI BRSR Statutory Governance</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                This period covers all 38 BRSR indicators across 7 hierarchy tiers. Maker data entries submitted during this window are cryptographically hashed and gated by Four-Eyes Checker verification.
              </p>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {isAdmin && (
                <button 
                  type="button"
                  className={`btn btn-sm ${selectedPeriodDetail?.status === 'LOCKED' ? 'btn-success' : 'btn-danger'}`}
                  onClick={() => handleTogglePeriodStatus(selectedPeriodDetail)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {selectedPeriodDetail?.status === 'LOCKED' ? <Unlock size={13} /> : <Lock size={13} />}
                  <span>{selectedPeriodDetail?.status === 'LOCKED' ? 'Unlock Period (Admin)' : 'Audit Freeze Period (Admin)'}</span>
                </button>
              )}
            </div>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setSelectedPeriodDetail(null)}
            >
              Close Details
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Dedicated All Periods Console */}
      <Modal 
        isOpen={showAllPeriodsModal} 
        onClose={() => setShowAllPeriodsModal(false)} 
        maxWidth="840px"
      >
        <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="modal-header-icon">
                  <Calendar size={18} color="var(--brand-400)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', color: '#0F172A' }}>Dedicated Reporting Periods Console</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Complete catalog of fiscal cycles, statutory deadlines, and locking states
                  </p>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setShowAllPeriodsModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Period Code</th>
                      <th>Financial Year</th>
                      <th>Type</th>
                      <th>Date Range</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodList.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                          No reporting periods configured.
                        </td>
                      </tr>
                    ) : (
                      periodList.map(p => (
                      <tr key={p.id}>
                        <td>
                          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#0F172A' }}>
                            {p.code}
                          </span>
                        </td>
                        <td>FY {p.financial_year}</td>
                        <td>
                          <span className="badge badge-brand">
                            {p.period_type?.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {p.start_date} → {p.end_date}
                        </td>
                        <td>
                          {p.status === 'LOCKED' ? (
                            <span className="badge badge-rose"><Lock size={10} /> Locked</span>
                          ) : (
                            <span className="badge badge-emerald"><Unlock size={10} /> Open</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setSelectedPeriodDetail(p);
                              setShowAllPeriodsModal(false);
                            }}
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowAllPeriodsModal(false)}
              >
                Close Console
              </button>
            </div>
      </Modal>

      {/* Modal: Entity Unit Details Inspector */}
      {selectedNodeDetail && (
        <Modal 
          isOpen={Boolean(selectedNodeDetail)} 
          onClose={() => setSelectedNodeDetail(null)} 
          maxWidth="640px"
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="modal-header-icon">
                <Building2 size={18} color="var(--brand-400)" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', color: '#0F172A' }}>Entity Unit Details</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  4-Tier Hierarchy Node: {['project', 'site'].includes(selectedNodeDetail?.type) ? (selectedNodeDetail?.name || '').toUpperCase() : selectedNodeDetail?.name}
                </p>
              </div>
            </div>
            <button className="icon-btn" onClick={() => setSelectedNodeDetail(null)}>
              <X size={18} />
            </button>
          </div>

          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Entity Name</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: 2, textTransform: ['project', 'site'].includes(selectedNodeDetail?.type) ? 'uppercase' : 'none' }}>
                  {['project', 'site'].includes(selectedNodeDetail?.type) ? (selectedNodeDetail?.name || '').toUpperCase() : selectedNodeDetail?.name}
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Unique Code</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brand-400)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{selectedNodeDetail?.code}</div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Hierarchy Level</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, textTransform: 'capitalize' }}>
                  {selectedNodeDetail?.type?.replace('_', ' ')}
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Audit Boundary</div>
                <div style={{ marginTop: 4 }}>
                  <span className={`badge ${selectedNodeDetail?.boundary ? 'badge-emerald' : 'badge-gray'}`}>
                    {selectedNodeDetail?.boundary ? 'SEBI In-Scope' : 'Excluded'}
                  </span>
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Project Sector</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2, textTransform: 'capitalize' }}>
                  {PROJECT_TYPES.find(p => p.value === selectedNodeDetail?.project_type)?.label || selectedNodeDetail?.project_type}
                </div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Ownership & Control</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {selectedNodeDetail?.ownership_pct}% ({selectedNodeDetail?.control_type?.replace('_', ' ')})
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>PostgreSQL ltree Materialized Path</div>
              <div style={{ fontSize: '12px', color: 'var(--brand-400)', fontFamily: 'JetBrains Mono' }}>
                {selectedNodeDetail?.path || 'ROOT'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Geographical Location</div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                {selectedNodeDetail?.location_state ? `${selectedNodeDetail.location_state}, ` : ''}{selectedNodeDetail?.location_country || 'India'}
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {isAdmin && (
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={() => {
                    handleOpenEditNode(selectedNodeDetail);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Edit3 size={14} />
                  <span>Edit Unit Details (Admin)</span>
                </button>
              )}
            </div>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setSelectedNodeDetail(null)}
            >
              Close Details
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: System Admin Edit Organization Unit */}
      {editingNode && (
        <Modal
          isOpen={Boolean(editingNode)}
          onClose={() => setEditingNode(null)}
          maxWidth="580px"
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="modal-header-icon" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--brand-400)' }}>
                <Edit3 size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', color: '#0F172A', margin: 0 }}>System Admin: Edit Unit</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Modify unit details & SEBI statutory boundaries ({editingNode?.code})
                </p>
              </div>
            </div>
            <button className="icon-btn" onClick={() => setEditingNode(null)}>
              <X size={18} />
            </button>
          </div>

          {nodeUpdateError && (
            <div className="login-error-banner" style={{ margin: '16px 24px 0' }}>
              <AlertCircle size={16} />
              <span>{typeof nodeUpdateError === 'string' ? nodeUpdateError : JSON.stringify(nodeUpdateError)}</span>
            </div>
          )}

          <form onSubmit={handleSaveEditNode} className="modal-body">
            <div className="form-group">
              <label>Unit Name <span className="text-rose">*</span></label>
              <input
                type="text"
                className="form-control"
                value={editNodeForm.name || ''}
                onChange={(e) => setEditNodeForm({ ...editNodeForm, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Unit Code</label>
              <input
                type="text"
                className="form-control"
                value={editNodeForm.code || ''}
                onChange={(e) => setEditNodeForm({ ...editNodeForm, code: e.target.value.toUpperCase() })}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>SEBI Audit Boundary</label>
                <select
                  className="form-control"
                  value={editNodeForm.boundary ? 'true' : 'false'}
                  onChange={(e) => setEditNodeForm({ ...editNodeForm, boundary: e.target.value === 'true' })}
                >
                  <option value="true">SEBI In-Scope (Consolidated)</option>
                  <option value="false">Excluded from Audit</option>
                </select>
              </div>

              <div className="form-group">
                <label>Ownership Share (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  className="form-control"
                  value={editNodeForm.ownership_pct !== undefined ? editNodeForm.ownership_pct : 100}
                  onChange={(e) => setEditNodeForm({ ...editNodeForm, ownership_pct: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Project Sector</label>
                <select
                  className="form-control"
                  value={editNodeForm.project_type || 'corporate'}
                  onChange={(e) => setEditNodeForm({ ...editNodeForm, project_type: e.target.value })}
                >
                  {PROJECT_TYPES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Operational State / UT</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Telangana, Andhra Pradesh"
                  value={editNodeForm.location_state || ''}
                  onChange={(e) => setEditNodeForm({ ...editNodeForm, location_state: e.target.value })}
                />
              </div>
            </div>

            {/* Administrator Password Authorization Gate */}
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#ef4444', fontWeight: 600, fontSize: '13px' }}>
                <ShieldAlert size={16} />
                <span>Administrator Password Required</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                Enter your System Administrator password to cryptographically authorize this hierarchy update.
              </p>
              <input
                type="password"
                className="form-control"
                placeholder="Enter your administrator password"
                value={adminPasswordForNode}
                onChange={(e) => setAdminPasswordForNode(e.target.value)}
                required
              />
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-default)', paddingTop: 14, marginTop: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingNode(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={updatingNodePending}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {updatingNodePending ? <RefreshCw size={14} className="spin" /> : <CheckCircle2 size={14} />}
                <span>{updatingNodePending ? 'Authorizing...' : 'Authorize & Save Changes'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
      {/* Modal: Delete to Trash Confirm */}
      {deletingNode && (
        <Modal
          isOpen={Boolean(deletingNode)}
          onClose={() => { setDeletingNode(null); setDeleteError(''); }}
          maxWidth="520px"
        >
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="modal-header-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>
                <Trash2 size={18} color="#ef4444" />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', color: '#0F172A' }}>Delete Organization Unit</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Unit will be soft-deleted and moved to the Trash Can (restorable)
                </p>
              </div>
            </div>
            <button className="icon-btn" onClick={() => { setDeletingNode(null); setDeleteError(''); }}>
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleConfirmDeleteNode} className="modal-body">
            <div style={{
              padding: '12px 16px', borderRadius: 8,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
              marginBottom: 16
            }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>
                ⚠ You are about to delete:
              </div>
              <div style={{ fontSize: '14px', color: '#0F172A', fontWeight: 600 }}>{deletingNode.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                Code: {deletingNode.code} | Type: {deletingNode.type?.replace('_', ' ').toUpperCase()}
              </div>
            </div>

            <div className="form-group">
              <label>Reason for Deletion <span className="text-rose">*</span></label>
              <textarea
                rows={3}
                className="form-control"
                placeholder="Provide a mandatory reason (e.g. Subsidiary demerged, BU consolidated into parent, Data correction...)"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                required
              />
              <span className="form-help">This reason is permanently logged in the Audit Trail.</span>
            </div>

            <div className="form-group">
              <label>Your Administrator Password <span className="text-rose">*</span></label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter your password to authorize deletion"
                value={deleteAdminPassword}
                onChange={(e) => setDeleteAdminPassword(e.target.value)}
                required
              />
            </div>

            {deleteError && (
              <div className="login-error-banner">
                <AlertCircle size={15} />
                <span>{typeof deleteError === 'string' ? deleteError : JSON.stringify(deleteError)}</span>
              </div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setDeletingNode(null); setDeleteError(''); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn"
                disabled={isDeletingPending}
                style={{
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                {isDeletingPending ? <RefreshCw size={14} className="spin" /> : <Trash2 size={14} />}
                <span>{isDeletingPending ? 'Deleting...' : 'Confirm Delete to Trash'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
