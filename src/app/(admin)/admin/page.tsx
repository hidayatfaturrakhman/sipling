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
  FileText,
  Clock,
  CheckCircle2,
  Trash2,
  Check,
  MapPin,
  X,
  ImageIcon,
} from 'lucide-react';

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
  profiles?: {
    full_name: string;
    email: string;
  };
}

export default function AdminDashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [resolving, setResolving] = useState(false);
  const [resolutionPhoto, setResolutionPhoto] = useState<File | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const supabase = createClient();
  const { showToast } = useToast();

  useEffect(() => {
    const fetchReports = async () => {
      let query = supabase
        .from('reports')
        .select('*, profiles(full_name, email)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }

      const { data: reportsData } = await query;

      const { count: total } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      const { count: pending } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .is('deleted_at', null);

      const { count: resolved } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved')
        .is('deleted_at', null);

      setReports(reportsData || []);
      setStats({ total: total || 0, pending: pending || 0, resolved: resolved || 0 });
      setLoading(false);
    };

    fetchReports();
  }, [filterCategory, supabase]);

  const handleResolve = async () => {
    if (!selectedReport) return;
    setResolving(true);
    try {
      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status: 'resolved',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReport.id);

      if (updateError) throw new Error(updateError.message);

      setReports(reports.map(r => r.id === selectedReport.id ? { ...r, status: 'resolved' } : r));
      setStats(stats => ({
        ...stats,
        pending: stats.pending - 1,
        resolved: stats.resolved + 1,
      }));
      setSelectedReport(null);
      setResolutionPhoto(null);
      showToast('Laporan berhasil ditandai selesai!', 'success');
      await logActivity('resolve_report', `Menyelesaikan laporan: ${selectedReport.category}`);
      await logReportHistory(selectedReport.id, 'resolved', `Laporan diselesaikan oleh admin`);
    } catch (err: any) {
      console.error('Error resolving report:', err);
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
      } catch (err) {
        setResolutionPhoto(file);
      }
    }
  };

  const openGoogleMaps = (report: Report) => {
    const address = encodeURIComponent(report.address || `${report.latitude}, ${report.longitude}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank');
  };

  const handleDelete = async () => {
    if (!confirmDelete.id) return;
    const deletedReport = reports.find(r => r.id === confirmDelete.id);
    await supabase.from('reports').update({ deleted_at: new Date().toISOString() }).eq('id', confirmDelete.id);
    setReports(reports.filter(r => r.id !== confirmDelete.id));
    setStats(stats => ({ ...stats, total: stats.total - 1 }));
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
        <div className="text-gray-500 dark:text-gray-400">Memuat...</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Dashboard Admin</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Total Laporan</p>
          </div>
          <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Menunggu</p>
          </div>
          <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Selesai</p>
          </div>
          <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
        </div>
      </div>

      <div className="mb-4">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg"
        >
          <option value="all">Semua Kategori</option>
          <option value="jalan_rusak">Jalan Rusak</option>
          <option value="sampah">Sampah</option>
          <option value="jalan_berlubang">Jalan Berlubang</option>
          <option value="lainnya">Lainnya</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b dark:border-gray-700">
            <h3 className="font-semibold text-gray-800 dark:text-white">Laporan Terbaru</h3>
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y dark:divide-gray-700">
            {reports.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">Belum ada laporan</div>
            ) : (
              reports.slice(0, 10).map((report) => (
                <div
                  key={report.id}
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex items-start gap-3">
                    {report.photo_url && (
                      <img
                        src={report.photo_url?.split(',')[0]}
                        alt="Foto"
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    )}
                    {!report.photo_url && (
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium dark:text-white">{categoryLabels[report.category]}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            report.status === 'pending'
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}
                        >
                          {report.status === 'pending' ? 'Menunggu' : 'Selesai'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(report.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700 shrink-0">
              <h3 className="text-lg font-semibold dark:text-white">Detail Laporan</h3>
              <button
                onClick={() => { setSelectedReport(null); setResolutionPhoto(null); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedReport.photo_url && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Foto Laporan ({selectedReport.photo_url.split(',').length})</p>
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
                            className="absolute bottom-1 right-1 bg-white dark:bg-gray-700 rounded-full p-1 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600"
                            title="Buka di Google Maps"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedReport.resolution_photo_url && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Foto Bukti Perbaikan</p>
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
                  <p className="text-xs text-gray-500 dark:text-gray-400">Kategori</p>
                  <p className="font-medium dark:text-white">{categoryLabels[selectedReport.category]}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    selectedReport.status === 'pending' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    {selectedReport.status === 'pending' ? 'Menunggu' : 'Selesai'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Deskripsi</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{selectedReport.description || 'Tidak ada'}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Lokasi</p>
                <p className="text-sm dark:text-gray-300">{selectedReport.address || `${selectedReport.latitude}, ${selectedReport.longitude}`}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pelapor</p>
                <p className="text-sm dark:text-gray-300">{selectedReport.profiles?.full_name || selectedReport.profiles?.email || 'Unknown'}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tanggal</p>
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
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