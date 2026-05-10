'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useRef } from 'react';

interface AppSettings {
  id: string;
  institution_name: string;
  institution_logo: string;
  address: string;
  phone: string;
  email: string;
  description: string;
}

export default function PengaturanPage() {
  const [settings, setSettings] = useState<AppSettings>({
    id: 'default',
    institution_name: '',
    institution_logo: '',
    address: '',
    phone: '',
    email: '',
    description: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (data) {
      setSettings(data);
      setLogoPreview(data.institution_logo || null);
    }
    setLoading(false);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo maksimal 2MB');
        return;
      }
      setLogoPreview(URL.createObjectURL(file));
      setLogoFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let logoUrl = settings.institution_logo;

      // Upload logo jika ada file baru
      if (logoFile) {
        const file = logoFile;
        const fileName = `logo-${Date.now()}.${file.name.split('.').pop()}`;

        const { error: uploadError } = await supabase.storage
          .from('report-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('report-photos')
          .getPublicUrl(fileName);

        logoUrl = urlData.publicUrl;
      }

      // Update settings
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          id: 'default',
          institution_name: settings.institution_name,
          institution_logo: logoUrl || null,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          description: settings.description,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Memuat...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Pengaturan Aplikasi</h2>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-6">
          ✓ Pengaturan berhasil disimpan!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo & Nama Instansi */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Identitas Instansi</h3>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Logo Upload */}
            <div className="flex-shrink-0">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 transition overflow-hidden bg-gray-50"
              >
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-gray-400 text-center p-4">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs">Pilih Logo</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
              <p className="text-xs text-gray-500 mt-1 text-center">max 2MB</p>
            </div>

            {/* Nama & Deskripsi */}
            <div className="flex-1 space-y-4 w-full">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Instansi
                </label>
                <input
                  type="text"
                  value={settings.institution_name}
                  onChange={(e) => setSettings({ ...settings, institution_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Contoh: Dinas Pekerjaan Umum"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi Singkat
                </label>
                <textarea
                  value={settings.description}
                  onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Deskripsi singkat tentang aplikasi..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Informasi Kontak */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Informasi Kontak</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alamat
              </label>
              <textarea
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Alamat lengkap..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                No. Telepon
              </label>
              <input
                type="tel"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="021-xxxxxxx"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="info@example.com"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        {settings.institution_name && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Preview Tampilan</h3>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              {logoPreview && (
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="w-12 h-12 object-contain"
                />
              )}
              <div>
                <h4 className="font-bold text-blue-600">{settings.institution_name || 'Nama Instansi'}</h4>
                {settings.description && (
                  <p className="text-sm text-gray-600">{settings.description}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
        >
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </form>
    </div>
  );
}