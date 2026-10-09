import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Trash2, FileText, Calendar, User, Search, RefreshCw, AlertCircle } from 'lucide-react';

export default function Trash() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: trashItems = [], isLoading, error, refetch } = useQuery({
    queryKey: ['trash'],
    queryFn: async () => {
      const res = await axios.get('/api/v1/audit/trash');
      return res.data;
    }
  });

  const filteredItems = trashItems.filter(item => 
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.details?.document_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.details?.project_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.details?.reason?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: '#FEE2E2', padding: 8, borderRadius: 8, color: '#EF4444' }}>
              <Trash2 size={20} />
            </div>
            Deletion Audit (Trash)
          </h1>
          <p style={{ margin: 0, color: '#64748B', fontSize: 14 }}>
            Immutable record of all controlled deletions across your authorized scope.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0',
            borderRadius: 6, fontSize: 14, fontWeight: 600, color: '#475569',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div style={{ marginBottom: 24, position: 'relative' }}>
        <Search size={18} color="#94A3B8" style={{ position: 'absolute', left: 14, top: 11 }} />
        <input 
          type="text" 
          placeholder="Search by Deletion ID, Document Name, Project, or Reason..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px 10px 40px', border: '1px solid #E2E8F0',
            borderRadius: 8, fontSize: 14, outline: 'none', color: '#0F172A'
          }}
        />
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94A3B8' }}>Loading trash records...</div>
      ) : error ? (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: 16, borderRadius: 8, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 12 }}>
          <AlertCircle size={20} />
          Failed to load deletion audit. Please ensure you have the required permissions.
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', border: '1px dashed #E2E8F0', borderRadius: 12, background: '#F8FAFC' }}>
          <Trash2 size={40} color="#CBD5E1" style={{ marginBottom: 16 }} />
          <h3 style={{ margin: '0 0 8px 0', color: '#334155', fontSize: 16 }}>No deleted items found</h3>
          <p style={{ margin: 0, color: '#94A3B8', fontSize: 14 }}>There are no deletion records in your authorized scope.</p>
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Deletion ID</th>
                <th style={{ padding: '12px 16px' }}>Deleted Item</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>Project</th>
                <th style={{ padding: '12px 16px' }}>Evidence ID</th>
                <th style={{ padding: '12px 16px' }}>Deleted By</th>
                <th style={{ padding: '12px 16px' }}>Reason</th>
                <th style={{ padding: '12px 16px' }}>Date/Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}>
                  <td style={{ padding: '14px 16px', fontFamily: 'JetBrains Mono, monospace', color: '#64748B', fontSize: 12 }}>
                    {item.id.substring(0, 8)}...
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 500, color: '#0F172A' }}>
                    {item.details?.document_name || 'Unknown'}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#475569' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F1F5F9', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                      <FileText size={12} />
                      {item.target_type}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#0F172A', fontWeight: 500 }}>
                    {item.details?.project_id || 'N/A'}
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'JetBrains Mono, monospace', color: '#64748B', fontSize: 12 }}>
                    {item.details?.evidence_id || 'N/A'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                        <User size={12} />
                      </div>
                      <div>
                        <div style={{ color: '#0F172A', fontWeight: 500 }}>{item.details?.deleted_by_name || item.actor_email || 'Unknown'}</div>
                        <div style={{ color: '#64748B', fontSize: 11 }}>{item.actor_role}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#475569', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.details?.reason}>
                    {item.details?.reason}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748B', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={14} />
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
