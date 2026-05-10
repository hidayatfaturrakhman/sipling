'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const supabase = createClient();

  useEffect(() => {
    const fetchReports = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: reportsData } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5);

      const { count: total } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('deleted_at', null);

      const { count: pending } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .is('deleted_at', null);

      const { count: resolved } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'resolved')
        .is('deleted_at', null);

      setReports(reportsData || []);
      setStats({
        total: total || 0,
        pending: pending || 0,
        resolved: resolved || 0,
      });
      setLoading(false);
    };

    fetchReports();
  }, [supabase]);

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

  // Drag functionality with boundary constraints
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
      const container = e.currentTarget;
      const containerRect = container.getBoundingClientRect();
      const scaledWidth = containerRect.width * lightboxZoom;
      const scaledHeight = containerRect.height * lightboxZoom;

      const maxX = Math.max(0, (scaledWidth - containerRect.width) / 2);
      const maxY = Math.max(0, (scaledHeight - containerRect.height) / 2);

      let newX = e.clientX - dragStart.x;
      let newY = e.clientY - dragStart.y;

      newX = Math.max(-maxX, Math.min(maxX, newX));
      newY = Math.max(-maxY, Math.min(maxY, newY));

      setDragPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Memuat...</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Warga</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-gray-500 text-sm">Total Laporan</p>
          <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-gray-500 text-sm">Menunggu</p>
          <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-gray-500 text-sm">Selesai</p>
          <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
        </div>
      </div>

      <div className="mb-6">
        <Link
          href="/dashboard/buat-laporan"
          className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
        >
          + Buat Laporan Baru
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-800">Laporan Terbaru</h3>
        </div>

        {reports.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Belum ada laporan. Buat laporan baru!
          </div>
        ) : (
          <div className="divide-y">
            {reports.map((report) => (
              <div key={report.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  {report.photo_url && (
                    <img
                      src={report.photo_url.split(',')[0]}
                      alt="Foto"
                      className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-90"
                      onClick={() => openLightbox(report.photo_url.split(','), 0)}
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
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
                        {statusLabels[report.status] || report.status}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-1">
                      {report.description || 'Tidak ada deskripsi'}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {new Date(report.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
    </div>
  );
}