'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

interface Report {
  id: string;
  category: string;
  description: string;
  photo_url: string;
  latitude: number;
  longitude: number;
  address: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export default function ExportPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const supabase = createClient();

  useEffect(() => {
    const fetchReports = async () => {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, '0')}-01`;

      const { data } = await supabase
        .from('reports')
        .select('*, profiles(full_name, email)')
        .gte('created_at', startDate)
        .lt('created_at', endDate)
        .order('created_at', { ascending: false });

      setReports(data || []);
      setLoading(false);
    };

    fetchReports();
  }, [month, year, supabase]);

  const handleExport = () => {
    const categoryLabels: Record<string, string> = {
      jalan_rusak: 'Jalan Rusak',
      sampah: 'Sampah',
      jalan_berlubang: 'Jalan Berlubang',
      lainnya: 'Lainnya',
    };

    const statusLabels: Record<string, string> = {
      pending: 'Menunggu',
      resolved: 'Selesai',
    };

    const exportData = reports.map((report) => ({
      'No': reports.indexOf(report) + 1,
      'Tanggal': new Date(report.created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      'Kategori': categoryLabels[report.category] || report.category,
      'Deskripsi': report.description || '-',
      'Alamat': report.address || `${report.latitude}, ${report.longitude}`,
      'Pelapor': report.profiles?.full_name || report.profiles?.email || '-',
      'Status': statusLabels[report.status] || report.status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    XLSX.writeFile(wb, `Laporan_${monthNames[month - 1]}_${year}.xlsx`);
  };

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
  };

  const categoryStats = {
    jalan_rusak: reports.filter(r => r.category === 'jalan_rusak').length,
    sampah: reports.filter(r => r.category === 'sampah').length,
    jalan_berlubang: reports.filter(r => r.category === 'jalan_berlubang').length,
    lainnya: reports.filter(r => r.category === 'lainnya').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Memuat...</div>
      </div>
    );
  }

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Export Laporan</h2>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h3 className="font-semibold text-gray-800 mb-3 text-sm">Pilih Periode</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Bulan</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {monthNames.map((name, index) => (
                <option key={index} value={index + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Tahun</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-xs mb-1">Total</p>
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col justify-between">
          <p className="text-gray-500 text-xs mb-1">Selesai</p>
          <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
          <button
            onClick={handleExport}
            disabled={reports.length === 0}
            className="mt-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50"
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="bg-white rounded-xl shadow-sm mb-4 lg:hidden">
        {reports.length === 0 ? (
          <p className="text-center text-gray-500 p-6">Tidak ada laporan</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {reports.map((report, index) => (
              <div key={report.id} className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">
                    {new Date(report.created_at).toLocaleDateString('id-ID')}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    report.status === 'pending' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {report.status === 'pending' ? 'Menunggu' : 'Selesai'}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-800">
                  {report.category === 'jalan_rusak' && 'Jalan Rusak'}
                  {report.category === 'sampah' && 'Sampah'}
                  {report.category === 'jalan_berlubang' && 'Jalan Berlubang'}
                  {report.category === 'lainnya' && 'Lainnya'}
                </p>
                <p className="text-xs text-gray-500 truncate">{report.profiles?.full_name || report.profiles?.email || '-'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm p-6 mb-4">
        <h3 className="font-semibold text-gray-800 mb-4">
          Laporan {monthNames[month - 1]} {year}
        </h3>
        {reports.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Tidak ada laporan</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">No</th>
                  <th className="px-4 py-2 text-left">Tanggal</th>
                  <th className="px-4 py-2 text-left">Kategori</th>
                  <th className="px-4 py-2 text-left">Pelapor</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reports.map((report, index) => (
                  <tr key={report.id}>
                    <td className="px-4 py-2">{index + 1}</td>
                    <td className="px-4 py-2">{new Date(report.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-2">
                      {report.category === 'jalan_rusak' && 'Jalan Rusak'}
                      {report.category === 'sampah' && 'Sampah'}
                      {report.category === 'jalan_berlubang' && 'Jalan Berlubang'}
                      {report.category === 'lainnya' && 'Lainnya'}
                    </td>
                    <td className="px-4 py-2">{report.profiles?.full_name || report.profiles?.email || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        report.status === 'pending' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {report.status === 'pending' ? 'Menunggu' : 'Selesai'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}