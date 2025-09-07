import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, Eye, CheckCircle, XCircle, RefreshCw, Search } from 'lucide-react';

interface SchemaFailure {
  id: string;
  created_at: string;
  request_id: string | null;
  payload_preview: string;
  validation_errors: string;
  status: 'active' | 'resolved' | 'ignored';
  first_seen: string;
}

interface SchemaFailureStats {
  total: number;
  active: number;
  resolved: number;
  ignored: number;
}

export function SchemaFailuresAdmin() {
  const [failures, setFailures] = useState<SchemaFailure[]>([]);
  const [stats, setStats] = useState<SchemaFailureStats>({ total: 0, active: 0, resolved: 0, ignored: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'resolved' | 'ignored'>('all');

  useEffect(() => {
    fetchFailures();
    fetchStats();
  }, [filterStatus]);

  const fetchFailures = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('schema_failures')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setFailures(data || []);
    } catch (error) {
      console.error('Error fetching schema failures:', error);
      alert('Failed to load schema failures');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('schema_failures')
        .select('status');

      if (error) throw error;

      const statsData = data?.reduce((acc, item) => {
        acc.total++;
        acc[item.status as keyof SchemaFailureStats]++;
        return acc;
      }, { total: 0, active: 0, resolved: 0, ignored: 0 } as SchemaFailureStats) || { total: 0, active: 0, resolved: 0, ignored: 0 };

      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateFailureStatus = async (id: string, newStatus: 'active' | 'resolved' | 'ignored') => {
    try {
      const { error } = await supabase
        .from('schema_failures')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setFailures(failures.map(f => f.id === id ? { ...f, status: newStatus } : f));
      await fetchStats();
      alert(`Failure status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Search className="w-5 h-5 mr-2 text-cyan-400" />
          <h4 className="text-xl font-semibold text-white">Schema Failures Admin</h4>
        </div>
        <button
          onClick={fetchFailures}
          className="flex items-center px-3 py-2 bg-blue-900/30 hover:bg-blue-800/40 border border-blue-700 rounded-lg text-blue-400 text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Total</span>
            <AlertTriangle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{stats.total}</div>
        </div>
        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center justify-between">
            <span className="text-orange-400 text-sm">Active</span>
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-400 mt-2">{stats.active}</div>
        </div>
        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center justify-between">
            <span className="text-green-400 text-sm">Resolved</span>
            <CheckCircle className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400 mt-2">{stats.resolved}</div>
        </div>
        <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Ignored</span>
            <XCircle className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-400 mt-2">{stats.ignored}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
        >
          <option value="all">All Failures</option>
          <option value="active">Active Only</option>
          <option value="resolved">Resolved Only</option>
          <option value="ignored">Ignored Only</option>
        </select>
      </div>

      {/* Failures List */}
      {isLoading ? (
        <div className="text-center py-8 text-slate-400">Loading...</div>
      ) : failures.length === 0 ? (
        <div className="text-center py-8 text-slate-400">No failures found</div>
      ) : (
        <div className="space-y-4">
          {failures.map((failure) => (
            <div key={failure.id} className="bg-slate-700 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  {failure.status === 'active' && <AlertTriangle className="w-4 h-4 text-orange-400 mr-2" />}
                  {failure.status === 'resolved' && <CheckCircle className="w-4 h-4 text-green-400 mr-2" />}
                  {failure.status === 'ignored' && <XCircle className="w-4 h-4 text-gray-400 mr-2" />}
                  <span className="text-white font-medium">{failure.id.slice(0, 8)}</span>
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    failure.status === 'active' ? 'bg-orange-900/40 text-orange-400' :
                    failure.status === 'resolved' ? 'bg-green-900/40 text-green-400' :
                    'bg-gray-900/40 text-gray-400'
                  }`}>
                    {failure.status}
                  </span>
                </div>
                <select
                  value={failure.status}
                  onChange={(e) => updateFailureStatus(failure.id, e.target.value as any)}
                  className="bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-sm"
                >
                  <option value="active">Active</option>
                  <option value="resolved">Resolved</option>
                  <option value="ignored">Ignored</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
                <div>
                  <span className="text-slate-400">Created:</span> {formatDate(failure.created_at)}
                </div>
                <div>
                  <span className="text-slate-400">First Seen:</span> {formatDate(failure.first_seen)}
                </div>
              </div>
              <div className="mt-2 text-sm text-slate-400">
                <span className="text-slate-400">Preview:</span> {failure.payload_preview.slice(0, 100)}...
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SchemaFailuresAdmin;