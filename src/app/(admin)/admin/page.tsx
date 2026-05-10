'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

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

export default function AdminDashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [mapReady, setMapReady] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setMapReady(true);
  }, []);

  useEffect(() => {
    const fetchReports = async () => {
      let query = supabase
        .from('reports')
        .select('*, profiles(full_name, email)')
        .order('created_at', { ascending: false });

      if (filterCategory !== 'all') {
        query = query.eq('category', filterCategory);
      }

      const { data: reportsData } = await query;

      const { count: total } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true });

      const { count: pending } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: resolved } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolved');

      setReports(reportsData || []);
      setStats({ total: total || 0, pending: pending || 0, resolved: resolved || 0 });
      setLoading(false);
    };

    fetchReports();
  }, [filterCategory, supabase]);

  const handleUpdateStatus = async (id: string, status: string) => {
    await supabase.from('reports').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setReports(reports.map(r => r.id === id ? { ...r, status } : r));
    setStats(stats => ({
      ...stats,
      pending: status === 'pending' ? stats.pending + 1 : stats.pending - 1,
      resolved: status === 'resolved' ? stats.resolved + 1 : stats.resolved - 1,
    }));
    setSelectedReport(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus laporan ini?')) return;
    await supabase.from('reports').delete().eq('id', id);
    setReports(reports.filter(r => r.id !== id));
    setStats(stats => ({ ...stats, total: stats.total - 1 }));
    setSelectedReport(null);
  };

  const categoryLabels: Record<string, string> = {
    jalan_rusak: 'Jalan Rusak',
    sampah: 'Sampah',
    jalan_berlubang: 'Jalan Berlubang',
    lainnya: 'Lainnya',
  };

  const defaultCenter: [number, number] = [-6.2, 106.8]; // Jakarta
  const defaultZoom = 11;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Memuat...</div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Admin</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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

      <div className="mb-4">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-gray-800">Peta Lokasi</h3>
          </div>
          <div className="h-[400px]">
            {mapReady && typeof window !== 'undefined' && (
              <MapContainer
                center={defaultCenter}
                zoom={defaultZoom}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {reports.map((report) => (
                  <Marker
                    key={report.id}
                    position={[report.latitude, report.longitude]}
                    eventHandlers={{
                      click: () => setSelectedReport(report),
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-semibold">{categoryLabels[report.category]}</p>
                        <p className="text-gray-600">{report.address || 'Tidak ada alamat'}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        </div>

        {/* Recent Reports List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-gray-800">Laporan Terbaru</h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto divide-y">
            {reports.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Belum ada laporan</div>
            ) : (
              reports.slice(0, 10).map((report) => (
                <div
                  key={report.id}
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex items-start gap-3">
                    {report.photo_url && (
                      <img
                        src={report.photo_url}
                        alt="Foto"
                        className="w-12 h-12 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{categoryLabels[report.category]}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            report.status === 'pending'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {report.status === 'pending' ? 'Menunggu' : 'Selesai'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(report.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
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
              <img
                src={selectedReport.photo_url}
                alt="Foto"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
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

            <div className="flex gap-3 mt-6">
              {selectedReport.status === 'pending' && (
                <button
                  onClick={() => handleUpdateStatus(selectedReport.id, 'resolved')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg"
                >
                  Tandai Selesai
                </button>
              )}
              <button
                onClick={() => handleDelete(selectedReport.id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}