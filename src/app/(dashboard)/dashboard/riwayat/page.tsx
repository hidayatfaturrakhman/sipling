'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
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
  created_at: string;
  updated_at: string;
}

export default function RiwayatPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const supabase = createClient();

  useEffect(() => {
    fetchReports();
  }, [filterStatus]);

  const fetchReports = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from('reports')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data } = await query;
    setReports(data || []);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete.id) return;
    const { error } = await supabase.from('reports').update({ deleted_at: new Date().toISOString() }).eq('id', confirmDelete.id);
    if (!error) {
      setReports(reports.filter(r => r.id !== confirmDelete.id));
    }
    setConfirmDelete({ open: false, id: null });
  };

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

  const categoryColors: Record<string, string> = {
    jalan_rusak: 'bg-red-100 text-red-800',
    sampah: 'bg-green-100 text-green-800',
    jalan_berlubang: 'bg-orange-100 text-orange-800',
    lainnya: 'bg-gray-100 text-gray-800',
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Riwayat Laporan</h2>
        <Link
          href="/dashboard/buat-laporan"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          + Laporan Baru
        </Link>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm mb-6 p-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="resolved">Selesai</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-sm">Total</p>
          <p className="text-2xl font-bold text-blue-600">{reports.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-sm">Menunggu</p>
          <p className="text-2xl font-bold text-orange-600">
            {reports.filter(r => r.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-gray-500 text-sm">Selesai</p>
          <p className="text-2xl font-bold text-green-600">
            {reports.filter(r => r.status === 'resolved').length}
          </p>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
            <p>Belum ada laporan.</p>
            <Link href="/dashboard/buat-laporan" className="text-blue-600 hover:underline">
              Buat laporan pertama Anda
            </Link>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col md:flex-row gap-4">
                {report.photo_url && (
                  <img
                    src={report.photo_url.split(',')[0]}
                    alt="Foto"
                    className="w-full md:w-32 h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                    onClick={() => openLightbox(report.photo_url.split(','), 0)}
                  />
                )}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        categoryColors[report.category] || 'bg-gray-100'
                      }`}
                    >
                      {categoryLabels[report.category] || report.category}
                    </span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        report.status === 'pending'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {statusLabels[report.status]}
                    </span>
                  </div>

                  <p className="text-gray-700 mb-2">
                    {report.description || 'Tidak ada deskripsi'}
                  </p>

                  {report.address && (
                    <p className="text-sm text-gray-500 mb-2">📍 {report.address}</p>
                  )}

                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{formatDate(report.created_at)}</span>

                    {report.status === 'resolved' && report.updated_at && (
                      <span className="text-green-600">
                        ✓ Selesai: {formatDate(report.updated_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {report.status === 'pending' && (
                <div className="mt-4 pt-4 border-t dark:border-gray-700 flex justify-end">
                  <button
                    onClick={() => setConfirmDelete({ open: true, id: report.id })}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Hapus Laporan
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[99999] p-2 sm:p-4"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white hover:text-gray-300 p-2"
          >
            <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {lightboxImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length); }}
                className="absolute left-2 sm:left-4 text-white hover:text-gray-300 p-2"
              >
                <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % lightboxImages.length); }}
                className="absolute right-2 sm:right-4 text-white hover:text-gray-300 p-2"
              >
                <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          <div className="max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightboxImages[lightboxIndex]}
              alt={`Foto ${lightboxIndex + 1}`}
              className="max-w-full max-h-[85vh] sm:max-h-[90vh] object-contain rounded"
            />
            <p className="text-white text-center mt-2 text-sm">
              {lightboxIndex + 1} / {lightboxImages.length}
            </p>
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