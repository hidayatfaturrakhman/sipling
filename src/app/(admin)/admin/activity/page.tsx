'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>('all');
  const supabase = createClient();

  useEffect(() => {
    fetchLogs();
  }, [filterAction]);

  const fetchLogs = async () => {
    let query = supabase
      .from('activity_logs')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filterAction !== 'all') {
      query = query.eq('action', filterAction);
    }

    const { data } = await query;
    setLogs(data || []);
    setLoading(false);
  };

  const actionLabels: Record<string, string> = {
    login: 'Login',
    create_report: 'Buat Laporan',
    update_report: 'Update Laporan',
    delete_report: 'Hapus Laporan',
    update_category: 'Update Kategori',
    update_user: 'Update User',
  };

  const actionColors: Record<string, string> = {
    login: 'bg-blue-100 text-blue-800',
    create_report: 'bg-green-100 text-green-800',
    update_report: 'bg-yellow-100 text-yellow-800',
    delete_report: 'bg-red-100 text-red-800',
    update_category: 'bg-purple-100 text-purple-800',
    update_user: 'bg-indigo-100 text-indigo-800',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Memuat...</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Log Aktivitas</h2>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm mb-6 p-4">
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">Semua Aktivitas</option>
          <option value="login">Login</option>
          <option value="create_report">Buat Laporan</option>
          <option value="update_report">Update Laporan</option>
          <option value="delete_report">Hapus Laporan</option>
          <option value="update_category">Update Kategori</option>
          <option value="update_user">Update User</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-sm">Total Aktivitas</p>
          <p className="text-2xl font-bold text-blue-600">{logs.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-sm">Login</p>
          <p className="text-2xl font-bold text-green-600">
            {logs.filter(l => l.action === 'login').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-sm">Laporan Baru</p>
          <p className="text-2xl font-bold text-purple-600">
            {logs.filter(l => l.action === 'create_report').length}
          </p>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aktivitas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Tidak ada aktivitas
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(log.created_at).toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-800">
                        {log.profiles?.full_name || log.profiles?.email || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          actionColors[log.action] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {log.details || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}