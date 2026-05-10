'use client';

import { createClient } from '@/lib/supabase/client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { compressImage, formatFileSize } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { logActivity } from '@/lib/activityLog';
import { logReportHistory } from '@/lib/reportHistory';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export default function BuatLaporanPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const MAX_PHOTOS = 5;

  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    // Fetch active categories
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      setCategories(data || []);
      setCategoriesLoading(false);
    };
    fetchCategories();
  }, [supabase]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationLoading(false);
        },
        (err) => {
          console.error('GPS error:', err);
          setLocationLoading(false);
          setError('Gagal mendapatkan lokasi. Pastikan GPS diaktifkan.');
        }
      );
    } else {
      setLocationLoading(false);
      setError('Browser tidak mendukung GPS.');
    }
  }, []);

  useEffect(() => {
    if (location) {
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.display_name) {
            setAddress(data.display_name);
          }
        })
        .catch(console.error);
    }
  }, [location]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + photos.length > MAX_PHOTOS) {
      setError(`Maksimal ${MAX_PHOTOS} foto`);
      return;
    }

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Foto maksimal 10MB');
        return;
      }

      try {
        const compressed = await compressImage(file);
        setPhotos(prev => [...prev, compressed]);
        setPhotoPreviews(prev => [...prev, URL.createObjectURL(compressed)]);
        setError('');
      } catch (err) {
        setPhotos(prev => [...prev, file]);
        setPhotoPreviews(prev => [...prev, URL.createObjectURL(file)]);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    if (imageFiles.length + photos.length > MAX_PHOTOS) {
      setError(`Maksimal ${MAX_PHOTOS} foto`);
      return;
    }

    for (const file of imageFiles) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Foto maksimal 10MB');
        return;
      }

      try {
        const compressed = await compressImage(file);
        setPhotos(prev => [...prev, compressed]);
        setPhotoPreviews(prev => [...prev, URL.createObjectURL(compressed)]);
      } catch (err) {
        setPhotos(prev => [...prev, file]);
        setPhotoPreviews(prev => [...prev, URL.createObjectURL(file)]);
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!category) {
      setError('Pilih kategori laporan');
      return;
    }

    if (!location) {
      setError('Lokasi belum terdeteksi');
      return;
    }

    if (photos.length === 0) {
      setError('Upload minimal 1 foto');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Silakan login terlebih dahulu');

      // Upload photos and get URLs
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const fileName = `${Date.now()}-${Math.random()}-${photo.name}`;
        const { error: uploadError } = await supabase.storage
          .from('report-photos')
          .upload(fileName, photo);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('report-photos')
          .getPublicUrl(fileName);

        photoUrls.push(urlData.publicUrl);
      }

      const photoUrl = photoUrls.join(','); // Store multiple URLs separated by comma

      // Get category name
      const selectedCategory = categories.find(c => c.id === category);

      // Insert report
      const { data: insertData, error: insertError } = await supabase.from('reports').insert({
        user_id: user.id,
        category_id: category,
        category: selectedCategory?.name,
        description,
        photo_url: photoUrl,
        latitude: location.lat,
        longitude: location.lng,
        address,
        status: 'pending',
      }).select().single();

      if (insertError) throw insertError;

      await logActivity('create_report', `Membuat laporan: ${selectedCategory?.name}`, user.id);
      await logReportHistory(insertData.id, 'created', `Laporan "${selectedCategory?.name}" berhasil dibuat`);

      setSuccess(true);
      showToast('Laporan berhasil dikirim!', 'success');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim laporan');
      showToast(err.message || 'Gagal mengirim laporan', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-green-100 rounded-full p-4 mb-4">
          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Laporan Berhasil!</h2>
        <p className="text-gray-600">Mengalihkan ke dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Buat Laporan Baru</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Lokasi</h3>
          {locationLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              Mendeteksi lokasi...
            </div>
          ) : location ? (
            <div>
              <p className="text-sm text-gray-600 mb-2">
                📍 {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
              {address && (
                <p className="text-sm text-gray-500">{address}</p>
              )}
            </div>
          ) : (
            <p className="text-red-500">Lokasi tidak tersedia</p>
          )}
        </div>

        {/* Photo Upload */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            Foto ({photos.length}/{MAX_PHOTOS})
          </h3>
          <div
            onClick={() => photos.length < MAX_PHOTOS && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`border-2 border-dashed rounded-lg p-4 text-center transition ${
              photos.length > 0 ? 'border-gray-200' : 'border-gray-300'
            } ${photos.length < MAX_PHOTOS ? 'cursor-pointer hover:border-blue-500' : 'cursor-not-allowed'}`}
          >
            {photoPreviews.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <div className="h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-2xl">
                    +
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 py-4">
                <p className="mb-2">Klik atau drag & drop foto</p>
                <p className="text-sm">JPG, PNG (max 10MB per foto)</p>
              </div>
            )}
          </div>

          {/* Camera Buttons */}
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Pilih File
            </button>
            <button
              type="button"
              disabled={photos.length >= MAX_PHOTOS}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.capture = 'environment';
                input.multiple = photos.length < MAX_PHOTOS - 1;
                input.onchange = async (e) => {
                  const files = Array.from((e.target as HTMLInputElement).files || []);
                  if (files.length + photos.length > MAX_PHOTOS) {
                    setError(`Maksimal ${MAX_PHOTOS} foto`);
                    return;
                  }
                  for (const file of files) {
                    if (file.size > 10 * 1024 * 1024) {
                      setError('Foto maksimal 10MB');
                      return;
                    }
                    try {
                      const compressed = await compressImage(file);
                      setPhotos(prev => [...prev, compressed]);
                      setPhotoPreviews(prev => [...prev, URL.createObjectURL(compressed)]);
                      setError('');
                    } catch (err) {
                      setPhotos(prev => [...prev, file]);
                      setPhotoPreviews(prev => [...prev, URL.createObjectURL(file)]);
                    }
                  }
                };
                input.click();
              }}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${
                photos.length >= MAX_PHOTOS
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Kamera
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handlePhotoChange}
            className="hidden"
          />
        </div>

        {/* Category */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Kategori</h3>
          {categoriesLoading ? (
            <div className="text-gray-500">Memuat kategori...</div>
          ) : categories.length === 0 ? (
            <div className="text-gray-500">Tidak ada kategori aktif</div>
          ) : (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Pilih kategori...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Deskripsi</h3>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            placeholder="Jelaskan kondisi kerusakan atau masalah..."
          />
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading || locationLoading || categoriesLoading}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Mengirim...' : 'Kirim Laporan'}
          </button>
        </div>
      </form>
    </div>
  );
}