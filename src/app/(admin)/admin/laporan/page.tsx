'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

import { compressImage } from '@/lib/utils';

interface Report {
  id: string;
  category: string;
  description: string;
  photo_url: string;
  latitude: number;
  longitude: number;
  address: string;
  status: string;
  resolution_photo_url: string;
  resolved_at: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export default function AdminLaporanPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateStart, setFilterDateStart] = useState<string>('');
  const [filterDateEnd, setFilterDateEnd] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolutionPhoto, setResolutionPhoto] = useState<File | null>(null);
  const itemsPerPage = 10;
  const supabase = createClient();

  useEffect(() => {
    // Reset to page 1 when filters change
    if (filterCategory !== 'all' || filterStatus !== 'all' || search || filterDateStart || filterDateEnd) {
      setPage(1);
    }
  }, [filterCategory, filterStatus, search, filterDateStart, filterDateEnd]);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      let query = supabase
        .from('reports')
        .select('*, profiles(full_name, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * itemsPerPage, page * itemsPerPage - 1);

      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      if (search) {
        query = query.ilike('description', `%${search}%`);
      }
      if (filterDateStart) {
        query = query.gte('created_at', filterDateStart);
      }
      if (filterDateEnd) {
        query = query.lte('created_at', filterDateEnd + 'T23:59:59');
      }

      const { data, count } = await query;
      setReports(data || []);
      setTotalCount(count || 0);
      setLoading(false);
    };

    fetchReports();
  }, [filterCategory, filterStatus, page, search, filterDateStart, filterDateEnd, supabase]);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleResolve = async () => {
    if (!selectedReport) return;
    setResolving(true);
    try {
      let resolutionPhotoUrl = '';
      if (resolutionPhoto) {
        const fileName = `resolution-${Date.now()}-${resolutionPhoto.name}`;
        const { error: uploadError } = await supabase.storage
          .from('report-photos')
          .upload(fileName, resolutionPhoto);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('report-photos').getPublicUrl(fileName);
        resolutionPhotoUrl = urlData.publicUrl;
      }
      await supabase.from('reports').update({
        status: 'resolved',
        resolution_photo_url: resolutionPhotoUrl,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq('id', selectedReport.id);
      setReports(reports.map(r => r.id === selectedReport.id ? { ...r, status: 'resolved', resolution_photo_url: resolutionPhotoUrl, resolved_at: new Date().toISOString() } : r));
      setSelectedReport(null);
      setResolutionPhoto(null);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setResolving(false);
    }
  };

  const handleResolutionPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Foto maksimal 10MB');
        return;
      }
      try {
        const compressed = await compressImage(file);
        setResolutionPhoto(compressed);
      } catch {
        setResolutionPhoto(file);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus laporan ini?')) return;
    await supabase.from('reports').delete().eq('id', id);
    setReports(reports.filter(r => r.id !== id));
    setSelectedReport(null);
  };

  const categoryLabels: Record<string, string> = {
    jalan_rusak: 'Jalan Rusak',
    sampah: 'Sampah',
    jalan_berlubang: 'Jalan Berlubang',
    lainnya: 'Lainnya',
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
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Semua Laporan</h2>

      <div className="bg-white rounded-xl shadow-sm mb-6 p-4">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Cari laporan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">Semua Kategori</option>
            <option value="jalan_rusak">Jalan Rusak</option>
            <option value="sampah">Sampah</option>
            <option value="jalan_berlubang">Jalan Berlubang</option>
            <option value="lainnya">Lainnya</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="resolved">Selesai</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Tgl Mulai"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Tgl Akhir"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Foto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pelapor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Tidak ada laporan
                  </td>
                </tr>
              ) : (
                reports.map((report: Report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {report.photo_url && (
                        <img
                          src={report.photo_url}
                          alt="Foto"
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {categoryLabels[report.category]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {report.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {report.profiles?.full_name || report.profiles?.email || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          report.status === 'pending'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {report.status === 'pending' ? 'Menunggu' : 'Selesai'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(report.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1 rounded ${
                  page === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">Detail Laporan</h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {selectedReport.photo_url && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Foto Laporan</p>
                <img
                  src={selectedReport.photo_url}
                  alt="Foto Laporan"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}

            {selectedReport.resolution_photo_url && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-1">Foto Bukti Perbaikan</p>
                <img
                  src={selectedReport.resolution_photo_url}
                  alt="Foto Bukti"
                  className="w-full h-48 object-cover rounded-lg border-2 border-green-500"
                />
                {selectedReport.resolved_at && (
                  <p className="text-xs text-green-600 mt-1">
                    Diselesaikan: {new Date(selectedReport.resolved_at).toLocaleDateString('id-ID')}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Kategori</p>
                <p className="font-medium">{categoryLabels[selectedReport.category]}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className={`font-medium ${selectedReport.status === 'pending' ? 'text-orange-600' : 'text-green-600'}`}>
                  {selectedReport.status === 'pending' ? 'Menunggu' : 'Selesai'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Deskripsi</p>
                <p className="text-gray-700">{selectedReport.description || 'Tidak ada'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Lokasi</p>
                <p className="text-sm">{selectedReport.address || `${selectedReport.latitude}, ${selectedReport.longitude}`}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pelapor</p>
                <p className="text-sm">{selectedReport.profiles?.full_name || selectedReport.profiles?.email || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tanggal</p>
                <p className="text-sm">
                  {new Date(selectedReport.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-6">
              {selectedReport.status === 'pending' && (
                <>
                  <div className="mb-2">
                    <label className="block text-sm text-gray-600 mb-2">
                      Upload Foto Bukti Perbaikan (Opsional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleResolutionPhotoChange}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {resolutionPhoto && (
                      <p className="text-xs text-green-600 mt-1">✓ Foto dipilih: {resolutionPhoto.name}</p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleResolve}
                      disabled={resolving}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg disabled:opacity-50"
                    >
                      {resolving ? 'Menyimpan...' : 'Tandai Selesai'}
                    </button>
                    <button
                      onClick={() => handleDelete(selectedReport.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg"
                    >
                      Hapus
                    </button>
                  </div>
                </>
              )}
              {selectedReport.status === 'resolved' && (
                <button
                  onClick={() => handleDelete(selectedReport.id)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg"
                >
                  Hapus
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}