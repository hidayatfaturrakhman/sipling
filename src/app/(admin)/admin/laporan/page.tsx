'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { compressImage } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Lightbox } from '@/components/Lightbox';
import { logActivity } from '@/lib/activityLog';
import { logReportHistory } from '@/lib/reportHistory';
import {
  Trash2,
  X,
  Check,
  MapPin,
  FileText,
  ImageIcon,
} from 'lucide-react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const itemsPerPage = 10;
  const supabase = createClient();
  const { showToast } = useToast();

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
        .is('deleted_at', null)
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
      let resolutionPhotoUrl = selectedReport.resolution_photo_url || null;

      // Upload resolution photo if exists
      if (resolutionPhoto) {
        const fileName = `reports/${selectedReport.id}/resolution_${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('report-photos')
          .upload(fileName, resolutionPhoto, { contentType: 'image/jpeg' });

        if (uploadError) {
          console.error('Upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage.from('report-photos').getPublicUrl(uploadData.path);
          resolutionPhotoUrl = urlData.publicUrl;
        }
      }

      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status: 'resolved',
          resolution_photo_url: resolutionPhotoUrl,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReport.id);

      if (updateError) throw new Error(updateError.message);

      // Send email notification to reporter
      const reporterEmail = selectedReport.profiles?.email;
      const reporterName = selectedReport.profiles?.full_name || 'Warga';
      if (reporterEmail) {
        await fetch(`${SUPABASE_URL}/functions/v1/send-report-resolved-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email: reporterEmail,
            fullName: reporterName,
            categoryLabel: categoryLabels[selectedReport.category] || selectedReport.category,
            description: selectedReport.description,
            resolutionPhotoUrl: resolutionPhotoUrl || undefined,
          }),
        });
      }

      setReports(reports.map(r => r.id === selectedReport.id ? { ...r, status: 'resolved' } : r));
      setSelectedReport(null);
      setResolutionPhoto(null);
      showToast('Laporan berhasil ditandai selesai! Email notifikasi sudah dikirim.', 'success');
      await logActivity('resolve_report', `Menyelesaikan laporan: ${selectedReport.category}`);
      await logReportHistory(selectedReport.id, 'resolved', `Laporan diselesaikan oleh admin`);
    } catch (err: any) {
      console.error('Error:', err);
      showToast(err.message || 'Gagal menyelesaikan laporan', 'error');
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

  const openGoogleMaps = (report: any) => {
    const address = encodeURIComponent(report.address || `${report.latitude}, ${report.longitude}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
  };

  const handleDelete = async () => {
    if (!confirmDelete.id) return;
    const deletedReport = reports.find(r => r.id === confirmDelete.id);
    await supabase.from('reports').update({ deleted_at: new Date().toISOString() }).eq('id', confirmDelete.id);
    setReports(reports.filter(r => r.id !== confirmDelete.id));
    setSelectedReport(null);
    setConfirmDelete({ open: false, id: null });
    if (deletedReport) {
      await logActivity('delete_report', `Menghapus laporan: ${deletedReport.category}`);
      await logReportHistory(confirmDelete.id, 'deleted', `Laporan "${deletedReport.category}" dihapus oleh admin`);
    }
  };

  const openLightbox = (images: string[]) => {
    setLightboxImages(images);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxImages([]);
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

      <div className="bg-white rounded-xl shadow-sm mb-4 p-3 space-y-3">
        <input
          type="text"
          placeholder="Cari laporan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="resolved">Selesai</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filterDateStart}
            onChange={(e) => setFilterDateStart(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-400">-</span>
          <input
            type="date"
            value={filterDateEnd}
            onChange={(e) => setFilterDateEnd(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Mobile Card Layout */}
        <div className="divide-y divide-gray-200 lg:hidden">
          {reports.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Tidak ada laporan
            </div>
          ) : (
            reports.map((report: Report) => (
              <div
                key={report.id}
                className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex gap-3">
                  {report.photo_url && (
                    <img
                      src={report.photo_url?.split(',')[0]}
                      alt="Foto"
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {categoryLabels[report.category]}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        report.status === 'pending' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {report.status === 'pending' ? 'Menunggu' : 'Selesai'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate mb-1">
                      {report.description || 'Tidak ada deskripsi'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{report.profiles?.full_name || report.profiles?.email || '-'}</span>
                      <span>{new Date(report.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table Layout */}
        <div className="hidden lg:block overflow-x-auto">
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
                          src={report.photo_url?.split(',')[0]}
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
          <div className="px-4 py-4 flex justify-center gap-2">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b shrink-0">
              <h3 className="text-lg font-semibold">Detail Laporan</h3>
              <button
                onClick={() => { setSelectedReport(null); setResolutionPhoto(null); }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedReport.photo_url && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Foto Laporan ({selectedReport.photo_url.split(',').length})</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedReport.photo_url.split(',').map((url: string, index: number) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-24 sm:h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition"
                          onClick={() => openLightbox(selectedReport.photo_url.split(','))}
                        />
                        {index === 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openGoogleMaps(selectedReport); }}
                            className="absolute bottom-1 right-1 bg-white rounded-full p-1 shadow-sm hover:bg-gray-100"
                            title="Buka di Google Maps"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#4285F4"/>
                              <path d="M12 2v7c0 3.5-4 8-4 8s4 3.5 4 7" fill="#FBBC05"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedReport.resolution_photo_url && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Foto Bukti Perbaikan</p>
                  <img
                    src={selectedReport.resolution_photo_url}
                    alt="Foto Bukti"
                    className="w-full h-40 object-cover rounded-lg border-2 border-green-500"
                  />
                  {selectedReport.resolved_at && (
                    <p className="text-xs text-green-600 mt-1">
                      Diselesaikan: {new Date(selectedReport.resolved_at).toLocaleDateString('id-ID')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Kategori</p>
                  <p className="font-medium">{categoryLabels[selectedReport.category]}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    selectedReport.status === 'pending' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {selectedReport.status === 'pending' ? 'Menunggu' : 'Selesai'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500">Deskripsi</p>
                <p className="text-sm text-gray-700">{selectedReport.description || 'Tidak ada'}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Lokasi</p>
                <p className="text-sm">{selectedReport.address || `${selectedReport.latitude}, ${selectedReport.longitude}`}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Pelapor</p>
                <p className="text-sm">{selectedReport.profiles?.full_name || selectedReport.profiles?.email || 'Unknown'}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Tanggal</p>
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

            <div className="p-4 border-t shrink-0">
              {selectedReport.status === 'pending' && (
                <>
                  <div className="mb-3">
                    <label className="block text-xs text-gray-600 mb-2">
                      Upload Foto Bukti (Opsional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleResolutionPhotoChange}
                      className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {resolutionPhoto && (
                      <p className="text-xs text-green-600 mt-1">✓ {resolutionPhoto.name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleResolve}
                      disabled={resolving}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      {resolving ? 'Menyimpan...' : 'Selesai'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ open: true, id: selectedReport.id })}
                      className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg flex items-center justify-center"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
              {selectedReport.status === 'resolved' && (
                <button
                  onClick={() => setConfirmDelete({ open: true, id: selectedReport.id })}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <Lightbox
          images={lightboxImages}
          isOpen={lightboxOpen}
          onClose={closeLightbox}
        />

      <ConfirmDialog
        open={confirmDelete.open}
        title="Hapus Laporan"
        message="Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete({ open: false, id: null })}
        danger
      />
    </div>
  );
}