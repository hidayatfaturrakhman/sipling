'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { compressImage } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';

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
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxZoom, setLightboxZoom] = useState(1);
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
      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status: 'resolved',
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedReport.id);

      if (updateError) throw new Error(updateError.message);

      setReports(reports.map(r => r.id === selectedReport.id ? { ...r, status: 'resolved' } : r));
      setSelectedReport(null);
      setResolutionPhoto(null);
      showToast('Laporan berhasil ditandai selesai!', 'success');
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
    await supabase.from('reports').update({ deleted_at: new Date().toISOString() }).eq('id', confirmDelete.id);
    setReports(reports.filter(r => r.id !== confirmDelete.id));
    setSelectedReport(null);
    setConfirmDelete({ open: false, id: null });
  };

  const openLightbox = (images: string[], index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxIndex(0);
    setLightboxImages([]);
    setLightboxZoom(1);
    setDragPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setLightboxZoom(prev => Math.min(prev + 0.5, 4));
    setDragPosition({ x: 0, y: 0 });
  };
  const handleZoomOut = () => setLightboxZoom(prev => Math.max(prev - 0.5, 0.5));
  const handleZoomReset = () => {
    setLightboxZoom(1);
    setDragPosition({ x: 0, y: 0 });
  };
  const handleWheelZoom = (e: React.WheelEvent) => {
    if (e.deltaY < 0) handleZoomIn();
    else handleZoomOut();
  };

  // Drag functionality
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (lightboxZoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - dragPosition.x, y: e.clientY - dragPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && lightboxZoom > 1) {
      setDragPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
                          onClick={() => openLightbox(selectedReport.photo_url.split(','), index)}
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
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {resolving ? 'Menyimpan...' : 'Selesai'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ open: true, id: selectedReport.id })}
                      className="bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg flex items-center justify-center"
                      title="Hapus"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
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

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[99999] p-2 sm:p-4"
          onClick={closeLightbox}
        >
          {/* Zoom Controls */}
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex gap-1 z-10" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleZoomOut} className="text-white hover:text-gray-300 p-2 bg-black/50 rounded" title="Zoom Out">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
            </button>
            <button onClick={handleZoomReset} className="text-white hover:text-gray-300 px-3 py-2 bg-black/50 rounded text-sm" title="Reset Zoom">{Math.round(lightboxZoom * 100)}%</button>
            <button onClick={handleZoomIn} className="text-white hover:text-gray-300 p-2 bg-black/50 rounded" title="Zoom In">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" /></svg>
            </button>
          </div>

          <button onClick={closeLightbox} className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white hover:text-gray-300 p-2">
            <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          {lightboxImages.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length); }} className="absolute left-2 sm:left-4 text-white hover:text-gray-300 p-2">
                <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % lightboxImages.length); }} className="absolute right-2 sm:right-4 text-white hover:text-gray-300 p-2">
                <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          )}

          <div className={`max-w-full max-h-full overflow-hidden ${lightboxZoom > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`} onClick={(e) => e.stopPropagation()} onWheel={handleWheelZoom} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            <img src={lightboxImages[lightboxIndex]} alt={`Foto ${lightboxIndex + 1}`} className="object-contain transition-transform duration-200" style={{ maxWidth: '100%', maxHeight: '85vh', transform: `scale(${lightboxZoom}) translate(${dragPosition.x}px, ${dragPosition.y}px)`, transformOrigin: 'center center', cursor: lightboxZoom > 1 ? 'grab' : 'zoom-in' }} draggable={false} />
            <p className="text-white text-center mt-2 text-sm">{lightboxIndex + 1} / {lightboxImages.length}</p>
          </div>
        </div>
      )}

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